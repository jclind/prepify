// apps is non-empty so the initializeApp guard in middleware/auth.js is skipped
const deleteFile = jest.fn().mockResolvedValue([{}])

// Stable auth instance so tests can tune verifyIdToken / getUser via the
// exported handles (admin.auth() returns the same object every call).
const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'test-uid' })
const getUser = jest.fn().mockResolvedValue({
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.png',
})
const authInstance = { verifyIdToken, getUser }

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
}

module.exports = admin
