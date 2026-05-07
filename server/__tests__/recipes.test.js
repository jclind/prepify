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
const { seedRecipe, seedRecipes, seedUserRecipeData } = require('./helpers/seed')

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
    db.collection('stats').deleteMany({}),
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

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

// ─── GET /getRecipe ───────────────────────────────────────────────────────────

describe('GET /getRecipe', () => {
  beforeEach(async () => {
    await seedRecipe({ ...BASE_RECIPE, views: 5 })
  })

  it('returns 400 if id is missing', async () => {
    const res = await request(app).get('/getRecipe')
    expect(res.status).toBe(400)
  })

  it('returns 404 if recipe is not found', async () => {
    const res = await request(app).get('/getRecipe?id=nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns the recipe and increments the view count', async () => {
    const res = await request(app).get(`/getRecipe?id=${RECIPE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe(RECIPE_ID)
    expect(res.body.views).toBe(6)
  })
})

// ─── DELETE /deleteRecipe ─────────────────────────────────────────────────────

describe('DELETE /deleteRecipe', () => {
  beforeEach(async () => {
    await seedRecipe({ ...BASE_RECIPE })
    await seedUserRecipeData(TEST_UID, { userRecipes: [{ recipeId: RECIPE_ID }] })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).delete(`/deleteRecipe?recipeId=${RECIPE_ID}&userId=${TEST_UID}`)
    expect(res.status).toBe(401)
  })

  it('rejects if userId does not match token uid (403)', async () => {
    const res = await request(app)
      .delete(`/deleteRecipe?recipeId=${RECIPE_ID}&userId=other-uid`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns 404 if the recipe does not exist', async () => {
    const res = await request(app)
      .delete(`/deleteRecipe?recipeId=nonexistent&userId=${TEST_UID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(404)
  })

  it('deletes the recipe and removes it from userRecipes', async () => {
    const res = await request(app)
      .delete(`/deleteRecipe?recipeId=${RECIPE_ID}&userId=${TEST_UID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })

    const db = getDB()
    expect(await db.collection('recipes').findOne({ _id: RECIPE_ID })).toBeNull()

    const userData = await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    expect(userData.userRecipes).toHaveLength(0)
  })
})

// ─── GET /getSavedRecipe ──────────────────────────────────────────────────────

describe('GET /getSavedRecipe', () => {
  beforeEach(async () => {
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [{ recipeId: RECIPE_ID, dateSaved: '99999' }],
    })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get(`/getSavedRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('rejects if userId does not match token uid (403)', async () => {
    const res = await request(app)
      .get(`/getSavedRecipe?userId=other-uid&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('returns the saved entry when the recipe is in the saved list', async () => {
    const res = await request(app)
      .get(`/getSavedRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.recipeId).toBe(RECIPE_ID)
    expect(res.body.dateSaved).toBe('99999')
  })

  it('returns null when the recipe is not in the saved list', async () => {
    const res = await request(app)
      .get(`/getSavedRecipe?userId=${TEST_UID}&recipeId=not-saved`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })
})

// ─── POST /madeRecipe ─────────────────────────────────────────────────────────

describe('POST /madeRecipe', () => {
  beforeEach(async () => {
    await seedRecipe({ ...BASE_RECIPE, numTimesMade: 0 })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post(`/madeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('rejects if userId does not match token uid (403)', async () => {
    const res = await request(app)
      .post(`/madeRecipe?userId=other-uid&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('increments numTimesMade and adds to madeRecipes', async () => {
    const res = await request(app)
      .post(`/madeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ made: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesMade).toBe(1)

    const userData = await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    expect(userData.madeRecipes).toContainEqual({ recipeId: RECIPE_ID })
  })

  it('does not double-add to madeRecipes on repeated calls ($addToSet)', async () => {
    await request(app).post(`/madeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`).set(AUTH_HEADER)
    await request(app).post(`/madeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`).set(AUTH_HEADER)

    const db = getDB()
    const userData = await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    const entries = userData.madeRecipes.filter((e) => e.recipeId === RECIPE_ID)
    expect(entries).toHaveLength(1)
  })
})

// ─── GET /checkMadeRecipe ─────────────────────────────────────────────────────

describe('GET /checkMadeRecipe', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get(`/checkMadeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns { made: false } when user has not made the recipe', async () => {
    const res = await request(app)
      .get(`/checkMadeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ made: false })
  })

  it('returns { made: true } when user has made the recipe', async () => {
    await seedUserRecipeData(TEST_UID, { madeRecipes: [{ recipeId: RECIPE_ID }] })

    const res = await request(app)
      .get(`/checkMadeRecipe?userId=${TEST_UID}&recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ made: true })
  })
})

// ─── GET /searchAutoCompleteRecipes ───────────────────────────────────────────

describe('GET /searchAutoCompleteRecipes', () => {
  beforeEach(async () => {
    await seedRecipes([
      { _id: 'ac-1', title: 'Apple Pie', recipeImage: 'apple.jpg' },
      { _id: 'ac-2', title: 'Apple Crumble', recipeImage: 'crumble.jpg' },
      { _id: 'ac-3', title: 'Banana Bread', recipeImage: 'banana.jpg' },
    ])
  })

  it('returns recipes matching the title search', async () => {
    const res = await request(app).get('/searchAutoCompleteRecipes?title=apple')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const titles = res.body.map((r) => r.title)
    expect(titles).toContain('Apple Pie')
    expect(titles).toContain('Apple Crumble')
  })

  it('returns only _id, title, and recipeImage fields', async () => {
    const res = await request(app).get('/searchAutoCompleteRecipes?title=banana')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(Object.keys(res.body[0]).sort()).toEqual(['_id', 'recipeImage', 'title'])
  })

  it('is case-insensitive', async () => {
    const res = await request(app).get('/searchAutoCompleteRecipes?title=APPLE')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('limits results to 8', async () => {
    await seedRecipes(
      Array.from({ length: 10 }, (_, i) => ({ _id: `extra-${i}`, title: `apple-extra-${i}` }))
    )
    const res = await request(app).get('/searchAutoCompleteRecipes?title=apple')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(8)
  })
})

// ─── GET /getTrendingRecipes ──────────────────────────────────────────────────

describe('GET /getTrendingRecipes', () => {
  beforeEach(async () => {
    await seedRecipes([
      { _id: 'tr-1', title: 'Hot', views: 100 },
      { _id: 'tr-2', title: 'Warm', views: 50 },
      { _id: 'tr-3', title: 'Cool', views: 10 },
      { _id: 'tr-4', title: 'Cold', views: 1 },
      { _id: 'tr-5', title: 'Frozen', views: 0 },
    ])
  })

  it('returns 4 recipes sorted by views descending by default', async () => {
    const res = await request(app).get('/getTrendingRecipes')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
    expect(res.body[0]._id).toBe('tr-1')
  })

  it('respects the limit query param', async () => {
    const res = await request(app).get('/getTrendingRecipes?limit=2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]._id).toBe('tr-1')
  })

  it('caps limit at 20', async () => {
    await seedRecipes(
      Array.from({ length: 20 }, (_, i) => ({ _id: `cap-${i}`, title: `Recipe ${i}`, views: i }))
    )
    const res = await request(app).get('/getTrendingRecipes?limit=100')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(20)
  })
})
