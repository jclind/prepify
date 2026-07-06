// Mock for the 'firebase-admin/auth' modular entry. Delegates to the shared
// state in ../firebase-admin.js — the same module instance tests get from
// require('firebase-admin') — so the __ handles there tune this getAuth().
const admin = require('../firebase-admin')

module.exports = {
  getAuth: jest.fn(() => admin.__authInstance),
}
