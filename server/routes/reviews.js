const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken, optionalAuth, requireAdmin, requireActive } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { REVIEW_VISIBLE, RECIPE_VISIBLE } = require('../util/moderation')
const { DESCRIPTION_MAX_LENGTH } = require('../util/recipeLimits')
const { recordAudit } = require('../util/auditLog')
const { recomputeRecipeRating } = require('../util/recipeRating')
const { notifyInBackground, notifyReviewTakenDown } = require('../util/email')

const router = Router()

// Hard ceiling on client-requested page sizes (audit §4.5); mirrors recipes.js.
const MAX_PER_PAGE = 50

// POST /addRating
router.post('/addRating', verifyToken, requireActive, async (req, res) => {
  try {
    const { recipeId, rating } = req.query
    const db = getDB()
    const userDoc = await db.collection('usernames').findOne({ _id: req.uid })
    if (!userDoc) return res.status(400).json({ error: 'User not found' })
    const username = userDoc.username
    if (!recipeId || typeof recipeId !== 'string' || !rating || typeof rating !== 'string') {
      return res.status(400).json({ error: 'recipeId and rating are required' })
    }
    const parsedRating = parseFloat(rating)
    if (isNaN(parsedRating)) {
      return res.status(400).json({ error: 'Invalid rating' })
    }
    if (parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const existing = await db.collection('ratings').findOne({ username, recipeId })
    if (existing) {
      await db.collection('ratings').updateOne(
        { username, recipeId },
        { $set: { rating: parsedRating, ratingLastUpdated: new Date() } }
      )
    } else {
      await db.collection('ratings').insertOne({
        username,
        recipeId,
        rating: parsedRating,
        ratingLastUpdated: new Date(),
        reviewCreatedAt: '',
        reviewLastUpdated: '',
        reviewText: '',
      })
    }

    // Recompute the aggregate (excludes moderated ratings).
    await recomputeRecipeRating(db, recipeId)

    res.json({ rated: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /newReview
router.post('/newReview', verifyToken, requireActive, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId, reviewText } = req.body
    const userId = req.uid
    if (!recipeId || typeof recipeId !== 'string' || typeof reviewText !== 'string') {
      return res.status(400).json({ error: 'recipeId and reviewText are required' })
    }
    if (reviewText.length > DESCRIPTION_MAX_LENGTH) {
      return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
    }

    const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
    if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
    const { username } = usernameDoc

    const now = Date.now().toString()
    await db.collection('ratings').updateOne(
      { username, recipeId },
      {
        $set: { reviewText, reviewCreatedAt: now, reviewLastUpdated: now },
        // A review can be posted before any rating; default the rating fields on
        // insert so no ratings doc ever lacks them (recomputeRecipeRating skips
        // rating: null, but this keeps the document shape consistent).
        $setOnInsert: { rating: null, ratingLastUpdated: '' },
      },
      { upsert: true }
    )

    const updated = await db.collection('ratings').findOne({ username, recipeId })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /checkIfReviewed — scoped to the authenticated user
router.get('/checkIfReviewed', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId } = req.query
    if (!recipeId) {
      return res.status(400).json({ error: 'recipeId is required' })
    }
    const userDoc = await db.collection('usernames').findOne({ _id: req.uid })
    if (!userDoc) return res.status(400).json({ error: 'Username not found for this user' })
    const { username } = userDoc

    const doc = await db.collection('ratings').findOne({ username, recipeId })
    if (doc) {
      res.json({ reviewed: true, ...doc })
    } else {
      res.json({ reviewed: false })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /editReview
router.post('/editReview', verifyToken, requireActive, async (req, res) => {
  try {
    const { recipeId, text } = req.query
    const db = getDB()
    const userDoc = await db.collection('usernames').findOne({ _id: req.uid })
    if (!userDoc) return res.status(400).json({ error: 'User not found' })
    const username = userDoc.username
    if (!recipeId || typeof recipeId !== 'string' || text == null || typeof text !== 'string') {
      return res.status(400).json({ error: 'recipeId and text are required' })
    }
    if (text.length > DESCRIPTION_MAX_LENGTH) {
      return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
    }
    const editResult = await db.collection('ratings').updateOne(
      { username, recipeId },
      { $set: { reviewText: text, reviewLastUpdated: Date.now().toString() } }
    )
    if (editResult.matchedCount === 0) {
      return res.status(403).json({ error: 'Review not found or not authorized' })
    }
    res.json({ edited: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /deleteReview
router.delete('/deleteReview', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId } = req.query
    const userId = req.uid
    if (!recipeId) {
      return res.status(400).json({ error: 'recipeId is required' })
    }
    const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
    if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
    const { username } = usernameDoc

    const deleteResult = await db.collection('ratings').updateOne(
      { username, recipeId },
      { $set: { reviewText: '', reviewLastUpdated: '' } }
    )
    if (deleteResult.matchedCount === 0) {
      return res.status(403).json({ error: 'Review not found or not authorized' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getReviews — anonymous-friendly. `optionalAuth` sets req.uid only when a
// valid token is present; the `isCurrentUser` flag is derived from that verified
// uid (NOT the client-supplied `username` query param, which anyone could set to
// another user's name to spoof "edit/delete mine" affordances).
router.get('/getReviews', optionalAuth, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId, page = 0, reviewsPerPage = 5, filter } = req.query
    if (!recipeId) return res.status(400).json({ error: 'recipeId is required' })

    // Resolve the caller's own username from the verified token, if any.
    let currentUsername = null
    if (req.uid) {
      const me = await db.collection('usernames').findOne({ _id: req.uid })
      currentUsername = me?.username || null
    }

    const limit = Math.min(parseInt(reviewsPerPage) || 5, MAX_PER_PAGE)
    const skip = (parseInt(page) || 0) * limit
    // Exclude admin-taken-down reviews from the public list.
    const query = { recipeId, reviewText: { $exists: true, $ne: '' }, ...REVIEW_VISIBLE }

    let sort = {}
    if (filter === 'new') sort = { reviewCreatedAt: -1 }
    else if (filter === 'top') sort = { rating: -1 }

    const [rawReviews, totalCount] = await Promise.all([
      db.collection('ratings').find(query).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection('ratings').countDocuments(query),
    ])

    const reviews = rawReviews.map((r) => ({
      ...r,
      isCurrentUser: currentUsername != null && r.username === currentUsername,
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

    const limit = Math.min(parseInt(reviewsPerPage) || 5, MAX_PER_PAGE)
    const skip = (parseInt(page) || 0) * limit
    // Suppress admin-taken-down reviews from a user's public review list too.
    const query = { username, ...REVIEW_VISIBLE }

    let sort = {}
    if (filter === 'new') sort = { reviewCreatedAt: -1 }
    else if (filter === 'top') sort = { rating: -1 }

    const [rawReviews, totalCount] = await Promise.all([
      db.collection('ratings').find(query).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection('ratings').countDocuments(query),
    ])

    let reviews = rawReviews
    if (returnRecipeData === 'true') {
      // Only attach (and keep) ratings whose recipe is still publicly visible —
      // a rating for a soft-hidden recipe shouldn't surface in the user's list.
      const withRecipe = await Promise.all(
        rawReviews.map(async (r) => {
          const recipeData = await db
            .collection('recipes')
            .findOne({ ...recipeIdQuery(r.recipeId), ...RECIPE_VISIBLE })
          return recipeData ? { ...r, recipeData } : null
        })
      )
      reviews = withRecipe.filter(Boolean)
    }

    res.json({ reviews, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/reviews/moderation — admin take down / restore a review.
// Reviews have no stable id; identity is the (username, recipeId) pair. Uses a
// distinct `moderationHidden` flag rather than blanking reviewText, so the
// takedown is reversible and the original text is preserved for audit/appeal.
router.patch('/admin/reviews/moderation', verifyToken, requireAdmin, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId, username, moderationHidden } = req.body
    if (!recipeId || typeof recipeId !== 'string' || !username || typeof username !== 'string') {
      return res.status(400).json({ error: 'recipeId and username are required' })
    }
    if (typeof moderationHidden !== 'boolean') {
      return res.status(400).json({ error: 'moderationHidden must be a boolean' })
    }
    const result = await db.collection('ratings').updateOne(
      { username, recipeId },
      {
        $set: {
          moderationHidden,
          moderatedBy: req.uid,
          moderatedAt: new Date(),
        },
      }
    )
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }
    // A takedown/restore changes which ratings count toward the recipe's score.
    await recomputeRecipeRating(db, recipeId)
    await recordAudit(db, {
      action: moderationHidden ? 'review.takedown' : 'review.restore',
      actorUid: req.uid,
      targetType: 'review',
      targetId: `${username}:${recipeId}`,
      targetLabel: `@${username}`,
      metadata: { recipeId, username },
    })
    // Notify the review author on a takedown (background). Restore is silent.
    if (moderationHidden) notifyInBackground(notifyReviewTakenDown(db, username, recipeId))
    res.json({ recipeId, username, moderationHidden })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
