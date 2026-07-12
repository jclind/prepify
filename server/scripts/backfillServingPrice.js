/**
 * Backfill — recompute and correct the stored `servingPrice` on existing recipes.
 *
 * Why: `servingPrice` is computed once at create/edit time (client-side, via
 * src/util/calculateServingPrice.ts) and stored on the recipe doc. A bug in that
 * util (fixed in PR #152) divided the total cost by `numServings` TWICE and then
 * rounded up to the nearest whole dollar, so historical recipes carry wrong
 * values — typically a flat $1.00/serving regardless of real cost. New/edited
 * recipes already recompute with the corrected formula; this script fixes the
 * docs that haven't been touched since.
 *
 * The recompute uses server/util/calculateServingPrice.js — itself a hand-kept
 * mirror of src/util/calculateServingPrice.ts (the server can't import client
 * TS). That shared helper is also what V1 (server/routes/recipes.js) uses to
 * recompute `servingPrice` server-side on every create/edit, so this script and
 * the live routes can't drift apart:
 *   servingPrice = round( sum(ingredient.ingredientData.totalPriceUSACents) / servings )
 * counting only real ingredient rows (those with a `parsedIngredient`) and
 * skipping NaN prices.
 *
 * SAFE BY DEFAULT: this is a DRY RUN unless you pass --apply. The dry run reads
 * only — it counts what would change and prints a sample of before/after values
 * so you can eyeball them against a prod snapshot first.
 *
 * Idempotent: only recipes whose recomputed price DIFFERS from the stored value
 * are written, so a second --apply run is a no-op. Recipes with non-positive or
 * missing `servings` are skipped (the util returns 0 for those — we don't clobber
 * an existing value over a bad divisor) and listed as anomalies.
 *
 * Usage:
 *   node server/scripts/backfillServingPrice.js            # dry run (default)
 *   node server/scripts/backfillServingPrice.js --apply    # actually write
 *
 * Reads MONGO_URI from server/.env. Exit code 0 = success, 1 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')
const { calculateServingPrice } = require('../util/calculateServingPrice')

const APPLY = process.argv.includes('--apply')
const SAMPLE_LIMIT = 25 // how many before/after rows to print

const fmt = (cents) =>
  cents == null || Number.isNaN(Number(cents))
    ? String(cents)
    : `$${(Number(cents) / 100).toFixed(2)}`

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set (looked in server/.env).')
    process.exit(1)
  }

  const client = new MongoClient(uri, {
    tls: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db('prepify')
    console.log(
      `Connected to MongoDB (prepify). Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (read-only)'}\n`
    )

    const col = db.collection('recipes')

    let scanned = 0
    let changed = 0 // recompute differs from stored → (would) update
    let unchanged = 0 // already correct
    let written = 0 // actually updated (APPLY only)
    const anomalies = [] // { id, title, servings } — bad/missing servings, skipped
    const samples = [] // { id, title, servings, before, after }

    const cursor = col.find(
      {},
      { projection: { ingredients: 1, servings: 1, servingPrice: 1, title: 1 } }
    )

    for await (const doc of cursor) {
      scanned++
      const servings = Number(doc.servings)

      if (!Number.isFinite(servings) || servings <= 0) {
        anomalies.push({ id: String(doc._id), title: doc.title, servings: doc.servings })
        continue
      }

      const before = doc.servingPrice
      const after = calculateServingPrice(doc.ingredients, servings)

      if (Number(before) === after) {
        unchanged++
        continue
      }

      changed++
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({ id: String(doc._id), title: doc.title, servings, before, after })
      }

      if (APPLY) {
        await col.updateOne({ _id: doc._id }, { $set: { servingPrice: after } })
        written++
      }
    }

    console.log('Sample of recipes that ' + (APPLY ? 'were' : 'would be') + ' corrected')
    console.log('─'.repeat(60))
    if (samples.length === 0) {
      console.log('  (none — every recipe already has the correct servingPrice)')
    } else {
      for (const s of samples) {
        console.log(
          `  ${s.id}  "${s.title ?? '(untitled)'}"  servings=${s.servings}\n` +
            `      ${fmt(s.before)}/serving  →  ${fmt(s.after)}/serving`
        )
      }
      if (changed > samples.length) {
        console.log(`  …and ${changed - samples.length} more not shown.`)
      }
    }

    console.log('\nSummary')
    console.log('───────')
    console.log(`  scanned:    ${scanned} recipe(s)`)
    console.log(`  ${APPLY ? 'updated' : 'would update'}: ${APPLY ? written : changed}`)
    console.log(`  unchanged:  ${unchanged} (already correct)`)
    console.log(`  skipped:    ${anomalies.length} (servings missing or <= 0 — left untouched)`)
    if (anomalies.length) {
      console.log('    Anomalies (need a manual look — divisor is invalid):')
      for (const a of anomalies) {
        console.log(`      - ${a.id} "${a.title ?? '(untitled)'}" servings=${JSON.stringify(a.servings)}`)
      }
    }

    if (!APPLY) {
      console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.')
    } else {
      console.log('\nDone. Backfill applied.')
    }
    process.exit(0)
  } catch (err) {
    console.error('\nBackfill failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

main()
