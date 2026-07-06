// Mock for the 'firebase-admin/auth' modular entry. Auto-applied by Jest for the
// subpath (like the sibling app/storage mocks and ../firebase-admin.js): mocks in
// __mocks__/ adjacent to node_modules are used automatically for node_modules
// modules — no jest.mock('firebase-admin/auth') call needed. Delegates to the
// shared state in ../firebase-admin.js — the same module instance tests get from
// require('firebase-admin') — so the __ handles there tune this getAuth().
const admin = require('../firebase-admin')

module.exports = {
  getAuth: jest.fn(() => admin.__authInstance),
}
