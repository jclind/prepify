/**
 * READ-ONLY precheck for the unique index on usernames.username_lower.
 *
 * The migration in db.js (ensureIndexes) builds a UNIQUE index on the
 * lowercased username. If the collection already contains two usernames that
 * differ only by case (e.g. "John" and "john"), that index will fail to build.
 * This script finds those collisions BEFORE you deploy, without writing
 * anything — it opens its own connection and never calls ensureIndexes().
 *
 * Usage (from the repo root or the server dir):
 *   node server/scripts/check-username-dupes.js
 *
 * Exit code 0 = clean (index will build), 1 = collisions found, 2 = error.
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { MongoClient } = require('mongodb')

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set (looked in server/.env).')
    process.exit(2)
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 })

  try {
    await client.connect()
    const usernames = client.db('prepify').collection('usernames')

    const total = await usernames.countDocuments()
    const missingLower = await usernames.countDocuments({
      username_lower: { $exists: false },
      username: { $type: 'string' },
    })

    // Group by the lowercased username and keep only groups with >1 doc.
    const collisions = await usernames
      .aggregate([
        { $match: { username: { $type: 'string' } } },
        {
          $group: {
            _id: { $toLower: '$username' },
            count: { $sum: 1 },
            ids: { $push: '$_id' },
            originals: { $push: '$username' },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray()

    console.log(`\nusernames documents:        ${total}`)
    console.log(`missing username_lower:     ${missingLower} (will be backfilled on deploy)`)
    console.log(`case-insensitive collisions: ${collisions.length}\n`)

    if (collisions.length === 0) {
      console.log('✅ No case-variant duplicates. The unique index will build cleanly.')
      process.exit(0)
    }

    console.log('❌ Found usernames that collide once lowercased. Resolve these before deploying:\n')
    for (const c of collisions) {
      console.log(`  "${c._id}" x${c.count}`)
      c.originals.forEach((name, i) => {
        console.log(`      - ${JSON.stringify(name)}  (uid: ${c.ids[i]})`)
      })
    }
    console.log('')
    process.exit(1)
  } catch (err) {
    console.error('Precheck failed:', err.message)
    process.exit(2)
  } finally {
    await client.close()
  }
}

main()
