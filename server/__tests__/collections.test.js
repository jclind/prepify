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

const getUserData = () =>
  getDB().collection('userRecipeData').findOne({ _id: TEST_UID })

// ─── POST /collections ────────────────────────────────────────────────────────

describe('POST /collections', () => {
  it('rejects with no auth token (401)', async () => {
    const res = await request(app).post('/api/collections').send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('creates a collection and returns it with a zero count', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set(AUTH_HEADER)
      .send({ name: '  Weeknight  ' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Weeknight') // trimmed
    expect(res.body.count).toBe(0)
    expect(res.body.coverRecipeId).toBeNull()
    expect(typeof res.body.id).toBe('string')

    const data = await getUserData()
    expect(data.collections).toHaveLength(1)
    expect(data.collections[0].name).toBe('Weeknight')
  })

  it('rejects an empty / whitespace name (400)', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set(AUTH_HEADER)
      .send({ name: '   ' })
    expect(res.status).toBe(400)
  })

  it('rejects a duplicate name case-insensitively (409)', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Desserts', createdAt: '1' }],
    })
    const res = await request(app)
      .post('/api/collections')
      .set(AUTH_HEADER)
      .send({ name: 'desserts' })
    expect(res.status).toBe(409)
  })
})

// ─── GET /collections ─────────────────────────────────────────────────────────

describe('GET /collections', () => {
  it('returns each collection with a live count and most-recent cover', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Weeknight', createdAt: '1' }],
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '100', collectionIds: ['c1'] },
        { recipeId: 'r2', dateSaved: '300', collectionIds: ['c1'] },
        { recipeId: 'r3', dateSaved: '200', collectionIds: [] },
      ],
    })
    const res = await request(app).get('/api/collections').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].count).toBe(2)
    expect(res.body[0].coverRecipeId).toBe('r2') // newest dateSaved member
  })

  it('returns an empty array when the user has no doc', async () => {
    const res = await request(app).get('/api/collections').set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('resolves coverImage from the most-recent member recipe', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'One', recipeImage: 'http://img/r1.jpg' },
      { _id: 'r2', title: 'Two', recipeImage: 'http://img/r2.jpg' },
    ])
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Weeknight', createdAt: '1' }],
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '100', collectionIds: ['c1'] },
        { recipeId: 'r2', dateSaved: '300', collectionIds: ['c1'] },
      ],
    })
    const res = await request(app).get('/api/collections').set(AUTH_HEADER)
    expect(res.body[0].coverRecipeId).toBe('r2')
    expect(res.body[0].coverImage).toBe('http://img/r2.jpg')
  })

  it('returns a null coverImage when the cover recipe is hidden', async () => {
    await seedRecipes([
      { _id: 'r1', title: 'One', recipeImage: 'http://img/r1.jpg', status: 'hidden' },
    ])
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Weeknight', createdAt: '1' }],
      savedRecipes: [{ recipeId: 'r1', dateSaved: '100', collectionIds: ['c1'] }],
    })
    const res = await request(app).get('/api/collections').set(AUTH_HEADER)
    expect(res.body[0].coverRecipeId).toBe('r1')
    expect(res.body[0].coverImage).toBeNull()
  })
})

// ─── PATCH /collections/:id ───────────────────────────────────────────────────

describe('PATCH /collections/:id', () => {
  it('renames a collection', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Old', createdAt: '1' }],
    })
    const res = await request(app)
      .patch('/api/collections/c1')
      .set(AUTH_HEADER)
      .send({ name: 'New' })
    expect(res.status).toBe(200)
    const data = await getUserData()
    expect(data.collections[0].name).toBe('New')
  })

  it('404s for an unknown collection', async () => {
    await seedUserRecipeData(TEST_UID, { collections: [] })
    const res = await request(app)
      .patch('/api/collections/nope')
      .set(AUTH_HEADER)
      .send({ name: 'New' })
    expect(res.status).toBe(404)
  })

  it('409s on a name collision with a different collection', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [
        { id: 'c1', name: 'A', createdAt: '1' },
        { id: 'c2', name: 'B', createdAt: '2' },
      ],
    })
    const res = await request(app)
      .patch('/api/collections/c2')
      .set(AUTH_HEADER)
      .send({ name: 'a' })
    expect(res.status).toBe(409)
  })
})

// ─── DELETE /collections/:id ──────────────────────────────────────────────────

describe('DELETE /collections/:id', () => {
  it('deletes the collection and strips its tag, leaving recipes saved', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Weeknight', createdAt: '1' }],
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '100', collectionIds: ['c1'] },
        { recipeId: 'r2', dateSaved: '200', collectionIds: ['c1'] },
      ],
    })
    const res = await request(app).delete('/api/collections/c1').set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const data = await getUserData()
    expect(data.collections).toHaveLength(0)
    // Recipes stay saved, just untagged.
    expect(data.savedRecipes).toHaveLength(2)
    expect(data.savedRecipes.every(e => e.collectionIds.length === 0)).toBe(true)
  })

  it('404s for an unknown collection', async () => {
    await seedUserRecipeData(TEST_UID, { collections: [] })
    const res = await request(app).delete('/api/collections/nope').set(AUTH_HEADER)
    expect(res.status).toBe(404)
  })
})

// ─── PATCH /recipes/:recipeId/collections (membership) ────────────────────────

