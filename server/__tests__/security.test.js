/**
 * Regression tests for the 2026-06-11 security audit
 * (docs/SECURITY_AUDIT_2026-06-11.md).
 *
 * Express's default 'extended' query parser turned ?id[$ne]=x into the object
 * { $ne: 'x' }, which flowed into MongoDB filters as a query operator. The app
 * now uses the 'simple' parser (app.js) and routes/utilities reject non-string
 * values, so operator objects and repeated-key arrays can never reach a filter.
 *
 * Auth mocking follows the same approach as reviews.test.js: the automatic
 * firebase-admin mock resolves verifyIdToken to { uid: 'test-uid' }.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const admin = require('firebase-admin')
const { recipeIdQuery, recipeIdInQuery } = require('../util/recipeIdQuery')

const TEST_UID = 'test-uid'
const TEST_USERNAME = 'testuser'
const RECIPE_ID = 'recipe-sec-001'
const OTHER_RECIPE_ID = 'recipe-sec-002'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

beforeEach(async () => {
  const db = getDB()
  await db.collection('usernames').insertOne({
    _id: TEST_UID,
    username: TEST_USERNAME,
    username_lower: TEST_USERNAME.toLowerCase(),
  })
  await db.collection('recipes').insertMany([
    { _id: RECIPE_ID, title: 'Security Test Recipe', rating: { rateCount: 0, rateValue: 0 }, views: 0 },
    { _id: OTHER_RECIPE_ID, title: 'Bystander Recipe', rating: { rateCount: 5, rateValue: 4.8 }, views: 0 },
  ])
  admin.auth.mockReset()
  admin.auth.mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: TEST_UID }),
  }))
})

afterEach(async () => {
  const db = getDB()
  await Promise.all([
    db.collection('usernames').deleteMany({}),
    db.collection('recipes').deleteMany({}),
    db.collection('ratings').deleteMany({}),
  ])
})

// ─── Query parser hardening ──────────────────────────────────────────────────

describe('query-string operator injection', () => {
  it('addRating rejects bracket-notation operator in recipeId (400)', async () => {
    const res = await request(app)
      .post('/api/addRating?recipeId[$ne]=x&rating=1')
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    // The bystander recipe's rating must be untouched
    const db = getDB()
    const bystander = await db.collection('recipes').findOne({ _id: OTHER_RECIPE_ID })
    expect(bystander.rating).toEqual({ rateCount: 5, rateValue: 4.8 })
  })

  it('addRating rejects repeated-key array recipeId (400)', async () => {
    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&recipeId=${OTHER_RECIPE_ID}&rating=1`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
  })

  it('getRecipe with operator in id returns 400, not another recipe', async () => {
    const res = await request(app).get('/api/getRecipe?id[$ne]=x')
    expect(res.status).toBe(400)
  })

  it('getRecipe with repeated id keys matches nothing (404)', async () => {
    const res = await request(app).get(`/api/getRecipe?id=${RECIPE_ID}&id=${OTHER_RECIPE_ID}`)
    expect(res.status).toBe(404)
  })

  it('GET /recipes tolerates repeated q keys without a 500', async () => {
    const res = await request(app).get('/api/recipes?q=a&q=b')
    expect(res.status).toBe(200)
  })

  it('checkUsernameAvailability rejects operator-shaped username (400)', async () => {
    const res = await request(app).get('/api/checkUsernameAvailability?username[$ne]=x')
    expect(res.status).toBe(400)
  })
})

// ─── JSON-body operator injection ────────────────────────────────────────────

describe('JSON-body operator injection', () => {
  it('newReview rejects object recipeId (400)', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: { $ne: '' }, reviewText: 'injected' })
    expect(res.status).toBe(400)
    const db = getDB()
    expect(await db.collection('ratings').countDocuments({})).toBe(0)
  })

  it('newReview rejects non-string reviewText (400)', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: { $set: 'x' } })
    expect(res.status).toBe(400)
  })
})

// ─── Page-size caps ──────────────────────────────────────────────────────────

describe('pagination caps', () => {
  it('GET /recipes caps recipesPerPage at 50 regardless of the requested size', async () => {
    const db = getDB()
    await db.collection('recipes').insertMany(
      Array.from({ length: 55 }, (_, i) => ({
        _id: `recipe-cap-${String(i).padStart(3, '0')}`,
        title: `Cap Test ${i}`,
      }))
    )
    const res = await request(app).get('/api/recipes?recipesPerPage=99999')
    expect(res.status).toBe(200)
    expect(res.body.recipeList).toHaveLength(50)
    expect(res.body.total_results).toBe(57) // 55 + the 2 beforeEach fixtures
  })

  it('GET /recipes tolerates a non-numeric page size without a 500', async () => {
    const res = await request(app).get('/api/recipes?recipesPerPage=abc&page=xyz')
    expect(res.status).toBe(200)
  })
})

// ─── recipeIdQuery non-string hardening ──────────────────────────────────────

describe('recipeIdQuery non-string ids', () => {
  it('returns a match-nothing filter for objects and arrays', () => {
    expect(recipeIdQuery({ $ne: 'x' })).toEqual({ _id: { $in: [] } })
    expect(recipeIdQuery(['a', 'b'])).toEqual({ _id: { $in: [] } })
    expect(recipeIdQuery(undefined)).toEqual({ _id: { $in: [] } })
  })

  it('recipeIdInQuery drops non-string entries', () => {
    const filter = recipeIdInQuery(['abc', { $ne: 'x' }, 42])
    expect(filter._id.$in).toEqual(['abc'])
  })
})
