// Copy production's published recipes into the DEV database, so deploy
// previews (which run against dev) have real content to smoke-test.
//
//   node scripts/seedDevFromProd.js                    copy (skips recipes already copied)
//   node scripts/seedDevFromProd.js --owner <username> give the copies to a dev account
//   node scripts/seedDevFromProd.js --remove           delete every copy
//
// Reads only prod's public API (no prod credentials). Each copied recipe costs
// one public GET /api/getRecipe, which adds one view to that live recipe.
// Writes go to the database in server/.env, and the script refuses to run
// unless that is the prepify-dev cluster and the dev Firebase project. Copies
// carry `seededFrom: 'prod'`, so --remove takes out exactly what it added.
//
// Until --owner is run, the copies belong to a placeholder uid with no Firebase
// account, so their bylines show the generated avatar.

require('dotenv').config({ quiet: true })
const { MongoClient, ObjectId } = require('mongodb')

const PROD_API = process.env.SEED_PROD_API || 'https://prepifymeals.com'
const DEV_HOST_MARK = 'prepify-dev'
const DEV_FIREBASE_PROJECT = 'prepify-dev-58579'
const PLACEHOLDER_UID = 'seed-prepify'
const PLACEHOLDER_USERNAME = 'prepify'
const SEED_MARK = { seededFrom: 'prod' }

function assertDev() {
  const uri = process.env.MONGO_URI || ''
  const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'https://')).hostname
  let project = ''
  try {
    project = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}').project_id || ''
  } catch {
    // unparseable: treated as not dev below
  }
  if (!host.includes(DEV_HOST_MARK) || project !== DEV_FIREBASE_PROJECT) {
    console.error(`Refusing to run: MONGO_URI host "${host}" / Firebase project "${project}" is not dev.`)
    process.exit(1)
  }
  return host
}

async function getJSON(path) {
  const res = await fetch(`${PROD_API}${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

// Prod recipes created after the id migration use ObjectId _ids; keep the type.
const toId = (id) => (/^[0-9a-f]{24}$/.test(id) ? new ObjectId(id) : id)

async function seed(db) {
  // The list endpoint pages (max 50 per page), so walk every page.
  const recipeList = []
  for (let page = 0; ; page++) {
    const { recipeList: batch, total_results: total } = await getJSON(
      `/api/recipes?recipesPerPage=50&page=${page}`
    )
    recipeList.push(...batch)
    if (batch.length === 0 || recipeList.length >= total) break
  }
  let added = 0
  for (const card of recipeList) {
    const _id = toId(card._id)
    if (await db.collection('recipes').findOne({ _id }, { projection: { _id: 1 } })) continue
    const recipe = await getJSON(`/api/getRecipe?id=${encodeURIComponent(card._id)}`)
    delete recipe.authorPhotoURL // response-only, derived per request
    await db.collection('recipes').insertOne({
      ...recipe,
      _id,
      userId: PLACEHOLDER_UID,
      authorUsername: PLACEHOLDER_USERNAME,
      ...SEED_MARK,
      seededAt: new Date(),
    })
    added++
    console.log(`  + ${recipe.title}`)
  }
  console.log(`Copied ${added} recipe(s); ${recipeList.length - added} were already there.`)
}

async function setOwner(db, username) {
  const doc = await db
    .collection('usernames')
    .findOne({ username_lower: username.toLowerCase() }, { projection: { username: 1 } })
  if (!doc) {
    console.error(`No dev account has the username "${username}".`)
    process.exit(1)
  }
  const { modifiedCount } = await db
    .collection('recipes')
    .updateMany(SEED_MARK, { $set: { userId: String(doc._id), authorUsername: doc.username } })
  console.log(`Gave ${modifiedCount} copied recipe(s) to @${doc.username}.`)
}

async function remove(db) {
  const { deletedCount } = await db.collection('recipes').deleteMany(SEED_MARK)
  console.log(`Removed ${deletedCount} copied recipe(s).`)
}

async function main() {
  const host = assertDev()
  const args = process.argv.slice(2)
  const client = await MongoClient.connect(process.env.MONGO_URI)
  try {
    const db = client.db('prepify')
    console.log(`Dev database: ${host}`)
    if (args[0] === '--remove') await remove(db)
    else if (args[0] === '--owner' && args[1]) await setOwner(db, args[1])
    else if (args.length === 0) await seed(db)
    else {
      console.error('Usage: seedDevFromProd.js [--owner <username> | --remove]')
      process.exitCode = 1
    }
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
