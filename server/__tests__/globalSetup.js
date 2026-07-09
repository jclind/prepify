const { MongoMemoryReplSet } = require('mongodb-memory-server')

// One in-memory Mongo for the WHOLE run, not one per test file. The suite runs
// --runInBand, so files execute sequentially against it; setup.js gives each
// file a fresh view by dropping the database in its afterAll. Before this,
// every one of the ~30 suites booted (and tore down) its own MongoMemoryReplSet;
// under CPU contention that churn tripped the driver's serverSelection timeout
// mid-test and randomly failed one DB-heavy test per run (see BACKLOG "Server
// Jest suite is flaky under CPU contention").
//
// A single-node replica set (not a standalone) so multi-document transactions —
// used by DELETE /deleteRecipe and the migration scripts — work in tests,
// matching the replica-set topology of the production Atlas deployment.
//
// globalSetup runs in Jest's main process before any worker/test file, so the
// URI handed to setup.js travels via process.env; the replset instance itself
// stays on globalThis for globalTeardown (same process) to stop.
module.exports = async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  globalThis.__MONGOD__ = mongod
  process.env.MONGO_TEST_URI = mongod.getUri()
}
