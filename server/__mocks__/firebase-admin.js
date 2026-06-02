// apps is non-empty so the initializeApp guard in middleware/auth.js is skipped
const admin = {
  apps: [{}],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
  })),
}

module.exports = admin
