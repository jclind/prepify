const { Router } = require('express')
const { getAuth } = require('firebase-admin/auth')
const { asyncHandler } = require('../util/asyncHandler')
const { getDB } = require('../db')
const { verifyToken, optionalAuth, requireAdmin, requireActive } = require('../middleware/auth')
const { reviewWriteLimiter } = require('../middleware/writeLimiter')
const { REVIEW_VISIBLE, RECIPE_VISIBLE } = require('../util/moderation')
const { DESCRIPTION_MAX_LENGTH } = require('../util/recipeLimits')
const { recordAudit } = require('../util/auditLog')
const { recomputeRecipeRating, hasNumericRating } = require('../util/recipeRating')
const { publicRecipeProjection, pickFields } = require('../util/recipeFields')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { upsertWithDupRetry } = require('../util/upsertWithDupRetry')
const { notifyInBackground, notifyReviewTakenDown } = require('../util/email')
const { moderateText } = require('../util/textModeration')
const { respondBlocked } = require('../util/automod')

const router = Router()

// Hard ceiling on client-requested page sizes (audit §4.5); mirrors recipes.js.
const MAX_PER_PAGE = 50

// The review fields safe to serialize to PUBLIC (unauthenticated / non-admin)
// callers — an inclusion allowlist, so a field added to the rating doc later
// can't silently leak (audit M1). Deliberately EXCLUDES:
//   • `userId` — the reviewer's Firebase uid (a username→uid oracle). It's still
//     FETCHED on /getReviews because it's the identity join key for avatar
//     enrichment + the isCurrentUser flag, but stripped from the response there.
//   • `moderatedBy` / `moderatedAt` / `moderationHidden` — the admin uid +
//     timestamp of any takedown/restore; internal moderation state no client
//     reads. An inclusion projection drops these structurally.
const REVIEW_PUBLIC_FIELDS = [
  '_id',
  'recipeId',
  'username',
  'rating',
  'ratingLastUpdated',
  'reviewCreatedAt',
  'reviewLastUpdated',
  'reviewText',
]
// Mongo inclusion projection over the allowlist, for the public review reads.
const reviewPublicProjection = Object.fromEntries(
  REVIEW_PUBLIC_FIELDS.map((f) => [f, 1])
)

// Resolve reviewer avatar + display name for a page of reviews (§D). photoURL and
// displayName live on the Firebase Auth record, not the rating doc, so batch-fetch
// them keyed on the doc's stable uid (never a client-supplied value). One deduped
// getUsers() call covers the page (≤ MAX_PER_PAGE < the SDK's 100-identifier cap).
// Degrade gracefully like publicProfile: a failed batch or a not-found/deleted
// reviewer yields null fields (the client falls back to DefaultAvatar + @username)
// and NEVER fails the list. Returns a Map<uid, { photoURL, displayName }>.
async function resolveReviewerIdentities(reviews) {
  const byUid = new Map()
  const uids = [...new Set(reviews.map((r) => r.userId).filter(Boolean))]
  // getUsers() throws on an empty identifier array — skip the call when a page
  // has no resolvable uids (e.g. legacy docs written before the uid backfill).
  if (uids.length === 0) return byUid
  try {
    const { users } = await getAuth().getUsers(uids.map((uid) => ({ uid })))
    for (const u of users) {
      byUid.set(u.uid, {
        photoURL: u.photoURL || null,
        displayName: u.displayName || null,
      })
    }
  } catch (err) {
    // Transient Admin SDK failure — return what we have (empty); callers default
    // the fields to null so the reviews still render. Log it so a real outage
    // (avatars silently vanishing page-wide) surfaces instead of being invisible.
    console.warn('resolveReviewerIdentities: getUsers batch failed, reviews will render without avatars:', err?.message || err)
  }
  return byUid
}

