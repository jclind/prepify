/**
 * P1 — automated text moderation wired into the write routes.
 *
 * util/textModeration.moderateText is mocked so each test drives a deterministic
 * verdict (high / medium / clean) without an API call; the REAL automod helper,
 * routes, visibility predicates, audit log and reports collection are exercised.
 *
 * Contract under test, per the design doc:
 *   - recipe  high   → 422 blocked, nothing persisted
 *   - recipe  medium → 201 saved as 'pending_review' + open automod report + audit
 *   - recipe  clean  → 201 normal, publicly visible
 *   - review / username / profile  high|medium → 422 blocked
 *   - public reads exclude 'pending_review'; the owner's own list includes it
 */

jest.mock('../util/textModeration', () => ({ moderateText: jest.fn() }))

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const app = require('../app')
const { getDB } = require('../db')
const { moderateText } = require('../util/textModeration')
const { SYSTEM_ACTOR } = require('../util/auditLog')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { seedRecipe, seedUser } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH = { Authorization: 'Bearer fake-test-token' }

const HIGH = { allowed: false, severity: 'high', reason: 'openai:hate:0.97', category: 'hate', source: 'openai' }
const MEDIUM = { allowed: false, severity: 'medium', reason: 'openai:harassment:0.60', category: 'harassment', source: 'openai' }
const CLEAN = { allowed: true, severity: 'clean', reason: null, category: null, source: 'openai' }

// Minimal valid recipe payload (server stamps _id/userId/counters).
const RECIPE_BODY = {
  title: 'Tuscan Chicken Skillet',
  description: 'A great dish',
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: ['low-carb'],
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '1000000',
  // Real client shapes (src/types.ts): parsed-ingredient row + step row.
  ingredients: [
    {
      id: 'i1',
      parsedIngredient: { ingredient: 'chicken', originalIngredientString: '1 lb chicken', comment: null },
      ingredientData: { name: 'chicken' },
    },
  ],
  instructions: [{ content: 'Cook the chicken', index: 0, id: 's1' }],
  recipeImage: 'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ft.jpg?alt=media&token=abc',
}

beforeEach(() => {
  moderateText.mockReset()
  moderateText.mockResolvedValue(CLEAN)
})

afterEach(async () => {
  admin.__resetClaims()
  admin.__resetUsers()
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
    db.collection('reports').deleteMany({}),
    db.collection('auditLog').deleteMany({}),
    db.collection('usernames').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
    db.collection('userProfiles').deleteMany({}),
  ])
})

describe('POST /addRecipe — moderation tiers', () => {
  it('high confidence → 422 blocked, nothing persisted', async () => {
    moderateText.mockResolvedValue(HIGH)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    expect(await getDB().collection('recipes').countDocuments({})).toBe(0)
  })

  it('medium confidence → 201 pending_review + open automod report + system audit', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(true)

    const db = getDB()
    const recipe = await db.collection('recipes').findOne(recipeIdQuery(res.body._id))
    expect(recipe.status).toBe('pending_review')

    const report = await db.collection('reports').findOne({ recipeId: String(res.body._id) })
    expect(report).toMatchObject({
      targetType: 'recipe',
      reporterUid: SYSTEM_ACTOR.uid,
      status: 'open',
      source: 'automod',
    })

    const audit = await db.collection('auditLog').findOne({ action: 'recipe.autohold' })
    expect(audit).toMatchObject({ actorType: 'system', actorUid: SYSTEM_ACTOR.uid, targetType: 'recipe' })
  })

  it('clean → 201 normal (no pending flag, no report)', async () => {
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(false)
    const recipe = await getDB().collection('recipes').findOne(recipeIdQuery(res.body._id))
    expect(recipe.status).toBeUndefined()
    expect(await getDB().collection('reports').countDocuments({})).toBe(0)
  })
})

