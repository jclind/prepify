/**
 * V5 — one-off `ratings` field-type normalization (filed 2026-07-09, out of §D).
 *
 * Legacy `ratings` docs (pre-#266) store their star `rating` as a STRINGIFIED
 * number ("5") and `reviewCreatedAt` as a stringified epoch-ms ("1677605819601"),
 * while post-#266 writes store a real double `rating`; review-only docs carry
 * `rating: null`. The client normalizes at the API boundary (`coerceRating` in
 * src/api/recipes.ts) so RENDERING is correct, but the server's "Top" review sort
 * is a raw `{ rating: -1 }` (server/routes/reviews.js) over the mixed-type field,
 * and MongoDB orders by BSON TYPE first — so every string rating sorts as a block
 * above (or below) the numeric ones instead of interleaving by value. User-visible
 * since #271 exposed "Top" as a sort pill.
 *
 * This script rewrites, in place, each legacy doc's string `rating` → double and
 * string `reviewCreatedAt` → numeric epoch-ms, so the whole collection is single-
 * typed and `{ rating: -1 }` sorts by value. It does NOT touch the server sort or
 * the client `coerceRating` — retiring that coercion is a deliberate FOLLOW-UP,
 * done only after this has run against prod.
 *
 * Per-field rules (a doc is classified field-by-field; the two are independent):
 *   rating:
 *     - null                     → left as-is (review-only doc; NOT coerced to 0)
 *     - already a finite double  → no-op (never rewritten)
 *     - numeric string "5"/"4.5" → rewritten to the double
 *     - non-numeric / empty ""   → GARBAGE: reported, NOT written (never a NaN)
 *   reviewCreatedAt:
 *     - absent                   → left absent (nothing to normalize)
 *     - "" (rating-first doc)    → left as-is ("no review yet"; NOT coerced to 0)
 *     - already a finite number  → no-op
 *     - numeric string           → rewritten to the number
 *     - non-numeric string       → GARBAGE: reported, NOT written
 *
 * SAFE BY DEFAULT: DRY RUN unless you pass --apply. The dry run reads only — it
 * lists every doc it WOULD rewrite and every garbage value it can't.
 *
 * IDEMPOTENT: converted docs are single-typed, so they no longer match the
 * string-typed rescan — a second --apply run finds nothing to do. Garbage docs
 * stay string-typed on purpose (they need manual attention), so they keep the
 * exit code non-zero until resolved — this doubles as a cutover check.
 *
 * Usage:
 *   node server/scripts/normalizeRatingTypes.js            # dry run (default)
 *   node server/scripts/normalizeRatingTypes.js --apply    # actually write
 *
 * Reads MONGO_URI from server/.env (override the DB with DB_NAME, default
 * "prepify"). Exit code 0 = success, nothing pending afterwards; 2 = docs remain
 * that need attention (a dry run with candidates, or garbage that can't be
 * auto-fixed); 1 = error.
 */
const path = require('path')
const { MongoClient } = require('mongodb')

// Cap the per-doc lines so a pathological run can't flood the terminal; the
// summary counts are always exact and the cap is announced (no silent trim).
const MAX_LISTED = 100

// Docs the post-run rescan still considers "needs attention": a string `rating`,
// or a non-empty string `reviewCreatedAt`. After a clean --apply this matches
// only GARBAGE (non-convertible strings) — convertible ones have become numbers,
// and review-only nulls / empty-string createdAt were never string-typed here.
// It can't drive the scan cursor itself (a numeric string and a garbage string
// share the BSON string type, so classification below decides per doc); this
// query is only for the post-run remaining-count / exit gate.
const PENDING_QUERY = {
  $or: [
    { rating: { $type: 'string' } },
    { reviewCreatedAt: { $type: 'string', $ne: '' } },
  ],
}

// Parse a value that should be numeric. Returns a finite Number, or null if the
// value can't be a real number (non-numeric string, empty string, NaN). Mirrors
// the intent of the client's coerceRating but is stricter: empty string is not a
// number here, and we never emit a non-finite value.
function toFiniteNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Classify ONE ratings doc. Returns:
//   { set }      — the fields to $set (may be empty → nothing to write)
//   { garbage }  — [{ field, value }] values that should be numeric but aren't
//                  parseable, so they're reported and left untouched.
// Pure and side-effect-free so tests can drive it directly.
function classifyRatingDoc(doc) {
  const set = {}
  const garbage = []

  // --- rating ---
  const r = doc.rating
  if (r === null || r === undefined) {
    // review-only (or absent): leave as null — never coerce to 0.
  } else if (typeof r === 'number') {
    if (!Number.isFinite(r)) garbage.push({ field: 'rating', value: r })
    // finite number → already normalized, no-op.
  } else {
    // string (legacy) or some unexpected type.
    const n = toFiniteNumber(r)
    if (n === null) garbage.push({ field: 'rating', value: r })
    else set.rating = n
  }

  // --- reviewCreatedAt ---
  // Only consider the field when the doc actually carries it; an absent field is
  // nothing to normalize (and must not be created here).
  if (Object.prototype.hasOwnProperty.call(doc, 'reviewCreatedAt')) {
    const t = doc.reviewCreatedAt
    if (t === '' || t === null || t === undefined) {
      // "" = rating-first doc with no review yet; leave it (not a 0 timestamp).
    } else if (typeof t === 'number') {
      if (!Number.isFinite(t)) garbage.push({ field: 'reviewCreatedAt', value: t })
      // finite number → already normalized, no-op.
    } else {
      const n = toFiniteNumber(t)
      if (n === null) garbage.push({ field: 'reviewCreatedAt', value: t })
      else set.reviewCreatedAt = n
    }
  }

  return { set, garbage }
}

