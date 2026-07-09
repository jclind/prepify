/**
 * Unit coverage for util/recipeRating.js.
 *
 * recomputeRecipeRating is already exercised end-to-end through the review
 * routes (reviews.test.js) and the deleteAccount cascade (auth.test.js). These
 * tests pin the S6 split: `computeRecipeRating` is the PURE read half — it must
 * return the same aggregate WITHOUT touching the recipe doc, so the read-only
 * reconciliation dry-run can trust it. They also lock the two filtering rules
 * (moderation-hidden excluded, review-only null-rating docs ignored) at the
 * util level rather than only through a route.
 */
const { getDB } = require('../db')
const {
  computeRecipeRating,
  recomputeRecipeRating,
} = require('../util/recipeRating')

const RECIPE_ID = 'recipe-rating-unit'

async function seed(ratingDocs, storedAggregate) {
  await getDB()
    .collection('recipes')
    .insertOne({ _id: RECIPE_ID, title: 'x', rating: storedAggregate })
  if (ratingDocs.length) await getDB().collection('ratings').insertMany(ratingDocs)
}

afterEach(async () => {
  await Promise.all([
    getDB().collection('recipes').deleteMany({}),
    getDB().collection('ratings').deleteMany({}),
  ])
})

describe('computeRecipeRating (pure read)', () => {
  it('averages only visible, numeric-rating docs', async () => {
    await seed([
      { recipeId: RECIPE_ID, userId: 'a', rating: 4 },
      { recipeId: RECIPE_ID, userId: 'b', rating: '5' }, // legacy string rating
      { recipeId: RECIPE_ID, userId: 'c', rating: 3, moderationHidden: true }, // hidden → excluded
      { recipeId: RECIPE_ID, userId: 'd', rating: null }, // review-only → ignored
    ], { rateCount: 0, rateValue: 0 })

    const agg = await computeRecipeRating(getDB(), RECIPE_ID)
    // Only the two visible numeric docs (4 and '5') count toward the histogram.
    expect(agg).toEqual({
      rateCount: 2,
      rateValue: 4.5,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    })
  })

  it('returns a zero aggregate (all-zero breakdown) for a recipe with no ratings', async () => {
    await seed([], { rateCount: 0, rateValue: 0 })
    expect(await computeRecipeRating(getDB(), RECIPE_ID)).toEqual({
      rateCount: 0,
      rateValue: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
  })

  it('buckets each visible rating into its nearest whole star (clamped 1–5)', async () => {
    await seed([
      { recipeId: RECIPE_ID, userId: 'a', rating: 1 },
      { recipeId: RECIPE_ID, userId: 'b', rating: 4 },
      { recipeId: RECIPE_ID, userId: 'c', rating: '4' }, // legacy string → 4
      { recipeId: RECIPE_ID, userId: 'd', rating: 4.4 }, // rounds down → 4
      { recipeId: RECIPE_ID, userId: 'e', rating: 4.6 }, // rounds up → 5
      { recipeId: RECIPE_ID, userId: 'f', rating: 3, moderationHidden: true }, // hidden → excluded
      { recipeId: RECIPE_ID, userId: 'g', rating: null }, // review-only → ignored
    ], { rateCount: 0, rateValue: 0 })

    const agg = await computeRecipeRating(getDB(), RECIPE_ID)
    expect(agg.rateCount).toBe(5)
    expect(agg.breakdown).toEqual({ 1: 1, 2: 0, 3: 0, 4: 3, 5: 1 })
    // The buckets sum to rateCount by construction.
    const summed = Object.values(agg.breakdown).reduce((a, b) => a + b, 0)
    expect(summed).toBe(agg.rateCount)
  })

  it('does NOT write — the stored aggregate is left untouched', async () => {
    // Seed a deliberately WRONG stored aggregate; a pure read must not fix it.
    await seed([{ recipeId: RECIPE_ID, userId: 'a', rating: 4 }], {
      rateCount: 99,
      rateValue: 1,
    })

    await computeRecipeRating(getDB(), RECIPE_ID)

    const recipe = await getDB().collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating).toEqual({ rateCount: 99, rateValue: 1 })
  })
})

describe('recomputeRecipeRating (persisting)', () => {
  it('heals a drifted stored aggregate onto the recipe doc', async () => {
    await seed([{ recipeId: RECIPE_ID, userId: 'a', rating: 4 }], {
      rateCount: 99,
      rateValue: 1,
    })

    const returned = await recomputeRecipeRating(getDB(), RECIPE_ID)
    expect(returned).toEqual({
      rateCount: 1,
      rateValue: 4,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 },
    })

    const recipe = await getDB().collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating).toEqual({
      rateCount: 1,
      rateValue: 4,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 },
    })
  })

  it('persists a refreshed breakdown when a recipe predates the field', async () => {
    // A recipe rated before §D shipped: correct rateCount/rateValue, NO breakdown.
    await seed([
      { recipeId: RECIPE_ID, userId: 'a', rating: 5 },
      { recipeId: RECIPE_ID, userId: 'b', rating: 5 },
    ], { rateCount: 2, rateValue: 5 })

    await recomputeRecipeRating(getDB(), RECIPE_ID)

    const recipe = await getDB().collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.breakdown).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 })
  })
})
