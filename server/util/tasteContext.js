// Shared loader for a user's content-based taste context, used by both the
// "For You" home row (GET /getForYouRecipes) and the "What should I cook?"
// button (GET /recipes/random). Keeping this in one place means the signal/seen
// split and the profile are defined exactly once.
//
// Split into two steps on purpose: loadInteractions() is cheap (two indexed
// reads, no recipe scan) so a caller can check the MIN_SIGNAL threshold and bail
// BEFORE paying for the feature-doc lookup that buildSeenProfile() needs.

const { recipeIdInQuery } = require('./recipeIdQuery')
const { buildTasteProfile, interactionWeight } = require('./forYou')

// Read the user's saves / makes / ratings and derive the two id sets the
// recommendation routes care about:
//  - signalIds: recipes carrying REAL taste signal (saved | made | non-null
//    rating). Drives the MIN_SIGNAL threshold AND the taste profile.
//  - seenIds: everything engaged with — signal PLUS review-only (rating: null)
//    docs. Used only to EXCLUDE recipes from suggestions; a null rating is never
//    taste signal and never counts toward the threshold.
// Also returns the raw maps so buildSeenProfile can weight each recipe's signals.
async function loadInteractions(db, uid) {
  const [userData, ratingDocs] = await Promise.all([
    db.collection('userRecipeData').findOne(
      { _id: uid },
      { projection: { savedRecipes: 1, madeRecipes: 1 } }
    ),
    db.collection('ratings')
      .find({ userId: uid }, { projection: { recipeId: 1, rating: 1 } })
      .toArray(),
  ])

  const savedIds = new Set((userData?.savedRecipes ?? []).map((e) => e.recipeId))
  const madeIds = new Set((userData?.madeRecipes ?? []).map((e) => e.recipeId))
  const ratingById = new Map(
    ratingDocs
      .filter((r) => r.rating != null)
      .map((r) => [r.recipeId, r.rating])
  )

  const signalIds = new Set([...savedIds, ...madeIds, ...ratingById.keys()])
  const seenIds = new Set([...signalIds, ...ratingDocs.map((r) => r.recipeId)])

  return { savedIds, madeIds, ratingById, signalIds, seenIds }
}

// Build the taste profile for a user from the feature tags of their seen
// recipes. Looks up cuisine/mealTypes/nutritionLabels for the seenIds (deleted
// recipes just drop out), combines each recipe's signals into one weight via
// interactionWeight (review-only docs weigh 0 → ignored), and folds them into a
// buildTasteProfile() result. Call only after the threshold check.
async function buildSeenProfile(db, { savedIds, madeIds, ratingById, seenIds }) {
  const seenFeatureDocs = await db
    .collection('recipes')
    .find(recipeIdInQuery([...seenIds]), {
      projection: { cuisine: 1, mealTypes: 1, nutritionLabels: 1 },
    })
    .toArray()

  const interactions = seenFeatureDocs.map((recipe) => {
    const id = String(recipe._id)
    return {
      recipe,
      weight: interactionWeight({
        made: madeIds.has(id),
        saved: savedIds.has(id),
        rating: ratingById.get(id) ?? null,
      }),
    }
  })

  return buildTasteProfile(interactions)
}

module.exports = { loadInteractions, buildSeenProfile }
