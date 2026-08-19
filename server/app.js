const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const pkg = require('./package.json')
const recipeRoutes = require('./routes/recipes')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const ingredientRoutes = require('./routes/ingredients')
const nutritionRoutes = require('./routes/nutrition')
const draftRoutes = require('./routes/drafts')
const gamificationRoutes = require('./routes/gamification')
const publicProfileRoutes = require('./routes/publicProfile')
const reportRoutes = require('./routes/reports')
const bugReportRoutes = require('./routes/bugReports')
const adminRoutes = require('./routes/admin')
const collectionRoutes = require('./routes/collections')
const Sentry = require('@sentry/node')
const { GENERIC_500_MESSAGE } = require('./util/respondServerError')
const { getDB } = require('./db')

const app = express()

// The default ('extended'/qs) parser turns ?id[$ne]=x into a nested object,
// which would flow into MongoDB filters as a query operator. 'simple' keeps
// every query value a plain string (or array of strings for repeated keys).
app.set('query parser', 'simple')

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))

const netlifyPreviewPattern = /^https:\/\/deploy-preview-\d+--prepify\.netlify\.app$/

// Outside production, allow any localhost/127.0.0.1 dev client on ports 3000-3010
// so git worktrees (each Vite picks the next free port) reach the API without
// editing FRONTEND_URLS each time. Never applied when NODE_ENV=production.
const isProduction = process.env.NODE_ENV === 'production'
const localhostDevPattern = /^http:\/\/(localhost|127\.0\.0\.1):30(0\d|10)$/

// Loud startup warning: in production with FRONTEND_URLS unset/empty, the CORS
// allow-list silently falls back to 'http://localhost:3000' — which no real
// browser client sends — so every production origin (except Netlify deploy
// previews) is blocked and the frontend can't reach the API. This only warns;
// the fallback behaviour is intentionally left unchanged.
if (isProduction && !(process.env.FRONTEND_URLS || '').trim()) {
  console.warn(
    'WARNING: FRONTEND_URLS is unset in production. CORS will fall back to ' +
      "'http://localhost:3000' and block all real production origins. Set " +
      'FRONTEND_URLS to your production frontend origin(s) (comma-separated).'
  )
}

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      netlifyPreviewPattern.test(origin) ||
      (!isProduction && localhostDevPattern.test(origin))
    ) {
      callback(null, true)
    } else {
      // A rejected origin is an expected client condition, not a server fault:
      // tag it 403 so the error backstop renders it as a quiet JSON 403 and
      // does NOT Sentry-capture it (the backstop only captures status >= 500).
      const err = new Error('Not allowed by CORS')
      err.status = 403
      callback(err)
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(helmet())

// In production the server sits behind exactly one reverse proxy (the hosting
// platform's), so req.ip must come from X-Forwarded-For for per-IP rate
// limiting to see real clients. Never trusted in dev, where the server is hit
// directly and the header would be client-spoofable.
if (isProduction) app.set('trust proxy', 1)

// /health stays above the limiter so platform health checks and uptime
// monitors can never be throttled into a false "down".
//
// A live DB round-trip (not a static 200): a wedged instance whose Mongo
// connection has dropped must report unhealthy so Railway restarts it instead
// of leaving the deploy green on a broken pod. The probe is raced against a 2s
// timeout so a hung/unreachable Mongo can't stall the healthcheck past the
// driver's serverSelectionTimeoutMS. It reuses the getDB() singleton (never a
// new client) and can never throw: a not-yet-connected getDB(), a failed probe,
// or the timeout all collapse to a 503 { status: 'degraded' }.
//
// The probe is a REAL QUERY, deliberately not `db.command({ ping: 1 })`. That
// distinction is not theoretical: from 2026-07-12 to 2026-08-19 the prod Atlas
// cluster was terminated, and for that entire window `/health` answered 200
// { status: 'ok' } while every data route 500'd with a TLS handshake failure.
// The ping was being served even though no query could run, so Railway held a
// completely dead instance green for five weeks and nothing alerted. A findOne
// goes through the same query path the routes use, so "the DB answers pings"
// can never again stand in for "the app can actually read data".
//
// `recipes` is the right collection to probe: it backs the home and browse
// pages, so if it is unreadable the site is down by any definition. The empty
// filter with an _id-only projection makes this O(1) — the server returns the
// first document it walks, or null on an empty collection, which is a healthy
// answer (a fresh deploy against an empty DB must report healthy).
app.get('/health', async (req, res) => {
  let timer
  try {
    const db = getDB() // throws if connectDB() hasn't completed yet
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('health probe timeout')), 2000)
    })
    await Promise.race([
      db.collection('recipes').findOne({}, { projection: { _id: 1 } }),
      timeout,
    ])
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(503).json({ status: 'degraded' })
  } finally {
    clearTimeout(timer)
  }
})

