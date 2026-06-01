const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const { seedRecipes, seedUserRecipeData } = require('./helpers/seed')

const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('userRecipeData').deleteMany({}),
    db.collection('recipes').deleteMany({}),
  ])
})

// ─── GET /getSavedRecipes ─────────────────────────────────────────────────────

describe('GET /getSavedRecipes', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getSavedRecipes')
    expect(res.status).toBe(401)
  })

  it('returns empty recipes and totalCount 0 when user has no saved recipes', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ recipes: [], totalCount: 0 })
  })

  it('returns saved recipes with totalCount', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Recipe One' },
      { _id: 'r2', title: 'Recipe Two' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes).toHaveLength(2)
  })

  it('paginates results', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Recipe One' },
      { _id: 'r2', title: 'Recipe Two' },
      { _id: 'r3', title: 'Recipe Three' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '2000' },
        { recipeId: 'r3', dateSaved: '3000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?page=0&recipesPerPage=2')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(2)
    expect(res.body.totalCount).toBe(3)
  })

  it('order=new returns the newest-saved recipe first (page=0, recipesPerPage=1)', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old Recipe' },
      { _id: 'r2', title: 'New Recipe' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '9000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?order=new&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r2')
  })

  it('order=old returns the oldest-saved recipe first (page=0, recipesPerPage=1)', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old Recipe' },
      { _id: 'r2', title: 'New Recipe' },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '1000' },
        { recipeId: 'r2', dateSaved: '9000' },
      ],
    })

    const res = await request(app)
      .get('/api/getSavedRecipes?order=old&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r1')
  })
})

// ─── GET /getCreatedRecipes ───────────────────────────────────────────────────

describe('GET /getCreatedRecipes', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get('/api/getCreatedRecipes')
    expect(res.status).toBe(401)
  })

  it('returns empty recipes and totalCount 0 when user has created none', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Someone Else', userId: 'other-uid', createdAt: '1000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ recipes: [], totalCount: 0 })
  })

  it('returns only recipes authored by the current user', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Mine One', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'Theirs', userId: 'other-uid', createdAt: '2000' },
      { _id: 'r3', title: 'Mine Two', userId: TEST_UID, createdAt: '3000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes.map((r) => r._id).sort()).toEqual(['r1', 'r3'])
  })

  it('paginates results', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'One', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'Two', userId: TEST_UID, createdAt: '2000' },
      { _id: 'r3', title: 'Three', userId: TEST_UID, createdAt: '3000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?page=0&recipesPerPage=2')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(2)
    expect(res.body.totalCount).toBe(3)
  })

  it('order=new returns the newest-created recipe first', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'New', userId: TEST_UID, createdAt: '9000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?order=new&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r2')
  })

  it('order=old returns the oldest-created recipe first', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Old', userId: TEST_UID, createdAt: '1000' },
      { _id: 'r2', title: 'New', userId: TEST_UID, createdAt: '9000' },
    ])

    const res = await request(app)
      .get('/api/getCreatedRecipes?order=old&page=0&recipesPerPage=1')
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.recipes).toHaveLength(1)
    expect(res.body.recipes[0]._id).toBe('r1')
  })
})
