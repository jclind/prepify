// apps is non-empty so the initializeApp guard in middleware/auth.js is skipped
const deleteFile = jest.fn().mockResolvedValue([{}])

// Extra custom claims merged into the decoded token. Default: none, so existing
// tests see a plain { uid: 'test-uid' } (non-admin). Admin tests call
// __setClaims({ admin: true }); __resetClaims() restores the default. The module
// registry is per test file, so this state never leaks between suites.
let extraClaims = {}

// Firebase user registry for getUser / getUserByEmail (used by the admin user
// routes). Default: a single entry for the authenticated test uid so detail
// lookups resolve. Tests add targets via __setUsers([{ uid, email, admin }]).
const DEFAULT_USERS = [{ uid: 'test-uid', email: 'admin@test.dev' }]
let users = DEFAULT_USERS

function toFbUser(u) {
  return {
    uid: u.uid,
    email: u.email || null,
    customClaims: u.admin ? { admin: true } : u.customClaims || null,
  }
}
function notFound() {
  const err = new Error(
    'There is no user record corresponding to the provided identifier.'
  )
  err.code = 'auth/user-not-found'
  return err
}

// Stable auth instance so tests can tune verifyIdToken / getUser via the exported
// handles (admin.auth() returns the same object every call). The default
// implementations honor the admin-test state (extraClaims / users registry), so
// the account-page suites (which override __getUser / __verifyIdToken directly)
// and the admin suites (which use the __setClaims / __setUsers setters) both work
// against this one mock.
const verifyIdToken = jest
  .fn()
  .mockImplementation(async () => ({ uid: 'test-uid', ...extraClaims }))
const getUser = jest.fn().mockImplementation(async uid => {
  const u = users.find(x => x.uid === uid)
  if (!u) throw notFound()
  return toFbUser(u)
})
const getUserByEmail = jest.fn().mockImplementation(async email => {
  const u = users.find(x => x.email === email)
  if (!u) throw notFound()
  return toFbUser(u)
})
const authInstance = { verifyIdToken, getUser, getUserByEmail }

const admin = {
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(() => authInstance),
  // Storage chain used by util/firebaseStorage.deleteRecipeImage. deleteFile is
  // exported so tests can assert (or override) image-deletion behavior.
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({ delete: deleteFile })),
    })),
  })),
  __deleteFile: deleteFile,
  __verifyIdToken: verifyIdToken,
  __getUser: getUser,
  __setClaims: claims => {
    extraClaims = claims
  },
  __resetClaims: () => {
    extraClaims = {}
  },
  // Register Firebase users for getUser/getUserByEmail. Pass [{ uid, email, admin }].
  __setUsers: list => {
    users = list
  },
  __resetUsers: () => {
    users = DEFAULT_USERS
  },
}

module.exports = admin
