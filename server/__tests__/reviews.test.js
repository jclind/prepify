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
const { seedRating } = require('./helpers/seed')

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

// ─── POST /addRating ───────────────────────────────────────────────────────────

describe('POST /addRating', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post(`/api/addRating?recipeId=${RECIPE_ID}&rating=4`)
    expect(res.status).toBe(401)
  })

  it('rejects non-numeric rating (400)', async () => {
    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=abc`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid rating')
  })

  it('rejects rating above 5 (400)', async () => {
    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=6`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/between 1 and 5/)
  })

  it('rejects rating below 1 (400)', async () => {
    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=0`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/between 1 and 5/)
  })

  it('accepts a valid rating and updates the recipe rating stats', async () => {
    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=4`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ rated: true })

    const db = getDB()
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(1)
    expect(recipe.rating.rateValue).toBe(4)
  })
})

// ─── POST /editReview ──────────────────────────────────────────────────────────

describe('POST /editReview', () => {
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

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).post(`/api/editReview?recipeId=${RECIPE_ID}&text=Modified`)
    expect(res.status).toBe(401)
  })

  it('rejects request from non-author (403)', async () => {
    // Next admin.auth() call in verifyToken returns other-uid →
    // route looks up 'otheruser' → no ratings doc matches → matchedCount 0 → 403
    admin.auth.mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: OTHER_UID }),
    })

    const res = await request(app)
      .post(`/api/editReview?recipeId=${RECIPE_ID}&text=Modified`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(403)
  })

  it('allows the author to edit their own review', async () => {
    const res = await request(app)
      .post(`/api/editReview?recipeId=${RECIPE_ID}&text=Updated+review`)
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

// ─── DELETE /deleteReview ────────────────────────────────────────────────────────

describe('DELETE /deleteReview', () => {
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

  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).delete(`/api/deleteReview?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('rejects request from non-author (403)', async () => {
    admin.auth.mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: OTHER_UID }),
    })

    const res = await request(app)
      .delete(`/api/deleteReview?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(403)
  })

  it('allows the author to delete their own review', async () => {
    const res = await request(app)
      .delete(`/api/deleteReview?recipeId=${RECIPE_ID}`)
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

// ─── POST /newReview ───────────────────────────────────────────────────────────

describe('POST /newReview', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .send({ recipeId: RECIPE_ID, reviewText: 'Great!' })
    expect(res.status).toBe(401)
  })

  it('returns 400 if reviewText is missing from body', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID })
    expect(res.status).toBe(400)
  })

  it('returns 400 if the user has no username set', async () => {
    admin.auth.mockReturnValueOnce({
      verifyIdToken: jest.fn().mockResolvedValueOnce({ uid: 'no-username-uid' }),
    })

    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'Text' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Username not found/)
  })

  it('creates a new review and returns the saved document', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'Amazing dish!' })

    expect(res.status).toBe(200)
    expect(res.body.reviewText).toBe('Amazing dish!')
    expect(res.body.username).toBe(TEST_USERNAME)
    expect(res.body.recipeId).toBe(RECIPE_ID)
  })

  it('updates an existing review entry (upsert)', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Original text',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })

    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'Updated text' })

    expect(res.status).toBe(200)
    expect(res.body.reviewText).toBe('Updated text')
  })

  // Identity is resolved server-side from req.uid → usernames collection.
  // Anything the client puts in body.username must be ignored.
  it('ignores client-supplied username in body and stores token-resolved username', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({
        recipeId: RECIPE_ID,
        reviewText: 'Identity spoofing attempt',
        username: OTHER_USERNAME, // attacker tries to write as another user
      })

    expect(res.status).toBe(200)
    expect(res.body.username).toBe(TEST_USERNAME)

    const db = getDB()
    const stored = await db
      .collection('ratings')
      .findOne({ recipeId: RECIPE_ID, reviewText: 'Identity spoofing attempt' })
    expect(stored).not.toBeNull()
    expect(stored.username).toBe(TEST_USERNAME)
    // And no doc was written under the attacker's username
    const spoofed = await db
      .collection('ratings')
      .findOne({ username: OTHER_USERNAME, recipeId: RECIPE_ID })
    expect(spoofed).toBeNull()
  })
})

// ─── GET /checkIfReviewed ─────────────────────────────────────────────────────

