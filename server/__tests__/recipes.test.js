/**
 * Auth approach
 * ─────────────
 * server/__mocks__/firebase-admin.js is automatically used by Jest for all
 * imports of 'firebase-admin'. Its verifyIdToken always resolves to
 * { uid: 'test-uid' }, so any request carrying an Authorization header
 * (any Bearer value) passes verifyToken and receives req.uid = 'test-uid'.
 *
 * None of these test groups need a different uid, so the default mock is
 * sufficient throughout this file.
 */

const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked (server/__mocks__/firebase-admin.js)
const app = require('../app')
const { getDB } = require('../db')
const {
  seedRecipe,
  seedRecipes,
  seedUserRecipeData,
  seedRating,
} = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const RECIPE_ID = 'recipe-001'

// Drive requests through ONE long-lived listening server rather than letting
// supertest spin up (and tear down) an ephemeral server per `request(server)` call.
// Under parallel-worker load that per-call churn intermittently surfaced as a
// "socket hang up" (a transient connection error read as a non-array body), e.g.
// the `GET /getTrendingRecipes › caps limit at 20` flake. Same approach as
// writeLimiter.test.js (PR-C).
let server
beforeAll(() => {
  server = app.listen(0)
})
afterAll((done) => {
  server.close(done)
})

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
  recipeImage:
    'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ftuscan.jpg?alt=media&token=abc',
}

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('recipes').deleteMany({}),
    db.collection('userRecipeData').deleteMany({}),
    db.collection('stats').deleteMany({}),
    db.collection('ratings').deleteMany({}),
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
    const res = await request(server).get('/api/recipes')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('recipeList')
    expect(res.body).toHaveProperty('total_results')
    expect(Array.isArray(res.body.recipeList)).toBe(true)
    expect(typeof res.body.total_results).toBe('number')
  })

  // Browse is intentionally public — anonymous visitors can view recipes.
  // Explicit assertion so a future stray verifyToken doesn't silently break it.
  it('succeeds without an Authorization header (route is public)', async () => {
    const res = await request(server).get('/api/recipes')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('recipeList')
    expect(res.body).toHaveProperty('total_results')
  })

  it('filters results by search query (q)', async () => {
    const res = await request(server).get('/api/recipes?q=chicken')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.recipeList[0].title).toBe('Tuscan Chicken Skillet')
    expect(res.body.total_results).toBe(1)
  })

  it('search is case-insensitive', async () => {
    const res = await request(server).get('/api/recipes?q=PASTA')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.recipeList[0]._id).toBe('recipe-003')
  })

  it('returns empty list when no recipes match query', async () => {
    const res = await request(server).get('/api/recipes?q=zzznomatch')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(0)
    expect(res.body.total_results).toBe(0)
  })

  it('page 0 with recipesPerPage=2 returns first 2 of 3', async () => {
    const res = await request(server).get('/api/recipes?page=0&recipesPerPage=2')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(2)
    expect(res.body.total_results).toBe(3)
  })

  it('page 1 with recipesPerPage=2 returns the remaining 1', async () => {
    const res = await request(server).get('/api/recipes?page=1&recipesPerPage=2')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.total_results).toBe(3)
  })
})

// ─── GET /recipes — sorting & meal filter ─────────────────────────────────────

describe('GET /recipes sorting & meal filter', () => {
  beforeEach(async () => {
    const db = getDB()
    // Distinct price / time / createdAt / saves so order is unambiguous.
    await db.collection('recipes').insertMany([
      { ...BASE_RECIPE, _id: 's-a', title: 'Alpha', mealTypes: ['breakfast'], nutritionLabels: ['vegan'], servingPrice: 100, totalTime: 10, createdAt: '3000', numTimesSaved: 5 },
      { ...BASE_RECIPE, _id: 's-b', title: 'Bravo', mealTypes: ['dinner'], nutritionLabels: [], servingPrice: 300, totalTime: 50, createdAt: '1000', numTimesSaved: 1 },
      { ...BASE_RECIPE, _id: 's-c', title: 'Charlie', mealTypes: ['lunch', 'dinner'], nutritionLabels: ['vegan'], servingPrice: 200, totalTime: 30, createdAt: '2000', numTimesSaved: 9 },
    ])
  })

  const firstId = async (order) => {
    const res = await request(server).get(`/api/recipes?order=${order}`)
    expect(res.status).toBe(200)
    return res.body.recipeList[0]._id
  }

  it('cheapest → lowest servingPrice first', async () => {
    expect(await firstId('cheapest')).toBe('s-a')
  })
  it('expensive → highest servingPrice first', async () => {
    expect(await firstId('expensive')).toBe('s-b')
  })
  it('shortest → lowest totalTime first', async () => {
    expect(await firstId('shortest')).toBe('s-a')
  })
  it('longest → highest totalTime first', async () => {
    expect(await firstId('longest')).toBe('s-b')
  })
  it('new → newest createdAt first', async () => {
    expect(await firstId('new')).toBe('s-a')
  })
  it('old → oldest createdAt first', async () => {
    expect(await firstId('old')).toBe('s-b')
  })
  it('popular → most-saved first', async () => {
    expect(await firstId('popular')).toBe('s-c')
  })

  it('mealTypes filters to recipes with that meal', async () => {
    const res = await request(server).get('/api/recipes?mealTypes=dinner')
    expect(res.status).toBe(200)
    expect(res.body.recipeList.map((r) => r._id).sort()).toEqual(['s-b', 's-c'])
  })

  it('mealTypes AND tags (diet) combine', async () => {
    const res = await request(server).get('/api/recipes?mealTypes=dinner&tags=vegan')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(1)
    expect(res.body.recipeList[0]._id).toBe('s-c')
  })

  // Hardening: `order` is client-controlled; an inherited-member name must not
  // resolve to a function/object and break the Mongo sort.
  it('ignores a prototype-polluting order value (no 500)', async () => {
    const res = await request(server).get('/api/recipes?order=constructor')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.recipeList)).toBe(true)
  })

  // Hardening: a repeated list param arrives as an array; must not throw.
  it('handles a repeated mealTypes param as an array', async () => {
    const res = await request(server).get(
      '/api/recipes?mealTypes=dinner&mealTypes=lunch'
    )
    expect(res.status).toBe(200)
    expect(res.body.recipeList.map((r) => r._id).sort()).toEqual(['s-b', 's-c'])
  })
})

