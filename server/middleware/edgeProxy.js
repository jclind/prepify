const crypto = require('crypto')
const net = require('net')

// The site calls the API on its own domain (prepifymeals.com/api/*), and a
// Netlify Edge Function forwards the request here, so visitors on networks
// whose DNS blocks *.railway.app still get recipes. Behind that extra hop the
// platform-derived req.ip is the Netlify edge's address, which would put every
// visitor on one edge node into a single per-IP rate-limit bucket (the global
// backstop in app.js and the bug-report submitLimiter).
//
// The edge function sends the visitor's IP (Netlify's context.ip, not anything
// the client supplied) in X-Prepify-Client-Ip, plus a shared secret in
// X-Prepify-Edge. Only a request carrying the right secret gets its req.ip
// replaced. Anyone calling the Railway host directly keeps the platform-derived
// req.ip, so the headers can't be used to pick an IP. With EDGE_PROXY_SECRET
// unset (dev, CI) this is a no-op.
const EDGE_SECRET_HEADER = 'x-prepify-edge'
const EDGE_CLIENT_IP_HEADER = 'x-prepify-client-ip'

function secretMatches(sent, secret) {
  const a = Buffer.from(sent)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function edgeClientIp({ secret = process.env.EDGE_PROXY_SECRET } = {}) {
  return (req, res, next) => {
    if (!secret) return next()
    const sent = req.get(EDGE_SECRET_HEADER)
    if (!sent || !secretMatches(sent, secret)) return next()

    const ip = (req.get(EDGE_CLIENT_IP_HEADER) || '').trim()
    // req.ip is a getter on Express 4's request prototype, so a plain
    // assignment is silently ignored. An own property shadows it.
    if (net.isIP(ip)) {
      Object.defineProperty(req, 'ip', { value: ip, configurable: true, enumerable: true })
    }
    next()
  }
}

// API responses are per-user (auth rides the Authorization header) and carry an
// ETag but no Cache-Control. A CDN in front of the API, like the Netlify edge,
// may cache a response like that and serve one user's data to another, so
// every /api response says it must never be stored.
function noStore(req, res, next) {
  res.set('Cache-Control', 'private, no-store')
  next()
}

module.exports = { edgeClientIp, noStore, EDGE_SECRET_HEADER, EDGE_CLIENT_IP_HEADER }
