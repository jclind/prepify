/**
 * middleware/edgeProxy.js: the visitor IP handed over by the site's Netlify
 * edge, and the no-store header on every /api response.
 *
 * edgeClientIp is tested on a bare Express app with its own limiter, so the
 * secret and the rate-limit keying can be exercised without the shared app's
 * test-mode limiter skips. noStore is checked through the real app.
 */

const express = require('express')
const request = require('supertest')
const { rateLimit } = require('express-rate-limit')
const { edgeClientIp, EDGE_SECRET_HEADER, EDGE_CLIENT_IP_HEADER } = require('../middleware/edgeProxy')

const SECRET = 'test-edge-secret'

function ipEchoApp(secret) {
  const app = express()
  app.use(edgeClientIp({ secret }))
  app.get('/ip', (req, res) => res.json({ ip: req.ip }))
  return app
}

describe('edgeClientIp', () => {
  it('uses the forwarded visitor IP when the edge secret matches', async () => {
    const res = await request(ipEchoApp(SECRET))
      .get('/ip')
      .set(EDGE_SECRET_HEADER, SECRET)
      .set(EDGE_CLIENT_IP_HEADER, '203.0.113.7')
    expect(res.body.ip).toBe('203.0.113.7')
  })

  it('accepts an IPv6 visitor address', async () => {
    const res = await request(ipEchoApp(SECRET))
      .get('/ip')
      .set(EDGE_SECRET_HEADER, SECRET)
      .set(EDGE_CLIENT_IP_HEADER, '2001:db8::1')
    expect(res.body.ip).toBe('2001:db8::1')
  })

  it('ignores the IP header when the secret is wrong', async () => {
    const res = await request(ipEchoApp(SECRET))
      .get('/ip')
      .set(EDGE_SECRET_HEADER, 'guess')
      .set(EDGE_CLIENT_IP_HEADER, '203.0.113.7')
    expect(res.body.ip).not.toBe('203.0.113.7')
  })

  it('ignores the IP header when no secret is sent', async () => {
    const res = await request(ipEchoApp(SECRET))
      .get('/ip')
      .set(EDGE_CLIENT_IP_HEADER, '203.0.113.7')
    expect(res.body.ip).not.toBe('203.0.113.7')
  })

  it('ignores a value that is not an IP address', async () => {
    const res = await request(ipEchoApp(SECRET))
      .get('/ip')
      .set(EDGE_SECRET_HEADER, SECRET)
      .set(EDGE_CLIENT_IP_HEADER, 'not-an-ip')
    expect(res.body.ip).not.toBe('not-an-ip')
  })

  it('does nothing when the server has no secret configured', async () => {
    const res = await request(ipEchoApp(undefined))
      .get('/ip')
      .set(EDGE_SECRET_HEADER, '')
      .set(EDGE_CLIENT_IP_HEADER, '203.0.113.7')
    expect(res.body.ip).not.toBe('203.0.113.7')
  })

  it('gives each forwarded visitor their own rate-limit bucket', async () => {
    const app = express()
    app.use(edgeClientIp({ secret: SECRET }))
    app.use(rateLimit({ windowMs: 60_000, limit: 1, standardHeaders: true, legacyHeaders: false }))
    app.get('/x', (req, res) => res.sendStatus(200))

    const fromEdge = ip =>
      request(app).get('/x').set(EDGE_SECRET_HEADER, SECRET).set(EDGE_CLIENT_IP_HEADER, ip)

    expect((await fromEdge('203.0.113.1')).status).toBe(200)
    expect((await fromEdge('203.0.113.2')).status).toBe(200)
    expect((await fromEdge('203.0.113.1')).status).toBe(429)
  })
})

describe('noStore on /api', () => {
  const app = require('../app')

  it('marks API responses private and uncacheable', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist')
    expect(res.status).toBe(404)
    expect(res.headers['cache-control']).toBe('private, no-store')
  })

  it('leaves /health alone', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['cache-control']).not.toBe('private, no-store')
  })
})
