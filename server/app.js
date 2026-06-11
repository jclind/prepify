const express = require('express')
const cors = require('cors')
const recipeRoutes = require('./routes/recipes')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const ingredientRoutes = require('./routes/ingredients')
const draftRoutes = require('./routes/drafts')

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

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api', recipeRoutes)
app.use('/api', reviewRoutes)
app.use('/api', userRoutes)
app.use('/api', authRoutes)
app.use('/api/ingredients', ingredientRoutes)
app.use('/api/drafts', draftRoutes)

module.exports = app