// Load the rating/review target recipe and enforce the two integrity rules the
// rating writes previously skipped entirely (audit M2): neither addRating nor
// newReview loaded the recipe they were writing against, so —
//   • a nonexistent / hidden / pending recipeId still upserted a rating (ghost
//     targets, and XP/achievement farming off junk recipeIds), and
//   • an author could rate + review their OWN recipe, inflating its public
//     average and ranking signal.
// Returns a { status, error } to send back, or null when the write may proceed.
// Scoped through RECIPE_VISIBLE so a soft-hidden/unpublished/pending recipe is
// "not found" for rating purposes — you can only rate what the public can see.
// Projected to just userId (the recipe author uid), the only field the checks
// need. Called BEFORE the (paid) text-moderation pass in newReview so a ghost or
// self-target never spends a classifier call.
async function checkRatableRecipe(db, recipeId, uid) {
  const recipe = await db
    .collection('recipes')
    .findOne({ ...recipeIdQuery(recipeId), ...RECIPE_VISIBLE }, { projection: { userId: 1 } })
  if (!recipe) return { status: 404, error: 'Recipe not found' }
  if (recipe.userId === uid) {
    return { status: 403, error: 'You cannot rate or review your own recipe' }
  }
  return null
}

// POST /addRating
router.post('/addRating', verifyToken, requireActive, reviewWriteLimiter, asyncHandler(async (req, res) => {
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

  // Target must exist, be publicly visible, and not be the caller's own recipe
  // (audit M2) — otherwise this endpoint upserts ratings against ghost/hidden
  // targets and lets an author self-rate.
  const targetError = await checkRatableRecipe(db, recipeId, userId)
  if (targetError) {
    return res.status(targetError.status).json({ error: targetError.error })
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
router.post('/newReview', verifyToken, requireActive, reviewWriteLimiter, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId, reviewText } = req.body
  const userId = req.uid
  if (!recipeId || typeof recipeId !== 'string' || typeof reviewText !== 'string') {
    return res.status(400).json({ error: 'recipeId and reviewText are required' })
  }
  if (reviewText.length > DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
  }

  // Target must exist, be publicly visible, and not be the caller's own recipe
  // (audit M2). Checked BEFORE the paid moderation pass so a ghost/self target
  // never spends a classifier call.
  const targetError = await checkRatableRecipe(db, recipeId, userId)
  if (targetError) {
    return res.status(targetError.status).json({ error: targetError.error })
  }

  // Reviews are short and author-only; there's no useful owner-only "pending"
  // state, so BOTH high and medium confidence block inline (ask to rephrase).
  // `allowed` is true only for a clean verdict.
  const verdict = await moderateText(reviewText, 'review')
  if (!verdict.allowed) {
    return respondBlocked(res, { db, uid: userId, surface: 'review', verdict })
  }

  const usernameDoc = await db.collection('usernames').findOne({ _id: userId })
  if (!usernameDoc) return res.status(400).json({ error: 'Username not found for this user' })
  const { username } = usernameDoc

  // Numeric epoch-ms (V5 cutover): the ratings collection must be single-typed
  // for the New/Top sorts (BSON compares by type first). '' stays the
  // "no review yet" sentinel — normalizeRatingTypes preserves it.
  const now = Date.now()
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
  if (!recipeId || typeof recipeId !== 'string') {
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
// Params come from the JSON body; the query-string form (?recipeId=&text=) is a
// backward-compat fallback for the pre-§D client and can be dropped one release
// after the frontend switches to the body (the query form corrupts review text
// containing &, #, % or +). Body takes precedence when both are present.
router.post('/editReview', verifyToken, requireActive, reviewWriteLimiter, asyncHandler(async (req, res) => {
  const recipeId = req.body?.recipeId ?? req.query.recipeId
  const text = req.body?.text ?? req.query.text
  const db = getDB()
  if (!recipeId || typeof recipeId !== 'string' || text == null || typeof text !== 'string') {
    return res.status(400).json({ error: 'recipeId and text are required' })
  }
  if (text.length > DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({ error: `Review cannot exceed ${DESCRIPTION_MAX_LENGTH} characters` })
  }
  const verdict = await moderateText(text, 'review')
  if (!verdict.allowed) {
    return respondBlocked(res, { db, uid: req.uid, surface: 'review', verdict })
  }
  // Keyed by the stable uid (D1): only the author (req.uid) can match their own
  // doc, so a non-author can never match either — a miss is purely "no such
  // doc for this uid", i.e. not-found, not a permissions failure. House
  // convention (drafts.js): 404 = no such doc, 403 = exists but not yours.
  const editResult = await db.collection('ratings').updateOne(
    { userId: req.uid, recipeId },
    { $set: { reviewText: text, reviewLastUpdated: Date.now() } }
  )
  if (editResult.matchedCount === 0) {
    return res.status(404).json({ error: 'Review not found' })
  }
  res.json({ edited: true })
}))

// DELETE /deleteReview — removes the written review but KEEPS any star rating
// the user left (the rating is removed separately via /removeRating). If the
// doc has no rating to keep, blanking the text would leave an orphan with
// neither text nor rating, so the whole doc is deleted instead.
router.delete('/deleteReview', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  const userId = req.uid
  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ error: 'recipeId is required' })
  }

  // Keyed by the stable uid (D1) — only the author's own doc can match, so a
  // miss is purely "no such doc for this uid" — not-found, not a permissions
  // failure. House convention (drafts.js): 404 = no such doc, 403 = exists but
  // not yours. Mirrors /removeRating's identical no-doc case below.
  const doc = await db.collection('ratings').findOne({ userId, recipeId })
  if (!doc) {
    return res.status(404).json({ error: 'Review not found' })
  }

  if (hasNumericRating(doc.rating)) {
    // A real star rating remains — keep it, just clear the review text.
    await db.collection('ratings').updateOne(
      { userId, recipeId },
      { $set: { reviewText: '', reviewLastUpdated: '' } }
    )
  } else {
    // No rating to keep — drop the doc so we never leave an empty orphan.
    await db.collection('ratings').deleteOne({ userId, recipeId })
  }
  // The recipe aggregate is unaffected either way (the rating, if any, is kept;
  // a rating-less orphan never counted), so no recompute is needed.
  res.json({ deleted: true })
}))

