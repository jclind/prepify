/**
 * routes/collections.js — collectionWriteLimiter's real 429 behaviour on
 * POST /collections and PATCH /collections/:id.
 *
 * Mirrors bugReportsLimiter.test.js / writeLimiter.test.js: the limiter
 * `skip`s under NODE_ENV=test (so the rest of the suite, which fires many
 * requests per user via supertest, isn't throttled), so this file flips
 * NODE_ENV to exercise the real behaviour, then restores it in `finally` so a
 * failed assertion can't leak the flip into later test files run in the same
 * --runInBand process. The global per-IP backstop in app.js (limit 1000) is
 * also live under this flip but nowhere near the ~31 requests driven below.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const TEST_UID = 'test-uid'
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const COLLECTION_LIMIT = 30 // collectionWriteLimiter's default (makeUserLimiter())

afterEach(async () => {
  await getDB().collection('userRecipeData').deleteMany({})
})

// One shared uid draws down collectionWriteLimiter's single bucket across both
// surfaces in ONE test (rather than a POST-only test and a separate PATCH-only
// test) because collectionWriteLimiter is a module-level singleton — a second
// test hitting the same uid within the same 60s window would inherit whatever
// budget the first test already spent instead of starting fresh.
describe('collectionWriteLimiter — shared bucket across POST /collections and PATCH /collections/:id', () => {
  it('429s with the house { error, code: RATE_LIMITED } JSON shape once the per-user cap is hit, and create+rename share one budget', async () => {
    process.env.NODE_ENV = 'development' // un-skip collectionWriteLimiter
    try {
      // Spend 1 on a create so there's a collection to rename.
      const created = await request(app)
        .post('/api/collections')
        .set(AUTH_HEADER)
        .send({ name: 'Collection 0' })
      expect(created.status).toBe(201)
      const id = created.body.id

      // Spend the rest of the budget on RENAMES (not creates) to prove the
      // rename route draws from the SAME instance as create, not a fresh one.
      for (let i = 1; i < COLLECTION_LIMIT; i++) {
        const res = await request(app)
          .patch(`/api/collections/${id}`)
          .set(AUTH_HEADER)
          .send({ name: `Collection ${i}` })
        expect(res.status).toBe(200)
      }

      // The budget is now fully spent (1 create + (COLLECTION_LIMIT - 1)
      // renames = COLLECTION_LIMIT total) — the next request on EITHER route
      // 429s with the house shape.
      const blocked = await request(app)
        .post('/api/collections')
        .set(AUTH_HEADER)
        .send({ name: 'One Too Many' })
      expect(blocked.status).toBe(429)
      expect(blocked.body).toEqual({
        error: 'You’re doing that too quickly — wait a moment and try again.',
        code: 'RATE_LIMITED',
      })
      const blockedRename = await request(app)
        .patch(`/api/collections/${id}`)
        .set(AUTH_HEADER)
        .send({ name: 'Also One Too Many' })
      expect(blockedRename.status).toBe(429)
      expect(blockedRename.body.code).toBe('RATE_LIMITED')
    } finally {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    }
  }, 30000)
})