// ─── GET /recipes — diet filter (conjunctive / AND) ───────────────────────────

describe('GET /recipes diet filter (AND)', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      { ...BASE_RECIPE, _id: 'd-1', title: 'Both', nutritionLabels: ['vegan', 'gluten-free'] },
      { ...BASE_RECIPE, _id: 'd-2', title: 'VeganOnly', nutritionLabels: ['vegan'] },
      { ...BASE_RECIPE, _id: 'd-3', title: 'GfOnly', nutritionLabels: ['gluten-free'] },
    ])
  })

  it('a single diet matches any recipe carrying it', async () => {
    const res = await request(server).get('/api/recipes?diets=vegan')
    expect(res.status).toBe(200)
    expect(res.body.recipeList.map((r) => r._id).sort()).toEqual(['d-1', 'd-2'])
  })

  it('multiple diets require ALL labels (AND, not OR)', async () => {
    const res = await request(server).get('/api/recipes?diets=vegan,gluten-free')
    expect(res.status).toBe(200)
    expect(res.body.recipeList.map((r) => r._id)).toEqual(['d-1'])
  })
})

describe('GET /recipes/facets', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertMany([
      { ...BASE_RECIPE, _id: 'f-1', cuisine: 'Italian', mealTypes: ['dinner'], nutritionLabels: ['vegan'] },
      { ...BASE_RECIPE, _id: 'f-2', cuisine: 'Mexican', mealTypes: ['lunch'], nutritionLabels: ['gluten-free'] },
      // Empty/missing values should be dropped, not surfaced as facets.
      { ...BASE_RECIPE, _id: 'f-3', cuisine: '', mealTypes: [], nutritionLabels: [] },
    ])
  })

  it('returns only the distinct, non-empty values present in the catalog', async () => {
    const res = await request(server).get('/api/recipes/facets')
    expect(res.status).toBe(200)
    expect(res.body.cuisines.sort()).toEqual(['Italian', 'Mexican'])
    expect(res.body.diets.sort()).toEqual(['gluten-free', 'vegan'])
    expect(res.body.mealTypes.sort()).toEqual(['dinner', 'lunch'])
    // The empty-string cuisine from f-3 is filtered out.
    expect(res.body.cuisines).not.toContain('')
  })
})

// ─── POST /addRecipe ──────────────────────────────────────────────────────────

