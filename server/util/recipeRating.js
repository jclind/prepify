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

// Compute a recipe's aggregate rating from its ratings docs WITHOUT persisting,
// EXCLUDING any taken down by moderation (REVIEW_VISIBLE). This is the pure read
// half of recomputeRecipeRating — split out so read-only callers (e.g. the
// catalog reconciliation script in server/scripts/) can diff the true aggregate
// against the stored one without writing. count === 0 yields rateValue 0
// (avoids divide-by-zero).
async function computeRecipeRating(db, recipeId) {
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
  // Per-star histogram for the reviews-summary UI (§D). Bucket each rating by its
  // nearest whole star — clamped to 1–5 so a fractional/out-of-range legacy value
  // can't land outside the five buckets — and always return all five keys, so the
  // client renders empty bars without null-guarding each one. The buckets sum to
  // rateCount by construction.
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of ratings) {
    const star = Math.min(5, Math.max(1, Math.round(parseFloat(r.rating))))
    breakdown[star] += 1
  }
  return { rateCount, rateValue, breakdown }
}

// Recompute and persist a recipe's aggregate rating from its ratings docs,
// EXCLUDING any that have been taken down by moderation (REVIEW_VISIBLE). Called
// whenever ratings change (new rating) or a review is hidden/restored, so a
// moderated rating no longer influences the recipe's score. Returns the new
// aggregate. count === 0 yields rateValue 0 (avoids divide-by-zero).
async function recomputeRecipeRating(db, recipeId) {
  const agg = await computeRecipeRating(db, recipeId)
  await db
    .collection('recipes')
    .updateOne(recipeIdQuery(recipeId), { $set: { rating: agg } })
  return agg
}

module.exports = { computeRecipeRating, recomputeRecipeRating, hasNumericRating }
