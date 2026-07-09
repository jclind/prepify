const { MongoClient } = require('mongodb')

let client
let db

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGO_URI
  // The explicit-`uri` path is test-only (Jest's in-memory Mongo; index.js calls
  // connectDB() bare), and a CPU-starved test run can stall the topology monitor
  // past a tight selection window — so it keeps the driver's default 30s instead
  // of prod's deliberate 5s fail-fast.
  const options = uri
    ? { serverSelectionTimeoutMS: 30000 }
    : { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 10 }

  // Force TLS for the remote (Atlas/prod) MONGO_URI connection, but never for a
  // localhost host. A plain mongodb://localhost — local dev or the CI E2E mongo
  // service container — has no TLS endpoint, so forcing it fails the handshake.
  // The explicit-`uri` arg path (server unit tests / in-memory Mongo) is already
  // TLS-free. Remote prod URIs (any non-localhost host) keep TLS exactly as before.
  const isLocalHost = /^mongodb:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(mongoUri || '')
  if (!uri && !isLocalHost) {
    options.tls = true
  }

  client = new MongoClient(mongoUri, options)
  await client.connect()
  db = client.db('prepify')
  console.log('Connected to MongoDB')
  await ensureIndexes()
}

// Enforces case-insensitive username uniqueness at the database level. Legacy
// docs created before `username_lower` existed are backfilled first so the
// unique index can be built over the whole collection.
async function ensureIndexes() {
  const usernames = db.collection('usernames')
  await usernames.updateMany(
    { username_lower: { $exists: false }, username: { $type: 'string' } },
    [{ $set: { username_lower: { $toLower: '$username' } } }]
  )
  try {
    await usernames.createIndex({ username_lower: 1 }, { unique: true })
  } catch (err) {
    // Pre-existing case-variant duplicates would make the unique index fail to
    // build. Log it rather than crashing startup; the duplicates need manual
    // cleanup, but the rest of the server should still come up.
    console.error(
      'Failed to create unique index on usernames.username_lower:',
      err.message
    )
  }

  // Backs the admin analytics usersOverTime series (signup createdAt range
  // bucketing). setUsername only began stamping createdAt in P3b, so this index
  // covers the docs that have it; legacy docs without the field aren't counted in
  // the signup series.
  try {
    await db.collection('usernames').createIndex({ createdAt: -1 })
  } catch (err) {
    console.error('Failed to create index on usernames.createdAt:', err.message)
  }

  // Backs GET /api/drafts, which lists a user's drafts newest-updated first
  // (find({ userId }).sort({ updatedAt: -1 })). Without it that query is a full
  // collection scan plus an in-memory sort on every Drafts-tab load.
  try {
    await db.collection('recipeDrafts').createIndex({ userId: 1, updatedAt: -1 })
  } catch (err) {
    console.error('Failed to create index on recipeDrafts.userId:', err.message)
  }

  // Backs GET /api/getCreatedRecipes (find/sort by author, newest first) and the
  // recipes count in GET /api/getAccountCounts. Without it both are full
  // collection scans over every recipe on the site.
  try {
    await db.collection('recipes').createIndex({ userId: 1, createdAt: -1 })
  } catch (err) {
    console.error('Failed to create index on recipes.userId:', err.message)
  }

  // Backs the default GET /recipes browse listing (the catalog page hit on every
  // visit), which sorts by SORTS.popular = { numTimesSaved:-1, views:-1, _id:-1 }.
  // Key order mirrors that sort EXACTLY so the walk is served in order and the
  // blocking in-memory SORT is eliminated (before: SORT <- COLLSCAN over the whole
  // visible catalog per page load). The public `status: { $nin: [...] }` visibility
  // predicate (RECIPE_VISIBLE) is deliberately NOT led with here: it's a low-
  // selectivity range ($nin), so by the equality->sort->range rule it stays a FETCH
  // residual filter rather than a leading key (leading with it would fragment the
  // index into multiple intervals and defeat the sort). The `_id:-1` tiebreak is in
  // the index so pagination stays stable without a residual sort. Other browse sorts
  // (createdAt/servingPrice/totalTime) intentionally aren't indexed here — popular is
  // the default and dominant path; the rest are lower-frequency and can be added if
  // they become hot.
  //
  // This (and the getReviews indexes below) live in startup rather than the deliberate
  // `scripts/createModerationIndexes.js` step ON PURPOSE, even though they're on the
  // large recipes/ratings collections: they back per-page-load hot paths, so the index
  // must exist the instant the querying code goes live — putting them in the script
  // would open a window where a deploy runs the new query against an unindexed
  // collection until someone remembers to run it. The build is online (reads/writes
  // keep working) and sub-second at current scale; if these collections ever grow big
  // enough that a cold build stalls readiness, that concerns the whole awaited
  // ensureIndexes() set, and the fix then is to make the heavy set non-blocking — not
  // to special-case these two paths now.
  try {
    await db.collection('recipes').createIndex({ numTimesSaved: -1, views: -1, _id: -1 })
  } catch (err) {
    console.error('Failed to create browse-popular index on recipes:', err.message)
  }

  // Backs the title autocomplete (GET /searchAutoCompleteRecipes). Its
  // correctly-spelled path runs `$text: { $search }` against this index, so that
  // path scales to any catalog size and matches query words in any order/position
  // instead of scanning a capped in-memory candidate set on every under-filled
  // query. The in-process Levenshtein fuzzy fallback still handles misspellings
  // ($text is word/stem-tokenised and can't match typos), but only runs when the
  // exact + $text tiers don't fill the results. A collection can hold only one
  // text index; `title` is the only autocompleted field. Lives in startup (not
  // scripts/createModerationIndexes.js) for the same reason as the browse index
  // above: the querying code must never hit an unindexed collection post-deploy —
  // and the route guards a missing index by degrading to the fuzzy scan anyway.
  try {
    await db.collection('recipes').createIndex({ title: 'text' })
  } catch (err) {
    console.error('Failed to create title text index on recipes:', err.message)
  }

  // Backs GET /api/getSingleUserReviews (a user's ratings) and the ratings count
  // in GET /api/getAccountCounts, both of which filter ratings by username.
  try {
    await db.collection('ratings').createIndex({ username: 1 })
  } catch (err) {
    console.error('Failed to create index on ratings.username:', err.message)
  }

  // Backs GET /getReviews, the per-recipe review list on every recipe-detail page.
  // It filters by `recipeId` (equality) then sorts either newest-first
  // (filter=new -> { reviewCreatedAt:-1 }) or highest-rated (filter=top ->
  // { rating:-1 }). The existing { recipeId, username } index serves the recipeId
  // MATCH but not the sort, so the query fetched the matches and then ran a blocking
  // in-memory SORT (verified via explain). These two compounds put the sort key
  // right after the equality prefix so the sort is served by the index walk (ESR:
  // recipeId=equality, then sort key; the `moderationHidden: { $ne: true }` /
  // `reviewText` predicates stay FETCH residuals). Both are needed because a single
  // recipeId-prefixed index can only order by one trailing key. (In startup, not the
  // migration script — same hot-path rationale as the browse-popular index above.)
  try {
    await db.collection('ratings').createIndex({ recipeId: 1, reviewCreatedAt: -1 })
    await db.collection('ratings').createIndex({ recipeId: 1, rating: -1 })
  } catch (err) {
    console.error('Failed to create getReviews indexes on ratings:', err.message)
  }

  // Moderation reports (P1/P2). The `reports` collection is new, so these build
  // instantly. Backs the admin queue (filter by status, newest first), the
  // per-user open-report tally in GET /admin/users (by reportedUsername and by
  // recipeId), and the one-open-report-per-target rate-limit lookup on POST.
  try {
    const reports = db.collection('reports')
    await reports.createIndex({ status: 1, createdAt: -1 })
    await reports.createIndex({ reportedUsername: 1 })
    await reports.createIndex({ recipeId: 1 })
    // Backs the admin analytics reportsOverTime series (createdAt range bucketing).
    await reports.createIndex({ createdAt: -1 })
  } catch (err) {
    console.error('Failed to create indexes on reports:', err.message)
  }

  // User bug reports. New collection, so these build instantly. Backs the admin
  // queue (filter by status, newest first) and analytics createdAt bucketing.
  try {
    const bugReports = db.collection('bugReports')
    await bugReports.createIndex({ status: 1, createdAt: -1 })
    await bugReports.createIndex({ createdAt: -1 })
  } catch (err) {
    console.error('Failed to create indexes on bugReports:', err.message)
  }

  // Admin audit log (P3). New collection, so these build instantly. Backs the
  // audit page (newest first), and filtering by actor or by a specific target.
  // The action/targetType compounds end in createdAt:-1 so the page's filter
  // dropdowns are served filter-then-sort by one index rather than an in-memory sort.
  try {
    const auditLog = db.collection('auditLog')
    await auditLog.createIndex({ createdAt: -1 })
    await auditLog.createIndex({ actorUid: 1, createdAt: -1 })
    await auditLog.createIndex({ targetType: 1, targetId: 1 })
    await auditLog.createIndex({ action: 1, createdAt: -1 })
    await auditLog.createIndex({ targetType: 1, createdAt: -1 })
  } catch (err) {
    console.error('Failed to create indexes on auditLog:', err.message)
  }

  // Ingredient-enrichment telemetry (N6). GET /admin/ingredients sorts by count
  // desc (tie-broken by lastSeen) and optionally filters by `type`. The bare
  // {count,lastSeen} index serves the default "All" tab; the type-led compound
  // serves the filtered tabs filter-then-sort by one index rather than an
  // in-memory sort (mirrors the auditLog bare + compound split above).
  try {
    const ingredientMisses = db.collection('ingredientMisses')
    await ingredientMisses.createIndex({ count: -1, lastSeen: -1 })
    await ingredientMisses.createIndex({ type: 1, count: -1, lastSeen: -1 })
  } catch (err) {
    console.error('Failed to create indexes on ingredientMisses:', err.message)
  }
}

async function closeDB() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

function getDB() {
  if (!db) throw new Error('DB not initialized. Call connectDB() first.')
  return db
}

function getClient() {
  if (!client) throw new Error('DB not initialized. Call connectDB() first.')
  return client
}

module.exports = { connectDB, closeDB, getDB, getClient }
