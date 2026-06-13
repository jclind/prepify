const { recipeIdQuery } = require('./recipeIdQuery')
const { REVIEW_VISIBLE } = require('./moderation')

// Recompute and persist a recipe's aggregate rating from its ratings docs,
// EXCLUDING any that have been taken down by moderation (REVIEW_VISIBLE). Called
// whenever ratings change (new rating) or a review is hidden/restored, so a
// moderated rating no longer influences the recipe's score. Returns the new
// aggregate. count === 0 yields rateValue 0 (avoids divide-by-zero).
async function recomputeRecipeRating(db, recipeId) {
  const docs = await db
    .collection('ratings')
    .find({ recipeId, ...REVIEW_VISIBLE })
    .toArray()
  // A ratings doc can be review-only (posted before any star rating), so its
  // `rating` is null/absent. Count and average ONLY docs with a real numeric
  // rating — otherwise parseFloat(null) → NaN poisons the whole aggregate.
  const ratings = docs.filter((r) => Number.isFinite(parseFloat(r.rating)))
  const rateCount = ratings.length
  const rateValue = rateCount
    ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / rateCount
    : 0
  await db
    .collection('recipes')
    .updateOne(recipeIdQuery(recipeId), { $set: { rating: { rateCount, rateValue } } })
  return { rateCount, rateValue }
}

module.exports = { recomputeRecipeRating }
