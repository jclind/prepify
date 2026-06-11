const { recipeIdQuery } = require('./recipeIdQuery')
const { REVIEW_VISIBLE } = require('./moderation')

// Recompute and persist a recipe's aggregate rating from its ratings docs,
// EXCLUDING any that have been taken down by moderation (REVIEW_VISIBLE). Called
// whenever ratings change (new rating) or a review is hidden/restored, so a
// moderated rating no longer influences the recipe's score. Returns the new
// aggregate. count === 0 yields rateValue 0 (avoids divide-by-zero).
async function recomputeRecipeRating(db, recipeId) {
  const ratings = await db
    .collection('ratings')
    .find({ recipeId, ...REVIEW_VISIBLE })
    .toArray()
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
