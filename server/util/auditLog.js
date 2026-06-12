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
  'user.suspend',
  'user.ban',
  'user.activate',
  'report.resolve',
  'report.dismiss',
]

const AUDIT_TARGET_TYPES = ['recipe', 'review', 'user', 'report']

/**
 * Append one immutable entry to the `auditLog` collection describing an admin
 * action. Deliberately best-effort: a logging failure must never break the
 * action it is recording, so this swallows its own errors (and logs them) and
 * always resolves. Callers should `await` it but need not guard it.
 *
 * @param {import('mongodb').Db} db
 * @param {object} entry
 * @param {string} entry.action       one of AUDIT_ACTIONS
 * @param {string} entry.actorUid     admin uid performing the action
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

module.exports = { recordAudit, recordAuditMany, AUDIT_ACTIONS, AUDIT_TARGET_TYPES }