describe('GET /checkIfReviewed', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 400 if recipeId is missing', async () => {
    const res = await request(app).get('/api/checkIfReviewed').set(AUTH_HEADER)
    expect(res.status).toBe(400)
  })

  it('returns { reviewed: false } when no rating document exists', async () => {
    const res = await request(app)
      .get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ reviewed: false })
  })

  it('returns { reviewed: true, rating } when a rating exists with empty reviewText (rating-only)', async () => {
    await seedRating({ username: TEST_USERNAME, recipeId: RECIPE_ID, rating: 3, reviewText: '' })

    const res = await request(app)
      .get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviewed).toBe(true)
    expect(res.body.rating).toBe(3)
    expect(res.body.reviewText).toBe('')
  })

  it('returns { reviewed: true, reviewText, rating } when a review exists', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'Really good!',
    })

    const res = await request(app)
      .get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviewed).toBe(true)
    expect(res.body.reviewText).toBe('Really good!')
    expect(res.body.rating).toBe(5)
  })
})

// ─── GET /getReviews ──────────────────────────────────────────────────────────

describe('GET /getReviews', () => {
  it('returns 400 if recipeId is missing', async () => {
    const res = await request(app).get('/api/getReviews')
    expect(res.status).toBe(400)
  })

  it('returns reviews and totalCount for a recipe', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'First review',
      reviewCreatedAt: '1000',
    })
    await seedRating({
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Second review',
      reviewCreatedAt: '2000',
    })

    const res = await request(app).get(`/api/getReviews?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(2)
    expect(res.body.reviews).toHaveLength(2)
  })

  it('excludes ratings with empty reviewText', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Has a review',
    })
    await seedRating({
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 3,
      reviewText: '',
    })

    const res = await request(app).get(`/api/getReviews?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
  })

  it('sets isCurrentUser=true for the review matching the username param', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'My review',
      reviewCreatedAt: '1000',
    })

    const res = await request(app).get(
      `/api/getReviews?recipeId=${RECIPE_ID}&username=${TEST_USERNAME}`
    )
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].isCurrentUser).toBe(true)
  })

  it('paginates results', async () => {
    for (let i = 0; i < 3; i++) {
      await seedRating({
        username: `paginationuser${i}`,
        recipeId: RECIPE_ID,
        rating: 3,
        reviewText: `Review ${i}`,
        reviewCreatedAt: `${i}000`,
      })
    }

    const res = await request(app).get(
      `/api/getReviews?recipeId=${RECIPE_ID}&page=0&reviewsPerPage=2`
    )
    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(2)
    expect(res.body.totalCount).toBe(3)
  })
})

// ─── GET /getSingleUserReviews ────────────────────────────────────────────────

describe('GET /getSingleUserReviews', () => {
  it('returns 400 if username is missing', async () => {
    const res = await request(app).get('/api/getSingleUserReviews')
    expect(res.status).toBe(400)
  })

  it('returns only reviews for the specified user', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'My review',
      reviewCreatedAt: '1000',
    })
    await seedRating({
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 3,
      reviewText: 'Other review',
      reviewCreatedAt: '2000',
    })

    const res = await request(app).get(`/api/getSingleUserReviews?username=${TEST_USERNAME}`)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
    expect(res.body.reviews[0].username).toBe(TEST_USERNAME)
  })

  it('includes recipeData when returnRecipeData=true', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Great recipe!',
      reviewCreatedAt: '1000',
    })

    const res = await request(app).get(
      `/api/getSingleUserReviews?username=${TEST_USERNAME}&returnRecipeData=true`
    )
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].recipeData).toBeDefined()
    expect(res.body.reviews[0].recipeData._id).toBe(RECIPE_ID)
  })

  it('does not include recipeData when returnRecipeData is not set', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Great recipe!',
      reviewCreatedAt: '1000',
    })

    const res = await request(app).get(`/api/getSingleUserReviews?username=${TEST_USERNAME}`)
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].recipeData).toBeUndefined()
  })

  // The "rated recipes" tab on the Account page needs rating-only docs to
  // show up. Earlier the filter required reviewText to exist and be non-empty,
  // which silently dropped any rating without a written review.
  it('includes rating-only entries (empty reviewText)', async () => {
    await seedRating({
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })

    const res = await request(app).get(`/api/getSingleUserReviews?username=${TEST_USERNAME}`)
    expect(res.status).toBe(200)
    expect(res.body.totalCount).toBe(1)
    expect(res.body.reviews[0].rating).toBe(4)
    expect(res.body.reviews[0].reviewText).toBe('')
  })

  it('paginates results', async () => {
    for (let i = 0; i < 4; i++) {
      await seedRating({
        username: TEST_USERNAME,
        recipeId: `recipe-${i}`,
        rating: 3,
        reviewText: `Review ${i}`,
        reviewCreatedAt: `${i}000`,
      })
    }

    const res = await request(app).get(
      `/api/getSingleUserReviews?username=${TEST_USERNAME}&page=0&reviewsPerPage=2`
    )
    expect(res.status).toBe(200)
    expect(res.body.reviews).toHaveLength(2)
    expect(res.body.totalCount).toBe(4)
  })
})
