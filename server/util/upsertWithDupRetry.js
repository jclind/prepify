// Run an upsert that races safely against a concurrent insert of the same
// unique key. With a unique index on the filter fields (e.g. ratings'
// { userId, recipeId }), two simultaneous upserts that BOTH find no existing
// doc will both attempt an INSERT; one wins and the other throws a duplicate-key
// error (E11000). On that error the doc now exists, so we re-apply the update as
// a plain (non-upsert) update — the `$set` lands on the row the racing request
// inserted, and `$setOnInsert` is correctly skipped (the doc is no longer new).
//
// Turns a rare double-submit from a 500 into the same end state a sequential
// pair of requests would reach: one row, last write wins.
async function upsertWithDupRetry(collection, filter, update, options = {}) {
  try {
    return await collection.updateOne(filter, update, { ...options, upsert: true })
  } catch (err) {
    if (err && err.code === 11000) {
      return collection.updateOne(filter, update, { ...options, upsert: false })
    }
    throw err
  }
}

module.exports = { upsertWithDupRetry }