describe('PATCH /recipes/:recipeId/collections', () => {
  it('sets membership on an already-saved recipe', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [
        { id: 'c1', name: 'A', createdAt: '1' },
        { id: 'c2', name: 'B', createdAt: '2' },
      ],
      savedRecipes: [{ recipeId: 'r1', dateSaved: '100', collectionIds: [] }],
    })
    const res = await request(app)
      .patch('/api/recipes/r1/collections')
      .set(AUTH_HEADER)
      .send({ collectionIds: ['c1', 'c2'] })
    expect(res.status).toBe(200)
    const data = await getUserData()
    expect(data.savedRecipes[0].collectionIds.sort()).toEqual(['c1', 'c2'])
  })

  it('drops unknown collection ids', async () => {
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'A', createdAt: '1' }],
      savedRecipes: [{ recipeId: 'r1', dateSaved: '100', collectionIds: [] }],
    })
    const res = await request(app)
      .patch('/api/recipes/r1/collections')
      .set(AUTH_HEADER)
      .send({ collectionIds: ['c1', 'ghost'] })
    expect(res.status).toBe(200)
    expect(res.body.collectionIds).toEqual(['c1'])
  })

  it('auto-saves a not-yet-saved recipe and bumps numTimesSaved', async () => {
    await seedRecipes([{ _id: 'r9', title: 'New', numTimesSaved: 0 }])
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'A', createdAt: '1' }],
      savedRecipes: [],
    })
    const res = await request(app)
      .patch('/api/recipes/r9/collections')
      .set(AUTH_HEADER)
      .send({ collectionIds: ['c1'] })
    expect(res.status).toBe(200)

    const data = await getUserData()
    expect(data.savedRecipes).toHaveLength(1)
    expect(data.savedRecipes[0].recipeId).toBe('r9')
    const recipe = await getDB().collection('recipes').findOne({ _id: 'r9' })
    expect(recipe.numTimesSaved).toBe(1)
  })

  it('rejects a non-array collectionIds (400)', async () => {
    const res = await request(app)
      .patch('/api/recipes/r1/collections')
      .set(AUTH_HEADER)
      .send({ collectionIds: 'c1' })
    expect(res.status).toBe(400)
  })
})

// ─── GET /getSavedRecipes — collection filter + ordering (bug-fix coverage) ────

describe('GET /getSavedRecipes with collections', () => {
  beforeEach(async () => {
    await seedRecipes([
      { _id: 'r1', title: 'One' },
      { _id: 'r2', title: 'Two' },
      { _id: 'r3', title: 'Three' },
    ])
    await seedUserRecipeData(TEST_UID, {
      collections: [{ id: 'c1', name: 'Weeknight', createdAt: '1' }],
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '100', collectionIds: ['c1'] },
        { recipeId: 'r2', dateSaved: '300', collectionIds: [] },
        { recipeId: 'r3', dateSaved: '200', collectionIds: ['c1'] },
      ],
    })
  })

  it('filters to a single collection and counts only its members', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?collectionId=c1')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes.map(r => r._id).sort()).toEqual(['r1', 'r3'])
  })

  it('orders by save time (newAdd = most recent first) and preserves it', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=newAdd')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // dateSaved: r2=300, r3=200, r1=100 → newest first.
    expect(res.body.recipes.map(r => r._id)).toEqual(['r2', 'r3', 'r1'])
  })

  it('orders oldest-first with oldAdd', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=oldAdd')
      .set(AUTH_HEADER)
    expect(res.body.recipes.map(r => r._id)).toEqual(['r1', 'r3', 'r2'])
  })
})

// ─── GET /getSavedRecipes — field sorts (title / rating / cook time) ───────────

describe('GET /getSavedRecipes field sorts', () => {
  beforeEach(async () => {
    await seedRecipes([
      { _id: 'r1', title: 'Banana Bread', totalTime: 60, rating: { rateValue: 3, rateCount: 2 } },
      { _id: 'r2', title: 'Apple Pie', totalTime: 30, rating: { rateValue: 5, rateCount: 1 } },
      { _id: 'r3', title: 'Cherry Tart', totalTime: 45, rating: { rateValue: 5, rateCount: 9 } },
    ])
    await seedUserRecipeData(TEST_UID, {
      savedRecipes: [
        { recipeId: 'r1', dateSaved: '100', collectionIds: [] },
        { recipeId: 'r2', dateSaved: '200', collectionIds: [] },
        { recipeId: 'r3', dateSaved: '300', collectionIds: [] },
      ],
    })
  })

  it('sorts alphabetically by title (A–Z)', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=alpha')
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    // Apple, Banana, Cherry
    expect(res.body.recipes.map(r => r._id)).toEqual(['r2', 'r1', 'r3'])
  })

  it('sorts by rating, highest average first with count as tiebreak', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=rating')
      .set(AUTH_HEADER)
    // r3 & r2 both 5★; r3 has more ratings → first. Then r1 (3★).
    expect(res.body.recipes.map(r => r._id)).toEqual(['r3', 'r2', 'r1'])
  })

  it('sorts by shortest cook time', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=timeShort')
      .set(AUTH_HEADER)
    // 30, 45, 60 mins
    expect(res.body.recipes.map(r => r._id)).toEqual(['r2', 'r3', 'r1'])
  })

  it('sorts by longest cook time', async () => {
    const res = await request(app)
      .get('/api/getSavedRecipes?order=timeLong')
      .set(AUTH_HEADER)
    expect(res.body.recipes.map(r => r._id)).toEqual(['r1', 'r3', 'r2'])
  })

  it('drops a soft-hidden recipe from a field-sorted page and count', async () => {
    await getDB()
      .collection('recipes')
      .updateOne({ _id: 'r2' }, { $set: { status: 'hidden' } })
    const res = await request(app)
      .get('/api/getSavedRecipes?order=alpha')
      .set(AUTH_HEADER)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.recipes.map(r => r._id)).toEqual(['r1', 'r3'])
  })
})
