/**
 * W1 — Phase 5-D one-off recipe `_id` migration: legacy string → native ObjectId.
 *
 * Recipes created before the Phase-5 refactor store `_id` as a plain STRING;
 * everything since stores a native BSON ObjectId. Reads/writes already work for
 * both shapes through the util/recipeIdQuery.js compatibility shim ($or over both
 * forms), so this migration is about retiring that duality, not fixing a bug.
 * `checkMigrationState.js` counts the docs still pending it (8 on prod + dev as
 * of 2026-07-09).
 *
 * HOW: every legacy `_id` in prod/dev is a genuine 24-char hex string (verified
 * 2026-07-09 — all 8 round-trip `String(new ObjectId(id)) === id`), so each doc
 * is re-inserted under `new ObjectId(sameHex)` and the string doc deleted, both
 * inside one multi-document transaction (prod Atlas is a replica set). Because
 * the hex is PRESERVED, the recipe's string form — `String(_id)` — is byte-for-
 * byte unchanged, and every foreign reference keeps resolving with NO repointing:
 * `ratings.recipeId`, `reports.recipeId`, and the `userRecipeData` lists
 * (`userRecipes`/`savedRecipes`/`madeRecipes`) all store the STRING id for every
 * recipe — including post-migration ObjectId recipes — and every lookup path goes
 * through the string id (route params) + `recipeIdQuery()`. The per-recipe ref
 * counts printed below are therefore INFORMATIONAL (visibility for the operator),
 * not a write surface. This supersedes the BACKLOG sketch of "insert under a
 * fresh ObjectId + repoint every ref" — a fresh id would force exactly that
 * repointing; preserving the hex makes it unnecessary.
 *
 * A legacy `_id` that is NOT 24-char hex, or whose ObjectId form already exists
 * as another doc (neither occurs in prod/dev today), is REPORTED AND SKIPPED —
 * migrating those safely would require the fresh-id + repoint machinery, which
 * is deliberately not built for data that doesn't exist. The exit code flags
 * them so a cutover gate can't miss it.
 *
 * SAFE BY DEFAULT: DRY RUN unless you pass --apply. The dry run reads only — it
 * lists each legacy doc, whether it converts cleanly, and its ref counts.
 *
 * IDEMPOTENT: converted docs no longer match `{ _id: { $type: 'string' } }`, so
 * a second --apply run finds nothing to do.
 *
 * AFTERWARDS: re-run `checkMigrationState.js` (the legacy-string-_id check goes
 * to 0). The recipeIdQuery shim's string branch is then a no-op; actually
 * removing the shim is a separate code change once PROD has been migrated.
 *
 * Usage:
 *   node server/scripts/migrateLegacyRecipeIds.js                 # dry run (default)
 *   node server/scripts/migrateLegacyRecipeIds.js --apply         # actually migrate
 *   node server/scripts/migrateLegacyRecipeIds.js --apply --id=<recipeId>
 *                                                  # target one doc — for a cautious first run
 *
 * Reads MONGO_URI from server/.env (override the DB with DB_NAME, default
 * "prepify"). Exit code 0 = success (nothing pending afterwards), 2 = docs
 * remain that need attention (dry run with candidates, or skipped docs),
 * 1 = error.
 */
const path = require('path')
const { MongoClient, ObjectId } = require('mongodb')

// Same round-trip check as util/recipeIdQuery.js `isObjectIdHex`: ObjectId.isValid
// alone is permissive (any 12-byte string passes), so pin to genuine 24-char hex.
function isLegacyHexObjectId(id) {
  return (
    typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id
  )
}

// The string-id reference sites, counted per recipe for the operator's benefit.
// NONE of these are modified — the hex-preserving convert keeps `String(_id)`
// identical, so string refs resolve before and after. Any collection not listed
// here that stores the string id (audit trails, drafts, …) keeps working for the
// same reason.
const REF_SITES = [
  { label: 'ratings', collection: 'ratings', filter: (id) => ({ recipeId: id }) },
  { label: 'reports', collection: 'reports', filter: (id) => ({ recipeId: id }) },
  {
    label: 'userRecipeData lists',
    collection: 'userRecipeData',
    filter: (id) => ({
      $or: [
        { 'userRecipes.recipeId': id },
        { 'savedRecipes.recipeId': id },
        { 'madeRecipes.recipeId': id },
      ],
    }),
  },
]

// Classify every legacy string-_id recipe:
//   { action: 'convert' }         → clean hex, no collision — migratable
//   { action: 'skip-non-hex' }    → string _id that isn't 24-char hex
//   { action: 'skip-collision' }  → ObjectId(hex) already exists as its own doc
// plus informational per-recipe ref counts.
async function planLegacyIdMigration(db, { onlyId = null } = {}) {
  const filter = { _id: { $type: 'string' } }
  // --id targets one doc; the $type guard stays, so passing an already-migrated
  // (ObjectId) recipe's id simply plans nothing rather than re-migrating.
  if (onlyId) filter._id = { $type: 'string', $eq: onlyId }
  const legacy = await db
    .collection('recipes')
    .find(filter)
    .project({ _id: 1, title: 1 })
    .toArray()

  const plan = []
  for (const doc of legacy) {
    const id = doc._id
    let action = 'convert'
    if (!isLegacyHexObjectId(id)) {
      action = 'skip-non-hex'
    } else if (
      await db
        .collection('recipes')
        .findOne({ _id: new ObjectId(id) }, { projection: { _id: 1 } })
    ) {
      action = 'skip-collision'
    }

    const refs = {}
    for (const site of REF_SITES) {
      refs[site.label] = await db
        .collection(site.collection)
        .countDocuments(site.filter(id))
    }
    plan.push({ id, title: doc.title, action, refs })
  }
  return plan
}

