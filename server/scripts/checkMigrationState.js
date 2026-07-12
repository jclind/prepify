/**
 * S6 — post-6-phase-refactor DB check (READ-ONLY).
 *
 * The Phase-5 data refactor and its sibling backfills each moved existing
 * records to a new shape. This script confirms that no record is still stranded
 * in the OLD shape — i.e. every one-time migration/backfill has fully run — so a
 * "post-refactor DB check" leaves proof in-repo instead of being a memory of a
 * manual mongosh session.
 *
 * It performs NO writes — only countDocuments() per known migration. Each check
 * is a "records still pending this migration" query; a healthy database returns
 * 0 for all of them.
 *
 * Checks (each maps to a shipped migration/backfill):
 *   - recipes with a legacy string `_id`      → Phase 5-D _id string→ObjectId
 *                                                (util/recipeIdQuery.js)
 *   - ratings missing `userId`                → backfillRatingUserIds.js
 *   - review reports missing `reportedUid`    → backfillRatingUserIds.js (reports half)
 *   - recipes missing the `rating` aggregate  → reconcileRatingAggregates.js --apply
 *
 * This is a REPORT, not a fixer — it names the script to run for anything it
 * finds pending. Run it before a prod cutover; re-run after applying the named
 * backfills until every count is 0.
 *
 * Usage:
 *   node server/scripts/checkMigrationState.js
 *
 * Reads MONGO_URI from server/.env (override the DB with DB_NAME, default
 * "prepify"). Exit code 0 = all migrations complete, 2 = records pending,
 * 1 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')

// Each check: a human label, the collection, the "still in the old shape" filter,
// and the script an operator runs to clear it. Keep filters as "match what is
// still pending" (not "match what is migrated") so a healthy DB scores 0.
const CHECKS = [
  {
    label: 'recipes with a legacy string _id (want native ObjectId)',
    collection: 'recipes',
    filter: { _id: { $type: 'string' } },
    fix: 'Phase 5-D _id migration (string→ObjectId); see util/recipeIdQuery.js',
  },
  {
    label: 'ratings docs missing a stable userId',
    collection: 'ratings',
    filter: { userId: { $exists: false } },
    fix: 'node server/scripts/backfillRatingUserIds.js --apply',
  },
  {
    label: 'review reports missing a stable reportedUid',
    collection: 'reports',
    filter: { targetType: 'review', reportedUid: { $exists: false } },
    fix: 'node server/scripts/backfillRatingUserIds.js --apply',
  },
  {
    label: 'recipes missing the rating aggregate field',
    collection: 'recipes',
    filter: { rating: { $exists: false } },
    fix: 'node server/scripts/reconcileRatingAggregates.js --apply',
  },
]

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set (looked in server/.env).')
    process.exit(1)
  }
  const dbName = process.env.DB_NAME || 'prepify'

  const client = new MongoClient(uri, {
    tls: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db(dbName)
    console.log(`Connected to MongoDB (${dbName}). Post-refactor migration check (READ-ONLY).\n`)

    const results = []
    for (const check of CHECKS) {
      const pending = await db.collection(check.collection).countDocuments(check.filter)
      results.push({ ...check, pending })
    }

    const nameW = Math.max(...results.map((r) => r.label.length))
    for (const r of results) {
      const mark = r.pending === 0 ? '✓' : '✗'
      console.log(`  ${mark} ${r.label.padEnd(nameW)}  ${String(r.pending).padStart(6)} pending`)
      if (r.pending > 0) console.log(`      → fix: ${r.fix}`)
    }

    const stillPending = results.filter((r) => r.pending > 0)
    console.log('\nSummary')
    console.log('───────')
    if (stillPending.length === 0) {
      console.log('  All known migrations complete — no records need updating.')
      process.exit(0)
    } else {
      console.log(
        `  ${stillPending.length} migration(s) have pending records; run the fix(es) above and re-check.`
      )
      process.exit(2)
    }
  } catch (err) {
    console.error('\nMigration check failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

main()
