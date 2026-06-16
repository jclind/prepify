/**
 * middleware/writeLimiter — the shared per-user cap on moderated content writes.
 *
 * The limiter `skip`s when NODE_ENV === 'test' (so the rest of the suite, which
 * fires many requests per user via supertest, isn't throttled). `skip` is read
 * per-request, so we flip NODE_ENV for THIS file to exercise the real behaviour,
 * then restore it.
 */

const express = require('express')
const request = require('supertest')
const { writeLimiter } = require('../middleware/writeLimiter')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

// Tiny app: stamp a uid (writeLimiter keys on req.uid, normally set by
// verifyToken) from a header so each test can drive a distinct user.
const makeApp = () => {
  const app = express()
  app.use((req, _res, next) => {
    req.uid = req.headers['x-test-uid']
    next()
  })
  app.post('/write', writeLimiter, (_req, res) => res.json({ ok: true }))
  return app
}

beforeAll(() => {
  process.env.NODE_ENV = 'development' // un-skip the limiter
})
afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('writeLimiter — per-user content-write cap', () => {
  it('allows up to the limit then returns 429 for the same user', async () => {
    const app = makeApp()
    const uid = 'user-a'
    // The first 30 succeed.
    for (let i = 0; i < 30; i++) {
      const res = await request(app).post('/write').set('x-test-uid', uid)
      expect(res.status).toBe(200)
    }
    // The 31st in the window is throttled with the friendly message + a stable
    // code the FE can branch on.
    const blocked = await request(app).post('/write').set('x-test-uid', uid)
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toMatch(/too quickly/i)
    expect(blocked.body.code).toBe('RATE_LIMITED')
  })

  it('keys per user — one user hitting the cap does not throttle another', async () => {
    const app = makeApp()
    // Exhaust user-b.
    for (let i = 0; i < 30; i++) {
      await request(app).post('/write').set('x-test-uid', 'user-b')
    }
    const bBlocked = await request(app).post('/write').set('x-test-uid', 'user-b')
    expect(bBlocked.status).toBe(429)
    // A different user is unaffected.
    const cOk = await request(app).post('/write').set('x-test-uid', 'user-c')
    expect(cOk.status).toBe(200)
  })

  it('is bypassed entirely under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test'
    const app = makeApp()
    // Far more than the limit, all allowed because skip() short-circuits.
    for (let i = 0; i < 40; i++) {
      const res = await request(app).post('/write').set('x-test-uid', 'user-d')
      expect(res.status).toBe(200)
    }
    process.env.NODE_ENV = 'development' // restore for any later tests in this file
  })
})
