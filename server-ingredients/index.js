require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient } = require('mongodb')
const admin = require('firebase-admin')
const parseRoutes = require('./routes/parse')

const app = express()
const PORT = process.env.PORT || 4001

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ingredient-parser' }))

app.use('/parse', parseRoutes)

const MONGO_URI = process.env.MONGO_URI

MongoClient.connect(MONGO_URI)
  .then((client) => {
    const db = client.db('prepify')
    app.locals.db = db
    console.log('Connected to MongoDB')

    app.listen(PORT, () => {
      console.log(`Ingredient parser service running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })
