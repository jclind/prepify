const { getAuth } = require('firebase-admin/auth')

// Avatars and display names live on the Firebase Auth record, so showing them
// on a recipe or a review costs an Admin SDK call on the request path. The SDK
// waits up to 25s and retries, which would hold an otherwise ready recipe or
// review list hostage to an optional picture. Past this deadline the identity
// is dropped (the client falls back to DefaultAvatar + @username).
const AUTH_LOOKUP_TIMEOUT_MS = 1500

function withTimeout(promise, ms, label = 'lookup') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Resolve { photoURL, displayName } for a set of author uids, for display on
// content they published. Returns a Map<uid, identity>; a uid missing from it
// renders with the fallback avatar and name.
//
// Privacy: a user who switched their profile to private (userProfiles.isPublic
// === false) gets no real photo or display name here either, matching
// /getPublicProfile's 404, except to themselves (`viewerUid`) and to admins.
// If the privacy lookup itself fails, every identity is withheld rather than
// risk showing a private one.
async function resolveAuthorIdentities(db, uids, { viewerUid = null, isAdmin = false } = {}) {
  const byUid = new Map()
  const unique = [...new Set(uids.filter(Boolean))]
  // getUsers() throws on an empty identifier array.
  if (unique.length === 0) return byUid

  const [authResult, privateResult] = await Promise.allSettled([
    withTimeout(
      getAuth().getUsers(unique.map((uid) => ({ uid }))),
      AUTH_LOOKUP_TIMEOUT_MS,
      'author identity lookup'
    ),
    isAdmin
      ? Promise.resolve([])
      : db
          .collection('userProfiles')
          .find({ _id: { $in: unique }, isPublic: false }, { projection: { _id: 1 } })
          .toArray(),
  ])

  if (authResult.status === 'rejected') {
    // Slow or failing Admin SDK: render without avatars. Logged so a real
    // outage (avatars silently vanishing everywhere) is visible.
    console.warn('resolveAuthorIdentities: Firebase lookup failed, rendering without avatars:', authResult.reason?.message || authResult.reason)
    return byUid
  }
  if (privateResult.status === 'rejected') {
    console.warn('resolveAuthorIdentities: privacy lookup failed, withholding identities:', privateResult.reason?.message || privateResult.reason)
    return byUid
  }

  const hidden = new Set(privateResult.value.map((p) => String(p._id)))
  for (const u of authResult.value.users) {
    if (hidden.has(u.uid) && u.uid !== viewerUid) continue
    byUid.set(u.uid, {
      photoURL: u.photoURL || null,
      displayName: u.displayName || null,
    })
  }
  return byUid
}

module.exports = { AUTH_LOOKUP_TIMEOUT_MS, withTimeout, resolveAuthorIdentities }
