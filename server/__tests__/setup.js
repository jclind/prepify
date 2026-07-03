const timers = require('node:timers')
const { MongoMemoryReplSet } = require('mongodb-memory-server')
const { connectDB, closeDB } = require('../db')
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

let mongod

// A single-node replica set (rather than a standalone) so multi-document
// transactions — used by DELETE /deleteRecipe — work in tests, matching the
// replica-set topology of the production Atlas deployment.
beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await connectDB(mongod.getUri())
}, 60000)

afterAll(async () => {
  await closeDB()
  await mongod.stop()
})
