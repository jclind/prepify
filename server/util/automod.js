// Route-facing helpers that connect the text classifier (util/textModeration) to
// the EXISTING reactive moderation pipeline (reports + status + auditLog), so an
// automated decision does exactly what an admin action does today — no parallel
// state. Used by the recipe write routes; reviews/profile block inline and need
// none of this.

const { ObjectId } = require('mongodb')
const { recordAudit, SYSTEM_ACTOR } = require('./auditLog')
const { recipeIdQuery } = require('./recipeIdQuery')

// Friendly, surface-agnostic message returned on a high-confidence block. It
// deliberately does NOT echo the matched term/category (don't coach evasion, and
// don't repeat a slur back to the user). Routes pair it with `code` so the FE can
// branch without string-matching.
const BLOCKED_MESSAGE =
  "This content was flagged by our automated moderation system and can't be published. Please review our content guidelines and edit your submission."
const BLOCKED_CODE = 'CONTENT_BLOCKED'

/**
 * Best-effort audit row for a block that was returned to a user. Without it a
 * block leaves NO trace: the refused content is never persisted, so an admin
 * could not otherwise tell the automated system is rejecting submissions — from
 * whom, on which surface, or in what category. Credited to the system actor (a
 * machine decision, like recipe.autohold), with the OFFENDING user as the target.
 *
 * Stores ONLY structured signal — surface + classifier category/severity/source
 * + the offender's uid. It deliberately never stores verdict.reason (a blocklist
 * reason embeds the matched term, i.e. the very content we refuse to echo) nor
 * any of the submitted text.
 *
 * @param {import('mongodb').Db} db
 * @param {object} args
 * @param {string} args.uid       offending user's uid
 * @param {string} args.surface   where the block happened ('recipe' | 'review' | 'username' | 'displayName' | 'profile' | 'profile.photo')
 * @param {object} args.verdict   the moderate{Text,Image} result
 */
async function auditContentBlock(db, { uid, surface, verdict } = {}) {
  if (!db) return
  let targetLabel = null
  try {
    // Best-effort handle so the queue reads "@user" not a bare uid. A miss
    // (legacy user, lookup hiccup) just falls back to the uid at render time.
    if (uid) {
      const doc = await db
        .collection('usernames')
        .findOne({ _id: uid }, { projection: { username: 1 } })
      if (doc?.username) targetLabel = `@${doc.username}`
    }
  } catch (_) {
    // ignore — targetLabel stays null
  }
  await recordAudit(db, {
    action: 'content.blocked',
    actorUid: SYSTEM_ACTOR.uid,
    actorType: SYSTEM_ACTOR.type,
    targetType: 'user',
    targetId: uid || null,
    targetLabel,
    metadata: {
      surface: surface || null,
      category: verdict?.category || null,
      severity: verdict?.severity || null,
      source: verdict?.source || null,
    },
  })
}

// Single owner of the high-confidence block response, so the 422 contract (status
// + body shape the FE keys on) lives in one place instead of being re-typed at
// every write route. When a `context` ({ db, uid, surface, verdict }) is passed,
// it ALSO drops a best-effort, system-actor audit row so the block is visible to
// admins — fire-and-forget so it never delays the 422 or turns a block into a
// 500 (recordAudit already swallows its own errors; the guard covers the rest).
// Context is optional, so a bare respondBlocked(res) still works.
function respondBlocked(res, context) {
  if (context && context.db) {
    auditContentBlock(context.db, context).catch(() => {})
  }
  return res.status(422).json({ error: BLOCKED_MESSAGE, code: BLOCKED_CODE })
}

// A recipe is screened on two independent axes (text + image); the recipe is
// only as clean as its worst part. Collapse any number of verdicts into the most
// severe one, so the route applies a single tier decision (block / hold / allow).
// Skips falsy args (e.g. an image axis that wasn't scanned this request).
const SEVERITY_RANK = { clean: 0, medium: 1, high: 2 }
function worstVerdict(...verdicts) {
  let worst = null
  for (const v of verdicts) {
    if (!v) continue
    if (!worst || SEVERITY_RANK[v.severity] > SEVERITY_RANK[worst.severity]) worst = v
  }
  return worst || { allowed: true, severity: 'clean', reason: null, category: null, scores: null, source: 'none' }
}

// Flatten a recipe payload's user-controlled text into one blob for a single
// classifier pass (one API call per recipe, not one per field).
//
// Must match the SHAPES THE CLIENT ACTUALLY SENDS (src/types.ts), or whole
// fields silently go unmoderated:
//   - ingredients[] are parsed rows ({ parsedIngredient: { originalIngredientString,
//     ingredient, comment, … }, ingredientData, id }) OR section-header labels
//     ({ label, id }). The verbatim line the user typed lives in
//     `parsedIngredient.originalIngredientString`.
//   - instructions[] are step rows ({ content, index, id }) OR labels ({ label, id }).
//   - There is no `tags` field on recipes today; the loop is kept for forward-compat.
// Older/test shapes (`ingredient`/`name`, `step`, plain strings, `text`) are still
// accepted defensively, but the real keys above are what production exercises.
function gatherRecipeText(body = {}) {
  const parts = []
  const push = (v) => { if (typeof v === 'string') parts.push(v) }

  push(body.title)
  push(body.description)

  for (const ing of body.ingredients || []) {
    if (!ing) continue
    if (typeof ing === 'string') { parts.push(ing); continue }
    push(ing.label) // section-header row (LabelType)
    if (ing.parsedIngredient) {
      push(ing.parsedIngredient.originalIngredientString) // the verbatim typed line
      push(ing.parsedIngredient.ingredient)
      push(ing.parsedIngredient.comment)
    }
    push(ing.ingredient) // defensive (older/alternate shapes)
    push(ing.name)
  }

  for (const step of body.instructions || []) {
    if (!step) continue
    if (typeof step === 'string') { parts.push(step); continue }
    push(step.content) // step row (InstructionsType)
    push(step.label) // section-header row (LabelType)
    push(step.step) // defensive
  }

  for (const tag of body.tags || []) {
    if (!tag) continue
    if (typeof tag === 'string') { parts.push(tag); continue }
    push(tag.label)
    push(tag.text)
  }

  return parts.filter(Boolean).join('\n')
}

/**
 * Place a medium-confidence automated hold on a recipe, as one report-gated unit:
 *   1. file the OPEN admin-queue report (credited to the system actor),
 *   2. only then flip the recipe to `status: 'pending_review'`,
 *   3. append the `recipe.autohold` audit entry.
 *
 * Ordering matters: the recipe is hidden from public reads ONLY after its queue
 * entry exists, so we can never end up with a recipe that has silently vanished
 * with nothing for an admin to clear. If the report write fails the recipe is
 * left visible (fail-open, consistent with the text classifier) and the caller
 * is told the hold did not take.
 *
 * Idempotent on the report: re-holding the same recipe (e.g. owner re-edits while
 * still pending) upserts the single open automod report instead of stacking
 * duplicates, mirroring the one-open-report-per-(reporter,target) rule in
 * routes/reports.js.
 *
 * @param {import('mongodb').Db} db
 * @param {object} args
 * @param {string} args.recipeId
 * @param {string} [args.title]   recipe title, for the audit label
 * @param {object} args.verdict   the moderateText() result (severity/reason/category/source)
 * @returns {Promise<boolean>}    true if the recipe was actually held
 */
async function holdRecipeForReview(db, { recipeId, title, verdict }) {
  const id = String(recipeId)
  try {
    await db.collection('reports').updateOne(
      { targetType: 'recipe', recipeId: id, reporterUid: SYSTEM_ACTOR.uid, status: 'open' },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          targetType: 'recipe',
          recipeId: id,
          reporterUid: SYSTEM_ACTOR.uid,
          reason: 'inappropriate',
          details: `Automated moderation hold (${verdict.reason || verdict.severity}).`,
          status: 'open',
          source: 'automod',
          classifier: {
            severity: verdict.severity,
            category: verdict.category || null,
            reason: verdict.reason || null,
            source: verdict.source || null,
          },
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )
  } catch (err) {
    // Queue entry could not be created → do NOT hide the recipe. Better to leave
    // a borderline recipe momentarily visible than to disappear it with no way
    // for an admin to find and clear it.
    console.error('holdRecipeForReview: failed to file automod report — leaving recipe visible:', err.message)
    return false
  }

  // The queue entry now exists, so it is safe to withhold the recipe from public
  // reads. A failure here leaves the report in place (an admin can still act), so
  // it's logged but not fatal.
  try {
    await db.collection('recipes').updateOne(recipeIdQuery(id), { $set: { status: 'pending_review' } })
  } catch (err) {
    console.error('holdRecipeForReview: report filed but failed to set pending_review:', err.message)
  }

  await recordAudit(db, {
    action: 'recipe.autohold',
    actorUid: SYSTEM_ACTOR.uid,
    actorType: SYSTEM_ACTOR.type,
    targetType: 'recipe',
    targetId: id,
    targetLabel: title || null,
    reason: verdict.reason || null,
    metadata: { severity: verdict.severity, category: verdict.category || null, source: verdict.source || null },
  })
  return true
}

module.exports = { BLOCKED_MESSAGE, BLOCKED_CODE, respondBlocked, auditContentBlock, gatherRecipeText, holdRecipeForReview, worstVerdict }
