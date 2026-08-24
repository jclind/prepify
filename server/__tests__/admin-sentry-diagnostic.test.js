/**
 * POST /api/admin/diagnostics/sentry-test — the on-demand proof that server-side
 * error reporting works.
 *
 * Needed because @sentry/node emits only when something throws, unlike
 * @sentry/react which auto-tracks sessions on every page load. So a healthy
 * server and a server with a broken DSN look identical from the Sentry console,
 * and the only way to tell them apart is to make the server throw.
 *
 * The safety-critical property here is the admin gate. Without it this is a
 * public 500-generator and a way to burn Sentry quota, so it gets tested first
 * and hardest.
 */
const request = require('supertest')
const admin = require('firebase-admin') // auto-mocked
const Sentry = require('@sentry/node')
const app = require('../app')

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }
const ROUTE = '/api/admin/diagnostics/sentry-test'

let capture, logged
beforeEach(() => {
  capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => {})
  // The backstop logs the real error; keep the suite output readable.
  logged = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  capture.mockRestore()
  logged.mockRestore()
  admin.__resetClaims()
})

describe('admin gate (this must never become a public 500-generator)', () => {
  it('401s with no token', async () => {
    const res = await request(app).post(ROUTE)
    expect(res.status).toBe(401)
    expect(capture).not.toHaveBeenCalled()
  })

  it('403s for an authenticated NON-admin', async () => {
    const res = await request(app).post(ROUTE).set(AUTH_HEADER)
    expect(res.status).toBe(403)
    // The whole point: a non-admin cannot make the server throw, or spend quota.
    expect(capture).not.toHaveBeenCalled()
  })

  it('is not reachable by GET (only the explicit POST)', async () => {
    admin.__setClaims({ admin: true })
    const res = await request(app).get(ROUTE).set(AUTH_HEADER)
    expect(res.status).toBe(404)
    expect(capture).not.toHaveBeenCalled()
  })
})

describe('as an admin', () => {
  beforeEach(() => admin.__setClaims({ admin: true }))

  // A 500 is the PASS condition, not a failure: it proves the error travelled
  // the real production path (asyncHandler -> app.js backstop -> capture).
  it('returns the generic 500 — that is the pass', async () => {
    const res = await request(app).post(ROUTE).set(AUTH_HEADER)
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Internal server error' })
  })

  it('reports the error to Sentry through the real backstop', async () => {
    await request(app).post(ROUTE).set(AUTH_HEADER)
    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(capture.mock.calls[0][0].message).toContain('Sentry diagnostic')
  })

  it('echoes a marker so a specific run is findable in Sentry', async () => {
    await request(app).post(`${ROUTE}?marker=deploy-7ce41dc`).set(AUTH_HEADER)
    expect(capture.mock.calls[0][0].message).toContain('[marker: deploy-7ce41dc]')
  })

  it('omits the marker section entirely when none is given', async () => {
    await request(app).post(ROUTE).set(AUTH_HEADER)
    expect(capture.mock.calls[0][0].message).not.toContain('[marker:')
  })

  // Admin-supplied, but untrusted text is untrusted text — same treatment as the
  // CORS origin in app.js.
  it('caps marker length', async () => {
    await request(app).post(`${ROUTE}?marker=${'z'.repeat(500)}`).set(AUTH_HEADER)
    const msg = capture.mock.calls[0][0].message
    expect(msg).toContain('z'.repeat(80))
    expect(msg).not.toContain('z'.repeat(81))
  })

  it('strips control characters from the marker', async () => {
    await request(app).post(`${ROUTE}?marker=a%0D%0Ab%09c`).set(AUTH_HEADER)
    const msg = capture.mock.calls[0][0].message
    expect(msg).toContain('[marker: a  b c]')
    expect(msg).not.toMatch(/[\r\n\t]/)
  })
})
