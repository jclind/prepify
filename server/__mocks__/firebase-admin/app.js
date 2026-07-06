// Mock for the 'firebase-admin/app' modular entry. Auto-applied by Jest for the
// subpath (see the note in ./auth.js). getApps() is non-empty so the
// initializeApp guard in middleware/auth.js is skipped (tests have no
// FIREBASE_SERVICE_ACCOUNT to JSON.parse).
module.exports = {
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{}]),
  cert: jest.fn(),
}
