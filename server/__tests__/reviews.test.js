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
    { _id: TEST_UID, username: TEST_USERNAME, username_lower: TEST_USERNAME.toLowerCase() },
    { _id: OTHER_UID, username: OTHER_USERNAME, username_lower: OTHER_USERNAME.toLowerCase() },
  ])
  await db.collection('recipes').insertOne({
    _id: RECIPE_ID,
    title: 'Review Test Recipe',
    recipeImage: 'https://example.com/review-test.jpg',
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

  // Audit §4 item 8: a review-only doc (rating: null) on the same recipe must be
  // excluded from the recompute — otherwise parseFloat(null) → NaN poisons the
  // whole average. The aggregate counts only the genuinely-rated doc.
  it('does not let a review-only (rating: null) doc poison the recipe average', async () => {
    const db = getDB()
    await seedRating({
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: null,
      reviewText: 'Review with no star rating',
      ratingLastUpdated: '',
    })

    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=4`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(1)
    expect(recipe.rating.rateValue).toBe(4)
    expect(Number.isNaN(recipe.rating.rateValue)).toBe(false)
  })

  // Bug 2 regression: adding a 5-star can never LOWER a correctly-stored
  // average. Seed an existing 4-star from another user, then add a 5 → the
  // aggregate must rise to 4.5 (count 2), proving the recompute math is sound.
  it('adding a 5-star raises (never lowers) the average', async () => {
    const db = getDB()
    await seedRating({
      userId: OTHER_UID,
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })

    const res = await request(app)
      .post(`/api/addRating?recipeId=${RECIPE_ID}&rating=5`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(2)
    expect(recipe.rating.rateValue).toBe(4.5)
    expect(recipe.rating.rateValue).toBeGreaterThanOrEqual(4)
  })
})

// ─── POST /editReview ──────────────────────────────────────────────────────────

describe('POST /editReview', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('ratings').insertOne({
      userId: TEST_UID,
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

  // Audit §4 item 4: edited review text must be bounded too.
  it('rejects edited text longer than 2000 characters (400)', async () => {
    const res = await request(app)
      .post(`/api/editReview?recipeId=${RECIPE_ID}&text=${'x'.repeat(2001)}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/cannot exceed/)
  })
})

// ─── DELETE /deleteReview ────────────────────────────────────────────────────────

