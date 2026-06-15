const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { ObjectId } = require('mongodb')
const { getDB, getClient } = require('../db')
const { verifyToken, optionalAuth, requireAdmin, requireActive } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { RECIPE_VISIBLE, RECIPE_OWNER_VISIBLE } = require('../util/moderation')
const { recordAudit } = require('../util/auditLog')
const { notifyInBackground, notifyRecipeHidden } = require('../util/email')
const { validateRequiredRecipeFields, validateRecipeBounds } = require('../util/recipeLimits')
const { moderateText } = require('../util/textModeration')
const { moderateImage } = require('../util/imageModeration')
const { gatherRecipeText, holdRecipeForReview, respondBlocked, worstVerdict } = require('../util/automod')
const { EDITABLE_RECIPE_FIELDS, CREATABLE_RECIPE_FIELDS, pickFields } = require('../util/recipeFields')
const { deleteRecipeImage } = require('../util/firebaseStorage')
const { teardownRecipeDocs } = require('../util/teardownRecipe')

const router = Router()

// Hard ceiling on client-requested page sizes so a single request can never
// dump a whole collection (audit §4.5). Shared by every paginated route here.
const MAX_PER_PAGE = 50

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /recipes — browse/filter with pagination
// No auth required for browse; individual write routes below need auth.
router.get('/recipes', asyncHandler(async (req, res) => {
  const db = getDB()
  const {
    q,
    page = 0,
    recipesPerPage = 5,
    order,
    cuisine,
    tags,
    mealTypes,
    diets,
  } = req.query
  // Page-size cap (audit §4.5): a single request can never dump the whole
  // collection. The 'simple' query parser (app.js) guarantees every value is
  // a string or string[] — never a `{$ne:…}` operator object — so the helpers
  // below only have to coerce those two shapes.
  const limit = Math.min(parseInt(recipesPerPage) || 5, MAX_PER_PAGE)
  const skip = (parseInt(page) || 0) * limit

  // Soft-hidden recipes never surface in public browse.
  const filter = { ...RECIPE_VISIBLE }

  // Query params can arrive as arrays (?x=a&x=b) — coerce so string ops below
  // can't throw on malformed/repeated params.
  const asText = (v) => (Array.isArray(v) ? v[0] : v) ?? ''
  const parseList = (v) =>
    (Array.isArray(v) ? v : String(v).split(','))
      .map((s) => s.trim())
      .filter(Boolean)

  const qText = asText(q)
  if (qText) {
    filter.title = { $regex: escapeRegex(qText), $options: 'i' }
  }

  const cuisineText = asText(cuisine).trim()
  if (cuisineText) {
    filter.cuisine = { $regex: `^${escapeRegex(cuisineText)}$`, $options: 'i' }
  }

  if (tags) {
    const tagList = parseList(tags)
    if (tagList.length > 0) {
      filter.$or = [
        { mealTypes: { $in: tagList } },
        { nutritionLabels: { $in: tagList } },
      ]
    }
  }

  // Separate meal-type filter (AND'd with the rest): recipes matching any of
  // the selected meal types.
  if (mealTypes) {
    const mealList = parseList(mealTypes)
    if (mealList.length > 0) {
      filter.mealTypes = { $in: mealList }
    }
  }

  // Dietary filter — conjunctive ($all): a recipe must carry EVERY selected
  // diet label (e.g. Vegan AND Gluten-Free), since these are restrictions.
  // (The shared `tags`/$or above stays OR-based for the Home meal lookup.)
  if (diets) {
    const dietList = parseList(diets)
    if (dietList.length > 0) {
      filter.nutritionLabels = { $all: dietList }
    }
  }

  // Sort options exposed by the browse UI. `createdAt` is a millisecond-epoch
  // string of fixed (13-digit) width, so a lexicographic sort matches
  // chronological order. `_id` is a final tiebreak so pagination is stable
  // when the primary key ties (e.g. many recipes with 0 saves / same price).
  const SORTS = {
    popular: { numTimesSaved: -1, views: -1, _id: -1 },
    new: { createdAt: -1, _id: -1 },
    old: { createdAt: 1, _id: 1 },
    // Price/time sorts assume every recipe has servingPrice/totalTime (all
    // current docs do). If null/missing values ever appear, Mongo sorts them
    // first in ascending order, so "cheapest"/"quickest" would lead with
    // unpriced/untimed recipes — switch to an aggregation with $ifNull→Infinity
    // (nulls-last) at that point rather than papering over it here.
    cheapest: { servingPrice: 1, _id: 1 },
    expensive: { servingPrice: -1, _id: -1 },
    shortest: { totalTime: 1, _id: 1 },
    longest: { totalTime: -1, _id: -1 },
    // Retained for any non-UI callers.
    top: { 'rating.rateValue': -1, _id: -1 },
    trending: { views: -1, _id: -1 },
  }
  // Own-property lookup only — `order` is client-controlled, so a bare
  // `SORTS[order]` would resolve inherited members (`constructor`, `__proto__`)
  // to a function/object and break the Mongo sort.
  const sort = Object.prototype.hasOwnProperty.call(SORTS, order)
    ? SORTS[order]
    : SORTS.popular

  const collection = db.collection('recipes')
  const [recipes, totalCount] = await Promise.all([
    collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
  ])

  res.json({ recipeList: recipes, total_results: totalCount })
}))

