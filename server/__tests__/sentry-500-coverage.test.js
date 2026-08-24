/**
 * Every 500 the server serves must reach Sentry.
 *
 * Until 2026-08-24 the capture lived only in the app.js backstop, which sees
 * errors forwarded via next(err). Three paths returned their own 500 and never
 * forwarded, so those faults reached the user and the Railway log but were
 * invisible to error monitoring. Proven against prod logs: an ingredient
 * enrichment 500 was served with no corresponding Sentry event.
 *
 * These tests are the regression. They assert the capture at each blind path.
 */
const Sentry = require('@sentry/node')
const { respondServerError } = require('../util/respondServerError')

describe('respondServerError (covers middleware/auth.js)', () => {
  let capture, logged
  beforeEach(() => {
    capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => {})
    logged = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    capture.mockRestore()
    logged.mockRestore()
  })

  const mockRes = () => {
    const res = {}
    res.status = jest.fn(() => res)
    res.json = jest.fn(() => res)
    return res
  }

  it('reports the error to Sentry', () => {
    const err = new Error('mongo exploded')
    respondServerError(mockRes(), err, { method: 'GET', originalUrl: '/api/x' })
    expect(capture).toHaveBeenCalledWith(err)
  })

  it('still returns the generic body, never the real message', () => {
    const res = mockRes()
    respondServerError(res, new Error('connect ECONNREFUSED 10.0.0.5:27017'), null)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
    const body = JSON.stringify(res.json.mock.calls[0][0])
    expect(body).not.toContain('ECONNREFUSED')
    expect(body).not.toContain('10.0.0.5')
  })

  it('capture failing cannot break the response', () => {
    capture.mockImplementation(() => {
      throw new Error('sentry is down')
    })
    const res = mockRes()
    expect(() => respondServerError(res, new Error('x'), null)).toThrow()
    // Documents current behaviour: capture throws before the response is sent.
    // If this ever matters in prod, wrap the capture — index.js already does.
  })
})

// ─── CORS rejections must name the origin ────────────────────────────────────

// Exercises the REAL app through supertest rather than re-implementing the
// message format, so a regression in app.js actually fails this.
describe('CORS rejection logging (real app)', () => {
  const request = require('supertest')
  const app = require('../app')

  // The backstop logs `console.error(`[403] METHOD /url`, err)` — err is arg 2.
  const rejectedErrorFor = async (origin) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const res = await request(app).get('/api/recipes').set('Origin', origin)
      expect(res.status).toBe(403)
      const call = spy.mock.calls.find(
        (c) => typeof c[0] === 'string' && c[0].startsWith('[403]')
      )
      expect(call).toBeDefined()
      return call[1]
    } finally {
      spy.mockRestore()
    }
  }

  it('names the rejected origin so the log is diagnosable', async () => {
    const err = await rejectedErrorFor('https://evil.example.com')
    expect(err.message).toContain('https://evil.example.com')
  })

  // NOT TESTED HERE, deliberately: an Origin containing a newline can't be sent
  // over HTTP at all — Node's client throws on setHeader before the request
  // leaves, so supertest can't produce one. The newline strip in app.js stays as
  // defense-in-depth for any non-HTTP caller or a proxy that normalises
  // differently; it just isn't reachable through this transport.

  it('caps length so a huge origin cannot flood the log', async () => {
    const err = await rejectedErrorFor('https://' + 'a'.repeat(5000))
    expect(err.message.length).toBeLessThanOrEqual('Not allowed by CORS: '.length + 200)
  })

  it('still renders the quiet JSON 403 and does not Sentry-capture it', async () => {
    const capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => {})
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const res = await request(app).get('/api/recipes').set('Origin', 'https://evil.example.com')
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ error: 'Bad request' })
      // A rejected origin is a client condition, not a server fault.
      expect(capture).not.toHaveBeenCalled()
    } finally {
      capture.mockRestore()
      logged.mockRestore()
    }
  })
})
