/**
 * D1 backfill — stamp a STABLE userId onto the documents that historically
 * identified their author only by a mutable `username`:
 *   - `ratings`  → add `userId`        (from username        → usernames._id)
 *   - `reports`  → add `reportedUid`   (from reportedUsername → usernames._id,
 *                  review reports only; recipe reports have no reported user)
 *
 * Why: a username is renameable, so keying reviews/reports on it risks detaching
 * a user from their own data on every rename and makes the delete-account cascade
 * fragile (it has to resolve the username first). After this backfill the server
 * keys these collections on the immutable Firebase uid; `username` /
 * `reportedUsername` remain only as denormalized DISPLAY fields.
 *
 * The map is username_lower → _id, matching the case-insensitive lookup the app
 * uses everywhere (usernames.username_lower is the unique key).
 *
 * SAFE BY DEFAULT: this is a DRY RUN unless you pass --apply. The dry run reads
 * only — it counts what would change and lists any rows whose username has no
 * matching `usernames` doc (orphans that CANNOT be backfilled and want a look
 * before/after). Verify the dry-run output against a prod snapshot first, then
 * re-run with --apply.
 *
 * Idempotent: only documents still MISSING the target field are touched, so a
 * second --apply run is a no-op. Run it at deploy time, before the server starts
 * relying on userId for reads/writes (new writes already stamp userId, so the
 * window where a legacy username-only doc could be double-written is the gap
 * between deploy and this run — keep it short).
 *
 * Usage:
 *   node server/scripts/backfillRatingUserIds.js            # dry run (default)
 *   node server/scripts/backfillRatingUserIds.js --apply    # actually write
 *
 * Reads MONGO_URI from server/.env. Exit code 0 = success, 1 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')

const APPLY = process.argv.includes('--apply')

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

    // username_lower → _id (uid). Built once; used for both collections.
    const usernameToUid = new Map()
    await db
      .collection('usernames')
      .find({}, { projection: { username_lower: 1 } })
      .forEach((doc) => {
        if (typeof doc.username_lower === 'string') {
          usernameToUid.set(doc.username_lower, doc._id)
        }
      })
    console.log(`usernames map: ${usernameToUid.size} entries\n`)

    const ratings = await backfill(db, {
      collection: 'ratings',
      targetField: 'userId',
      sourceField: 'username',
      usernameToUid,
    })
    const reports = await backfill(db, {
      collection: 'reports',
      targetField: 'reportedUid',
      sourceField: 'reportedUsername',
      usernameToUid,
      // Recipe reports carry no reported user — only review reports have a
      // reportedUsername to resolve.
      extraFilter: { targetType: 'review' },
    })

    console.log('\nSummary')
    console.log('───────')
    report('ratings', ratings)
    report('reports (review)', reports)

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

// Walks every doc in `collection` that is missing `targetField`, resolves the
// uid from `sourceField` via the map, and (when --apply) stamps it. Returns
// counts plus the distinct unresolved source values (orphans).
async function backfill(db, { collection, targetField, sourceField, usernameToUid, extraFilter = {} }) {
  const col = db.collection(collection)
  const filter = { ...extraFilter, [targetField]: { $exists: false } }

  let scanned = 0
  let updated = 0
  const orphans = new Map() // sourceValue → count

  const cursor = col.find(filter, { projection: { [sourceField]: 1 } })
  for await (const doc of cursor) {
    scanned++
    const raw = doc[sourceField]
    const uid =
      typeof raw === 'string' ? usernameToUid.get(raw.toLowerCase()) : undefined
    if (uid === undefined) {
      orphans.set(raw, (orphans.get(raw) || 0) + 1)
      continue
    }
    if (APPLY) {
      await col.updateOne({ _id: doc._id }, { $set: { [targetField]: uid } })
    }
    updated++
  }

  return { scanned, updated, orphans }
}

function report(label, { scanned, updated, orphans }) {
  console.log(
    `  ${label}: scanned ${scanned} missing-field doc(s), ${APPLY ? 'updated' : 'would update'} ${updated}, ${orphans.size} unresolved handle(s)`
  )
  if (orphans.size) {
    console.log('    Unresolved (no matching usernames doc — left untouched):')
    for (const [name, count] of orphans) {
      console.log(`      - ${JSON.stringify(name)} x${count}`)
    }
  }
}

main()