// GET /recipes/facets — distinct filter values that actually exist in the
// catalog, so the browse UI can hide filters with zero recipes (e.g. don't
// offer "Jamaican" when nothing is tagged Jamaican). `distinct` returns raw
// stored values including null/'' — drop the empties; the client maps the rest
// back to its curated label lists.
router.get('/recipes/facets', asyncHandler(async (req, res) => {
  const collection = getDB().collection('recipes')
  const clean = (arr) =>
    arr.filter((v) => typeof v === 'string' && v.trim() !== '')
  const [cuisines, diets, mealTypes] = await Promise.all([
    collection.distinct('cuisine'),
    collection.distinct('nutritionLabels'),
    collection.distinct('mealTypes'),
  ])
  res.json({
    cuisines: clean(cuisines),
    diets: clean(diets),
    mealTypes: clean(mealTypes),
  })
}))

// GET /searchAutoCompleteRecipes — quick title search for autocomplete
router.get('/searchAutoCompleteRecipes', asyncHandler(async (req, res) => {
  const db = getDB()
  const { title } = req.query
  const recipes = await db
    .collection('recipes')
    .find(
      { title: { $regex: escapeRegex(typeof title === 'string' ? title : ''), $options: 'i' }, ...RECIPE_VISIBLE },
      {
        projection: {
          _id: 1,
          title: 1,
          recipeImage: 1,
          totalTime: 1,
          servings: 1,
          rating: 1,
          nutritionLabels: 1,
          servingPrice: 1,
        },
      }
    )
    .limit(8)
    .toArray()
  res.json(recipes)
}))

// GET /getTrendingRecipes
router.get('/getTrendingRecipes', asyncHandler(async (req, res) => {
  const db = getDB()
  const limit = Math.min(parseInt(req.query.limit) || 4, 20)
  // Admin-curated `featured` picks are pinned to the front of the row, then
  // the usual most-viewed ordering fills the rest.
  const recipes = await db
    .collection('recipes')
    .find({ ...RECIPE_VISIBLE })
    .sort({ featured: -1, views: -1 })
    .limit(limit)
    .toArray()
  res.json(recipes)
}))

// GET /getRecipe — fetch single recipe and increment view count.
// optionalAuth so an admin keeps access to hidden/unpublished recipes (to review
// + restore them); for everyone else a moderated recipe is treated as not found.
router.get('/getRecipe', optionalAuth, asyncHandler(async (req, res) => {
  const db = getDB()
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id is required' })

  // Admin: load the recipe regardless of moderation state, WITHOUT inflating
  // its view count (this is a moderation preview, not a real visit).
  if (req.isAdmin) {
    const recipe = await db.collection('recipes').findOne(recipeIdQuery(id))
    if (!recipe) return res.status(404).json({ error: 'Not found' })
    return res.json(recipe)
  }

  // Public: a soft-hidden/unpublished recipe is "not found" — and the
  // non-match means views aren't incremented either.
  const recipe = await db.collection('recipes').findOneAndUpdate(
    { ...recipeIdQuery(id), ...RECIPE_VISIBLE },
    { $inc: { views: 1 } },
    { returnDocument: 'after' }
  )

  if (!recipe) {
    // The author can still view their OWN recipe while it's held in
    // 'pending_review' (it's withheld from the public, not from its owner). Don't
    // inflate views for this owner preview. Takedowns ('hidden'/'unpublished')
    // are excluded by RECIPE_OWNER_VISIBLE, so this only surfaces a pending hold.
    if (req.uid) {
      const own = await db
        .collection('recipes')
        .findOne({ ...recipeIdQuery(id), userId: req.uid, ...RECIPE_OWNER_VISIBLE })
      if (own) return res.json(own)
    }
    return res.status(404).json({ error: 'Not found' })
  }

  // Fire-and-forget global stats increment
  db.collection('stats').updateOne(
    { _id: 'globalStats' },
    { $inc: { totalRecipeViews: 1 } }
  )

  res.json(recipe)
}))

