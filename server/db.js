const { MongoClient } = require('mongodb')

let client
let db

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGO_URI
  const options = uri
    ? { serverSelectionTimeoutMS: 5000 }
    : { tls: true, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 10 }

  client = new MongoClient(mongoUri, options)
  await client.connect()
  db = client.db('prepify')
  console.log('Connected to MongoDB')
}

async function closeDB() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.')
  return db
}

module.exports = { connectDB, closeDB, getDB }
