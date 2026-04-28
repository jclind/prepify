const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

const router = Router()

// PUT /addRating
// TODO: protect with verifyToken
router.put('/addRating', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { username, recipeId, rating } = req.query
    if (!username || !recipeId || !rating) {
      return res.status(400).json({ error: 'username, recipeId, and rating are required' })
    }

    const existing = await db.collection('ratings').findOne({ username, recipeId })
    if (existing) {
      await db.collection('ratings').updateOne(
        { username, recipeId },
        { $set: { rating, ratingLastUpdated: new Date() } }
      )
    } else {
      await db.collection('ratings').insertOne({
        username,
        recipeId,
        rating,
        ratingLastUpdated: new Date(),
        reviewCreatedAt: '',
        reviewLastUpdated: '',
        reviewText: '',
      })
    }

    const allRatings = await db.collection('ratings').find({ recipeId }).toArray()
    const count = allRatings.length
    const avg = allRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / count

    await db.collection('recipes').updateOne(
      { _id: recipeId },
      { $set: { rating: { rateCount: count.toString(), rateValue: avg.toString() } } }
    )

    res.json({ rated: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /newReview
// TODO: protect with verifyToken
router.put('/newReview', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { userId, recipeId, reviewText } = req.body
    if (!userId || !recipeId || reviewText == null) {
      return res.status(400).json({ error: 'userId, recipeId, and reviewText are required' })
    }

    const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
    if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
    const { username } = usernameDoc

    const now = Date.now().toString()
    await db.collection('ratings').updateOne(
      { username, recipeId },
      { $set: { reviewText, reviewCreatedAt: now, reviewLastUpdated: now } },
      { upsert: true }
    )

    const updated = await db.collection('ratings').findOne({ username, recipeId })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /checkIfReviewed
router.get('/checkIfReviewed', async (req, res) => {
  try {
    const db = getDB()
    const { username, recipeId } = req.query
    if (!username || !recipeId) {
      return res.status(400).json({ error: 'username and recipeId are required' })
    }
    const doc = await db.collection('ratings').findOne({ username, recipeId })
    if (doc && doc.reviewText) {
      res.json({ reviewed: true, reviewText: doc.reviewText, rating: doc.rating })
    } else {
      res.json({ reviewed: false })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /editReview
// TODO: protect with verifyToken
router.put('/editReview', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { username, recipeId, text } = req.query
    if (!username || !recipeId || text == null) {
      return res.status(400).json({ error: 'username, recipeId, and text are required' })
    }
    await db.collection('ratings').updateOne(
      { username, recipeId },
      { $set: { reviewText: text, reviewLastUpdated: Date.now().toString() } }
    )
    res.json({ edited: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /deleteReview
// TODO: protect with verifyToken
router.put('/deleteReview', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
    if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
    const { username } = usernameDoc

    await db.collection('ratings').updateOne(
      { username, recipeId },
      { $set: { reviewText: '', reviewLastUpdated: '' } }
    )
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getReviews
router.get('/getReviews', async (req, res) => {
  try {
    const db = getDB()
    const { username, recipeId, page = 0, reviewsPerPage = 5, filter } = req.query
    if (!recipeId) return res.status(400).json({ error: 'recipeId is required' })

    const skip = parseInt(page) * parseInt(reviewsPerPage)
    const limit = parseInt(reviewsPerPage)
    const query = { recipeId, reviewText: { $exists: true, $ne: '' } }

    let sort = {}
    if (filter === 'new') sort = { reviewCreatedAt: -1 }
    else if (filter === 'top') sort = { rating: -1 }

    const [rawReviews, totalCount] = await Promise.all([
      db.collection('ratings').find(query).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection('ratings').countDocuments(query),
    ])

    const reviews = rawReviews.map((r) => ({
      ...r,
      isCurrentUser: r.username === username,
    }))

    res.json({ reviews, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getSingleUserReviews
router.get('/getSingleUserReviews', async (req, res) => {
  try {
    const db = getDB()
    const { username, page = 0, reviewsPerPage = 5, filter, returnRecipeData } = req.query
    if (!username) return res.status(400).json({ error: 'username is required' })

    const skip = parseInt(page) * parseInt(reviewsPerPage)
    const limit = parseInt(reviewsPerPage)
    const query = { username, reviewText: { $exists: true, $ne: '' } }

    let sort = {}
    if (filter === 'new') sort = { reviewCreatedAt: -1 }
    else if (filter === 'top') sort = { rating: -1 }

    const [rawReviews, totalCount] = await Promise.all([
      db.collection('ratings').find(query).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection('ratings').countDocuments(query),
    ])

    let reviews = rawReviews
    if (returnRecipeData === 'true') {
      reviews = await Promise.all(
        rawReviews.map(async (r) => {
          const recipeData = await db.collection('recipes').findOne({ _id: r.recipeId })
          return { ...r, recipeData }
        })
      )
    }

    res.json({ reviews, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
