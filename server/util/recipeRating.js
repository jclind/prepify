const { recipeIdQuery } = require('./recipeIdQuery')
const { REVIEW_VISIBLE } = require('./moderation')

// A ratings doc can be review-only (rating null/absent) or carry a real star
// rating, which legacy data may store as a string ("5") or a number (5). This
// is the single source of truth for "does this doc have a real numeric rating"
// — parseFloat handles both shapes, and Number.isFinite rejects null/NaN so a
// review-only doc never poisons an average or gets mistaken for a rating.
function hasNumericRating(rating) {
  return Number.isFinite(parseFloat(rating))
}

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
  const ratings = docs.filter((r) => hasNumericRating(r.rating))
  const rateCount = ratings.length
  const rateValue = rateCount
    ? ratings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / rateCount
    : 0
  await db
    .collection('recipes')
    .updateOne(recipeIdQuery(recipeId), { $set: { rating: { rateCount, rateValue } } })
  return { rateCount, rateValue }
}

module.exports = { recomputeRecipeRating, hasNumericRating }
