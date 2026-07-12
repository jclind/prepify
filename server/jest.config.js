module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  // One in-memory Mongo for the whole run (see globalSetup.js); each file
  // connects to it in setup.js and drops the database when it finishes.
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
  // A timeout's job is to catch a HUNG test, not to race a busy CPU: with the
  // default 5s, a DB-heavy test on a loaded machine (dev servers + a concurrent
  // jest run) intermittently blew the deadline and failed the suite. 30s still
  // catches real hangs without flaking under contention.
  testTimeout: 30000,
}
