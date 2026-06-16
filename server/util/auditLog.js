const { ObjectId } = require('mongodb')

// Canonical set of audit actions. Kept as a flat verb.noun list so the queue
// and the audit page can filter on an exact value. New admin mutations should
// add their action here rather than passing an ad-hoc string.
const AUDIT_ACTIONS = [
  'recipe.hide',
  'recipe.unhide',
  'recipe.publish',
  'recipe.unpublish',
  'recipe.feature',
  'recipe.unfeature',
  'review.takedown',
  'review.restore',
  // Automated moderation: a classifier put a recipe into pending_review (held
  // from public reads until a human clears it). Credited to the system actor.
  'recipe.autohold',
  // Automated moderation: a high/medium-confidence classifier verdict refused a
  // write outright (the content was never persisted). Credited to the system
  // actor; the target is the offending user. See util/automod.auditContentBlock.
  'content.blocked',
  'user.suspend',
  'user.ban',
  'user.activate',
  // Self-service: the user deleted their own account (Settings → Danger Zone).
  'user.delete',
  'report.resolve',
  'report.dismiss',
  'bugReport.resolve',
  'bugReport.dismiss',
]

const AUDIT_TARGET_TYPES = ['recipe', 'review', 'user', 'report', 'bugReport']

// Reserved synthetic actor for automated (non-human) moderation actions. Stamped
// into auditLog/reports so the queue can visually distinguish a machine decision
// from a human admin's, and so `actorUid` analytics never attribute an automod
// action to a real admin. The uid is an obviously-non-Firebase sentinel.
const SYSTEM_ACTOR = { uid: 'system:automod', type: 'system' }

/**
 * Append one immutable entry to the `auditLog` collection describing an admin
 * action. Deliberately best-effort: a logging failure must never break the
 * action it is recording, so this swallows its own errors (and logs them) and
 * always resolves. Callers should `await` it but need not guard it.
 *
 * @param {import('mongodb').Db} db
 * @param {object} entry
 * @param {string} entry.action       one of AUDIT_ACTIONS
 * @param {string} entry.actorUid     admin uid performing the action (or SYSTEM_ACTOR.uid)
 * @param {string} [entry.actorType]  'admin' (default) | 'system' — machine vs human
 * @param {string} entry.targetType   one of AUDIT_TARGET_TYPES
 * @param {string} entry.targetId     recipeId / uid / reportId (or username+recipeId for reviews)
 * @param {string} [entry.targetLabel] human-readable label captured at action time (recipe title, @username)
 * @param {string} [entry.reason]
 * @param {object} [entry.metadata]   any extra structured context (e.g. { from, to })
 */
async function recordAudit(db, entry) {
  try {
    await db.collection('auditLog').insertOne({
      _id: new ObjectId(),
      action: entry.action,
      actorUid: entry.actorUid,
      actorType: entry.actorType || 'admin',
      targetType: entry.targetType,
      targetId: entry.targetId != null ? String(entry.targetId) : null,
      targetLabel: entry.targetLabel || null,
      reason: entry.reason || null,
      metadata: entry.metadata || null,
      createdAt: new Date(),
    })
  } catch (err) {
    console.error('Failed to write audit log entry:', err.message)
  }
}

/**
 * Append many audit entries in a single insertOne batch. Same best-effort
 * contract as recordAudit (swallows its own errors, always resolves) — for
 * bulk admin sweeps so we make one round-trip instead of one per entry.
 *
 * @param {import('mongodb').Db} db
 * @param {object[]} entries  each shaped like the recordAudit `entry` arg
 */
async function recordAuditMany(db, entries) {
  if (!Array.isArray(entries) || entries.length === 0) return
  try {
    await db.collection('auditLog').insertMany(
      entries.map((entry) => ({
        _id: new ObjectId(),
        action: entry.action,
        actorUid: entry.actorUid,
        actorType: entry.actorType || 'admin',
        targetType: entry.targetType,
        targetId: entry.targetId != null ? String(entry.targetId) : null,
        targetLabel: entry.targetLabel || null,
        reason: entry.reason || null,
        metadata: entry.metadata || null,
        createdAt: new Date(),
      }))
    )
  } catch (err) {
    console.error('Failed to write audit log entries:', err.message)
  }
}

module.exports = { recordAudit, recordAuditMany, AUDIT_ACTIONS, AUDIT_TARGET_TYPES, SYSTEM_ACTOR }
