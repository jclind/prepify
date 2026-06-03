// apps is non-empty so the initializeApp guard in middleware/auth.js is skipped
const deleteFile = jest.fn().mockResolvedValue([{}])

const admin = {
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
  })),
  // Storage chain used by util/firebaseStorage.deleteRecipeImage. deleteFile is
  // exported so tests can assert (or override) image-deletion behavior.
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({ delete: deleteFile })),
    })),
  })),
  __deleteFile: deleteFile,
}

module.exports = admin
