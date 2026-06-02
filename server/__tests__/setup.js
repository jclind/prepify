const { MongoMemoryReplSet } = require('mongodb-memory-server')
const { connectDB, closeDB } = require('../db')

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
