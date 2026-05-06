/**
 * Auth approach
 * ─────────────
 * server/__mocks__/firebase-admin.js is the automatic mock. Its admin.auth is
 * a jest.fn() whose default implementation returns { verifyIdToken } resolving
 * to { uid: 'test-uid' }.
 *
 * For tests that need a DIFFERENT uid (non-author 403 cases), we call:
 *
 *   admin.auth.mockReturnValueOnce({
 *     verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: OTHER_UID }),
 *   })
 *
 * mockReturnValueOnce is consumed by the very next admin.auth() call inside
 * verifyToken middleware, then the default implementation resumes.
 *
 * Why beforeEach instead of beforeAll for seeding:
 * setupFilesAfterEnv registers setup.js's connectDB as a top-level beforeAll.
 * A test file's own top-level beforeAll is registered at the same scope and
 * can race with it. beforeEach is guaranteed to fire AFTER all beforeAlls have
 * settled, so getDB() is safe to call there.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')
const admin = require('firebase-admin')

const TEST_UID = 'test-uid'
const TEST_USERNAME = 'testuser'
const OTHER_UID = 'other-uid'
const OTHER_USERNAME = 'otheruser'
const RECIPE_ID = 'recipe-rev-001'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }

// ─── Shared setup/teardown ────────────────────────────────────────────────────
// Seed shared fixtures and reset auth mock before every test.
// Using beforeEach (not beforeAll) so DB is guaranteed to be connected first.

beforeEach(async () => {
  const db = getDB()
  await db.collection('usernames').insertMany([
    { _id: TEST_UID, username: TEST_USERNAME },
    { _id: OTHER_UID, username: OTHER_USERNAME },
  ])
  await db.collection('recipes').insertOne({
    _id: RECIPE_ID,
    title: 'Review Test Recipe',
    rating: { rateCount: 0, rateValue: 0 },
  })
  // Reset to default: verifyToken resolves req.uid = TEST_UID
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

// ─── PUT /addRating ───────────────────────────────────────────────────────────

describe('PUT /addRating', () => {
  it('rejects non-numeric rating (400)', async () => {
    const res = await request(app)
      .put(`/addRating?recipeId=${RECIPE_ID}&rating=abc`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid rating')
  })

  it('rejects rating above 5 (400)', async () => {
    const res = await request(app)
      .put(`/addRating?recipeId=${RECIPE_ID}&rating=6`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/between 1 and 5/)
  })

  it('rejects rating below 1 (400)', async () => {
    const res = await request(app)
      .put(`/addRating?recipeId=${RECIPE_ID}&rating=0`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/between 1 and 5/)
  })

  it('accepts a valid rating and updates the recipe rating stats', async () => {
    const res = await request(app)
      .put(`/addRating?recipeId=${RECIPE_ID}&rating=4`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ rated: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(1)
    expect(recipe.rating.rateValue).toBe(4)
  })
})

// ─── PUT /editReview ──────────────────────────────────────────────────────────

describe('PUT /editReview', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('ratings').insertOne({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Original review text',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })
  })

  it('rejects request from non-author (403)', async () => {
    // Next admin.auth() call in verifyToken returns other-uid →
    // route looks up 'otheruser' → no ratings doc matches → matchedCount 0 → 403
    admin.auth.mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: OTHER_UID }),
    })

    const res = await request(app)
      .put(`/editReview?recipeId=${RECIPE_ID}&text=Modified`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(403)
  })

  it('allows the author to edit their own review', async () => {
    const res = await request(app)
      .put(`/editReview?recipeId=${RECIPE_ID}&text=Updated+review`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ edited: true })

    const db = getDB()
    const doc = await db
      .collection('ratings')
      .findOne({ username: TEST_USERNAME, recipeId: RECIPE_ID })
    expect(doc.reviewText).toBe('Updated review')
  })
})

// ─── PUT /deleteReview ────────────────────────────────────────────────────────

describe('PUT /deleteReview', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('ratings').insertOne({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 3,
      reviewText: 'Review to be deleted',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })
  })

  it('rejects request from non-author (403)', async () => {
    admin.auth.mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: OTHER_UID }),
    })

    const res = await request(app)
      .put(`/deleteReview?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(403)
  })

  it('allows the author to delete their own review', async () => {
    const res = await request(app)
      .put(`/deleteReview?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })

    const db = getDB()
    const doc = await db
      .collection('ratings')
      .findOne({ username: TEST_USERNAME, recipeId: RECIPE_ID })
    expect(doc.reviewText).toBe('')
  })
})
