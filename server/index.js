require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connectDB } = require('./db')
const recipeRoutes = require('./routes/recipes')
const tagRoutes = require('./routes/tags')
const reviewRoutes = require('./routes/reviews')
const userRoutes = require('./routes/users')

const app = express()
const PORT = process.env.PORT || 4000

// TODO: lock CORS origin to frontend URL in production
app.use(cors({ origin: '*' }))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/', recipeRoutes)
app.use('/', tagRoutes)
app.use('/', reviewRoutes)
app.use('/', userRoutes)

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1)
  })
