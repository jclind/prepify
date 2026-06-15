// Route-facing helpers that connect the text classifier (util/textModeration) to
// the EXISTING reactive moderation pipeline (reports + status + auditLog), so an
// automated decision does exactly what an admin action does today — no parallel
// state. Used by the recipe write routes; reviews/profile block inline and need
// none of this.

const { ObjectId } = require('mongodb')
const { recordAudit, SYSTEM_ACTOR } = require('./auditLog')

// Friendly, surface-agnostic message returned on a high-confidence block. It
// deliberately does NOT echo the matched term/category (don't coach evasion, and
// don't repeat a slur back to the user). Routes pair it with `code` so the FE can
// branch without string-matching.
const BLOCKED_MESSAGE =
  "This content was flagged by our automated moderation system and can't be published. Please review our content guidelines and edit your submission."
const BLOCKED_CODE = 'CONTENT_BLOCKED'

// Flatten a recipe payload's user-controlled text into one blob for a single
// classifier pass (one API call per recipe, not one per field). Defensive about
// shape: ingredients may carry `ingredient` or `name`; instructions may be
// strings or `{ step }`; tags may be strings or `{ text }`.
function gatherRecipeText(body = {}) {
  const parts = []
  if (typeof body.title === 'string') parts.push(body.title)
  if (typeof body.description === 'string') parts.push(body.description)
  for (const ing of body.ingredients || []) {
    parts.push((ing && (ing.ingredient || ing.name)) || '')
  }
  for (const step of body.instructions || []) {
    parts.push(typeof step === 'string' ? step : (step && step.step) || '')
  }
  for (const tag of body.tags || []) {
    parts.push(typeof tag === 'string' ? tag : (tag && tag.text) || '')
  }
  return parts.filter(Boolean).join('\n')
}

/**
 * Record a medium-confidence automated hold on a recipe: file an OPEN report into
 * the admin queue (credited to the system actor) and append an audit entry. The
 * caller is responsible for stamping `status: 'pending_review'` on the recipe doc
 * itself — this only writes the queue/audit side effects.
 *
 * Idempotent on the report: re-holding the same recipe (e.g. owner re-edits while
 * still pending) upserts the single open automod report instead of stacking
 * duplicates, mirroring the one-open-report-per-(reporter,target) rule in
 * routes/reports.js.
 *
 * Best-effort, like recordAudit/email: never throws into the write route.
 *
 * @param {import('mongodb').Db} db
 * @param {object} args
 * @param {string} args.recipeId
 * @param {string} [args.title]   recipe title, for the audit label
 * @param {object} args.verdict   the moderateText() result (severity/reason/category/source)
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
    console.error('holdRecipeForReview: failed to file automod report:', err.message)
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
}

module.exports = { BLOCKED_MESSAGE, BLOCKED_CODE, gatherRecipeText, holdRecipeForReview }