// GET /version — what code is actually running.
//
// Added after the 2026-08-19 restore, where confirming a deploy meant opening
// the Railway dashboard because nothing the server serves identifies its own
// build. A deploy you can't verify from outside is a deploy you have to trust,
// and the health-probe outage in this same file is what trusting looks like.
//
// Deliberately does NOT touch the database. Its whole job is answering "which
// build is live" during an incident, which is exactly when Mongo may be the
// thing that's broken — a version endpoint that 500s with the database is
// useless at the only moment it matters. /health is the DB liveness signal;
// this is the identity signal. Keep them separate.
//
// Railway injects RAILWAY_GIT_COMMIT_SHA and RAILWAY_GIT_BRANCH into the
// runtime env automatically (they don't appear in the dashboard's variable
// list, which is expected). Anywhere else — local, CI, Jest — they're absent
// and the fields come back null rather than throwing or reporting a wrong SHA.
//
// Public on purpose: the repo is public, so a commit SHA discloses nothing an
// attacker couldn't already read, and gating it behind auth would defeat the
// one-curl check it exists for. Nothing beyond build identity goes in here.
app.get('/version', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || null
  res.json({
    version: pkg.version,
    commit: sha ? sha.slice(0, 7) : null,
    commitFull: sha,
    branch: process.env.RAILWAY_GIT_BRANCH || null,
    env: process.env.NODE_ENV || 'development',
  })
})

// Generous global per-IP backstop — normal browsing is tens of requests a
// minute, so only scripted abuse approaches this. The tight per-user limit on
// /api/ingredients/parse (paid Spoonacular quota) lives in routes/ingredients.js.
// Skipped under Jest, where supertest fires hundreds of requests from one IP
// in seconds; Cypress E2E in CI stays well under the cap.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  })
)

app.use('/api', recipeRoutes)
app.use('/api', reviewRoutes)
app.use('/api', userRoutes)
app.use('/api', authRoutes)
app.use('/api', gamificationRoutes)
app.use('/api', publicProfileRoutes)
app.use('/api/ingredients', ingredientRoutes)
app.use('/api/nutrition', nutritionRoutes)
app.use('/api/drafts', draftRoutes)
app.use('/api', reportRoutes)
app.use('/api', bugReportRoutes)
app.use('/api', adminRoutes)
app.use('/api', collectionRoutes)

// JSON 404 for unmatched API routes. Without this, an unknown /api/* path falls
// through to Express's default handler, which returns an HTML "Cannot GET …"
// page — a JSON API should answer with JSON. Scoped to /api and mounted AFTER
// every router (so real routes still match) but BEFORE the error backstop.
// Non-API surfaces (/health, anything outside /api) are unaffected.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Central error backstop. Route handlers catch their own errors (via
// respondServerError), but errors thrown *outside* a route's try/catch — a
// malformed JSON body rejected by express.json(), a CORS origin rejection, or
// any future handler that forgets to catch — would otherwise reach Express's
// default handler, which echoes a stack trace to the client. Same contract as
// respondServerError: log the real error, return a generic body. A 4xx the
// thrower set (e.g. body-parser's 400 on bad JSON) is preserved; anything else
// collapses to 500.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || err.statusCode || 500
  console.error(`[${status}] ${req.method} ${req.originalUrl}`, err)
  // Report genuine server faults to Sentry (no-ops without SENTRY_DSN). Skip
  // client 4xx the thrower set (bad JSON, CORS) — those are expected outcomes,
  // not bugs. Capture never blocks or changes the client-facing response.
  if (status >= 500) Sentry.captureException(err)
  res.status(status).json({
    error: status >= 500 ? GENERIC_500_MESSAGE : 'Bad request',
  })
})

module.exports = app
