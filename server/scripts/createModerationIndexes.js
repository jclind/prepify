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
    why: 'admin user list review tally (still keyed by reportedUsername)',
  },
  // D1: ratings now identify their author by the stable `userId`. This compound
  // serves both the (userId, recipeId) point lookup/upsert used by every review
  // write AND the userId-prefix scans (getSingleUserReviews, account counts,
  // exportMyData, the delete-account cascade).
  //
  // Also provisioned at server boot (db.js ensureIndexes) with an IDENTICAL spec —
  // same key, name, and options — so a fresh deploy's write path never runs
  // against an unindexed ratings collection before this script does. This copy is
  // kept because it's idempotent and the release runbook §2e runs it against prod
  // as an explicit gate; the two identical createIndex calls are a no-op for each
  // other (a same-name-but-different-options call would throw, hence "identical").
  //
  // UNIQUE — enforces the "one rating per (user, recipe)" invariant the upserts
  // rely on. Without it, a legacy doc missing `userId` (pre-backfill) or a
  // concurrent double-submit would slip a SECOND row past the upsert filter and
  // silently double-count the author in the recipe aggregate. PARTIAL on
  // `userId: { $exists: true }` so it (a) ignores not-yet-backfilled legacy docs
  // instead of failing to build over them, and (b) still serves every read,
  // which always predicates on an existing `userId`. Run the backfill first so
  // the docs that should be unique actually carry the field.
  {
    collection: 'ratings',
    key: { userId: 1, recipeId: 1 },
    name: 'userId_1_recipeId_1',
    options: {
      unique: true,
      partialFilterExpression: { userId: { $exists: true } },
    },
    why: 'D1 review writes/reads + account-counts/export/cascade keyed on userId (unique: one rating per user+recipe)',
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

    let failures = 0
    for (const ix of INDEXES) {
      const start = Date.now()
      try {
        const result = await db
          .collection(ix.collection)
          .createIndex(ix.key, { name: ix.name, ...ix.options })
        const ms = Date.now() - start
        console.log(`  ✓ ${ix.collection}.${result}  (${ms}ms)`)
        console.log(`      ${ix.why}`)
      } catch (err) {
        // A unique index can fail to build over legacy data that still holds
        // duplicates (cf. the username_lower guard in db.js). Don't abort the
        // whole run for one collision — report it loudly so the operator can
        // dedup (and re-run the backfill) then re-run, while the rest build.
        failures++
        console.error(`  ✗ ${ix.collection}.${ix.name} FAILED: ${err.message}`)
        if (err.code === 11000 || /duplicate key/i.test(err.message)) {
          console.error(
            `      Duplicate (${Object.keys(ix.key).join(',')}) rows exist — ` +
              'dedup them (run backfillRatingUserIds.js first), then re-run.'
          )
        }
      }
    }

    if (failures) {
      console.error(`\n${failures} index(es) failed to build. See errors above.`)
      process.exit(1)
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