describe('POST /addRecipe', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).post('/api/addRecipe').send({})
    expect(res.status).toBe(401)
  })

  it('rejects request with missing required fields (400)', async () => {
    const res = await request(server)
      .post('/api/addRecipe')
      .set(AUTH_HEADER)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Missing required fields/)
  })

  it('creates recipe, generates _id server-side, and enforces safe defaults regardless of client payload', async () => {
    const payload = {
      // Client tries to dictate the _id — server must ignore it
      _id: 'client-supplied-id-should-be-ignored',
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

    const res = await request(server)
      .post('/api/addRecipe')
      .set(AUTH_HEADER)
      .send(payload)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('_id')
    expect(res.body._id).toMatch(/^[a-f0-9]{24}$/)
    expect(res.body._id).not.toBe('client-supplied-id-should-be-ignored')

    const newId = res.body._id
    const db = getDB()
    const { ObjectId } = require('mongodb')
    const stored = await db.collection('recipes').findOne({ _id: new ObjectId(newId) })
    expect(stored).not.toBeNull()
    expect(stored.numTimesSaved).toBe(0)
    expect(stored.numTimesMade).toBe(0)
    expect(stored.views).toBe(0)
    // Server should stamp userId from the verified token, regardless of body
    expect(stored.userId).toBe(TEST_UID)
  })

  it('ignores client-supplied status, featured, and a forged rating on create', async () => {
    const res = await request(server)
      .post('/api/addRecipe')
      .set(AUTH_HEADER)
      .send({
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [{ id: 'i1', name: 'salt' }],
        instructions: [{ content: 'Add salt', index: 1, id: 's1' }],
        mealTypes: ['dinner'],
        // Curation / moderation flags a client must never be able to set on create.
        status: 'active',
        featured: true,
        // A forged rating to fake social proof on a brand-new recipe.
        rating: { rateCount: 99, rateValue: 5 },
      })

    expect(res.status).toBe(201)
    const { ObjectId } = require('mongodb')
    const stored = await getDB().collection('recipes').findOne({ _id: new ObjectId(res.body._id) })
    expect(stored.status).toBeUndefined()
    expect(stored.featured).toBeUndefined()
    expect(stored.rating).toEqual({ rateCount: 0, rateValue: 0 })
  })

  describe('input bounds (defense-in-depth)', () => {
    const validBody = () => ({
      title: 'Test Recipe',
      description: 'A test recipe',
      ingredients: [{ id: 'i1', name: 'salt' }],
      instructions: [{ content: 'Add salt', index: 1, id: 's1' }],
      mealTypes: ['dinner'],
    })

    const expectRejected = async (overrides, pattern) => {
      const res = await request(server)
        .post('/api/addRecipe')
        .set(AUTH_HEADER)
        .send({ ...validBody(), ...overrides })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(pattern)
    }

    it('rejects a title over 50 characters', async () => {
      await expectRejected({ title: 'A'.repeat(51) }, /Title cannot exceed/)
    })

    it('rejects a description over 2000 characters', async () => {
      await expectRejected({ description: 'A'.repeat(2001) }, /Description cannot exceed/)
    })

    it('rejects more than 50 ingredients', async () => {
      const ingredients = Array.from({ length: 51 }, (_, i) => ({ id: `i${i}`, name: 'x' }))
      await expectRejected({ ingredients }, /more than 50 ingredients/)
    })

    it('rejects more than 50 instructions', async () => {
      const instructions = Array.from({ length: 51 }, (_, i) => ({
        content: 'step',
        index: i + 1,
        id: `s${i}`,
      }))
      await expectRejected({ instructions }, /more than 50 instructions/)
    })

    it('rejects an instruction over 1000 characters', async () => {
      const instructions = [{ content: 'A'.repeat(1001), index: 1, id: 's1' }]
      await expectRejected({ instructions }, /instruction cannot exceed/i)
    })

    it('accepts a payload exactly at the limits (201)', async () => {
      const res = await request(server)
        .post('/api/addRecipe')
        .set(AUTH_HEADER)
        .send({
          ...validBody(),
          title: 'A'.repeat(50),
          description: 'A'.repeat(2000),
        })
      expect(res.status).toBe(201)
    })
  })
})

// ─── PUT /editRecipe ──────────────────────────────────────────────────────────

