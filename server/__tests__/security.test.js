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
const { getAuth } = require('firebase-admin/auth')
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
  getAuth.mockReset()
  getAuth.mockImplementation(() => ({
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

// ─── Admin surface (audit §5 step 3) ─────────────────────────────────────────
// The default beforeEach mock resolves a NON-admin token (uid only). Admin
// tests opt in with asAdmin(), which resolves { admin: true } for the rest of
// the test (beforeEach restores the non-admin default), mirroring how
// verifyToken sets req.isAdmin = decoded.admin === true. Deliberately sticky
// rather than mockReturnValueOnce: a one-shot override is consumed by whichever
// getAuth() call comes next, so a stray async call (leaked fire-and-forget
// audit/email work) could eat it and demote the intended request to 403.

function asAdmin() {
  getAuth.mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: TEST_UID, admin: true }),
  }))
}

describe('admin route auth chaining', () => {
  it('GET /admin/users rejects an anonymous request (401)', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  it('GET /admin/users rejects a non-admin token (403)', async () => {
    // Default mock = non-admin uid → requireAdmin denies.
    const res = await request(app).get('/api/admin/users').set(AUTH_HEADER)
    expect(res.status).toBe(403)
  })

  it('PATCH /reports/bulk rejects a non-admin token (403)', async () => {
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids: ['x'], status: 'resolved' })
    expect(res.status).toBe(403)
  })
})

describe('admin endpoints reject injected / malformed ids', () => {
  it('PATCH /reports/bulk drops operator-shaped ids → 400 (no valid ids)', async () => {
    asAdmin()
    const res = await request(app)
      .patch('/api/reports/bulk')
      .set(AUTH_HEADER)
      .send({ ids: [{ $ne: null }, 42, 'not-an-objectid'], status: 'resolved' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/No valid report ids/)
  })

  it('PATCH /reports/:id rejects a non-ObjectId id (404, no crash)', async () => {
    asAdmin()
    const res = await request(app)
      .patch('/api/reports/not-a-valid-objectid')
      .set(AUTH_HEADER)
      .send({ status: 'resolved' })
    expect(res.status).toBe(404)
  })

  it('PATCH /admin/recipes/:id/moderation rejects a non-string status (400)', async () => {
    asAdmin()
    const res = await request(app)
      .patch(`/api/admin/recipes/${RECIPE_ID}/moderation`)
      .set(AUTH_HEADER)
      .send({ status: { $ne: 'active' } })
    expect(res.status).toBe(400)
  })

  it('PATCH /admin/reviews/moderation rejects object recipeId/username (400)', async () => {
    asAdmin()
    const res = await request(app)
      .patch('/api/admin/reviews/moderation')
      .set(AUTH_HEADER)
      .send({ recipeId: { $ne: '' }, username: { $ne: '' }, moderationHidden: true })
    expect(res.status).toBe(400)
  })
})

// ─── Generic 500 responder contract (audit §4 item 2) ────────────────────────

describe('respondServerError', () => {
  const { respondServerError } = require('../util/respondServerError')

  it('logs the real error but returns a generic body, never err.message', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const json = jest.fn()
    const res = { status: jest.fn(() => res), json }
    const err = new Error('connect ECONNREFUSED 10.0.0.5:27017')
    respondServerError(res, err, { method: 'GET', originalUrl: '/api/secret' })
    expect(res.status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({ error: 'Internal server error' })
    // The raw message is logged server-side, not leaked to the client.
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0]).toContain(err)
    spy.mockRestore()
  })
})

// ─── asyncHandler (util/asyncHandler) ────────────────────────────────────────
// Wrapped handlers no longer carry their own try/catch; a rejected handler
// promise must reach Express's error chain via next(err) so the backstop turns
// it into a generic 500.

describe('asyncHandler', () => {
  const { asyncHandler } = require('../util/asyncHandler')

  it('forwards a rejected handler promise to next(err)', async () => {
    const boom = new Error('handler blew up')
    const next = jest.fn()
    await asyncHandler(async () => {
      throw boom
    })({}, {}, next)
    expect(next).toHaveBeenCalledWith(boom)
  })

  it('does not call next when the handler resolves', async () => {
    const next = jest.fn()
    await asyncHandler(async (req, res) => {
      res.json({ ok: true })
    })({}, { json: jest.fn() }, next)
    expect(next).not.toHaveBeenCalled()
  })
})

// ─── Central error backstop (app.js) ─────────────────────────────────────────
// Errors thrown outside a route's own try/catch (here: a malformed JSON body
// rejected by express.json()) must hit the app-level error handler and return a
// generic body — never Express's default handler, which would echo a stack trace.

describe('error backstop for non-route errors', () => {
  it('returns a generic 400 for a malformed JSON body (no stack leak)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app)
      .post('/api/newReview')
      .set(AUTH_HEADER)
      .set('Content-Type', 'application/json')
      .send('{ "recipeId": ') // truncated JSON → body-parser throws (status 400)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Bad request' })
    // Nothing in the response body resembles a stack trace or parser internals.
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|Unexpected|at /)
    spy.mockRestore()
  })
})