// Re-insert one legacy doc under ObjectId(sameHex) and delete the string doc,
// atomically. withTransaction retries on transient conflicts, and the findOne
// runs INSIDE the transaction so a write landing just before it is still copied.
async function convertRecipeId(client, db, id) {
  const session = client.startSession()
  try {
    await session.withTransaction(async () => {
      const doc = await db.collection('recipes').findOne({ _id: id }, { session })
      if (!doc) throw new Error(`recipe ${id} disappeared mid-run`)
      await db
        .collection('recipes')
        .insertOne({ ...doc, _id: new ObjectId(id) }, { session })
      await db.collection('recipes').deleteOne({ _id: id }, { session })
    })
  } finally {
    await session.endSession()
  }
}

// The whole run, separated from process/env wiring so tests can drive it
// against the in-memory replica set. Returns the plan + counts; `log` receives
// the per-recipe lines.
async function migrateLegacyRecipeIds(
  client,
  db,
  { apply = false, onlyId = null, log = () => {} } = {}
) {
  const plan = await planLegacyIdMigration(db, { onlyId })
  const counts = {
    legacy: plan.length,
    converted: 0,
    skippedNonHex: 0,
    skippedCollision: 0,
  }

  for (const entry of plan) {
    const refs = Object.entries(entry.refs)
      .map(([label, n]) => `${label} ${n}`)
      .join(', ')
    if (entry.action === 'skip-non-hex') {
      counts.skippedNonHex++
      log(`  SKIP   ${JSON.stringify(entry.id)}: not a 24-char hex string — needs the fresh-id + repoint path (refs: ${refs})`)
      continue
    }
    if (entry.action === 'skip-collision') {
      counts.skippedCollision++
      log(`  SKIP   ${entry.id}: ObjectId form already exists as another doc — resolve manually (refs: ${refs})`)
      continue
    }
    if (apply) {
      await convertRecipeId(client, db, entry.id)
      counts.converted++
      log(`  moved  ${entry.id} → ObjectId (refs untouched: ${refs}) — "${entry.title}"`)
    } else {
      counts.converted++
      log(`  would  ${entry.id} → ObjectId (refs untouched: ${refs}) — "${entry.title}"`)
    }
  }
  return { plan, counts }
}

async function main() {
  const APPLY = process.argv.includes('--apply')
  const idArg = process.argv.find((a) => a.startsWith('--id='))
  const ONLY_ID = idArg ? idArg.slice('--id='.length) : null
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
      `Connected to MongoDB (${dbName}). Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (read-only)'}` +
        `${ONLY_ID ? ` — only recipe ${ONLY_ID}` : ''}\n`
    )

    const { counts } = await migrateLegacyRecipeIds(client, db, {
      apply: APPLY,
      onlyId: ONLY_ID,
      log: console.log,
    })

    // Post-run verification: the pending-count the cutover gate
    // (checkMigrationState.js) will see. Always catalog-wide, even under --id,
    // so a targeted run still reports how much is left overall.
    const remaining = await db
      .collection('recipes')
      .countDocuments({ _id: { $type: 'string' } })

    console.log('\nSummary')
    console.log('───────')
    const row = (label, val) => console.log(`  ${(label + ':').padEnd(26)}${val}`)
    row('legacy string-_id docs', counts.legacy)
    row(APPLY ? 'converted' : 'would convert', counts.converted)
    if (counts.skippedNonHex) row('skipped (non-hex _id)', counts.skippedNonHex)
    if (counts.skippedCollision) row('skipped (id collision)', counts.skippedCollision)
    row('string _ids remaining', remaining)

    if (!APPLY) {
      console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.')
    } else if (remaining === 0) {
      console.log('\nDone. Re-run checkMigrationState.js — the legacy-_id check should now be 0.')
    } else if (counts.skippedNonHex || counts.skippedCollision) {
      console.log('\nDone, but docs were SKIPPED (see lines above) — resolve them before retiring the shim.')
    } else {
      console.log('\nDone. Other legacy docs remain (targeted run) — re-run without --id for the rest.')
    }
    // 0 only when nothing is left pending, so this can gate a cutover step the
    // same way checkMigrationState.js does (dry runs with candidates exit 2).
    process.exit(remaining === 0 ? 0 : 2)
  } catch (err) {
    console.error('\nMigration failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

// Export for unit tests; only load env + run when invoked directly
// (`node scripts/migrateLegacyRecipeIds.js`), so a test require doesn't pull
// real server/.env creds into its process.
module.exports = { isLegacyHexObjectId, planLegacyIdMigration, migrateLegacyRecipeIds }
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
  main()
}