describe('DELETE /deleteReview', () => {
  beforeEach(async () => {
    const db = getDB()
    await db.collection('ratings').insertOne({
      userId: TEST_UID,
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

  it('allows the author to delete their own review but KEEPS the star rating', async () => {
    const res = await request(app)
      .delete(`/api/deleteReview?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })

    const db = getDB()
    const doc = await db
      .collection('ratings')
      .findOne({ username: TEST_USERNAME, recipeId: RECIPE_ID })
    // Review text gone, but the 3-star rating is retained on the doc.
    expect(doc.reviewText).toBe('')
    expect(doc.rating).toBe(3)
  })

  // Orphan cleanup: deleting a review on a doc that has NO star rating must
  // remove the whole doc, not leave one with neither text nor rating.
  it('deletes the whole doc when the review had no rating to keep', async () => {
    const db = getDB()
    // Replace the rated fixture with a review-only doc (rating: null).
    await db.collection('ratings').deleteMany({})
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: null,
      reviewText: 'Review with no star rating',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
      ratingLastUpdated: '',
    })

    const res = await request(app)
      .delete(`/api/deleteReview?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const doc = await db
      .collection('ratings')
      .findOne({ userId: TEST_UID, recipeId: RECIPE_ID })
    expect(doc).toBeNull()
  })
})

// ─── DELETE /removeRating ────────────────────────────────────────────────────
// Bug 1: a user can remove just their star rating. The review (if any) is kept;
// a rating-only doc is deleted outright so no orphan lingers; and the recipe
// aggregate is recomputed so the removed star stops counting.

describe('DELETE /removeRating', () => {
  it('rejects request with no auth token (401)', async () => {
    const res = await request(app).delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 400 if recipeId is missing', async () => {
    const res = await request(app).delete('/api/removeRating').set(AUTH_HEADER)
    expect(res.status).toBe(400)
  })

  it('returns 404 when the user has no rating doc for the recipe', async () => {
    const res = await request(app)
      .delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(404)
  })

  it('removes the star rating but KEEPS the review, and recomputes the average', async () => {
    const db = getDB()
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'Loved it',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
      ratingLastUpdated: new Date(),
    })

    const res = await request(app)
      .delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ removed: true })

    const doc = await db
      .collection('ratings')
      .findOne({ userId: TEST_UID, recipeId: RECIPE_ID })
    // Review survives; the rating is cleared back to the review-only shape.
    expect(doc).not.toBeNull()
    expect(doc.reviewText).toBe('Loved it')
    expect(doc.rating).toBeNull()

    // The recipe aggregate drops the removed star — no ratings now → 0/0.
    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(0)
    expect(recipe.rating.rateValue).toBe(0)
  })

  it('deletes the whole doc when removing a rating-only entry (no review)', async () => {
    const db = getDB()
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })

    const res = await request(app)
      .delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const doc = await db
      .collection('ratings')
      .findOne({ userId: TEST_UID, recipeId: RECIPE_ID })
    expect(doc).toBeNull()
  })

  it('recomputes the average from the remaining ratings after one is removed', async () => {
    const db = getDB()
    // TEST_UID rated 2, OTHER_UID rated 4 → avg 3. Remove TEST_UID's → avg 4.
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 2,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })
    await seedRating({
      userId: OTHER_UID,
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })

    const res = await request(app)
      .delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const recipe = await db.collection('recipes').findOne({ _id: RECIPE_ID })
    expect(recipe.rating.rateCount).toBe(1)
    expect(recipe.rating.rateValue).toBe(4)
  })

  // Removing your own rating is a self-service delete, so it stays allowed even
  // for a suspended/banned account (mirrors /deleteReview — no requireActive).
  it('is allowed for a suspended account (self-service delete)', async () => {
    const db = getDB()
    await db.collection('users').insertOne({ _id: TEST_UID, status: 'suspended' })
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: '',
      ratingLastUpdated: new Date(),
    })
    try {
      const res = await request(app)
        .delete(`/api/removeRating?recipeId=${RECIPE_ID}`)
        .set(AUTH_HEADER)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ removed: true })
    } finally {
      await db.collection('users').deleteMany({})
    }
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

  // Audit §4 item 4: reviewText must be bounded (mirrors DESCRIPTION_MAX_LENGTH).
  it('rejects a review longer than 2000 characters (400)', async () => {
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'x'.repeat(2001) })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/cannot exceed/)
  })

  // Audit §4 item 8: a review posted before any rating must still produce a
  // ratings doc with a `rating` key (defaulted to null on insert), so the
  // recipe-average recompute never sees an undefined rating → NaN.
  it('defaults rating to null on a review-only upsert', async () => {
    await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'Review without a star rating' })

    const db = getDB()
    const stored = await db
      .collection('ratings')
      .findOne({ username: TEST_USERNAME, recipeId: RECIPE_ID })
    expect(stored).toHaveProperty('rating', null)
    expect(stored).toHaveProperty('ratingLastUpdated', '')
  })

  it('updates an existing review entry (upsert)', async () => {
    await seedRating({
      userId: TEST_UID,
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
    await seedRating({ userId: TEST_UID, username: TEST_USERNAME, recipeId: RECIPE_ID, rating: 3, reviewText: '' })

    const res = await request(app)
      .get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviewed).toBe(true)
    expect(res.body.rating).toBe(3)
    expect(res.body.reviewText).toBe('')
  })

  it('returns the full ratings doc plus reviewed:true when a review exists', async () => {
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'Really good!',
      reviewCreatedAt: '1700000000000',
      reviewLastUpdated: '1700000000000',
    })

    const res = await request(app)
      .get(`/api/checkIfReviewed?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviewed).toBe(true)
    expect(res.body.reviewText).toBe('Really good!')
    expect(res.body.rating).toBe(5)
    // RecipeReview reads these fields off currUserReview — if any is missing,
    // formatDate(undefined) crashes downstream on Invalid Date → undefined.substring.
    expect(res.body.username).toBe(TEST_USERNAME)
    expect(res.body.recipeId).toBe(RECIPE_ID)
    expect(res.body.reviewCreatedAt).toBe('1700000000000')
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

  it('sets isCurrentUser=true for the authenticated caller’s own review', async () => {
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'My review',
      reviewCreatedAt: '1000',
    })

    // Token resolves to TEST_UID → TEST_USERNAME; flag comes from the token.
    const res = await request(app)
      .get(`/api/getReviews?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].isCurrentUser).toBe(true)
  })

  it('ignores the username query param — no token means isCurrentUser=false (spoof closed)', async () => {
    await seedRating({
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'My review',
      reviewCreatedAt: '1000',
    })

    // Anonymous request passing ?username=<victim> must NOT be flagged as theirs.
    const res = await request(app).get(
      `/api/getReviews?recipeId=${RECIPE_ID}&username=${TEST_USERNAME}`
    )
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].isCurrentUser).toBe(false)
  })

  it('sets isCurrentUser=false for another user’s review even when authenticated', async () => {
    await seedRating({
      username: OTHER_USERNAME,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'Their review',
      reviewCreatedAt: '1000',
    })

    // Authenticated as TEST_UID, but the review belongs to OTHER_USERNAME.
    const res = await request(app)
      .get(`/api/getReviews?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].isCurrentUser).toBe(false)
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
      userId: TEST_UID,
      username: TEST_USERNAME,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'My review',
      reviewCreatedAt: '1000',
    })
    await seedRating({
      userId: OTHER_UID,
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
      userId: TEST_UID,
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

  // The account "Ratings" list reads flat recipeImage/recipeTitle off each
  // review (the rating doc stores neither) — they must be denormalized from the
  // recipe doc, or the thumbnail and title render blank.
  it('flattens recipeImage and recipeTitle from the recipe when returnRecipeData=true', async () => {
    await seedRating({
      userId: TEST_UID,
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
    expect(res.body.reviews[0].recipeImage).toBe(
      'https://example.com/review-test.jpg'
    )
    expect(res.body.reviews[0].recipeTitle).toBe('Review Test Recipe')
  })

  it('does not include recipeData when returnRecipeData is not set', async () => {
    await seedRating({
      userId: TEST_UID,
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
      userId: TEST_UID,
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
        userId: TEST_UID,
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

// ─── D1: ratings are keyed by the stable userId, not the mutable username ──────
// These pin the root-cause fix: a review's identity is the author's uid, so a
// username that no longer matches the doc (a rename happened) can neither
// detach the author from their own review nor let the stale handle be used to
// reach it.

describe('D1: review identity keyed on userId', () => {
  // Simulate a post-rename state: the user's CURRENT username is TEST_USERNAME
  // (from the usernames doc seeded in beforeEach), but their existing rating doc
  // still carries the OLD denormalized handle.
  const STALE_HANDLE = 'old-handle'

  it('lets the author edit their own review found by uid even when the stored username is stale', async () => {
    await seedRating({
      userId: TEST_UID,
      username: STALE_HANDLE,
      recipeId: RECIPE_ID,
      rating: 4,
      reviewText: 'before',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })

    const res = await request(app)
      .post(`/api/editReview?recipeId=${RECIPE_ID}&text=after`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)

    const doc = await getDB()
      .collection('ratings')
      .findOne({ userId: TEST_UID, recipeId: RECIPE_ID })
    expect(doc.reviewText).toBe('after')
  })

  it('upserts onto the existing doc by uid (no duplicate) when the stored username is stale', async () => {
    await seedRating({
      userId: TEST_UID,
      username: STALE_HANDLE,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'original',
      reviewCreatedAt: '1000',
      reviewLastUpdated: '1000',
    })

    await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .send({ recipeId: RECIPE_ID, reviewText: 'updated' })

    const docs = await getDB()
      .collection('ratings')
      .find({ userId: TEST_UID, recipeId: RECIPE_ID })
      .toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].reviewText).toBe('updated')
  })

  it('flags isCurrentUser from the uid, not the (possibly stale) stored username', async () => {
    await seedRating({
      userId: TEST_UID,
      username: STALE_HANDLE,
      recipeId: RECIPE_ID,
      rating: 5,
      reviewText: 'mine',
      reviewCreatedAt: '1000',
    })

    const res = await request(app)
      .get(`/api/getReviews?recipeId=${RECIPE_ID}`)
      .set(AUTH_HEADER)
    expect(res.status).toBe(200)
    expect(res.body.reviews[0].isCurrentUser).toBe(true)
  })
})
