/**
 * Prod-hardening regression tests (Wave 14 lane E):
 *   - GET /health does a live DB ping: 200 {status:'ok'} healthy, 503
 *     {status:'degraded'} when the ping fails.
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
  it('returns 200 { status: "ok" } when the DB ping succeeds', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns 503 { status: "degraded" } when the DB ping fails', async () => {
    const db = getDB()
    const spy = jest
      .spyOn(db, 'command')
      .mockRejectedValue(new Error('mongo unreachable'))
    try {
      const res = await request(app).get('/health')
      expect(res.status).toBe(503)
      expect(res.body).toEqual({ status: 'degraded' })
    } finally {
      spy.mockRestore()
    }
  })

  it('uses the getDB() singleton (never opens a new client) for the ping', async () => {
    const db = getDB()
    const spy = jest.spyOn(db, 'command')
    await request(app).get('/health')
    expect(spy).toHaveBeenCalledWith({ ping: 1 })
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