// DELETE /removeRating — removes JUST the star rating, keeping any written
// review intact. If there's no review either, the whole doc is deleted so we
// never leave an orphan with neither a rating nor text. Either way the recipe
// aggregate is recomputed so the removed star stops counting toward the average.
// No requireActive: like /deleteReview this is a self-service removal of the
// user's own content, which stays allowed even for a suspended/banned account
// (see user-status-enforcement: "deletes remain allowed when suspended").
router.delete('/removeRating', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  const userId = req.uid
  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ error: 'recipeId is required' })
  }

  // Keyed by the stable uid (D1) — only the author's own doc can match.
  const doc = await db.collection('ratings').findOne({ userId, recipeId })
  if (!doc) {
    return res.status(404).json({ error: 'Rating not found' })
  }

  const hasReview = typeof doc.reviewText === 'string' && doc.reviewText !== ''
  if (hasReview) {
    // Keep the review; reset to the review-only shape (rating: null).
    await db.collection('ratings').updateOne(
      { userId, recipeId },
      { $set: { rating: null, ratingLastUpdated: '' } }
    )
  } else {
    // Nothing left without the rating — drop the doc entirely.
    await db.collection('ratings').deleteOne({ userId, recipeId })
  }

  // The removed star must no longer influence the recipe's score.
  await recomputeRecipeRating(db, recipeId)
  res.json({ removed: true })
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
  if (!recipeId || typeof recipeId !== 'string') return res.status(400).json({ error: 'recipeId is required' })

  // Floor at 1 so a negative ?reviewsPerPage can't sneak past the Math.min
  // cap above and make `limit` negative — that in turn made `skip` negative
  // for page > 0 (MongoDB rejects a negative skip/limit as a 500).
  const limit = Math.min(Math.max(parseInt(reviewsPerPage) || 5, 1), MAX_PER_PAGE)
  // Floor at 0 so a negative ?page never produces a negative .skip() (which
  // MongoDB rejects, surfacing as a 500 instead of a clean first page).
  const skip = Math.max(0, parseInt(page) || 0) * limit
  // Exclude admin-taken-down reviews from the public list.
  const query = { recipeId, reviewText: { $exists: true, $ne: '' }, ...REVIEW_VISIBLE }

  let sort = {}
  if (filter === 'new') sort = { reviewCreatedAt: -1 }
  else if (filter === 'top') sort = { rating: -1 }

  const [rawReviews, totalCount] = await Promise.all([
    // Project to the public allowlist PLUS userId: the uid is needed server-side
    // (identity enrichment + isCurrentUser) but is stripped from the response
    // below, and the projection structurally drops the moderation stamps (M1).
    db.collection('ratings')
      .find(query)
      .project({ ...reviewPublicProjection, userId: 1 })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('ratings').countDocuments(query),
  ])

  // Enrich each review with the author's avatar + display name (§D). Batched,
  // deduped, and failure-tolerant — see resolveReviewerIdentities.
  const identities = await resolveReviewerIdentities(rawReviews)
  const reviews = rawReviews.map((r) => {
    const identity = identities.get(r.userId)
    // pickFields drops userId (not on the allowlist) from the serialized shape;
    // r.userId is still read here for the enrichment + isCurrentUser flag.
    return {
      ...pickFields(r, REVIEW_PUBLIC_FIELDS),
      isCurrentUser: req.uid != null && r.userId === req.uid,
      photoURL: identity ? identity.photoURL : null,
      displayName: identity ? identity.displayName : null,
    }
  })

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

  // Floor at 1 — see getReviews: a negative reviewsPerPage defeats the page
  // floor below by making `limit` negative, so `skip` goes negative again.
  const limit = Math.min(Math.max(parseInt(reviewsPerPage) || 5, 1), MAX_PER_PAGE)
  // Floor at 0 — see getReviews: negative skip is a MongoDB error (500).
  const skip = Math.max(0, parseInt(page) || 0) * limit
  // Suppress admin-taken-down reviews from a user's public review list too.
  const query = { userId: ownerDoc._id, ...REVIEW_VISIBLE }

  let sort = {}
  if (filter === 'new') sort = { reviewCreatedAt: -1 }
  else if (filter === 'top') sort = { rating: -1 }

  let reviews
  let totalCount
  if (returnRecipeData === 'true') {
    // The account "Ratings" list joins each rating to its recipe and DROPS any
    // whose recipe is soft-hidden. That filter has to happen INSIDE the query,
    // not after paging, or two things break: a page can come back short (rows
    // filtered out post-limit), and — the Load-More bug this fixes — totalCount
    // would count hidden-recipe ratings the list never shows, so the client's
    // "loaded < totalCount" check never settles and Load-More never disappears.
    // So join + filter first, then page and count over the visible set in one
    // $facet. Single-source the hidden-status list off RECIPE_VISIBLE.
    const hiddenStatuses = RECIPE_VISIBLE.status.$nin
    const [facet] = await db
      .collection('ratings')
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'recipes',
            let: { rid: '$recipeId' },
            pipeline: [
              {
                $match: {
                  // $toString normalises the recipe _id (native ObjectId
                  // post-migration, plain string for legacy) to the string form
                  // rating.recipeId is stored in, so the join spans both shapes
                  // (mirrors recipeIdQuery). The status guard is the aggregation
                  // form of RECIPE_VISIBLE's $nin — legacy-safe: a doc with no
                  // status field isn't in the list, so it stays visible.
                  $expr: {
                    $and: [
                      { $eq: [{ $toString: '$_id' }, '$$rid'] },
                      { $not: [{ $in: ['$status', hiddenStatuses] }] },
                    ],
                  },
                },
              },
              // Project the joined recipe to the public recipe shape so the
              // internal admin stamps (moderatedBy/featuredBy/publishUpdatedBy +
              // their timestamps) never ride out to a public caller through this
              // join — every OTHER public recipe read strips them via
              // publicRecipeProjection, and this join path now does too (audit M1).
              { $project: publicRecipeProjection },
            ],
            as: 'recipe',
          },
        },
        // Keep only ratings whose recipe survived the visibility join.
        { $match: { 'recipe.0': { $exists: true } } },
        {
          $facet: {
            // $sort rejects an empty spec, so only add the stage when sorting.
            page: [...(Object.keys(sort).length ? [{ $sort: sort }] : []), { $skip: skip }, { $limit: limit }],
            total: [{ $count: 'n' }],
          },
        },
      ])
      .toArray()

    totalCount = facet.total[0]?.n || 0
    reviews = facet.page.map(({ recipe, ...r }) => {
      const recipeData = recipe[0]
      // The account "Ratings" list reads flat `recipeImage`/`recipeTitle` off
      // each review (the rating doc itself stores neither). Denormalize them
      // from the recipe doc so the thumbnail and title actually render; keep
      // the (now public-projected) `recipeData` for callers that need the rest.
      // pickFields keeps only the review allowlist, dropping the reviewer uid +
      // moderation stamps from the review-level fields too (audit M1).
      return {
        ...pickFields(r, REVIEW_PUBLIC_FIELDS),
        recipeImage: recipeData.recipeImage,
        recipeTitle: recipeData.title,
        recipeData,
      }
    })
  } else {
    // No recipe join → every visible review is returnable, so a plain
    // find + countDocuments over the same query keeps totalCount exact. Project
    // to the public allowlist so the reviewer uid + moderation stamps never
    // reach a public caller (M1); this path needs no uid server-side.
    ;[reviews, totalCount] = await Promise.all([
      db.collection('ratings').find(query).project(reviewPublicProjection).sort(sort).skip(skip).limit(limit).toArray(),
      db.collection('ratings').countDocuments(query),
    ])
  }

  res.json({ reviews, totalCount })
}))

