/**
 * I2 — one-off recipe-image re-key: flat `recipeImages/{filename}` → owner-scoped
 * `recipeImages/{uid}/{uuid}`.
 *
 * I2 (PR #249) moved new uploads to `recipeImages/{uid}/{uuid}` and tightened
 * `storage.rules` to owner-scoped writes (`request.auth.uid == uid`), keeping the
 * old flat path READ-ONLY so pre-migration images keep rendering. This script is
 * the other half of the rollout (docs/IMAGE_PIPELINE.md § "Runbook — I2 uid re-key
 * rollout", step 2): it moves the already-uploaded flat objects under their owner's
 * uid prefix and repoints `recipes.recipeImage` at the new URL, so the catalog is
 * uid-scoped end to end and the legacy read rule can eventually be dropped.
 *
 * Per recipe whose `recipeImage` still decodes to a flat `recipeImages/{filename}`
 * object:
 *   1. Parse the bucket + object path from the stored URL (util/firebaseStorage.js
 *      `parseStorageUrl`). The catalog is MIXED-BUCKET (some URLs point at
 *      `prepify-9b974`, others at the dev/prod buckets), so we copy WITHIN the
 *      object's own bucket — never across buckets.
 *   2. Resolve the owner uid from `recipes.userId` (the field `addRecipe` stamps),
 *      falling back to `authorUsername` → `usernames` (keyed by `_id: uid`,
 *      matched on `username_lower`) for any legacy doc missing it.
 *   3. Copy the object to `recipeImages/{uid}/{uuid}` (a fresh uuid, extensionless
 *      — matching what the client now writes) via the Admin SDK (bypasses rules),
 *      ensure it carries a Firebase download token, and build the download URL.
 *   4. Repoint the recipe's `recipeImage` at the new URL.
 *
 * SAFE BY DEFAULT: DRY RUN unless you pass --apply. The dry run reads only — it
 * reports what it WOULD move and any recipe it can't (no owner uid, an
 * unreadable/foreign bucket, an already-migrated or non-Storage URL).
 *
 * NON-DESTRUCTIVE: the old flat object is LEFT IN PLACE (still public-read, so
 * anything not yet repointed keeps rendering) unless you pass --delete-old. So the
 * migration is reversible up to that point — the safe sequence is `--apply` first,
 * verify, then optionally a later purge sweep with --delete-old.
 *
 * IDEMPOTENT: recipes whose `recipeImage` already decodes to `recipeImages/{uid}/…`
 * are skipped, so a second --apply run over a migrated catalog is a no-op.
 *
 * AFTERWARDS: re-run the I1 resize backfill (docs/IMAGE_PIPELINE.md § "Backfill
 * existing images") so the MOVED originals get their `{uid}/`-directory variants;
 * any variants generated at the old flat path are now orphaned.
 *
 * Usage:
 *   node server/scripts/migrateRecipeImagesToUid.js                 # dry run (default)
 *   node server/scripts/migrateRecipeImagesToUid.js --apply         # copy + repoint
 *   node server/scripts/migrateRecipeImagesToUid.js --apply --delete-old
 *   node server/scripts/migrateRecipeImagesToUid.js --id=<recipeId> # target one recipe
 *   node server/scripts/migrateRecipeImagesToUid.js --limit=25      # cap the batch
 *
 * Reads MONGO_URI + FIREBASE_SERVICE_ACCOUNT from server/.env (override the DB with
 * DB_NAME, default "prepify"). Exit code 0 = success, 1 = error/bad usage.
 */
const path = require('path')
const crypto = require('crypto')
const { MongoClient, ObjectId } = require('mongodb')
const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getStorage } = require('firebase-admin/storage')
const { parseStorageUrl } = require('../util/firebaseStorage')

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const DELETE_OLD = argv.includes('--delete-old')
const getOpt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const ONLY_ID = getOpt('id') // migrate a single recipe (by _id string) — for a cautious first run
const LIMIT = getOpt('limit') ? Number(getOpt('limit')) : Infinity

// Cap the per-recipe log lines so a large catalog can't flood the terminal; the
// summary counts are always exact and the cap is announced (no silent trim).
const MAX_LISTED = 200

const FIREBASE_URL_BASE = 'https://firebasestorage.googleapis.com/v0/b'

