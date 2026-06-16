const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const recipeRoutes = require('./routes/recipes')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const ingredientRoutes = require('./routes/ingredients')
const draftRoutes = require('./routes/drafts')
const gamificationRoutes = require('./routes/gamification')
const publicProfileRoutes = require('./routes/publicProfile')
const reportRoutes = require('./routes/reports')
const bugReportRoutes = require('./routes/bugReports')
const adminRoutes = require('./routes/admin')
const collectionRoutes = require('./routes/collections')
const Sentry = require('@sentry/node')
const { GENERIC_500_MESSAGE } = require('./util/respondServerError')

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
      callback(new Error('Not allowed by CORS'))
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
app.get('/health', (req, res) => res.json({ status: 'ok' }))

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
app.use('/api/drafts', draftRoutes)
app.use('/api', reportRoutes)
app.use('/api', bugReportRoutes)
app.use('/api', adminRoutes)
app.use('/api', collectionRoutes)

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
