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
    expect(agg).toEqual({ rateCount: 2, rateValue: 4.5 })
  })

  it('returns a zero aggregate for a recipe with no ratings', async () => {
    await seed([], { rateCount: 0, rateValue: 0 })
    expect(await computeRecipeRating(getDB(), RECIPE_ID)).toEqual({
      rateCount: 0,
      rateValue: 0,
    })
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
    expect(returned).toEqual({ rateCount: 1, rateValue: 4 })

    const recipe = await getDB().collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating).toEqual({ rateCount: 1, rateValue: 4 })
  })
})