describe('PUT /editRecipe — medium hold never downgrades an admin takedown', () => {
  it('medium edit of an active recipe → pending_review + automod report', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-active', userId: TEST_UID })
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).put('/api/editRecipe?recipeId=e-active').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(200)
    const db = getDB()
    expect((await db.collection('recipes').findOne(recipeIdQuery('e-active'))).status).toBe('pending_review')
    expect(await db.collection('reports').countDocuments({ recipeId: 'e-active', source: 'automod' })).toBe(1)
  })

  it('medium edit of an admin-hidden recipe keeps it hidden and files no automod report', async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'e-hidden', userId: TEST_UID, status: 'hidden' })
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).put('/api/editRecipe?recipeId=e-hidden').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(200)
    const db = getDB()
    // Admin takedown preserved — not lifted to the weaker owner-visible pending state.
    expect((await db.collection('recipes').findOne(recipeIdQuery('e-hidden'))).status).toBe('hidden')
    expect(await db.collection('reports').countDocuments({ recipeId: 'e-hidden' })).toBe(0)
  })
})

describe('pending_review visibility split', () => {
  beforeEach(async () => {
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-public', userId: TEST_UID, title: 'Public Pasta' })
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-pending', userId: TEST_UID, title: 'Held Pasta', status: 'pending_review' })
  })

  it('public GET /recipes excludes pending_review', async () => {
    const res = await request(app).get('/api/recipes')
    const ids = res.body.recipeList.map((r) => r._id)
    expect(ids).toContain('r-public')
    expect(ids).not.toContain('r-pending')
  })

  it("owner GET /getCreatedRecipes includes their own pending_review", async () => {
    const res = await request(app).get('/api/getCreatedRecipes').set(AUTH)
    const ids = res.body.recipes.map((r) => r._id)
    expect(ids).toContain('r-public')
    expect(ids).toContain('r-pending')
  })

  it('owner GET /getRecipe can view their own pending_review recipe', async () => {
    const res = await request(app).get('/api/getRecipe?id=r-pending').set(AUTH)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe('r-pending')
  })

  it('anonymous GET /getRecipe on a pending_review recipe is 404', async () => {
    const res = await request(app).get('/api/getRecipe?id=r-pending')
    expect(res.status).toBe(404)
  })
})

describe('reviews — high|medium both block', () => {
  beforeEach(async () => {
    await seedUser(TEST_UID, 'chef_test')
    await seedRecipe({ ...RECIPE_BODY, _id: 'r-1', userId: 'someone-else' })
  })

  it('medium review → 422 (no owner-only state)', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/newReview').set(AUTH).send({ recipeId: 'r-1', reviewText: 'borderline' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
    expect(await getDB().collection('ratings').countDocuments({})).toBe(0)
  })

  it('clean review → 200 persisted', async () => {
    const res = await request(app).post('/api/newReview').set(AUTH).send({ recipeId: 'r-1', reviewText: 'lovely dish' })
    expect(res.status).toBe(200)
    expect(await getDB().collection('ratings').countDocuments({ userId: TEST_UID, recipeId: 'r-1' })).toBe(1)
  })
})

describe('username + profile blocking', () => {
  it('high-confidence username → 422', async () => {
    moderateText.mockResolvedValue(HIGH)
    const res = await request(app).post('/api/setUsername?username=badword').set(AUTH)
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('CONTENT_BLOCKED')
  })

  it('medium-confidence bio → 422', async () => {
    moderateText.mockResolvedValue(MEDIUM)
    const res = await request(app).post('/api/updateProfile').set(AUTH).send({ bio: 'borderline bio', location: 'NY' })
    expect(res.status).toBe(422)
    expect(await getDB().collection('userProfiles').countDocuments({})).toBe(0)
  })

  it('clean username → 200', async () => {
    const res = await request(app).post('/api/setUsername?username=cleanchef').set(AUTH)
    expect(res.status).toBe(200)
  })
})

describe('fail-open at the route layer', () => {
  it('classifier-disabled/error verdict (clean) lets the recipe save', async () => {
    moderateText.mockResolvedValue({ ...CLEAN, source: 'error' })
    const res = await request(app).post('/api/addRecipe').set(AUTH).send(RECIPE_BODY)
    expect(res.status).toBe(201)
    expect(res.body.pendingReview).toBe(false)
  })
})
