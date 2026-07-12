/**
 * S6 — one-off catalog-wide rating-aggregate reconciliation.
 *
 * Each recipe carries a denormalized `rating: { rateCount, rateValue, breakdown }`
 * that the server recomputes (util/recipeRating.js `recomputeRecipeRating`) on
 * every rating add/edit/delete and on every moderation hide/restore. The
 * denormalized value can nonetheless DRIFT from the source-of-truth `ratings` docs:
 *   - recipes rated before the per-star `breakdown` field shipped (§D) — running
 *     this with --apply is the one-off backfill that populates it everywhere,
 *   - legacy / pre-recompute data written before the recompute-on-every-change
 *     rule shipped (PR #150),
 *   - a past silent best-effort recompute failure (the deleteAccount path was
 *     only hardened to retry+surface in S2 / PR #229),
 *   - any recipe nobody has re-rated since, so the drift never self-heals.
 *
 * This script loops EVERY recipe, computes the true aggregate from its visible
 * `ratings` docs via the same `computeRecipeRating` the server uses (so the
 * math — REVIEW_VISIBLE exclusion, numeric-only averaging — cannot drift from
 * production), and compares it to the stored value. Under --apply it heals each
 * drifted recipe through the canonical `recomputeRecipeRating` (a fresh recompute
 * + write, so a rating landing mid-run is still reflected).
 *
 * SAFE BY DEFAULT: this is a DRY RUN unless you pass --apply. The dry run reads
 * only — it reports every drifted / missing aggregate and what it WOULD write.
 * Verify the dry-run output first, then re-run with --apply.
 *
 * Idempotent: it writes only recipes whose stored aggregate disagrees with the
 * recomputed one, so a second --apply run over an already-reconciled catalog is
 * a no-op (0 corrected).
 *
 * Usage:
 *   node server/scripts/reconcileRatingAggregates.js            # dry run (default)
 *   node server/scripts/reconcileRatingAggregates.js --apply    # actually write
 *
 * Reads MONGO_URI from server/.env (override the DB with DB_NAME, default
 * "prepify"). Exit code 0 = success, 1 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')
const {
  computeRecipeRating,
  recomputeRecipeRating,
} = require('../util/recipeRating')

const APPLY = process.argv.includes('--apply')

// rateValue is an average (a division), so compare with a tolerance rather than
// === — a stored 4.333333333333333 and a freshly recomputed one can differ in
// the last binary place without being a real drift. rateCount is an integer:
// exact. EPS well below any half-star boundary the UI renders.
const EPS = 1e-9

// Cap the per-recipe drift lines so a pathological run can't flood the terminal;
// the summary counts are always exact and the cap is announced (no silent trim).
const MAX_LISTED = 100

// The per-star histogram (§D) is part of the aggregate, so a recipe whose stored
// rateCount/rateValue are correct but which predates `breakdown` (or has a drifted
// one) must still be flagged and healed — this doubles as the breakdown backfill.
// A missing stored breakdown compares unequal to the recomputed five-bucket object,
// so it's correctly caught. Buckets are integers: exact comparison.
function breakdownEqual(a, b) {
  if (!a || !b) return false
  for (let s = 1; s <= 5; s++) {
    if ((Number(a[s]) || 0) !== (Number(b[s]) || 0)) return false
  }
  return true
}

function ratingsEqual(a, b) {
  return (
    a.rateCount === b.rateCount &&
    Math.abs(a.rateValue - b.rateValue) < EPS &&
    breakdownEqual(a.breakdown, b.breakdown)
  )
}

// The stored aggregate can be absent (legacy recipes predating the field),
// partial, or string-typed. Normalize to numbers so the comparison and the
// printout are well-defined; a missing/!finite field reads as NaN and will not
// equal any real recomputed value, so it is correctly flagged. `breakdown` is
// passed through as-is for breakdownEqual (which tolerates absent/partial).
function readStored(rating) {
  const rateCount = Number(rating && rating.rateCount)
  const rateValue = Number(rating && rating.rateValue)
  return {
    present: !!rating && rating.rateCount != null && rating.rateValue != null,
    rateCount,
    rateValue,
    breakdown: rating && rating.breakdown,
  }
}

function fmtBreakdown(breakdown) {
  if (!breakdown) return 'breakdown (absent)'
  return `breakdown [${[1, 2, 3, 4, 5].map((s) => Number(breakdown[s]) || 0).join('/')}]`
}

function fmt(agg) {
  if (agg.present === false) return '(absent)'
  const c = Number.isFinite(agg.rateCount) ? agg.rateCount : '?'
  const v = Number.isFinite(agg.rateValue) ? Number(agg.rateValue.toFixed(4)) : '?'
  return `{ rateCount: ${c}, rateValue: ${v}, ${fmtBreakdown(agg.breakdown)} }`
}

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
    console.log(
      `Connected to MongoDB (${dbName}). Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (read-only)'}\n`
    )

    let scanned = 0
    let inSync = 0
    let corrected = 0 // drifted (or absent) aggregates that were / would be written
    let missing = 0 // subset of corrected: recipes with no stored aggregate at all
    let listed = 0

    // Stream every recipe; we only need _id + the stored aggregate.
    const cursor = db.collection('recipes').find({}, { projection: { rating: 1 } })
    for await (const recipe of cursor) {
      scanned++
      // recipeId is the STRING form everywhere in the app (ratings.recipeId, the
      // route params). recipeIdQuery() maps it back to both ObjectId and legacy
      // string _id shapes, so String(_id) is the correct key for both.
      const recipeId = String(recipe._id)
      const expected = await computeRecipeRating(db, recipeId)
      const stored = readStored(recipe.rating)

      if (stored.present && ratingsEqual(stored, expected)) {
        inSync++
        continue
      }

      corrected++
      if (!stored.present) missing++

      if (listed < MAX_LISTED) {
        listed++
        console.log(
          `  drift  ${recipeId}: stored ${fmt(stored)} → ${APPLY ? 'wrote' : 'expected'} ${fmt({ ...expected, present: true })}`
        )
      } else if (listed === MAX_LISTED) {
        listed++
        console.log(`  … (further drifted recipes suppressed; see summary counts)`)
      }

      if (APPLY) {
        // Heal through the canonical writer — a fresh recompute + write, so a
        // rating that landed between our compute above and this write is still
        // captured.
        await recomputeRecipeRating(db, recipeId)
      }
    }

    console.log('\nSummary')
    console.log('───────')
    console.log(`  recipes scanned:       ${scanned}`)
    console.log(`  already in sync:       ${inSync}`)
    console.log(
      `  ${APPLY ? 'corrected' : 'would correct'}:  ${String(corrected).padStart(6)} (of which ${missing} had no stored aggregate)`
    )

    if (!APPLY) {
      console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.')
    } else {
      console.log('\nDone. Rating aggregates reconciled.')
    }
    process.exit(0)
  } catch (err) {
    console.error('\nReconciliation failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

main()