// POST /addRecipe
router.post('/addRecipe', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const body = req.body
  const uid = req.uid
  const requiredError = validateRequiredRecipeFields(body)
  if (requiredError) {
    return res.status(400).json({ error: requiredError })
  }
  const boundsError = validateRecipeBounds(body)
  if (boundsError) {
    return res.status(400).json({ error: boundsError })
  }

  // Automated moderation on BOTH axes — text and the recipe image — collapsed to
  // the most severe verdict. High-confidence → block the write (4xx). Medium →
  // save but hold from public reads as 'pending_review' (owner still sees it) and
  // file a system report for an admin to clear. Clean / classifier-disabled → save
  // normally. Text fails OPEN (an outage can't block creation); image fails CLOSED
  // (an unscanned image is held, never published) — see util/imageModeration.
  // The two scans are independent network calls, so run them concurrently; both
  // resolve internally (text fails open, image fails closed) and never reject, so
  // Promise.all won't short-circuit on a moderation outage.
  const [textVerdict, imageVerdict] = await Promise.all([
    moderateText(gatherRecipeText(body), 'recipe'),
    moderateImage(body.recipeImage, 'recipe.image'),
  ])
  const verdict = worstVerdict(textVerdict, imageVerdict)
  if (verdict.severity === 'high') {
    return respondBlocked(res)
  }

  // Whitelist the insert (mirrors the edit path): only creatable fields are
  // copied from the client, and the server stamps _id, userId, a zeroed rating
  // and counters. Anything else the client sends — `status`, `featured`, a
  // forged rating/counter — is ignored, so a recipe can never be born hidden,
  // featured, or pre-rated. The medium-hold status is NOT set here; holdRecipeForReview
  // owns it (and only flips it once the admin-queue report is filed).
  const newId = new ObjectId()
  const docToInsert = {
    ...pickFields(body, CREATABLE_RECIPE_FIELDS),
    _id: newId,
    userId: uid,
    rating: { rateCount: 0, rateValue: 0 },
    numTimesSaved: 0,
    numTimesMade: 0,
    views: 0,
  }
  await db.collection('recipes').insertOne(docToInsert)
  await db.collection('userRecipeData').updateOne(
    { _id: uid },
    { $push: { userRecipes: { recipeId: newId } } },
    { upsert: true }
  )
  let pendingReview = false
  if (verdict.severity === 'medium') {
    pendingReview = await holdRecipeForReview(db, { recipeId: newId, title: body.title, verdict })
  }
  res.status(201).json({ _id: newId, pendingReview })
}))

// PUT /editRecipe — owner-only edit. Social/derived counters and immutable
// metadata are never writable here (only EDITABLE_RECIPE_FIELDS are copied), so
// an edit can never reset a recipe's ratings, saves, or made-count. editedAt is
// stamped so the UI can surface that the recipe changed after people saved it.
router.put('/editRecipe', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const recipe = await db.collection('recipes').findOne(recipeIdQuery(recipeId))
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  if (recipe.userId !== uid) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const body = req.body
  const requiredError = validateRequiredRecipeFields(body)
  if (requiredError) {
    return res.status(400).json({ error: requiredError })
  }
  const boundsError = validateRecipeBounds(body)
  if (boundsError) {
    return res.status(400).json({ error: boundsError })
  }

  // Re-moderate the edited text + (only if it changed) the new image — same tiers
  // as create. High → reject the edit; the previously-saved version stays as-is.
  // Medium → re-hold as 'pending_review'. A clean edit deliberately does NOT clear
  // an existing hold/takedown — only an admin clears those (the edit just stops
  // adding new flags). The image is re-scanned only when the URL actually changed,
  // so a plain text edit doesn't pay for (or re-hold on) an already-cleared image.
  const newImage = body.recipeImage && body.recipeImage !== recipe.recipeImage ? body.recipeImage : null
  // Run the two scans concurrently (see addRecipe) — independent calls that both
  // resolve internally, so Promise.all is safe.
  const [textVerdict, imageVerdict] = await Promise.all([
    moderateText(gatherRecipeText(body), 'recipe'),
    moderateImage(newImage, 'recipe.image'),
  ])
  const verdict = worstVerdict(textVerdict, imageVerdict)
  if (verdict.severity === 'high') {
    return respondBlocked(res)
  }

  // Whitelist: copy only editable fields from the client payload. Anything
  // else the client sends (rating, numTimesSaved, views, userId, _id, …) is
  // ignored. The hold status is NOT set here — holdRecipeForReview owns it, so
  // the recipe is only hidden once its admin-queue report exists.
  const update = {
    ...pickFields(body, EDITABLE_RECIPE_FIELDS),
    editedAt: Date.now().toString(),
  }
  // Medium → re-hold as 'pending_review', BUT never downgrade an admin takedown:
  // if the recipe is already 'hidden'/'unpublished', an owner edit must not lift
  // it back to the weaker, owner-visible pending state (only an admin clears a
  // takedown). Re-holding an already-pending/active recipe is fine.
  const TAKEDOWN_STATUSES = ['hidden', 'unpublished']
  const shouldHold = verdict.severity === 'medium' && !TAKEDOWN_STATUSES.includes(recipe.status)

  const updated = await db.collection('recipes').findOneAndUpdate(
    recipeIdQuery(recipeId),
    { $set: update },
    { returnDocument: 'after' }
  )
  // The recipe can be deleted between the ownership check and this update; don't
  // 200 with a null body (and don't file a report against a recipe that's gone).
  if (!updated) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  if (shouldHold) {
    const held = await holdRecipeForReview(db, { recipeId, title: body.title, verdict })
    if (held) updated.status = 'pending_review'
  }
  res.json(updated)
}))

// DELETE /deleteRecipe
router.delete('/deleteRecipe', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const recipe = await db.collection('recipes').findOne(recipeIdQuery(recipeId))
  if (!recipe) {
    return res.status(404).json({ error: 'Recipe not found' })
  }
  if (recipe.userId !== uid) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Remove the recipe and every reference to it atomically: its ratings/
  // reviews, and the recipeId entry from any user's saved/made/created lists.
  // Shared with the delete-account cascade via teardownRecipeDocs so the two
  // paths can't drift.
  const session = getClient().startSession()
  try {
    await session.withTransaction(async () => {
      await teardownRecipeDocs(db, recipe, session)
    })
  } finally {
    await session.endSession()
  }

  // External side effect — runs after the transaction commits and never
  // fails the request (an orphaned image is preferable to a 500 here).
  await deleteRecipeImage(recipe.recipeImage)

  res.json({ deleted: true })
}))

// PATCH /admin/recipes/:id/moderation — admin soft-hide / unhide.
// Bypasses the owner check (admin authority). Reversible: flips `status`
// between 'hidden' and 'active'.
router.patch('/admin/recipes/:id/moderation', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const recipeId = req.params.id
  const { status } = req.body
  if (status !== 'hidden' && status !== 'active') {
    return res.status(400).json({ error: "status must be 'hidden' or 'active'" })
  }
  const updated = await db.collection('recipes').findOneAndUpdate(
    recipeIdQuery(recipeId),
    {
      $set: {
        status,
        moderatedBy: req.uid,
        moderatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ error: 'Recipe not found' })
  await recordAudit(db, {
    action: status === 'hidden' ? 'recipe.hide' : 'recipe.unhide',
    actorUid: req.uid,
    targetType: 'recipe',
    targetId: updated._id,
    targetLabel: updated.title || null,
  })
  // Notify the owner on a takedown (background). Unhide is silent.
  if (status === 'hidden') notifyInBackground(notifyRecipeHidden(updated.userId, updated.title))
  res.json({ _id: updated._id, status: updated.status })
}))

