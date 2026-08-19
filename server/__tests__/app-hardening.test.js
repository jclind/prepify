/**
 * Prod-hardening regression tests (Wave 14 lane E):
 *   - GET /health runs a live DB *query* (not a ping): 200 {status:'ok'}
 *     healthy, 503 {status:'degraded'} when the query fails. The ping-vs-query
 *     distinction has its own regression test below; see app.js for the
 *     2026-07/08 outage it encodes.
 *   - A rejected CORS origin renders as a quiet JSON 403 (no Sentry capture).
 *   - An unmatched /api route returns a JSON 404, not Express's default HTML.
 *
 * The signal handlers and graceful shutdown live in index.js, which the test
 * suite never loads, so they are intentionally not exercised here.
 */

const request = require('supertest')
const app = require('../app')
const { getDB } = require('../db')

// ─── /health live DB ping ────────────────────────────────────────────────────

describe('GET /health', () => {
  // Swap only the `recipes` handle the route asks for, leaving every other
  // collection real, so a stubbed probe can't disturb the rest of the suite.
  const stubRecipesFindOne = (impl) => {
    const db = getDB()
    const realCollection = db.collection.bind(db)
    return jest.spyOn(db, 'collection').mockImplementation((name, ...rest) => {
      if (name !== 'recipes') return realCollection(name, ...rest)
      return { findOne: impl }
    })
  }

  it('returns 200 { status: "ok" } when the DB query succeeds', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns 503 { status: "degraded" } when the DB query fails', async () => {
    const spy = stubRecipesFindOne(() =>
      Promise.reject(new Error('mongo unreachable'))
    )
    try {
      const res = await request(app).get('/health')
      expect(res.status).toBe(503)
      expect(res.body).toEqual({ status: 'degraded' })
    } finally {
      spy.mockRestore()
    }
  })

  // THE REGRESSION. Prod sat terminated from 2026-07-12 to 2026-08-19 while
  // /health answered 200: the Atlas proxy kept serving `ping` after real
  // queries had started failing, so Railway never restarted the dead instance.
  // A ping-based probe passes this scenario. A query-based one must not.
  it('reports degraded when the DB answers pings but cannot run queries', async () => {
    const db = getDB()
    const pingSpy = jest.spyOn(db, 'command').mockResolvedValue({ ok: 1 })
    const findSpy = stubRecipesFindOne(() =>
      Promise.reject(new Error('tlsv1 alert internal error'))
    )
    try {
      const res = await request(app).get('/health')
      expect(res.status).toBe(503)
      expect(res.body).toEqual({ status: 'degraded' })
      // The healthy-looking ping must never have been consulted.
      expect(pingSpy).not.toHaveBeenCalled()
    } finally {
      findSpy.mockRestore()
      pingSpy.mockRestore()
    }
  })

  it('treats an empty recipes collection as healthy (fresh deploy)', async () => {
    const spy = stubRecipesFindOne(() => Promise.resolve(null))
    try {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'ok' })
    } finally {
      spy.mockRestore()
    }
  })

  it('uses the getDB() singleton (never opens a new client) for the probe', async () => {
    const db = getDB()
    const spy = jest.spyOn(db, 'collection')
    await request(app).get('/health')
    expect(spy).toHaveBeenCalledWith('recipes')
    spy.mockRestore()
  })
})

// ─── CORS rejection → quiet JSON 403 ─────────────────────────────────────────

describe('CORS origin rejection', () => {
  it('renders a disallowed origin as a JSON 403, not a 500', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app)
      .get('/api/recipes')
      .set('Origin', 'http://evil.example.com')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Bad request' })
    spy.mockRestore()
  })
})

// ─── Unmatched /api route → JSON 404 ─────────────────────────────────────────

describe('unmatched /api route', () => {
  it('returns a JSON 404 { error: "Not found" }', async () => {
    const res = await request(app).get('/api/no-such-endpoint-xyz')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })
})