// Classify a stored recipeImage URL by its object path so we know what to do.
//   { kind: 'flat',       bucket, path }  → recipeImages/{filename}  (migrate)
//   { kind: 'migrated' }                  → recipeImages/{uid}/{uuid} (skip, done)
//   { kind: 'not-storage' }               → empty / external / unparseable URL (skip)
//   { kind: 'unexpected', path }          → a recipeImages/* shape we don't recognise
function classifyImage(url) {
  const parsed = parseStorageUrl(url)
  if (!parsed) return { kind: 'not-storage' }
  const parts = parsed.path.split('/')
  if (parts[0] !== 'recipeImages') return { kind: 'unexpected', path: parsed.path }
  // ['recipeImages', filename]         → flat (2 parts)
  // ['recipeImages', uid, uuid]        → already uid-scoped (3 parts)
  if (parts.length === 2) return { kind: 'flat', bucket: parsed.bucket, path: parsed.path }
  if (parts.length >= 3) return { kind: 'migrated' }
  return { kind: 'unexpected', path: parsed.path }
}

// Resolve the owner uid for a recipe: the stamped `userId`, else the author's
// handle via the `usernames` collection (`_id` IS the uid). Returns null when
// neither resolves — such a recipe can't be owner-scoped and is left untouched.
async function resolveOwnerUid(db, recipe) {
  if (recipe.userId && typeof recipe.userId === 'string') return recipe.userId
  const handle = recipe.authorUsername
  if (!handle || typeof handle !== 'string') return null
  const doc = await db
    .collection('usernames')
    .findOne({ username_lower: handle.toLowerCase() }, { projection: { _id: 1 } })
  return doc ? String(doc._id) : null
}

// Build the Firebase download URL for an object, mirroring the tokened URL the
// client's getDownloadURL() produces so migrated + newly-uploaded recipes read
// identically. The path is percent-encoded whole (slashes → %2F), matching
// Firebase's `/o/<encoded>` form that parseStorageUrl round-trips.
function downloadUrl(bucket, objectPath, token) {
  return `${FIREBASE_URL_BASE}/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`
}

