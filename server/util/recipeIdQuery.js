const { ObjectId } = require('mongodb')

// ObjectId.isValid is permissive — returns true for any 12-byte string. The
// String(new ObjectId(id)) === id round-trip pins it to genuine 24-char hex.
function isObjectIdHex(id) {
  return typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id
}

// Phase 5-D transition: recipes created post-migration store _id as a native
// BSON ObjectId; legacy recipes store _id as a plain string. Match both.
// Once the one-time backfill runs, the $or branch becomes a no-op extra
// clause — harmless to leave in place.
function recipeIdQuery(id) {
  // Non-string ids (arrays from repeated query keys, objects from JSON bodies)
  // must never reach the filter — an object here would act as a query operator.
  if (typeof id !== 'string') return { _id: { $in: [] } }
  if (isObjectIdHex(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
  }
  return { _id: id }
}

// Sibling for `_id: { $in: [...] }` queries. Each id that looks like a
// 24-char hex ObjectId expands into both its string and ObjectId form so
// the $in matches docs of either shape.
function recipeIdInQuery(ids) {
  const variants = []
  for (const id of ids) {
    if (typeof id !== 'string') continue
    variants.push(id)
    if (isObjectIdHex(id)) variants.push(new ObjectId(id))
  }
  return { _id: { $in: variants } }
}

module.exports = { recipeIdQuery, recipeIdInQuery, isObjectIdHex }
