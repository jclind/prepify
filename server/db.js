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
  await ensureIndexes()
}

// Enforces case-insensitive username uniqueness at the database level. Legacy
// docs created before `username_lower` existed are backfilled first so the
// unique index can be built over the whole collection.
async function ensureIndexes() {
  const usernames = db.collection('usernames')
  await usernames.updateMany(
    { username_lower: { $exists: false }, username: { $type: 'string' } },
    [{ $set: { username_lower: { $toLower: '$username' } } }]
  )
  try {
    await usernames.createIndex({ username_lower: 1 }, { unique: true })
  } catch (err) {
    // Pre-existing case-variant duplicates would make the unique index fail to
    // build. Log it rather than crashing startup; the duplicates need manual
    // cleanup, but the rest of the server should still come up.
    console.error(
      'Failed to create unique index on usernames.username_lower:',
      err.message
    )
  }
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
