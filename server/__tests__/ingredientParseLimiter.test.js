/**
 * routes/ingredients.js — the parseLimiter cap on POST /api/ingredients/parse.
 *
 * Mirrors writeLimiter.test.js's approach: the limiter `skip`s under
 * NODE_ENV=test (so the rest of the suite isn't throttled), so this file flips
 * NODE_ENV for the real limiter instance to exercise its actual behaviour, then
 * restores it. Mounted on a tiny standalone app (not the shared `../app`) so
 * this doesn't need Mongo/Firebase wiring — the limiter only reads req.uid.
 */

const express = require('express')
const request = require('supertest')
const { MAX_INGREDIENTS } = require('../util/recipeLimits')
const ingredientRoutes = require('../routes/ingredients')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

let server
beforeAll(() => {
  process.env.NODE_ENV = 'development' // un-skip the limiter
  const app = express()
  app.use((req, _res, next) => {
    req.uid = req.headers['x-test-uid']
    next()
  })
  app.post('/parse', ingredientRoutes.parseLimiter, (_req, res) => res.json({ ok: true }))
  server = app.listen(0)
})
afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  server.close()
})

describe('parseLimiter — ingredient-parse per-user cap', () => {
  it('clears MAX_INGREDIENTS with headroom for edits/retries in the same window', () => {
    // The bug this guards: the limiter used to sit BELOW MAX_INGREDIENTS (30 <
    // 50), so filling a max-size recipe alone tripped it. Assert it now clears
    // the cap with real headroom left over.
    expect(ingredientRoutes.PARSE_LIMIT).toBeGreaterThan(MAX_INGREDIENTS)
    expect(ingredientRoutes.PARSE_LIMIT - MAX_INGREDIENTS).toBeGreaterThanOrEqual(20)
  })

  it('allows a burst covering a full-size recipe (MAX_INGREDIENTS requests) with no 429s', async () => {
    const uid = 'user-full-recipe'
    for (let i = 0; i < MAX_INGREDIENTS; i++) {
      const res = await request(server).post('/parse').set('x-test-uid', uid)
      expect(res.status).toBe(200)
    }
  })

  it('429s past PARSE_LIMIT with the RATE_LIMITED code the FE branches on', async () => {
    const uid = 'user-over-limit'
    for (let i = 0; i < ingredientRoutes.PARSE_LIMIT; i++) {
      const res = await request(server).post('/parse').set('x-test-uid', uid)
      expect(res.status).toBe(200)
    }
    const blocked = await request(server).post('/parse').set('x-test-uid', uid)
    expect(blocked.status).toBe(429)
    expect(blocked.body.code).toBe('RATE_LIMITED')
    // express-rate-limit's standardHeaders sets Retry-After on the 429 — the
    // client reads this to show an honest wait time instead of a guess.
    expect(blocked.headers['retry-after']).toBeDefined()
  })
})
