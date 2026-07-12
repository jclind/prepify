/**
 * routes/bugReports.js — submitLimiter's 429 response shape.
 *
 * submitLimiter is a raw `express-rate-limit` instance keyed by IP (not
 * `req.uid`, so it can't reuse `makeUserLimiter`), skipped under
 * NODE_ENV=test like every other limiter in the tree (writeLimiter.test.js
 * uses the same pattern). Flip NODE_ENV for THIS file to exercise the real
 * behaviour, then restore it so no other test file sees the limiter live.
 *
 * This pins the JSON `{ error, code: 'RATE_LIMITED' }` shape (matching the
 * house `makeUserLimiter` convention) rather than express-rate-limit's
 * default plain-text 429 body — see docs/API_CONTRACT.md's bug-reports 429
 * note. Window/limit/skip behaviour is unchanged (15 requests / 15 min),
 * so this drives the real 15-request cap once to prove the shape.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

const validReport = {
  category: 'bug',
  description: 'The save button does nothing on the recipe page.',
  url: '/recipes/abc',
  appVersion: '2.6.3',
}

afterEach(async () => {
  await getDB().collection('bugReports').deleteMany({})
})

describe('POST /api/bug-reports — submitLimiter 429 shape', () => {
  it('429s with the house { error, code: RATE_LIMITED } JSON shape once the IP cap is hit', async () => {
    process.env.NODE_ENV = 'development' // un-skip submitLimiter (and the global backstop, which caps at 1000 — nowhere near the 16 requests below)
    try {
      // The cap is 15 requests / 15 min per IP; all requests in a supertest
      // run against the same app share one loopback IP, so the 16th trips it.
      for (let i = 0; i < 15; i++) {
        const res = await request(app).post('/api/bug-reports').send(validReport)
        expect(res.status).toBe(201)
      }
      const blocked = await request(app).post('/api/bug-reports').send(validReport)
      expect(blocked.status).toBe(429)
      expect(blocked.body).toEqual({
        error: 'You’re doing that too quickly — wait a moment and try again.',
        code: 'RATE_LIMITED',
      })
    } finally {
      // finally, so a failed assertion above can't leak NODE_ENV=test into
      // later test files run in the same --runInBand process.
      process.env.NODE_ENV = ORIGINAL_NODE_ENV
    }
  }, 30000)
})
