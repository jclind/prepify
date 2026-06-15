const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { getDB } = require('../db')
const { verifyToken, optionalAuth, requireAdmin, requireActive } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { REVIEW_VISIBLE, RECIPE_VISIBLE } = require('../util/moderation')
const { DESCRIPTION_MAX_LENGTH } = require('../util/recipeLimits')
const { recordAudit } = require('../util/auditLog')
const { recomputeRecipeRating } = require('../util/recipeRating')
const { upsertWithDupRetry } = require('../util/upsertWithDupRetry')
const { notifyInBackground, notifyReviewTakenDown } = require('../util/email')
const { moderateText } = require('../util/textModeration')
const { respondBlocked } = require('../util/automod')

const router = Router()

// Hard ceiling on client-requested page sizes (audit §4.5); mirrors recipes.js.
const MAX_PER_PAGE = 50

// POST /addRating
router.post('/addRating', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const { recipeId, rating } = req.query
  const db = getDB()
  // Identity is the stable uid (D1); the username is denormalized onto the
  // rating doc only as a display field, set once on insert.
  const userId = req.uid
  const userDoc = await db.collection('usernames').findOne({ _id: userId })
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

  // dup-retry: the unique { userId, recipeId } index turns a concurrent
  // double-submit into an E11000 on the loser; retry it as a plain update.
  await upsertWithDupRetry(
    db.collection('ratings'),
    { userId, recipeId },
    {
      $set: { rating: parsedRating, ratingLastUpdated: new Date() },
      // username is denormalized display; default the review fields so a
      // rating-first doc still has the consistent shape getReviews expects.
      $setOnInsert: {
        username,
        reviewCreatedAt: '',
        reviewLastUpdated: '',
        reviewText: '',
      },
    }
  )

  // Recompute the aggregate (excludes moderated ratings).
  await recomputeRecipeRating(db, recipeId)

  res.json({ rated: true })
}))

// POST /newReview
router.post('/newReview', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId, reviewText } = req.body
  const userId = req.uid
  if (!recipeId || typeof recipeId !== 'string' || typeof reviewText !== 'string') {
    return res.status(400).json({ error: 'recipeId and reviewText are required' })
  }
  if (reviewText.length > DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
  }

  // Reviews are short and author-only; there's no useful owner-only "pending"
  // state, so BOTH high and medium confidence block inline (ask to rephrase).
  // `allowed` is true only for a clean verdict.
  const verdict = await moderateText(reviewText, 'review')
  if (!verdict.allowed) {
    return respondBlocked(res)
  }

  const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
  if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
  const { username } = usernameDoc

  const now = Date.now().toString()
  // Keyed by the stable uid (D1). username is denormalized for display, written
  // once on insert ($setOnInsert) alongside the defaulted rating fields. The
  // dup-retry handles a concurrent double-submit racing on the unique index.
  await upsertWithDupRetry(
    db.collection('ratings'),
    { userId, recipeId },
    {
      $set: { reviewText, reviewCreatedAt: now, reviewLastUpdated: now },
      // A review can be posted before any rating; default the rating fields on
      // insert so no ratings doc ever lacks them (recomputeRecipeRating skips
      // rating: null, but this keeps the document shape consistent).
      $setOnInsert: { username, rating: null, ratingLastUpdated: '' },
    }
  )

  const updated = await db.collection('ratings').findOne({ userId, recipeId })
  res.json(updated)
}))

// GET /checkIfReviewed — scoped to the authenticated user
router.get('/checkIfReviewed', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }

  // Keyed by the stable uid (D1) — no username round-trip needed.
  const doc = await db.collection('ratings').findOne({ userId: req.uid, recipeId })
  if (doc) {
    res.json({ reviewed: true, ...doc })
  } else {
    res.json({ reviewed: false })
  }
}))

// POST /editReview
router.post('/editReview', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const { recipeId, text } = req.query
  const db = getDB()
  if (!recipeId || typeof recipeId !== 'string' || text == null || typeof text !== 'string') {
    return res.status(400).json({ error: 'recipeId and text are required' })
  }
  if (text.length > DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
  }
  const verdict = await moderateText(text, 'review')
  if (!verdict.allowed) {
    return respondBlocked(res)
  }
  // Keyed by the stable uid (D1): only the author (req.uid) can match their own
  // doc, so a non-author falls through to matchedCount 0 → 403 below.
  const editResult = await db.collection('ratings').updateOne(
    { userId: req.uid, recipeId },
    { $set: { reviewText: text, reviewLastUpdated: Date.now().toString() } }
  )
  if (editResult.matchedCount === 0) {
    return res.status(403).json({ error: 'Review not found or not authorized' })
  }
  res.json({ edited: true })
}))

// DELETE /deleteReview
router.delete('/deleteReview', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  const userId = req.uid
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }

  // Keyed by the stable uid (D1) — only the author's own doc can match.
  const deleteResult = await db.collection('ratings').updateOne(
    { userId, recipeId },
    { $set: { reviewText: '', reviewLastUpdated: '' } }
  )
  if (deleteResult.matchedCount === 0) {
    return res.status(403).json({ error: 'Review not found or not authorized' })
  }
  res.json({ deleted: true })
}))

// GET /getReviews — anonymous-friendly. `optionalAuth` sets req.uid only when a
// valid token is present; the `isCurrentUser` flag is derived from that verified
// uid (NOT the client-supplied `username` query param, which anyone could set to
// another user's name to spoof "edit/delete mine" affordances). Ratings now carry
// the author's stable uid (D1), so the flag is a direct uid match — no username
// round-trip and immune to renames.
router.get('/getReviews', optionalAuth, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId, page = 0, reviewsPerPage = 5, filter } = req.query
  if (!recipeId) return res.status(400).json({ error: 'recipeId is required' })

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
    isCurrentUser: req.uid != null && r.userId === req.uid,
  }))

  res.json({ reviews, totalCount })
}))

// GET /getSingleUserReviews
router.get('/getSingleUserReviews', asyncHandler(async (req, res) => {
  const db = getDB()
  const { username, page = 0, reviewsPerPage = 5, filter, returnRecipeData } = req.query
  if (!username) return res.status(400).json({ error: 'username is required' })

  // This list is addressed by the public handle, but ratings are keyed by the
  // stable uid (D1) — resolve the handle to a uid (case-insensitive, the same
  // lookup the unique index uses) and query on that. An unknown handle simply
  // has no reviews.
  const ownerDoc = await db
    .collection('usernames')
    .findOne({ username_lower: String(username).toLowerCase() })
  if (!ownerDoc) return res.json({ reviews: [], totalCount: 0 })

  const limit = Math.min(parseInt(reviewsPerPage) || 5, MAX_PER_PAGE)
  const skip = (parseInt(page) || 0) * limit
  // Suppress admin-taken-down reviews from a user's public review list too.
  const query = { userId: ownerDoc._id, ...REVIEW_VISIBLE }

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
}))

// PATCH /admin/reviews/moderation — admin take down / restore a review.
// Reviews have no stable id; identity is the (username, recipeId) pair. Uses a
// distinct `moderationHidden` flag rather than blanking reviewText, so the
// takedown is reversible and the original text is preserved for audit/appeal.
router.patch('/admin/reviews/moderation', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
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
}))

module.exports = router