// The whole run, separated from process/env wiring so tests can drive it against
// the in-memory Mongo. Streams every ratings doc, classifies it, and (under
// --apply) rewrites the mistyped fields with a single per-doc $set. Returns the
// counts; `log` receives the per-doc lines.
async function normalizeRatingTypes(db, { apply = false, log = () => {} } = {}) {
  const counts = {
    scanned: 0,
    inSync: 0, // no change needed (already numeric, null, absent, or "")
    migrated: 0, // docs that got (or would get) at least one field rewritten
    ratingFixed: 0, // string→double rating conversions
    createdAtFixed: 0, // string→number reviewCreatedAt conversions
    nullRating: 0, // review-only docs left null (informational)
    garbageDocs: 0, // docs with at least one non-parseable field (skipped)
  }
  let listed = 0

  const cursor = db
    .collection('ratings')
    .find({}, { projection: { rating: 1, reviewCreatedAt: 1, recipeId: 1, userId: 1 } })

  for await (const doc of cursor) {
    counts.scanned++
    if (doc.rating === null || doc.rating === undefined) counts.nullRating++

    const { set, garbage } = classifyRatingDoc(doc)
    const hasWrite = Object.keys(set).length > 0

    if (garbage.length > 0) {
      counts.garbageDocs++
      if (listed < MAX_LISTED) {
        listed++
        const parts = garbage
          .map((g) => `${g.field}=${JSON.stringify(g.value)}`)
          .join(', ')
        log(`  GARBAGE ${doc._id}: non-numeric ${parts} — left untouched, needs manual review`)
      } else if (listed === MAX_LISTED) {
        listed++
        log('  … (further per-doc lines suppressed; see summary counts)')
      }
    }

    if (!hasWrite) {
      if (garbage.length === 0) counts.inSync++
      continue
    }

    counts.migrated++
    if (set.rating !== undefined) counts.ratingFixed++
    if (set.reviewCreatedAt !== undefined) counts.createdAtFixed++

    if (listed < MAX_LISTED) {
      listed++
      const parts = Object.entries(set)
        .map(([k, v]) => `${k}→${v} (double)`)
        .join(', ')
      log(`  ${apply ? 'wrote ' : 'would '} ${doc._id}: ${parts}`)
    } else if (listed === MAX_LISTED) {
      listed++
      log('  … (further per-doc lines suppressed; see summary counts)')
    }

    if (apply) {
      await db.collection('ratings').updateOne({ _id: doc._id }, { $set: set })
    }
  }

  return { counts }
}

async function main() {
  const APPLY = process.argv.includes('--apply')
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

    const { counts } = await normalizeRatingTypes(db, { apply: APPLY, log: console.log })

    // Post-run rescan: docs the collection still holds as string-typed (a numeric
    // string not yet converted, or a garbage string). After a clean --apply this
    // is only the garbage docs. In a dry run it's every convertible candidate too.
    const remaining = await db.collection('ratings').countDocuments(PENDING_QUERY)

    console.log('\nSummary')
    console.log('───────')
    const row = (label, val) => console.log(`  ${(label + ':').padEnd(28)}${val}`)
    row('ratings scanned', counts.scanned)
    row('already in sync', counts.inSync)
    row('review-only (rating null)', counts.nullRating)
    row(APPLY ? 'docs rewritten' : 'docs would rewrite', counts.migrated)
    row('  rating string→double', counts.ratingFixed)
    row('  reviewCreatedAt string→num', counts.createdAtFixed)
    if (counts.garbageDocs) row('GARBAGE (skipped)', counts.garbageDocs)
    row('string-typed docs remaining', remaining)

    if (!APPLY) {
      console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.')
    } else if (remaining === 0) {
      console.log('\nDone. `ratings` is single-typed — the Top sort now orders by value.')
    } else {
      console.log(
        '\nDone, but string-typed docs remain (see GARBAGE lines above) — resolve them manually.'
      )
    }
    // 0 only when nothing is left string-typed, so this can gate a cutover step
    // the same way the other ops scripts do (dry runs with candidates exit 2).
    process.exit(remaining === 0 ? 0 : 2)
  } catch (err) {
    console.error('\nNormalization failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

// Export for unit tests; only load env + run when invoked directly, so a test
// require doesn't pull real server/.env creds into its process.
module.exports = { classifyRatingDoc, normalizeRatingTypes, toFiniteNumber, PENDING_QUERY }
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
  main()
}
