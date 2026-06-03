const express = require('express')
const cors = require('cors')
const recipeRoutes = require('./routes/recipes')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const ingredientRoutes = require('./routes/ingredients')
const draftRoutes = require('./routes/drafts')

const app = express()

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))

const netlifyPreviewPattern = /^https:\/\/deploy-preview-\d+--prepify\.netlify\.app$/

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || netlifyPreviewPattern.test(origin)) {
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
