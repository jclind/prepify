/**
 * middleware/writeLimiter — the per-user cap factory + per-surface instances on
 * moderated content writes.
 *
 * The limiters `skip` when NODE_ENV === 'test' (so the rest of the suite, which
 * fires many requests per user via supertest, isn't throttled). `skip` is read
 * per-request, so we flip NODE_ENV for THIS file to exercise the real behaviour,
 * then restore it.
 */

const express = require('express')
const request = require('supertest')
const {
  makeUserLimiter,
  recipeWriteLimiter,
  reviewWriteLimiter,
  profileWriteLimiter,
} = require('../middleware/writeLimiter')

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

// Tiny app: stamp a uid (the limiters key on req.uid, normally set by
// verifyToken) from a header so each test can drive a distinct user. Each call
// mounts the supplied limiter(s) on their own path so a test can hit two
// surfaces independently, and LISTENS once — reused for every request in the
// test. (Passing the bare app to supertest spins up + tears down a fresh
// ephemeral server per request; at 30+ rapid requests that occasionally ECONNRESETs
// as "socket hang up". One long-lived server avoids the churn.) Servers are
// tracked and closed in afterAll.
const servers = []
const start = (routes) => {
  const app = express()
  app.use((req, _res, next) => {
    req.uid = req.headers['x-test-uid']
    next()
  })
  for (const [path, limiter] of Object.entries(routes)) {
    app.post(path, limiter, (_req, res) => res.json({ ok: true }))
  }
  const server = app.listen(0)
  servers.push(server)
  return server
}

beforeAll(() => {
  process.env.NODE_ENV = 'development' // un-skip the limiters
})
afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  servers.forEach((s) => s.close())
})

describe('makeUserLimiter — per-user content-write cap', () => {
  it('allows up to the limit then returns 429 for the same user', async () => {
    const server = start({ '/write': makeUserLimiter({ limit: 30 }) })
    const uid = 'user-a'
    // The first 30 succeed.
    for (let i = 0; i < 30; i++) {
      const res = await request(server).post('/write').set('x-test-uid', uid)
      expect(res.status).toBe(200)
    }
    // The 31st in the window is throttled with the friendly message + a stable
    // code the FE can branch on.
    const blocked = await request(server).post('/write').set('x-test-uid', uid)
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toMatch(/too quickly/i)
    expect(blocked.body.code).toBe('RATE_LIMITED')
  })

  it('keys per user — one user hitting the cap does not throttle another', async () => {
    const server = start({ '/write': makeUserLimiter({ limit: 30 }) })
    // Exhaust user-b.
    for (let i = 0; i < 30; i++) {
      await request(server).post('/write').set('x-test-uid', 'user-b')
    }
    const bBlocked = await request(server).post('/write').set('x-test-uid', 'user-b')
    expect(bBlocked.status).toBe(429)
    // A different user is unaffected.
    const cOk = await request(server).post('/write').set('x-test-uid', 'user-c')
    expect(cOk.status).toBe(200)
  })

  it('honours a custom message while still carrying the RATE_LIMITED code', async () => {
    const server = start({
      '/write': makeUserLimiter({ limit: 1, message: 'slow your roll' }),
    })
    await request(server).post('/write').set('x-test-uid', 'user-msg')
    const blocked = await request(server).post('/write').set('x-test-uid', 'user-msg')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toBe('slow your roll')
    expect(blocked.body.code).toBe('RATE_LIMITED')
  })

  it('resets the bucket after the window elapses', async () => {
    // Short window so the test doesn't wait a real minute, but wide enough that
    // the two in-window requests can't straddle it even when parallel jest
    // workers starve the event loop.
    const server = start({ '/write': makeUserLimiter({ limit: 1, windowMs: 1000 }) })
    const uid = 'user-window'
    expect((await request(server).post('/write').set('x-test-uid', uid)).status).toBe(200)
    expect((await request(server).post('/write').set('x-test-uid', uid)).status).toBe(429)
    // After the window passes the same user is allowed again.
    await new Promise((r) => setTimeout(r, 1200))
    expect((await request(server).post('/write').set('x-test-uid', uid)).status).toBe(200)
  })

  it('is bypassed entirely under NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test'
    const server = start({ '/write': makeUserLimiter({ limit: 5 }) })
    // Far more than the limit, all allowed because skip() short-circuits.
    for (let i = 0; i < 40; i++) {
      const res = await request(server).post('/write').set('x-test-uid', 'user-d')
      expect(res.status).toBe(200)
    }
    process.env.NODE_ENV = 'development' // restore for any later tests in this file
  })
})

describe('per-surface limiters are independent buckets', () => {
  // The whole point of #3: exhausting one surface must NOT throttle another, so a
  // legit cross-surface burst can't 429. Each exported limiter is its own
  // instance with its own store, so a single uid gets a separate 30/min budget on
  // recipes vs reviews vs profile.
  it('exhausting the recipe surface leaves review + profile untouched for the same user', async () => {
    const server = start({
      '/recipe': recipeWriteLimiter,
      '/review': reviewWriteLimiter,
      '/profile': profileWriteLimiter,
    })
    const uid = 'cross-surface-user'

    // Burn the full recipe budget.
    for (let i = 0; i < 30; i++) {
      expect((await request(server).post('/recipe').set('x-test-uid', uid)).status).toBe(200)
    }
    expect((await request(server).post('/recipe').set('x-test-uid', uid)).status).toBe(429)

    // The other surfaces still have their own full budget.
    expect((await request(server).post('/review').set('x-test-uid', uid)).status).toBe(200)
    expect((await request(server).post('/profile').set('x-test-uid', uid)).status).toBe(200)
  })
})
