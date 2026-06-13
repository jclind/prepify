// Must load first so Sentry instruments express before it's required below.
require('./instrument')
const app = require('./app')
const { connectDB } = require('./db')

const PORT = process.env.PORT || 4000

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })
