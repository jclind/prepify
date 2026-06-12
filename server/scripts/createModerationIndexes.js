/**
 * Build the indexes that back the admin/moderation feature on the LARGE,
 * pre-existing collections (`recipes`, `ratings`). The new `reports` collection
 * is already indexed automatically at startup (see db.js ensureIndexes) — that
 * one is tiny so it builds instantly. These three are on collections with real
 * data, so we run them as a deliberate, controlled step rather than on every
 * server restart.
 *
 * Safe to run anytime and re-run: createIndex is idempotent (an existing index
 * with the same spec is a no-op). MongoDB (4.2+) builds indexes online — reads
 * and writes keep working during the build — but it does add IO, so prefer a
 * lower-traffic window for the first run on a hot DB.
 *
 * Usage:
 *   node server/scripts/createModerationIndexes.js
 *
 * Reads MONGO_URI from server/.env. Exit code 0 = success, 1 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')

// Each entry: collection, key spec, and why it exists. Names are explicit so
// re-runs and `db.collection.getIndexes()` are easy to read.
const INDEXES = [
  {
    collection: 'recipes',
    key: { userId: 1 },
    name: 'userId_1',
    why: 'admin user list/detail (recipes authored), getCreatedRecipes',
  },
  {
    collection: 'ratings',
    key: { recipeId: 1, username: 1 },
    name: 'recipeId_1_username_1',
    why: 'getReviews + recomputeRecipeRating (by recipeId) and the (username,recipeId) review findOne/upsert',
  },
  {
    collection: 'ratings',
    key: { username: 1 },
    name: 'username_1',
    why: 'admin user list review tally + getSingleUserReviews (by username)',
  },
  {
    collection: 'recipes',
    key: { featured: -1, views: -1 },
    name: 'featured_-1_views_-1',
    why: 'getTrendingRecipes homepage sort (featured picks first, then most-viewed)',
  },
  // Analytics recipesOverTime (P3b, GET /admin/analytics) buckets recipes by a
  // `createdAt` range; the existing {userId,createdAt} compound can't serve a
  // createdAt-only range. recipes is the large collection, so it lives here in the
  // deliberate migration. The small reports/usernames createdAt indexes auto-build
  // at startup (db.js) alongside their siblings. Admin-only + low-frequency, so
  // this is future-proofing, not a hot-path fix.
  {
    collection: 'recipes',
    key: { createdAt: -1 },
    name: 'createdAt_-1',
    why: 'admin analytics recipesOverTime (createdAt range bucketing)',
  },
]

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set (looked in server/.env).')
    process.exit(1)
  }

  // Mirror the production connection options from db.js.
  const client = new MongoClient(uri, {
    tls: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db('prepify')
    console.log('Connected to MongoDB (prepify). Building indexes...\n')

    for (const ix of INDEXES) {
      const start = Date.now()
      // Non-unique on purpose: a unique index could fail to build over legacy
      // data with duplicates (cf. the username_lower guard in db.js).
      const result = await db.collection(ix.collection).createIndex(ix.key, { name: ix.name })
      const ms = Date.now() - start
      console.log(`  ✓ ${ix.collection}.${result}  (${ms}ms)`)
      console.log(`      ${ix.why}`)
    }

    console.log('\nDone. All moderation indexes are in place.')
    process.exit(0)
  } catch (err) {
    console.error('\nIndex build failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

main()
