const express = require('express')
const cors = require('cors')
const recipeRoutes = require('./routes/recipes')
const tagRoutes = require('./routes/tags')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')
const ingredientRoutes = require('./routes/ingredients')

const app = express()

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/', recipeRoutes)
app.use('/', tagRoutes)
app.use('/', reviewRoutes)
app.use('/', userRoutes)
app.use('/', authRoutes)
app.use('/api/ingredients', ingredientRoutes)

module.exports = app