// PATCH /admin/recipes/:id/publish — admin de-publish / re-publish.
// Distinct from /moderation on purpose: this flips `status` between
// 'unpublished' and 'active' and stamps `publishUpdatedBy/At` (NOT `moderatedBy`)
// so an editorial de-publish never reads as a moderation takedown. Both states
// are filtered from public reads identically (util/moderation RECIPE_VISIBLE).
router.patch('/admin/recipes/:id/publish', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const recipeId = req.params.id
  const { published } = req.body
  if (typeof published !== 'boolean') {
    return res.status(400).json({ error: 'published must be a boolean' })
  }
  const updated = await db.collection('recipes').findOneAndUpdate(
    recipeIdQuery(recipeId),
    {
      $set: {
        status: published ? 'active' : 'unpublished',
        publishUpdatedBy: req.uid,
        publishUpdatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ error: 'Recipe not found' })
  await recordAudit(db, {
    action: published ? 'recipe.publish' : 'recipe.unpublish',
    actorUid: req.uid,
    targetType: 'recipe',
    targetId: updated._id,
    targetLabel: updated.title || null,
  })
  res.json({ _id: updated._id, status: updated.status })
}))

// PATCH /admin/recipes/:id/feature — admin curation. `featured` recipes are
// pinned to the front of the home trending row (see getTrendingRecipes).
router.patch('/admin/recipes/:id/feature', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const recipeId = req.params.id
  const { featured } = req.body
  if (typeof featured !== 'boolean') {
    return res.status(400).json({ error: 'featured must be a boolean' })
  }
  const updated = await db.collection('recipes').findOneAndUpdate(
    recipeIdQuery(recipeId),
    {
      $set: {
        featured,
        featuredBy: req.uid,
        featuredAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ error: 'Recipe not found' })
  await recordAudit(db, {
    action: featured ? 'recipe.feature' : 'recipe.unfeature',
    actorUid: req.uid,
    targetType: 'recipe',
    targetId: updated._id,
    targetLabel: updated.title || null,
  })
  res.json({ _id: updated._id, featured: updated.featured === true })
}))

// POST /recipes/:id/save
router.post('/recipes/:id/save', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const recipeId = req.params.id
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const existingData = await db.collection('userRecipeData').findOne({ _id: uid })
  const alreadySaved = existingData?.savedRecipes?.some(e => e.recipeId === recipeId) ?? false
  if (alreadySaved) {
    return res.status(409).json({ error: 'Recipe already saved' })
  }
  await db.collection('userRecipeData').updateOne(
    { _id: uid },
    { $push: { savedRecipes: { recipeId, dateSaved: Date.now().toString() } } },
    { upsert: true }
  )
  await db.collection('recipes').updateOne(
    recipeIdQuery(recipeId),
    { $inc: { numTimesSaved: 1 } }
  )
  res.json({ saved: true })
}))

// GET /getSavedRecipe
router.get('/getSavedRecipe', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const userData = await db.collection('userRecipeData').findOne({ _id: uid })
  const match =
    userData?.savedRecipes?.find((entry) => entry.recipeId === recipeId) ?? null
  res.json(match)
}))

// GET /getSavedRecipeIds — just the current user's saved recipe ids, so a grid
// can resolve every card's saved state from one request instead of N.
router.get('/getSavedRecipeIds', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { savedRecipes: 1 } })
  res.json((userData?.savedRecipes ?? []).map((e) => e.recipeId))
}))

// DELETE /recipes/:id/save
router.delete('/recipes/:id/save', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const recipeId = req.params.id
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const savedData = await db.collection('userRecipeData').findOne({ _id: uid })
  const isSaved = savedData?.savedRecipes?.some(e => e.recipeId === recipeId) ?? false
  if (!isSaved) {
    return res.status(404).json({ error: 'Recipe not in saved list' })
  }
  await db.collection('userRecipeData').updateOne(
    { _id: uid },
    { $pull: { savedRecipes: { recipeId } } }
  )
  await db.collection('recipes').updateOne(
    recipeIdQuery(recipeId),
    [{ $set: { numTimesSaved: { $max: [{ $subtract: ['$numTimesSaved', 1] }, 0] } } }]
  )
  res.json({ unsaved: true })
}))

// POST /madeRecipe
router.post('/madeRecipe', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  await db.collection('recipes').updateOne(
    recipeIdQuery(recipeId),
    { $inc: { numTimesMade: 1 } }
  )
  await db.collection('userRecipeData').updateOne(
    { _id: uid },
    { $addToSet: { madeRecipes: { recipeId } } },
    { upsert: true }
  )
  res.json({ made: true })
}))

// GET /checkMadeRecipe
router.get('/checkMadeRecipe', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { recipeId } = req.query
  if (!recipeId) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  const uid = req.uid
  const userData = await db.collection('userRecipeData').findOne({ _id: uid })
  const made =
    userData?.madeRecipes?.some((entry) => entry.recipeId === recipeId) ?? false
  res.json({ made })
}))

module.exports = router