// Copy the flat object to the uid path within the SAME bucket, ensure it carries a
// download token (copy usually preserves the source's, but a token-less legacy
// object gets a fresh one), and return the new object's download URL.
async function moveObject(bucketName, oldPath, uid) {
  const bucket = getStorage().bucket(bucketName)
  const newPath = `recipeImages/${uid}/${crypto.randomUUID()}`
  const [newFile] = await bucket.file(oldPath).copy(bucket.file(newPath))

  const [meta] = await newFile.getMetadata()
  let token = meta && meta.metadata && meta.metadata.firebaseStorageDownloadTokens
  token = token ? String(token).split(',')[0] : null
  if (!token) {
    token = crypto.randomUUID()
    await newFile.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } })
  }
  return { newPath, url: downloadUrl(bucketName, newPath, token) }
}

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set (looked in server/.env).')
    process.exit(1)
  }
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!rawServiceAccount) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set (looked in server/.env).')
    process.exit(1)
  }
  if (Number.isNaN(LIMIT) || LIMIT <= 0) {
    console.error('--limit must be a positive number.')
    process.exit(1)
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(rawServiceAccount)) })
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
        `${DELETE_OLD ? ' + delete-old' : ''}${ONLY_ID ? ` — only recipe ${ONLY_ID}` : ''}` +
        `${LIMIT !== Infinity ? ` — limit ${LIMIT}` : ''}\n`
    )

    // Build the recipe query. When --id is given, match by either the ObjectId or
    // legacy string _id shape (the catalog spans both); otherwise scan all.
    let query = {}
    if (ONLY_ID) {
      const or = [{ _id: ONLY_ID }]
      if (ObjectId.isValid(ONLY_ID)) or.push({ _id: new ObjectId(ONLY_ID) })
      query = { $or: or }
    }

    const counts = {
      scanned: 0,
      migrated: 0, // flat objects copied + repointed (or, in dry run, that would be)
      alreadyMigrated: 0,
      notStorage: 0, // empty / external / unparseable recipeImage
      unexpected: 0, // a recipeImages/* path we don't recognise
      noUid: 0, // flat, but no resolvable owner uid → skipped
      failed: 0, // storage/db error on an otherwise-migratable recipe
      deletedOld: 0,
    }
    let listed = 0
    const line = (msg) => {
      if (listed < MAX_LISTED) {
        listed++
        console.log(msg)
      } else if (listed === MAX_LISTED) {
        listed++
        console.log('  … (further lines suppressed; see summary counts)')
      }
    }

    const cursor = db
      .collection('recipes')
      .find(query, { projection: { recipeImage: 1, userId: 1, authorUsername: 1 } })

    for await (const recipe of cursor) {
      if (counts.migrated >= LIMIT) break
      counts.scanned++
      const id = String(recipe._id)
      const cls = classifyImage(recipe.recipeImage)

      if (cls.kind === 'migrated') {
        counts.alreadyMigrated++
        continue
      }
      if (cls.kind === 'not-storage') {
        counts.notStorage++
        continue
      }
      if (cls.kind === 'unexpected') {
        counts.unexpected++
        line(`  skip   ${id}: unexpected image path "${cls.path}"`)
        continue
      }

      // cls.kind === 'flat' → a migration candidate.
      const uid = await resolveOwnerUid(db, recipe)
      if (!uid) {
        counts.noUid++
        line(`  skip   ${id}: no resolvable owner uid (userId + authorUsername both unusable)`)
        continue
      }

      if (!APPLY) {
        counts.migrated++
        line(`  move   ${id}: ${cls.bucket}/${cls.path} → recipeImages/${uid}/{uuid}`)
        continue
      }

      try {
        const { newPath, url } = await moveObject(cls.bucket, cls.path, uid)
        await db
          .collection('recipes')
          .updateOne({ _id: recipe._id }, { $set: { recipeImage: url } })
        counts.migrated++
        line(`  moved  ${id}: ${cls.path} → ${newPath}`)

        if (DELETE_OLD) {
          try {
            await getStorage().bucket(cls.bucket).file(cls.path).delete()
            counts.deletedOld++
          } catch (delErr) {
            // Non-fatal: the recipe already points at the new object; a leftover
            // flat object is harmless (public-read, never written) and can be
            // purged later. Report but don't count as a migration failure.
            line(`  warn   ${id}: repointed but old object delete failed: ${delErr.message}`)
          }
        }
      } catch (err) {
        // Per-object isolation: a foreign/unreadable bucket (e.g. a dev service
        // account can't touch the legacy prod `prepify-9b974` bucket) or a missing
        // source object must not abort the whole run. The recipe is left pointing
        // at its old URL (still renders via the legacy read rule).
        counts.failed++
        line(`  FAIL   ${id}: ${cls.bucket}/${cls.path} — ${err.message}`)
      }
    }

    const row = (label, val) => console.log(`  ${(label + ':').padEnd(24)}${val}`)
    console.log('\nSummary')
    console.log('───────')
    row('recipes scanned', counts.scanned)
    row(APPLY ? 'migrated' : 'would migrate', counts.migrated)
    row('already uid-scoped', counts.alreadyMigrated)
    row('non-Storage / external', counts.notStorage)
    if (counts.unexpected) row('unexpected image path', counts.unexpected)
    if (counts.noUid) row('skipped (no owner uid)', counts.noUid)
    if (counts.failed) row('FAILED (storage/db)', counts.failed)
    if (APPLY && DELETE_OLD) row('old objects deleted', counts.deletedOld)

    if (!APPLY) {
      console.log('\nDRY RUN — nothing was written. Re-run with --apply to commit.')
    } else {
      console.log('\nDone. After a full apply, re-run the I1 resize backfill so the moved')
      console.log('originals get their {uid}/-directory variants (docs/IMAGE_PIPELINE.md).')
    }
    // A non-zero exit signals leftover work so this can gate a cutover step.
    process.exit(counts.failed > 0 ? 1 : 0)
  } catch (err) {
    console.error('\nMigration failed:', err.message)
    process.exit(1)
  } finally {
    await client.close().catch(() => {})
  }
}

// Export the pure helpers for unit testing; only load env + run the migration
// when invoked directly (`node scripts/migrateRecipeImagesToUid.js`), so a test
// `require`-ing this file doesn't pull real server/.env creds into its process.
module.exports = { classifyImage, downloadUrl, resolveOwnerUid }
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
  main()
}
