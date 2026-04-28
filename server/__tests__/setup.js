const { MongoMemoryServer } = require('mongodb-memory-server')
const { connectDB, closeDB } = require('../db')

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await connectDB(mongod.getUri())
}, 30000)

afterAll(async () => {
  await closeDB()
  await mongod.stop()
})
