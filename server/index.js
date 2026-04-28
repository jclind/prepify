require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connectDB } = require('./db')
const recipeRoutes = require('./routes/recipes')
const tagRoutes = require('./routes/tags')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')
const authRoutes = require('./routes/auth')

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/', recipeRoutes)
app.use('/', tagRoutes)
app.use('/', reviewRoutes)
app.use('/', userRoutes)
app.use('/', authRoutes)

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })
