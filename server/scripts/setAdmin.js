/**
 * Grant or revoke the Prepify admin role.
 *
 * Admin identity is a Firebase custom claim `{ admin: true }` on the user's
 * account. Once set, it rides every ID token that user mints, so the server
 * sees it in `verifyToken` (req.isAdmin) with no extra DB lookup. The user must
 * sign out and back in (or refresh their token) for a freshly granted claim to
 * appear in their session.
 *
 * Usage (from the repo root or the server dir):
 *   node server/scripts/setAdmin.js <uid|email>            # grant admin
 *   node server/scripts/setAdmin.js <uid|email> --revoke   # remove admin
 *
 * Reads FIREBASE_SERVICE_ACCOUNT from server/.env.
 * Exit code 0 = success, 2 = error/bad usage.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

async function main() {
  const args = process.argv.slice(2)
  const revoke = args.includes('--revoke')
  const identifier = args.find((a) => !a.startsWith('--'))

  if (!identifier) {
    console.error('Usage: node server/scripts/setAdmin.js <uid|email> [--revoke]')
    process.exit(2)
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!rawServiceAccount) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set (looked in server/.env).')
    process.exit(2)
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(rawServiceAccount)),
    })
  }

  try {
    // Accept either a uid or an email. An "@" is the cheap tell for an email.
    const user = identifier.includes('@')
      ? await getAuth().getUserByEmail(identifier)
      : await getAuth().getUser(identifier)

    // Merge with any existing claims so we never clobber unrelated ones.
    const existingClaims = user.customClaims || {}
    const nextClaims = { ...existingClaims }
    if (revoke) {
      delete nextClaims.admin
    } else {
      nextClaims.admin = true
    }

    await getAuth().setCustomUserClaims(user.uid, nextClaims)

    console.log(
      `${revoke ? 'Revoked' : 'Granted'} admin for ${user.email || user.uid} (uid: ${user.uid}).`
    )
    console.log('They must refresh their session (sign out/in) for the change to take effect.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to update admin claim:', err.message)
    process.exit(2)
  }
}

main()