describe('PUT /editRecipe', () => {
  const OWNED_RECIPE = {
    ...BASE_RECIPE,
    userId: TEST_UID,
    rating: { rateCount: 12, rateValue: 4.5 },
    numTimesSaved: 7,
    numTimesMade: 3,
    views: 99,
    editedAt: null,
  }

  const validEdit = () => ({
    title: 'Updated Title',
    description: 'An updated description',
    ingredients: [{ id: 'i1', name: 'chicken' }],
    instructions: [{ content: 'Cook it well', index: 1, id: 's1' }],
    mealTypes: ['dinner'],
  })

  beforeEach(async () => {
    await seedRecipe({ ...OWNED_RECIPE })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .send(validEdit())
    expect(res.status).toBe(401)
  })

  it('returns 400 when recipeId is missing', async () => {
    const res = await request(server)
      .put('/api/editRecipe')
      .set(AUTH_HEADER)
      .send(validEdit())
    expect(res.status).toBe(400)
  })

  it('returns 404 if the recipe does not exist', async () => {
    const res = await request(server)
      .put('/api/editRecipe?recipeId=nonexistent')
      .set(AUTH_HEADER)
      .send(validEdit())
    expect(res.status).toBe(404)
  })

  it('rejects an edit by a non-owner (403) and leaves the recipe unchanged', async () => {
    const db = getDB()
    await db.collection('recipes').deleteOne({ _id: RECIPE_ID })
    await seedRecipe({ ...OWNED_RECIPE, userId: 'someone-else' })

    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send(validEdit())

    expect(res.status).toBe(403)
    const stored = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(stored.title).toBe(OWNED_RECIPE.title)
    expect(stored.editedAt).toBeNull()
  })

  it('rejects missing required fields (400)', async () => {
    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send({ description: 'no title/ingredients/etc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Missing required fields/)
  })

  it('enforces input bounds (400)', async () => {
    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send({ ...validEdit(), title: 'A'.repeat(51) })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Title cannot exceed/)
  })

  it('updates editable fields and stamps editedAt', async () => {
    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send(validEdit())

    expect(res.status).toBe(200)

    const db = getDB()
    const stored = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(stored.title).toBe('Updated Title')
    expect(stored.description).toBe('An updated description')
    expect(typeof stored.editedAt).toBe('string')
    expect(stored.editedAt).not.toBeNull()
  })

  it('never resets ratings, saves, made-count, views, or createdAt on edit', async () => {
    await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send(validEdit())

    const db = getDB()
    const stored = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(stored.rating).toEqual({ rateCount: 12, rateValue: 4.5 })
    expect(stored.numTimesSaved).toBe(7)
    expect(stored.numTimesMade).toBe(3)
    expect(stored.views).toBe(99)
    expect(stored.createdAt).toBe(OWNED_RECIPE.createdAt)
  })

  it('ignores attempts to overwrite protected fields via the payload', async () => {
    const res = await request(server)
      .put(`/api/editRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
      .send({
        ...validEdit(),
        // Malicious / stray fields the whitelist must drop:
        rating: { rateCount: 9999, rateValue: 1 },
        numTimesSaved: 0,
        numTimesMade: 0,
        views: 0,
        userId: 'someone-else',
        _id: 'hijacked-id',
        createdAt: '1',
      })

    expect(res.status).toBe(200)
    const db = getDB()
    const stored = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(stored.rating).toEqual({ rateCount: 12, rateValue: 4.5 })
    expect(stored.numTimesSaved).toBe(7)
    expect(stored.numTimesMade).toBe(3)
    expect(stored.views).toBe(99)
    expect(stored.userId).toBe(TEST_UID)
    expect(stored._id).toBe(RECIPE_ID)
    expect(stored.createdAt).toBe(OWNED_RECIPE.createdAt)
  })
})

// ─── POST /recipes/:id/save ───────────────────────────────────────────────────

describe('POST /recipes/:id/save', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertOne({ ...BASE_RECIPE, numTimesSaved: 0 })
  })

  it('saves a recipe and increments numTimesSaved', async () => {
    const res = await request(server)
      .post(`/api/recipes/${RECIPE_ID}/save`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ saved: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesSaved).toBe(1)
  })

  it('returns 409 on duplicate save attempt', async () => {
    // first save
    await request(server)
      .post(`/api/recipes/${RECIPE_ID}/save`)
      .set(AUTH_HEADER)

    // second save — same recipe, same user
    const res = await request(server)
      .post(`/api/recipes/${RECIPE_ID}/save`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already saved/)
  })
})

// ─── DELETE /recipes/:id/save ─────────────────────────────────────────────────

describe('DELETE /recipes/:id/save', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('recipes').insertOne({ ...BASE_RECIPE, numTimesSaved: 1 })
    await db.collection('userRecipeData').insertOne({
      _id: TEST_UID,
      savedRecipes: [{ recipeId: RECIPE_ID, dateSaved: '12345' }],
    })
  })

  it('returns 404 if recipe is not in the user\'s saved list', async () => {
    const res = await request(server)
      .delete(`/api/recipes/not-saved-id/save`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not in saved list/)
  })

  it('unsaves a recipe and decrements numTimesSaved', async () => {
    const res = await request(server)
      .delete(`/api/recipes/${RECIPE_ID}/save`)
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

    const res = await request(server)
      .delete(`/api/recipes/${RECIPE_ID}/save`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)

    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.numTimesSaved).toBe(0)
  })
})

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(server).get('/health')
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
    const res = await request(server).get('/api/getRecipe')
    expect(res.status).toBe(400)
  })

  it('returns 404 if recipe is not found', async () => {
    const res = await request(server).get('/api/getRecipe?id=nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns the recipe and increments the view count', async () => {
    const res = await request(server).get(`/api/getRecipe?id=${RECIPE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe(RECIPE_ID)
    expect(res.body.views).toBe(6)
  })
})

// ─── DELETE /deleteRecipe ─────────────────────────────────────────────────────

describe('DELETE /deleteRecipe', () => {
  const OTHER_UID = 'other-user'
  const KEEP_ID = 'recipe-keep'

  beforeEach(async () => {
    admin.__deleteFile.mockClear()
    await seedRecipe({ ...BASE_RECIPE, userId: TEST_UID })

    // Owner's created/saved/made lists all reference the recipe.
    await seedUserRecipeData(TEST_UID, {
      userRecipes: [{ recipeId: RECIPE_ID }],
      savedRecipes: [{ recipeId: RECIPE_ID, dateSaved: '1000' }],
      madeRecipes: [{ recipeId: RECIPE_ID }],
    })
    // A different user who saved and made it — plus an unrelated recipe that
    // must survive the delete.
    await seedUserRecipeData(OTHER_UID, {
      savedRecipes: [
        { recipeId: RECIPE_ID, dateSaved: '2000' },
        { recipeId: KEEP_ID, dateSaved: '3000' },
      ],
      madeRecipes: [{ recipeId: RECIPE_ID }],
    })
    // Ratings/reviews for the recipe, and one for an unrelated recipe.
    await seedRating({ username: 'someone', recipeId: RECIPE_ID, rating: 5, reviewText: 'Great' })
    await seedRating({ username: 'another', recipeId: RECIPE_ID, rating: 4 })
    await seedRating({ username: 'someone', recipeId: KEEP_ID, rating: 3 })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 if the recipe does not exist', async () => {
    const res = await request(server)
      .delete(`/api/deleteRecipe?recipeId=nonexistent`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(404)
  })

  it('rejects deletion attempt by non-owner (403)', async () => {
    const db = getDB()
    // Re-seed the recipe with a different owner
    await db.collection('recipes').deleteOne({ _id: RECIPE_ID })
    await seedRecipe({ ...BASE_RECIPE, userId: 'someone-else' })

    const res = await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(403)
    // Recipe must still exist, and nothing should have been cleaned up.
    expect(await db.collection('recipes').findOne({ _id: RECIPE_ID })).not.toBeNull()
    expect(await db.collection('ratings').countDocuments({ recipeId: RECIPE_ID })).toBe(2)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('deletes the recipe and removes it from the owner\'s created/saved/made lists', async () => {
    const res = await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })

    const db = getDB()
    expect(await db.collection('recipes').findOne({ _id: RECIPE_ID })).toBeNull()

    const userData = await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    expect(userData.userRecipes).toHaveLength(0)
    expect(userData.savedRecipes).toHaveLength(0)
    expect(userData.madeRecipes).toHaveLength(0)
  })

  it('removes the recipe\'s ratings/reviews but leaves other recipes\' ratings', async () => {
    await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    const db = getDB()
    expect(await db.collection('ratings').countDocuments({ recipeId: RECIPE_ID })).toBe(0)
    expect(await db.collection('ratings').countDocuments({ recipeId: KEEP_ID })).toBe(1)
  })

  it('removes the recipeId from other users\' saved/made lists without touching unrelated entries', async () => {
    await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    const db = getDB()
    const other = await db.collection('userRecipeData').findOne({ _id: OTHER_UID })
    expect(other.savedRecipes).toEqual([{ recipeId: KEEP_ID, dateSaved: '3000' }])
    expect(other.madeRecipes).toHaveLength(0)
  })

  it('deletes the recipe image from storage', async () => {
    await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(admin.__deleteFile).toHaveBeenCalledTimes(1)
  })

  it('succeeds (200) and still deletes the recipe when there is no stored image', async () => {
    const db = getDB()
    await db.collection('recipes').updateOne({ _id: RECIPE_ID }, { $set: { recipeImage: '' } })

    const res = await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
    expect(await db.collection('recipes').findOne({ _id: RECIPE_ID })).toBeNull()
  })

  it('succeeds (200) even if storage image deletion fails', async () => {
    admin.__deleteFile.mockRejectedValueOnce(new Error('storage down'))

    const res = await request(server)
      .delete(`/api/deleteRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    const db = getDB()
    expect(await db.collection('recipes').findOne({ _id: RECIPE_ID })).toBeNull()
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
    const res = await request(server).get(`/api/getSavedRecipe?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns the saved entry when the recipe is in the saved list', async () => {
    const res = await request(server)
      .get(`/api/getSavedRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.recipeId).toBe(RECIPE_ID)
    expect(res.body.dateSaved).toBe('99999')
  })

  it('returns null when the recipe is not in the saved list', async () => {
    const res = await request(server)
      .get(`/api/getSavedRecipe?recipeId=not-saved`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })
})

// ─── GET /getSavedRecipeIds ───────────────────────────────────────────────────

describe('GET /getSavedRecipeIds', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).get('/api/getSavedRecipeIds')
    expect(res.status).toBe(401)
  })

  it('returns the current user saved recipe ids', async () => {
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1' },
        { recipeId: 'r2', dateSaved: '2' },
      ],
    })
    const res = await request(server)
      .get('/api/getSavedRecipeIds')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.sort()).toEqual(['r1', 'r2'])
  })

  it('returns [] when the user has no saved recipes', async () => {
    const res = await request(server)
      .get('/api/getSavedRecipeIds')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─── POST /madeRecipe ─────────────────────────────────────────────────────────

describe('POST /madeRecipe', () => {
  beforeEach(async () => {
    await seedRecipe({ ...BASE_RECIPE, numTimesMade: 0 })
  })

  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).post(`/api/madeRecipe?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('increments numTimesMade and adds to madeRecipes', async () => {
    const res = await request(server)
      .post(`/api/madeRecipe?recipeId=${RECIPE_ID}`)
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
    await request(server).post(`/api/madeRecipe?recipeId=${RECIPE_ID}`).set(AUTH_HEADER)
    await request(server).post(`/api/madeRecipe?recipeId=${RECIPE_ID}`).set(AUTH_HEADER)

    const db = getDB()
    const userData = await db.collection('userRecipeData').findOne({ _id: TEST_UID })
    const entries = userData.madeRecipes.filter((e) => e.recipeId === RECIPE_ID)
    expect(entries).toHaveLength(1)
  })
})

// ─── GET /checkMadeRecipe ─────────────────────────────────────────────────────

describe('GET /checkMadeRecipe', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).get(`/api/checkMadeRecipe?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns { made: false } when user has not made the recipe', async () => {
    const res = await request(server)
      .get(`/api/checkMadeRecipe?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ made: false })
  })

  it('returns { made: true } when user has made the recipe', async () => {
    await seedUserRecipeData(TEST_UID, { madeRecipes: [{ recipeId: RECIPE_ID }] })

    const res = await request(server)
      .get(`/api/checkMadeRecipe?recipeId=${RECIPE_ID}`)
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
    const res = await request(server).get('/api/searchAutoCompleteRecipes?title=apple')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const titles = res.body.map((r) => r.title)
    expect(titles).toContain('Apple Pie')
    expect(titles).toContain('Apple Crumble')
  })

  it('projects all RecipeSearchResponseType fields when present on the doc', async () => {
    const db = getDB()
    await db.collection('recipes').insertOne({
      _id: 'ac-full',
      title: 'Full Doc',
      recipeImage: 'full.jpg',
      totalTime: 30,
      servings: 4,
      rating: { rateCount: 2, rateValue: 4.5 },
      nutritionLabels: ['vegan', 'gluten-free'],
      servingPrice: 250,
      // fields NOT in RecipeSearchResponseType — should be excluded:
      ingredients: [],
      instructions: [],
    })
    const res = await request(server).get('/api/searchAutoCompleteRecipes?title=Full')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(Object.keys(res.body[0]).sort()).toEqual([
      '_id',
      'nutritionLabels',
      'rating',
      'recipeImage',
      'servingPrice',
      'servings',
      'title',
      'totalTime',
    ])
    expect(res.body[0].rating).toEqual({ rateCount: 2, rateValue: 4.5 })
  })

  it('is case-insensitive', async () => {
    const res = await request(server).get('/api/searchAutoCompleteRecipes?title=APPLE')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('limits results to 8', async () => {
    await seedRecipes(
      Array.from({ length: 10 }, (_, i) => ({ _id: `extra-${i}`, title: `apple-extra-${i}` }))
    )
    const res = await request(server).get('/api/searchAutoCompleteRecipes?title=apple')
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
    const res = await request(server).get('/api/getTrendingRecipes')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
    expect(res.body[0]._id).toBe('tr-1')
  })

  it('respects the limit query param', async () => {
    const res = await request(server).get('/api/getTrendingRecipes?limit=2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]._id).toBe('tr-1')
  })

  it('caps limit at 20', async () => {
    await seedRecipes(
      Array.from({ length: 20 }, (_, i) => ({ _id: `cap-${i}`, title: `Recipe ${i}`, views: i }))
    )
    const res = await request(server).get('/api/getTrendingRecipes?limit=100')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(20)
  })
})

// ─── GET /getForYouRecipes ────────────────────────────────────────────────────

describe('GET /getForYouRecipes', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(server).get('/api/getForYouRecipes')
    expect(res.status).toBe(401)
  })

  it('returns [] when the user has too little signal (< MIN_SIGNAL)', async () => {
    // Only 2 interacted recipes — below the threshold to personalize.
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-a', cuisine: 'Italian' },
      { ...BASE_RECIPE, _id: 'fy-b', cuisine: 'Italian' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-a', dateSaved: '1' },
        { recipeId: 'fy-b', dateSaved: '2' },
      ],
    })
    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('recommends unseen recipes matching the user\'s taste, excluding seen and own', async () => {
    await seedRecipes([
      // Three saved Italian dinners → builds an Italian-dinner taste profile.
      { ...BASE_RECIPE, _id: 'fy-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // Unseen Italian dinners → should be recommended.
      { ...BASE_RECIPE, _id: 'fy-c1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-c2', cuisine: 'Italian', mealTypes: ['dinner'] },
      // Unseen Mexican breakfast sharing no feature with the profile → excluded.
      // (nutritionLabels cleared so it doesn't match the inherited 'low-carb' diet.)
      { ...BASE_RECIPE, _id: 'fy-mex', cuisine: 'Mexican', mealTypes: ['breakfast'], nutritionLabels: [] },
      // Unseen Italian dinner but authored by the user → excluded as own.
      { ...BASE_RECIPE, _id: 'fy-own', cuisine: 'Italian', mealTypes: ['dinner'], userId: TEST_UID },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-s1', dateSaved: '1' },
        { recipeId: 'fy-s2', dateSaved: '2' },
        { recipeId: 'fy-s3', dateSaved: '3' },
      ],
    })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)

    const ids = res.body.map((r) => r._id)
    // Only the unseen, on-taste Italian dinners qualify.
    expect(ids.sort()).toEqual(['fy-c1', 'fy-c2'])
    // Never recommend something already saved, the user's own, or off-taste.
    expect(ids).not.toContain('fy-s1')
    expect(ids).not.toContain('fy-own')
    expect(ids).not.toContain('fy-mex')
  })

  it('excludes hidden recipes from recommendations', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // On-taste but moderation-hidden → must not surface.
      { ...BASE_RECIPE, _id: 'fy-hidden', cuisine: 'Italian', mealTypes: ['dinner'], status: 'hidden' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-s1', dateSaved: '1' },
        { recipeId: 'fy-s2', dateSaved: '2' },
        { recipeId: 'fy-s3', dateSaved: '3' },
      ],
    })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.map((r) => r._id)).not.toContain('fy-hidden')
  })

  it('reaches the signal threshold via ratings and recommends on-taste recipes', async () => {
    await seedRecipes([
      // Three highly-rated Italian dinners → Italian-dinner taste profile, built
      // entirely from ratings (no saves/makes), exercising that signal path.
      { ...BASE_RECIPE, _id: 'fy-r1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-r2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-r3', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-rec', cuisine: 'Italian', mealTypes: ['dinner'] },
    ])
    await seedRating({ userId: TEST_UID, recipeId: 'fy-r1', rating: 5 })
    await seedRating({ userId: TEST_UID, recipeId: 'fy-r2', rating: 5 })
    await seedRating({ userId: TEST_UID, recipeId: 'fy-r3', rating: 4 })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const ids = res.body.map((r) => r._id)
    expect(ids).toContain('fy-rec')
    // Rated recipes are "seen" → never recommended back.
    expect(ids).not.toContain('fy-r1')
  })

  it('reaches the signal threshold via made recipes', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-m1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-m2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-m3', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-mrec', cuisine: 'Italian', mealTypes: ['dinner'] },
    ])
    await seedUserRecipeData(TEST_UID, {
      madeRecipes: [{ recipeId: 'fy-m1' }, { recipeId: 'fy-m2' }, { recipeId: 'fy-m3' }],
    })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const ids = res.body.map((r) => r._id)
    expect(ids).toContain('fy-mrec')
    expect(ids).not.toContain('fy-m1')
  })

  it('does not surface a community-popular recipe the user has no taste affinity for', async () => {
    // Regression for the taste-vs-quality gate: an off-taste recipe with a strong
    // community rating + many saves has a positive *blended* score but zero taste,
    // and must NOT appear. (Seeds elsewhere carry no rating/saves, so only this
    // case proves the quality nudge can't pull an off-taste recipe in.)
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // On-taste, unrated → should surface.
      { ...BASE_RECIPE, _id: 'fy-italian', cuisine: 'Italian', mealTypes: ['dinner'] },
      // Off-taste but community-loved → must stay out despite blended score > 0.
      {
        ...BASE_RECIPE,
        _id: 'fy-popular',
        cuisine: 'French',
        mealTypes: ['breakfast'],
        nutritionLabels: [],
        rating: { rateCount: 200, rateValue: 5 },
        numTimesSaved: 500,
      },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-s1', dateSaved: '1' },
        { recipeId: 'fy-s2', dateSaved: '2' },
        { recipeId: 'fy-s3', dateSaved: '3' },
      ],
    })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const ids = res.body.map((r) => r._id)
    expect(ids).toContain('fy-italian')
    expect(ids).not.toContain('fy-popular')
  })

  it('honors the limit query param (and the per-cuisine cap)', async () => {
    await seedRecipes([
      // Saves across two on-taste cuisines so several candidates qualify.
      { ...BASE_RECIPE, _id: 'fy-i1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-i2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-x1', cuisine: 'Mexican', mealTypes: ['dinner'], nutritionLabels: ['low-carb'] },
      // Unseen candidates: 2 Italian + 2 Mexican (4 pass the 2-per-cuisine cap).
      { ...BASE_RECIPE, _id: 'fy-i3', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-i4', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-x2', cuisine: 'Mexican', mealTypes: ['dinner'], nutritionLabels: ['low-carb'] },
      { ...BASE_RECIPE, _id: 'fy-x3', cuisine: 'Mexican', mealTypes: ['dinner'], nutritionLabels: ['low-carb'] },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-i1', dateSaved: '1' },
        { recipeId: 'fy-i2', dateSaved: '2' },
        { recipeId: 'fy-x1', dateSaved: '3' },
      ],
    })

    const res = await request(server).get('/api/getForYouRecipes?limit=2').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(2)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('excludes a review-only (rating: null) recipe from recommendations', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // On-taste, but the user wrote a review with no star rating → engaged with
      // it, so it must not be recommended back.
      { ...BASE_RECIPE, _id: 'fy-reviewed', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-fresh', cuisine: 'Italian', mealTypes: ['dinner'] },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-s1', dateSaved: '1' },
        { recipeId: 'fy-s2', dateSaved: '2' },
        { recipeId: 'fy-s3', dateSaved: '3' },
      ],
    })
    await seedRating({ userId: TEST_UID, recipeId: 'fy-reviewed', rating: null })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    const ids = res.body.map((r) => r._id)
    expect(ids).not.toContain('fy-reviewed')
    expect(ids).toContain('fy-fresh')
  })

  it('does not count review-only (rating: null) docs toward the signal threshold', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'fy-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-rev', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'fy-cand', cuisine: 'Italian', mealTypes: ['dinner'] },
    ])
    // 2 real signals (saves) + 1 review-only doc → still below MIN_SIGNAL (3),
    // so the row stays hidden. A null rating must never act as taste signal.
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'fy-s1', dateSaved: '1' },
        { recipeId: 'fy-s2', dateSaved: '2' },
      ],
    })
    await seedRating({ userId: TEST_UID, recipeId: 'fy-rev', rating: null })

    const res = await request(server).get('/api/getForYouRecipes').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /recipes/random', () => {
  it('returns a visible recipe for an anonymous user, never a hidden one', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'rnd-vis', title: 'Visible' },
      { ...BASE_RECIPE, _id: 'rnd-hidden', title: 'Hidden', status: 'hidden' },
    ])
    // Only one visible candidate, so the (random) pick is deterministic here.
    for (let i = 0; i < 4; i++) {
      const res = await request(server).get('/api/recipes/random')
      expect(res.status).toBe(200)
      expect(res.body._id).toBe('rnd-vis')
    }
  })

  it('returns 404 when there are no recipes', async () => {
    const res = await request(server).get('/api/recipes/random')
    expect(res.status).toBe(404)
  })

  it('returns 404 when the only recipes are hidden (fallback excludes them)', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'rnd-h1', status: 'hidden' },
      { ...BASE_RECIPE, _id: 'rnd-h2', status: 'unpublished' },
    ])
    const res = await request(server).get('/api/recipes/random')
    expect(res.status).toBe(404)
  })

  it('honors the exclude param (never returns the excluded recipe)', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'rnd-a', title: 'A' },
      { ...BASE_RECIPE, _id: 'rnd-b', title: 'B' },
    ])
    for (let i = 0; i < 6; i++) {
      const res = await request(server).get('/api/recipes/random?exclude=rnd-a')
      expect(res.status).toBe(200)
      expect(res.body._id).toBe('rnd-b')
    }
  })

  it('gives a signal user a weighted on-taste pick, excluding seen and own', async () => {
    await seedRecipes([
      // 3 saved Italian dinners → Italian-dinner taste profile.
      { ...BASE_RECIPE, _id: 'rnd-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'rnd-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'rnd-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // The ONLY unseen, non-own, on-taste candidate → must always be the pick.
      { ...BASE_RECIPE, _id: 'rnd-on', cuisine: 'Italian', mealTypes: ['dinner'] },
      // Own (excluded) + off-taste (taste 0 → filtered out) decoys.
      { ...BASE_RECIPE, _id: 'rnd-own', cuisine: 'Italian', mealTypes: ['dinner'], userId: TEST_UID },
      { ...BASE_RECIPE, _id: 'rnd-off', cuisine: 'Mexican', mealTypes: ['breakfast'], nutritionLabels: [] },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'rnd-s1', dateSaved: '1' },
        { recipeId: 'rnd-s2', dateSaved: '2' },
        { recipeId: 'rnd-s3', dateSaved: '3' },
      ],
    })

    for (let i = 0; i < 5; i++) {
      const res = await request(server).get('/api/recipes/random').set(AUTH_HEADER)
      expect(res.status).toBe(200)
      expect(res.body._id).toBe('rnd-on')
    }
  })

  it('falls back to a random visible recipe when a signal user has no on-taste candidate', async () => {
    await seedRecipes([
      { ...BASE_RECIPE, _id: 'rnd-s1', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'rnd-s2', cuisine: 'Italian', mealTypes: ['dinner'] },
      { ...BASE_RECIPE, _id: 'rnd-s3', cuisine: 'Italian', mealTypes: ['dinner'] },
      // Only unseen candidate is off-taste → taste path finds nothing, so the
      // route falls through to a uniform random pick rather than 404.
      { ...BASE_RECIPE, _id: 'rnd-offonly', cuisine: 'Thai', mealTypes: ['breakfast'], nutritionLabels: [] },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'rnd-s1', dateSaved: '1' },
        { recipeId: 'rnd-s2', dateSaved: '2' },
        { recipeId: 'rnd-s3', dateSaved: '3' },
      ],
    })

    const res = await request(server).get('/api/recipes/random').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe('rnd-offonly')
  })

  it('still returns a recipe for an authed user below the signal threshold (fallback)', async () => {
    await seedRecipes([{ ...BASE_RECIPE, _id: 'rnd-only', title: 'Solo' }])
    // 1 save → below MIN_SIGNAL, so the taste path is skipped and the fallback
    // random pick runs. (Fallback excludes own + excluded, not merely-seen.)
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [{ recipeId: 'rnd-only', dateSaved: '1' }],
    })
    const res = await request(server).get('/api/recipes/random').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body._id).toBe('rnd-only')
  })
})

