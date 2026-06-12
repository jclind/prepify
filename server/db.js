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

  // Backs GET /api/drafts, which lists a user's drafts newest-updated first
  // (find({ userId }).sort({ updatedAt: -1 })). Without it that query is a full
  // collection scan plus an in-memory sort on every Drafts-tab load.
  try {
    await db.collection('recipeDrafts').createIndex({ userId: 1, updatedAt: -1 })
  } catch (err) {
    console.error('Failed to create index on recipeDrafts.userId:', err.message)
  }

  // Backs GET /api/getCreatedRecipes (find/sort by author, newest first) and the
  // recipes count in GET /api/getAccountCounts. Without it both are full
  // collection scans over every recipe on the site.
  try {
    await db.collection('recipes').createIndex({ userId: 1, createdAt: -1 })
  } catch (err) {
    console.error('Failed to create index on recipes.userId:', err.message)
  }

  // Backs GET /api/getSingleUserReviews (a user's ratings) and the ratings count
  // in GET /api/getAccountCounts, both of which filter ratings by username.
  try {
    await db.collection('ratings').createIndex({ username: 1 })
  } catch (err) {
    console.error('Failed to create index on ratings.username:', err.message)
  }

  // Moderation reports (P1/P2). The `reports` collection is new, so these build
  // instantly. Backs the admin queue (filter by status, newest first), the
  // per-user open-report tally in GET /admin/users (by reportedUsername and by
  // recipeId), and the one-open-report-per-target rate-limit lookup on POST.
  try {
    const reports = db.collection('reports')
    await reports.createIndex({ status: 1, createdAt: -1 })
    await reports.createIndex({ reportedUsername: 1 })
    await reports.createIndex({ recipeId: 1 })
  } catch (err) {
    console.error('Failed to create indexes on reports:', err.message)
  }

  // Admin audit log (P3). New collection, so these build instantly. Backs the
  // audit page (newest first), and filtering by actor or by a specific target.
  // The action/targetType compounds end in createdAt:-1 so the page's filter
  // dropdowns are served filter-then-sort by one index rather than an in-memory sort.
  try {
    const auditLog = db.collection('auditLog')
    await auditLog.createIndex({ createdAt: -1 })
    await auditLog.createIndex({ actorUid: 1, createdAt: -1 })
    await auditLog.createIndex({ targetType: 1, targetId: 1 })
    await auditLog.createIndex({ action: 1, createdAt: -1 })
    await auditLog.createIndex({ targetType: 1, createdAt: -1 })
  } catch (err) {
    console.error('Failed to create indexes on auditLog:', err.message)
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

function getClient() {
  if (!client) throw new Error('DB not initialized. Call connectDB() first.')
  return client
}

module.exports = { connectDB, closeDB, getDB, getClient }
