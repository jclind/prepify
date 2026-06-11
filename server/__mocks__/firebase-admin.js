// apps is non-empty so the initializeApp guard in middleware/auth.js is skipped
const deleteFile = jest.fn().mockResolvedValue([{}])

// Extra custom claims merged into the decoded token. Default: none, so existing
// tests see a plain { uid: 'test-uid' } (non-admin). Admin tests call
// __setClaims({ admin: true }); __resetClaims() restores the default. The module
// registry is per test file, so this state never leaks between suites.
let extraClaims = {}

const admin = {
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(() => ({
    verifyIdToken: jest
      .fn()
      .mockImplementation(async () => ({ uid: 'test-uid', ...extraClaims })),
  })),
  // Storage chain used by util/firebaseStorage.deleteRecipeImage. deleteFile is
  // exported so tests can assert (or override) image-deletion behavior.
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({ delete: deleteFile })),
    })),
  })),
  __deleteFile: deleteFile,
  __setClaims: (claims) => {
    extraClaims = claims
  },
  __resetClaims: () => {
    extraClaims = {}
  },
}

module.exports = admin
