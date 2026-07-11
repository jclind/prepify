// Server-side mirror of src/util/calculateServingPrice.ts. The server can't
// import client TypeScript, so this is a hand-kept port — keep the two in sync
// if the algorithm ever changes. Used to RECOMPUTE `servingPrice` server-side
// on create/edit (server/routes/recipes.js) so a stale/forged client-sent price
// is never trusted, and by the one-off backfill script
// (server/scripts/backfillServingPrice.js) that corrects historical documents.
//
// Semantics (must match the client util exactly):
//   - numServings <= 0 (or not a finite number) → 0.
//   - Sum `ingredientData.totalPriceUSACents` across ingredient rows, but only
//     rows that are real parsed ingredients (`'parsedIngredient' in ingr`) with
//     a non-null `ingredientData` — label rows and un-enriched/errored rows
//     (`ingredientData: null`, e.g. a failed lookup the app still lets the user
//     publish) contribute $0, not an error.
//   - A non-numeric/NaN totalPriceUSACents on an otherwise-real row is skipped
//     (also contributes $0) rather than poisoning the sum.
//   - Result is `Math.round(totalRecipeCents / numServings)`, whole cents.
function calculateServingPrice(ingredientsList, numServings) {
  if (!Array.isArray(ingredientsList) || !(Number(numServings) > 0)) return 0

  let totalRecipeCents = 0
  for (const ingr of ingredientsList) {
    if (ingr && 'parsedIngredient' in ingr && ingr.ingredientData) {
      const ingrPrice = Number(ingr.ingredientData.totalPriceUSACents)
      if (!Number.isNaN(ingrPrice)) totalRecipeCents += ingrPrice
    }
  }

  return Math.round(totalRecipeCents / Number(numServings))
}

module.exports = { calculateServingPrice }