// PATCH /admin/reviews/moderation — admin take down / restore a review.
// Reviews have no stable id of their own; their identity is the author's stable
// uid + recipeId (D1). The admin UI hands us the reported *handle*, so resolve
// it to that uid and match on it — the username stored on the rating doc is a
// denormalized display field that goes stale on a rename, so matching it
// directly would miss the very reviews a renamed author left. Uses a distinct
// `moderationHidden` flag rather than blanking reviewText, so the takedown is
// reversible and the original text is preserved for audit/appeal.
router.patch('/admin/reviews/moderation', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId, username, moderationHidden } = req.body
  if (!recipeId || typeof recipeId !== 'string' || !username || typeof username !== 'string') {
    return res.status(400).json({ error: 'recipeId and username are required' })
  }
  if (typeof moderationHidden !== 'boolean') {
    return res.status(400).json({ error: 'moderationHidden must be a boolean' })
  }

  // Resolve handle → stable uid (case-insensitive, the same lookup the unique
  // index / getSingleUserReviews use). An unknown handle can own no review.
  const ownerDoc = await db
    .collection('usernames')
    .findOne({ username_lower: username.toLowerCase() })
  if (!ownerDoc) {
    return res.status(404).json({ error: 'Review not found' })
  }
  const userId = ownerDoc._id
  // Prefer the author's CURRENT handle for the audit trail + notification, so a
  // rename between review and takedown doesn't stamp a stale label.
  const canonicalUsername = ownerDoc.username

  const result = await db.collection('ratings').updateOne(
    { userId, recipeId },
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
    // Stable key for the target: uid + recipeId (survives renames).
    targetId: `${userId}:${recipeId}`,
    targetLabel: `@${canonicalUsername}`,
    metadata: { recipeId, userId, username: canonicalUsername },
  })
  // Notify the review author on a takedown (background). Restore is silent.
  if (moderationHidden) notifyInBackground(notifyReviewTakenDown(db, canonicalUsername, recipeId))
  res.json({ recipeId, username: canonicalUsername, moderationHidden })
}))

module.exports = router
