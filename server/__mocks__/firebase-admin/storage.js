// Mock for the 'firebase-admin/storage' modular entry. Auto-applied by Jest for
// the subpath (see the note in ./auth.js). Delegates to the shared state in
// ../firebase-admin.js so tests keep asserting deletions via
// require('firebase-admin').__deleteFile.
const admin = require('../firebase-admin')

module.exports = {
  getStorage: jest.fn(() => admin.__storageInstance),
}
