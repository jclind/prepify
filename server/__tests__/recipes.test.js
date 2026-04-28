/**
 * Auth approach
 * ─────────────
 * server/__mocks__/firebase-admin.js is automatically used by Jest for all
 * imports of 'firebase-admin'. Its verifyIdToken always resolves to
 * { uid: 'test-uid' }, so any request carrying an Authorization header
 * (any Bearer value) passes verifyToken and receives req.uid = 'test-uid'.
 *
 * Routes that compare query.userId to req.uid (saveRecipe, unsaveRecipe, etc.)
 * must include userId=test-uid in the query string to avoid a 403.
 *
 * None of these test groups need a different uid, so the default mock is
 * sufficient throughout this file.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const RECIPE_ID = 'recipe-001'

const BASE_RECIPE = {
  _id: RECIPE_ID,
  title: 'Tuscan Chicken Skillet',
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: ['low-carb'],
  numTimesSaved: 0,
  numTimesMade: 0,
  views: 0,
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '1000000',
  description: 'A great dish',
  ingredients: [{ id: 'i1', name: 'chicken' }],
  instructions: [{ step: 'Cook the chicken' }],
}

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
  ])
})

// ─── GET /recipes ─────────────────────────────────────────────────────────────

describe('GET /recipes', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      { ...BASE_RECIPE },
      { ...BASE_RECIPE, _id: 'recipe-002', title: 'Beef Tacos', cuisine: 'Mexican', mealTypes: ['lunch'], nutritionLabels: [] },
      { ...BASE_RECIPE, _id: 'recipe-003', title: 'Pasta Primavera', cuisine: 'Italian', mealTypes: ['lunch'], nutritionLabels: [] },
    ])
  })

  it('returns { recipeList, total_results } shape', async () => {
    const res = await request(app).get('/recipes')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('recipeList')
    expect(res.body).toHaveProperty('total_results')
    expect(Array.isArray(res.body.recipeList)).toBe(true)
    expect(typeof res.body.total_results).toBe('number')
  })

  it('filters results by search query (q)', async () => {
    const res = await request(app).get('/recipes?q=chicken')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.recipeList[0].title).toBe('Tuscan Chicken Skillet')
    expect(res.body.total_results).toBe(1)
  })

  it('search is case-insensitive', async () => {
    const res = await request(app).get('/recipes?q=PASTA')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.recipeList[0]._id).toBe('recipe-003')
  })

  it('returns empty list when no recipes match query', async () => {
    const res = await request(app).get('/recipes?q=zzznomatch')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(0)
    expect(res.body.total_results).toBe(0)
  })

  it('page 0 with recipesPerPage=2 returns first 2 of 3', async () => {
    const res = await request(app).get('/recipes?page=0&recipesPerPage=2')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(2)
    expect(res.body.total_results).toBe(3)
  })

  it('page 1 with recipesPerPage=2 returns the remaining 1', async () => {
    const res = await request(app).get('/recipes?page=1&recipesPerPage=2')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.total_results).toBe(3)
  })
})

// ─── POST /addRecipe ──────────────────────────────────────────────────────────

describe('POST /addRecipe', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post('/addRecipe').send({})
    expect(res.status).toBe(401)
  })

  it('rejects request with missing required fields (400)', async () => {
    const res = await request(app)
      .post('/addRecipe')
      .set(AUTH_HEADER)
      .send({ userId: TEST_UID }) // passes auth check, fails field validation
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Missing required fields/)
  })

  it('creates recipe and enforces numTimesSaved/numTimesMade/views = 0 regardless of client payload', async () => {
    const payload = {
      _id: 'new-recipe-001',
      userId: TEST_UID,
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: [{ id: 'i1', name: 'salt' }],
      instructions: [{ step: 'Add salt' }],
      mealTypes: ['dinner'],
      // client tries to manipulate these counters
      numTimesSaved: 99,
      numTimesMade: 10,
      views: 500,
    }

    const res = await request(app)
      .post('/addRecipe')
      .set(AUTH_HEADER)
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('insertedId')

    const db = getDB()
    const stored = await db.collection('recipes').findOne({ _id: 'new-recipe-001' })
    expect(stored.numTimesSaved).toBe(0)
    expect(stored.numTimesMade).toBe(0)
    expect(stored.views).toBe(0)
  })
})

// ─── PUT /saveRecipe ──────────────────────────────────────────────────────────

describe('PUT /saveRecipe', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertOne({ ...BASE_RECIPE, numTimesSaved: 0 })
  })

  it('saves a recipe and increments numTimesSaved', async () => {
    const res = await request(app)
      .put(`/saveRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesSaved).toBe(1)
  })

  it('returns 409 on duplicate save attempt', async () => {
    // first save
    await request(app)
      .put(`/saveRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    // second save — same recipe, same user
    const res = await request(app)
      .put(`/saveRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already saved/)
  })
})

// ─── PUT /unsaveRecipe ────────────────────────────────────────────────────────

describe('PUT /unsaveRecipe', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertOne({ ...BASE_RECIPE, numTimesSaved: 1 })
    await db.collection('userRecipeData').insertOne({
      _id: TEST_UID,
      savedRecipes: [{ recipeId: RECIPE_ID, dateSaved: '12345' }],
    })
  })

  it('returns 404 if recipe is not in the user\'s saved list', async () => {
    const res = await request(app)
      .put(`/unsaveRecipe?userId=${TEST_UID}&recipeId=not-saved-id`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not in saved list/)
  })

  it('unsaves a recipe and decrements numTimesSaved', async () => {
    const res = await request(app)
      .put(`/unsaveRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ unsaved: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesSaved).toBe(0)
  })

  it('does not decrement numTimesSaved below 0', async () => {
    const db = getDB()
    // Force counter to 0 before unsaving (simulates already-corrected data)
    await db.collection('recipes').updateOne({ _id: RECIPE_ID }, { $set: { numTimesSaved: 0 } })

    const res = await request(app)
      .put(`/unsaveRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)

    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesSaved).toBe(0)
  })
})
