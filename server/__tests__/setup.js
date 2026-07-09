const timers = require('node:timers')
const { connectDB, closeDB, getClient } = require('../db')
const { facetsCache } = require('../util/facetsCache')

// Under Node 26's jest environment the global timer functions aren't stable
// across a fake-timer test: once a test runs `jest.useFakeTimers()` and then
// `jest.useRealTimers()`, the restored globals can come back undefined, so the
// NEXT test's HTTP call throws `clearTimeout is not defined` from `superagent`
// (via supertest) and times out. Re-install the canonical `node:timers`
// implementations before every test so a prior fake-timer test can't leave the
// globals broken. A test that opts into `jest.useFakeTimers()` still overrides
// these afterwards, so fake-timer behaviour is unchanged.
const installRealTimers = () => {
  for (const name of [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'setImmediate',
    'clearImmediate',
  ]) {
    globalThis[name] = timers[name]
  }
}
installRealTimers()
beforeEach(installRealTimers)

// The /recipes/facets cache is a process-wide singleton that outlives the
// per-test DB reset (recipes.test.js afterEach deleteMany). Clear it before
// every test so a facets response cached from one test's seed data can't leak
// into another test that seeded different recipes.
beforeEach(() => facetsCache.invalidate())

// Connect to the run-wide in-memory Mongo created by globalSetup.js (one
// MongoMemoryReplSet for the whole --runInBand run, not one per file — the
// per-file replSet churn was the main flakiness vector under CPU contention).
// Each file still gets its own client connection and a FRESH database: afterAll
// drops it, so nothing a suite (or its leaked fire-and-forget work) wrote can
// leak into the next file — the same isolation the per-file replSet provided.
beforeAll(async () => {
  await connectDB(process.env.MONGO_TEST_URI)
}, 60000)

afterAll(async () => {
  await getClient().db('prepify').dropDatabase()
  await closeDB()
})
