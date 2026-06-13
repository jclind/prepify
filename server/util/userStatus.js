// Single source of truth for account status (P2 moderation). Mirrors the
// "exclude only what is explicit" philosophy of util/moderation.js: there is no
// central user record today, so the ABSENCE of a `users` doc (or of a status
// field) means a perfectly normal account. Only an explicit 'suspended' /
// 'banned' status blocks anything.
//
// `banned` is, by product decision, a soft DB flag — enforced exactly like
// `suspended` (writes blocked, reads + login still work). It is NOT coupled to
// Firebase Auth's `disabled` flag; it's a stronger label, not a harder lockout.

const USER_STATUSES = ['active', 'suspended', 'banned']
const BLOCKED_STATUSES = ['suspended', 'banned']

// Look up an account's status. Defaults to 'active' for any uid without a record
// (every legacy user) so this can ship without a backfill.
async function getUserStatus(db, uid) {
  if (!uid) return 'active'
  const doc = await db.collection('users').findOne({ _id: uid })
  return doc?.status || 'active'
}

function isBlocked(status) {
  return BLOCKED_STATUSES.includes(status)
}

module.exports = { USER_STATUSES, isBlocked }
