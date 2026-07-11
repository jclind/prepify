/**
 * ensureIndexes provisioning — proves db.js builds the indexes its hot/invariant
 * paths depend on at connect time. setup.js already calls connectDB() (→ runs
 * ensureIndexes) before every file, so by the time these tests run the indexes
 * exist on the in-memory Mongo; we just read them back with listIndexes().
 *
 * The load-bearing case here is the D1 ratings identity index: it is UNIQUE and
 * PARTIAL, and its spec must stay byte-for-byte identical to the copy in
 * scripts/createModerationIndexes.js (a same-name-different-options createIndex
 * throws), so this pins the exact key + options the boot path installs.
 */
const { getDB } = require('../db')

// Read the named index off a collection, or undefined. listIndexes() returns the
// live server view including `unique` and `partialFilterExpression`.
async function indexByName(collection, name) {
  const all = await getDB().collection(collection).listIndexes().toArray()
  return all.find((ix) => ix.name === name)
}

describe('ensureIndexes provisions the ratings indexes at boot', () => {
  it('builds the D1 { userId, recipeId } unique+partial identity index', async () => {
    const ix = await indexByName('ratings', 'userId_1_recipeId_1')
    expect(ix).toBeDefined()
    expect(ix.key).toEqual({ userId: 1, recipeId: 1 })
    // The invariant this index enforces — one rating per (user, recipe).
    expect(ix.unique).toBe(true)
    // PARTIAL on an existing userId so pre-backfill legacy docs don't block the
    // build and every read (which always predicates on userId) is still served.
    expect(ix.partialFilterExpression).toEqual({ userId: { $exists: true } })
  })

  it('still builds the { username } index that backs the remaining ratings-by-username reads', async () => {
    // Kept (not dropped): the rename cascade migrated to userId in #310, but three
    // live queries still filter ratings by bare `username` — the admin user-list
    // review tally, admin user-detail recentReviews, and the reports legacy
    // fallback (see the db.js comment at this index's createIndex call). The
    // index stays until all three migrate.
    const ix = await indexByName('ratings', 'username_1')
    expect(ix).toBeDefined()
    expect(ix.key).toEqual({ username: 1 })
    // It is a plain (non-unique) index — several rows share a username.
    expect(ix.unique).toBeUndefined()
  })
})
