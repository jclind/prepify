#!/usr/bin/env node
/*
 * inventory-collections.js  —  READ-ONLY Mongo database inventory.
 *
 * Lists every collection in a database with its document count, storage/data
 * size, index names, and the top-level field names of one sample document so
 * you can tell app data (recipes/users/reviews/...) apart from co-mingled
 * third-party data (e.g. the @jclind/ingredient-parser dictionary/cache).
 *
 * It performs NO writes — only listCollections, count, $collStats, listIndexes,
 * and a single findOne() per collection.
 *
 * Usage (string passed via env so it never lands in a file or your shell history
 * if you prefix the command with a space):
 *
 *   cd server
 *    MONGO_URI="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net" node scripts/inventory-collections.js
 *
 *   # optional: target a non-default database (defaults to "prepify")
 *    MONGO_URI="..." DB_NAME="prepify" node scripts/inventory-collections.js
 *
 * You can also pass them positionally:  node scripts/inventory-collections.js "<uri>" "<db>"
 */

const { MongoClient } = require('mongodb')

const uri = process.env.MONGO_URI || process.argv[2]
const dbName = process.env.DB_NAME || process.argv[3] || 'prepify'

if (!uri) {
  console.error(
    'ERROR: no connection string. Pass it as MONGO_URI=... (recommended) or as the first argument.'
  )
  process.exit(1)
}

function humanBytes(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)}${units[i]}`
}

async function collStats(db, name) {
  // $collStats is the non-deprecated path; fall back to estimated count only.
  try {
    const [stats] = await db
      .collection(name)
      .aggregate([{ $collStats: { storageStats: {} } }])
      .toArray()
    const s = stats?.storageStats || {}
    return { count: s.count, dataSize: s.size, storageSize: s.storageSize }
  } catch {
    return null
  }
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db(dbName)

    const collInfos = await db.listCollections({}, { nameOnly: false }).toArray()
    const collections = collInfos
      .filter(c => c.type !== 'view')
      .map(c => c.name)
      .sort((a, b) => a.localeCompare(b))
    const views = collInfos.filter(c => c.type === 'view').map(c => c.name)

    if (collections.length === 0) {
      console.log(`\nDatabase "${dbName}" has no collections (does it exist? check the DB name).\n`)
      return
    }

    console.log(`\n=== Inventory of database "${dbName}" ===`)
    console.log(`Host: ${client.options?.hosts?.map(h => h.host).join(', ') || '(srv)'}`)
    console.log(`${collections.length} collection(s)${views.length ? `, ${views.length} view(s)` : ''}\n`)

    const rows = []
    for (const name of collections) {
      const coll = db.collection(name)
      let count
      try {
        count = await coll.estimatedDocumentCount()
      } catch {
        count = null
      }
      const stats = await collStats(db, name)

      let indexNames = []
      try {
        indexNames = (await coll.listIndexes().toArray()).map(i => i.name)
      } catch {
        indexNames = ['(unreadable)']
      }

      let fields = []
      try {
        const sample = await coll.findOne({}, { projection: {} })
        if (sample) fields = Object.keys(sample)
      } catch {
        fields = ['(unreadable)']
      }

      rows.push({
        name,
        count: count ?? stats?.count ?? '—',
        dataSize: humanBytes(stats?.dataSize),
        storageSize: humanBytes(stats?.storageSize),
        indexes: indexNames.length,
        fields,
      })
    }

    // Aligned summary table.
    const pad = (s, n) => String(s).padEnd(n)
    const nameW = Math.max(10, ...rows.map(r => r.name.length))
    const cntW = Math.max(5, ...rows.map(r => String(r.count).length))
    console.log(
      `${pad('COLLECTION', nameW)}  ${pad('DOCS', cntW)}  ${pad('DATA', 7)}  ${pad('STORE', 7)}  IDX`
    )
    console.log('-'.repeat(nameW + cntW + 7 + 7 + 4 + 8))
    for (const r of rows) {
      console.log(
        `${pad(r.name, nameW)}  ${pad(r.count, cntW)}  ${pad(r.dataSize, 7)}  ${pad(
          r.storageSize,
          7
        )}  ${r.indexes}`
      )
    }

    // Per-collection sample fields — the signal for app-data vs parser-data.
    console.log('\n--- sample top-level fields (one doc per collection) ---')
    for (const r of rows) {
      console.log(`\n${r.name}:`)
      console.log(`  ${r.fields.length ? r.fields.join(', ') : '(empty collection)'}`)
    }

    if (views.length) {
      console.log(`\nViews (not collections): ${views.join(', ')}`)
    }
    console.log('')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error('\nInventory failed:', err.message)
  process.exit(1)
})
