const { MongoClient } = require('mongodb')

const client = new MongoClient(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
})
let db

async function connectDB() {
  await client.connect()
  db = client.db('prepify')
  console.log('Connected to MongoDB')
}

function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.')
  return db
}

module.exports = { connectDB, getDB }
