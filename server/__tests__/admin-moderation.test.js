/**
 * Admin moderation: soft-hide endpoints + read-path filtering.
 *
 * Verifies (a) admin can hide/unhide recipes and take down reviews, (b) hidden
 * content is filtered from every public read path, and (c) legacy documents with
 * NO moderation field stay visible (the $ne predicate, not status==='active').
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipe, seedRecipes, seedUserRecipeData, seedRating, seedUser } = require('./helpers/seed')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'

const BASE_RECIPE = {
  title: 'Visible Dish',
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: [],
  numTimesSaved: 0,
  numTimesMade: 0,
  views: 0,
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '1000000',
  recipeImage: 'img',
}

afterEach(async () => {
  admin.__resetClaims()
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('stats').deleteMany({}),
    db.collection('reports').deleteMany({}),
  ])
})

describe('GET /api/admin/recipes/:id/automod', () => {
  it('requires admin', async () => {
    const res = await request(app).get('/api/admin/recipes/r1/automod').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns the classifier from the open automod report holding the recipe', async () => {
    admin.__setClaims({ admin: true })
    await getDB().collection('reports').insertOne({
      targetType: 'recipe',
      recipeId: 'r1',
      reporterUid: 'system:automod',
      source: 'automod',
      status: 'open',
      classifier: { severity: 'medium', category: 'harassment', reason: 'openai:harassment:0.60', source: 'openai' },
      createdAt: new Date(),
    })
    const res = await request(app).get('/api/admin/recipes/r1/automod').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.classifier).toMatchObject({ severity: 'medium', category: 'harassment' })
  })

  it('returns null classifier when there is no open automod report', async () => {
    admin.__setClaims({ admin: true })
    // A user report (no source) and a CLOSED automod report must both be ignored.
    await getDB().collection('reports').insertMany([
      { targetType: 'recipe', recipeId: 'r1', reporterUid: 'u1', status: 'open', createdAt: new Date() },
      { targetType: 'recipe', recipeId: 'r1', reporterUid: 'system:automod', source: 'automod', status: 'dismissed', classifier: { severity: 'medium' }, createdAt: new Date() },
    ])
    const res = await request(app).get('/api/admin/recipes/r1/automod').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.classifier).toBeNull()
  })
})

describe('PATCH /api/admin/recipes/:id/moderation', () => {
  it('requires admin', async () => {
    await seedRecipe({ ...BASE_RECIPE, _id: 'r1' })
    const res = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'hidden' })
    expect(res.status).toBe(403)
  })

  it('hides and unhides a recipe (bypassing the owner check)', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE_RECIPE, _id: 'r1', userId: 'someone-else' })

    const hide = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'hidden' })
    expect(hide.status).toBe(200)
    expect(hide.body.status).toBe('hidden')
    let doc = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(doc.status).toBe('hidden')
    expect(doc.moderatedBy).toBe(TEST_UID)

    const unhide = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'active' })
    expect(unhide.status).toBe(200)
    doc = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(doc.status).toBe('active')
  })

  it('rejects an invalid status value', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE_RECIPE, _id: 'r1' })
    const res = await request(app)
      .patch('/api/admin/recipes/r1/moderation')
      .set(AUTH_HEADER)
      .send({ status: 'banished' })
    expect(res.status).toBe(400)
  })
})

describe('soft-hidden recipes are filtered from public read paths', () => {
  beforeEach(async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'visible', title: 'Visible Dish', views: 5 },
      { ...BASE_RECIPE, _id: 'hidden', title: 'Hidden Dish', status: 'hidden', views: 99 },
      { ...BASE_RECIPE, _id: 'legacy', title: 'Legacy Dish', views: 3 }, // no status field
    ])
  })

  it('GET /recipes excludes hidden but keeps legacy (no status field)', async () => {
    const res = await request(app).get('/api/recipes?recipesPerPage=50')
    const ids = res.body.recipeList.map((r) => r._id)
    expect(ids).toContain('visible')
    expect(ids).toContain('legacy')
    expect(ids).not.toContain('hidden')
    expect(res.body.total_results).toBe(2)
  })

  it('GET /getRecipe 404s a hidden recipe and does not increment views', async () => {
    const res = await request(app).get('/api/getRecipe?id=hidden')
    expect(res.status).toBe(404)
    const doc = await getDB().collection('recipes').findOne({ _id: 'hidden' })
    expect(doc.views).toBe(99) // unchanged
  })

  it('GET /getTrendingRecipes excludes hidden', async () => {
    const res = await request(app).get('/api/getTrendingRecipes?limit=20')
    const ids = res.body.map((r) => r._id)
    expect(ids).not.toContain('hidden')
    expect(ids).toContain('visible')
  })

  it('GET /searchAutoCompleteRecipes excludes hidden', async () => {
    const res = await request(app).get('/api/searchAutoCompleteRecipes?title=Dish')
    const ids = res.body.map((r) => r._id)
    expect(ids).not.toContain('hidden')
    expect(ids).toContain('visible')
  })

  it('GET /getCreatedRecipes excludes the author’s own hidden recipe', async () => {
    await getDB().collection('recipes').updateMany({}, { $set: { userId: TEST_UID } })
    const res = await request(app).get('/api/getCreatedRecipes?recipesPerPage=50').set(AUTH_HEADER)
    const ids = res.body.recipes.map((r) => r._id)
    expect(ids).not.toContain('hidden')
    expect(ids).toContain('visible')
  })

  it('GET /getSavedRecipes excludes a saved-but-hidden recipe', async () => {
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'visible', dateSaved: '2' },
        { recipeId: 'hidden', dateSaved: '1' },
      ],
    })
    const res = await request(app).get('/api/getSavedRecipes?recipesPerPage=50').set(AUTH_HEADER)
    const ids = res.body.recipes.map((r) => r._id)
    expect(ids).toContain('visible')
    expect(ids).not.toContain('hidden')
  })
})

describe('PATCH /api/admin/reviews/moderation', () => {
  it('requires admin', async () => {
    const res = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'baduser', moderationHidden: true })
    expect(res.status).toBe(403)
  })

  it('takes down and restores a review by (username, recipeId), preserving text', async () => {
    admin.__setClaims({ admin: true })
    await seedRating({ username: 'baduser', recipeId: 'r1', reviewText: 'nasty stuff', rating: 1, reviewCreatedAt: '1', reviewLastUpdated: '1' })

    const hide = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'baduser', moderationHidden: true })
    expect(hide.status).toBe(200)

    let doc = await getDB().collection('ratings').findOne({ username: 'baduser', recipeId: 'r1' })
    expect(doc.moderationHidden).toBe(true)
    expect(doc.reviewText).toBe('nasty stuff') // original text preserved

    // Hidden review is filtered from the public list.
    const list = await request(app).get('/api/getReviews?recipeId=r1')
    expect(list.body.reviews.find((r) => r.username === 'baduser')).toBeUndefined()
    expect(list.body.totalCount).toBe(0)

    const restore = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'baduser', moderationHidden: false })
    expect(restore.status).toBe(200)
    const listAfter = await request(app).get('/api/getReviews?recipeId=r1')
    expect(listAfter.body.reviews.find((r) => r.username === 'baduser')).toBeDefined()
  })

  it('drops a user rating from their list when its recipe is soft-hidden (returnRecipeData)', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'vis', title: 'Visible' },
      { ...BASE_RECIPE, _id: 'hid', title: 'Hidden', status: 'hidden' },
    ])
    await seedUser('rater-uid', 'rater')
    await seedRating({ userId: 'rater-uid', username: 'rater', recipeId: 'vis', reviewText: 'good', rating: 5 })
    await seedRating({ userId: 'rater-uid', username: 'rater', recipeId: 'hid', reviewText: 'also good', rating: 4 })

    const res = await request(app).get(
      '/api/getSingleUserReviews?username=rater&returnRecipeData=true&reviewsPerPage=50'
    )
    expect(res.status).toBe(200)
    const ids = res.body.reviews.map((r) => r.recipeId)
    expect(ids).toContain('vis')
    expect(ids).not.toContain('hid')
  })

  it('excludes a taken-down rating from the recipe score, and restores it on un-hide', async () => {
    admin.__setClaims({ admin: true })
    await seedRecipe({ ...BASE_RECIPE, _id: 'r1', rating: { rateCount: 2, rateValue: 3 } })
    await seedRating({ username: 'good', recipeId: 'r1', rating: 5, reviewText: 'great' })
    await seedRating({ username: 'troll', recipeId: 'r1', rating: 1, reviewText: 'abusive' })

    // Take down the 1-star troll review.
    await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'troll', moderationHidden: true })

    let recipe = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(recipe.rating.rateCount).toBe(1) // only the 5-star counts now
    expect(recipe.rating.rateValue).toBe(5)

    // Restore it -> back in the average.
    await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'troll', moderationHidden: false })

    recipe = await getDB().collection('recipes').findOne({ _id: 'r1' })
    expect(recipe.rating.rateCount).toBe(2)
    expect(recipe.rating.rateValue).toBe(3) // (5 + 1) / 2
  })

  it('validates the body and 404s an unknown review', async () => {
    admin.__setClaims({ admin: true })
    const badBody = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'r1', username: 'baduser' })
    expect(badBody.status).toBe(400)

    const missing = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: 'nope', username: 'ghost', moderationHidden: true })
    expect(missing.status).toBe(404)
  })
})