// ─── Phase 5-D _id coercion regression tests ─────────────────────────────────

describe('Phase 5-D — recipeIdQuery coercion', () => {
  const { ObjectId } = require('mongodb')

  it('GET /getRecipe finds a recipe stored with a native ObjectId _id', async () => {
    const oid = new ObjectId()
    const hex = oid.toHexString()
    await seedRecipe({ ...BASE_RECIPE, _id: oid, views: 5 })

    const res = await request(server).get(`/api/getRecipe?id=${hex}`)
    expect(res.status).toBe(200)
    // BSON ObjectId serialises to its hex string over JSON
    expect(res.body._id).toBe(hex)
    expect(res.body.views).toBe(6)
  })

  it('GET /getSavedRecipes returns recipes saved as both string and ObjectId _ids', async () => {
    const stringId = 'legacy-recipe-001'
    const oid = new ObjectId()
    const oidHex = oid.toHexString()

    await seedRecipe({ ...BASE_RECIPE, _id: stringId, title: 'Legacy' })
    await seedRecipe({ ...BASE_RECIPE, _id: oid, title: 'New' })
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: stringId, dateSaved: '1000' },
        // The save flow stamps recipeId as the hex string of the ObjectId
        { recipeId: oidHex, dateSaved: '2000' },
      ],
    })

    const res = await request(server)
      .get('/api/getSavedRecipes?page=0&recipesPerPage=10&order=new')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    const titles = res.body.recipes.map((r) => r.title).sort()
    expect(titles).toEqual(['Legacy', 'New'])
  })
})
