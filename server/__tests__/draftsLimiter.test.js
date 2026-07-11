/**
 * routes/drafts.js — draftWriteLimiter's real 429 behaviour on POST /drafts,
 * and proof that PUT /drafts/:id (autosave) is NOT limited.
 *
 * Mirrors collectionsLimiter.test.js: the limiter `skip`s under NODE_ENV=test
 * (so the rest of the suite, which fires many requests per user via
 * supertest, isn't throttled), so this file flips NODE_ENV to exercise the
 * real behaviour, then restores it in `finally` so a failed assertion can't
 * leak the flip into later test files run in the same --runInBand process.
 * The global per-IP backstop in app.js (limit 1000) is also live under this
 * flip but nowhere near the request counts driven below.
 */

const request = require('supertest')
const { ObjectId } = require('mongodb')
const app = require('../app')
const { getDB } = require('../db')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const TEST_UID = 'test-uid'
const DRAFT_LIMIT = 30 // draftWriteLimiter's default (makeUserLimiter())

afterEach(async () => {
  await getDB().collection('recipeDrafts').deleteMany({})
})

describe('draftWriteLimiter — POST /drafts only', () => {
  it('429s with the house { error, code: RATE_LIMITED } JSON shape once the per-user cap is hit', async () => {
    process.env.NODE_ENV = 'development' // un-skip draftWriteLimiter
    try {
      // DRAFT_LIMIT (30, the rate cap) is above MAX_DRAFTS_PER_USER (25, the
      // drafts.js resource cap from V3), so once the loop passes 25 creates
      // the route itself starts 409ing with DRAFT_LIMIT — a *different*
      // status/code than the 429 this test pins. Assert only that the
      // limiter itself doesn't trip (never 429) for the first DRAFT_LIMIT
      // requests; which of 201/409 the handler returns is drafts.js's own
      // concern, not the limiter's.
      for (let i = 0; i < DRAFT_LIMIT; i++) {
        const res = await request(app)
          .post('/api/drafts')
          .set(AUTH_HEADER)
          .send({ title: `Draft ${i}` })
        expect(res.status).not.toBe(429)
      }

      // The rate budget is now fully spent (DRAFT_LIMIT requests) — the next
      // POST 429s with the house shape regardless of drafts.js's own cap.
      const blocked = await request(app)
        .post('/api/drafts')
        .set(AUTH_HEADER)
        .send({ title: 'One Too Many' })
      expect(blocked.status).toBe(429)
      expect(blocked.body).toEqual({
        error: 'You’re doing that too quickly — wait a moment and try again.',
        code: 'RATE_LIMITED',
      })
    } finally {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    }
  }, 30000)

  it('PUT /drafts/:id (autosave) is NOT limited — more than DRAFT_LIMIT PUTs all pass the limiter', async () => {
    process.env.NODE_ENV = 'development' // un-skip draftWriteLimiter (if it were mounted here)
    try {
      // Seed a draft to autosave against directly in the DB, rather than via
      // POST /drafts — the prior test in this file already ran DRAFT_LIMIT+1
      // POSTs for this same uid, and draftWriteLimiter is a module-level
      // singleton whose 60s window is shared across tests in this
      // --runInBand process, so a POST here could itself 429.
      const now = Date.now().toString()
      const id = new ObjectId()
      await getDB().collection('recipeDrafts').insertOne({
        _id: id,
        userId: TEST_UID,
        title: 'WIP',
        createdAt: now,
        updatedAt: now,
      })
      let updatedAt = now

      // Fire MORE than DRAFT_LIMIT PUTs (the POST cap) against the same
      // draft. If PUT were accidentally sharing or mounting a limiter, this
      // would 429 well before the loop finishes; since it's deliberately
      // unmounted, every single one succeeds.
      const attempts = DRAFT_LIMIT + 10
      for (let i = 0; i < attempts; i++) {
        const res = await request(app)
          .put(`/api/drafts/${id}`)
          .set(AUTH_HEADER)
          .send({ title: `Autosave ${i}`, updatedAt })
        expect(res.status).toBe(200)
        updatedAt = res.body.updatedAt
      }
    } finally {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    }
  }, 30000)
})
