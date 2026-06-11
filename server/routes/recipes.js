const { Router } = require('express')
const { ObjectId } = require('mongodb')
const { getDB, getClient } = require('../db')
const { verifyToken, requireAdmin, requireActive } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { RECIPE_VISIBLE } = require('../util/moderation')
const { validateRequiredRecipeFields, validateRecipeBounds } = require('../util/recipeLimits')
const { EDITABLE_RECIPE_FIELDS, pickFields } = require('../util/recipeFields')
const { deleteRecipeImage } = require('../util/firebaseStorage')

const router = Router()

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// GET /recipes — browse/filter with pagination
router.get('/recipes', async (req, res) => {
  // TODO: no auth required for browse; individual write routes below need auth
  try {
    const db = getDB()
    const { q, page = 0, recipesPerPage = 5, order, cuisine, tags } = req.query
    const skip = parseInt(page) * parseInt(recipesPerPage)
    const limit = parseInt(recipesPerPage)

    // Soft-hidden recipes never surface in public browse.
    const filter = { ...RECIPE_VISIBLE }

    if (q) {
      filter.title = { $regex: escapeRegex(q), $options: 'i' }
    }

    if (cuisine && cuisine.trim()) {
      filter.cuisine = { $regex: `^${escapeRegex(cuisine.trim())}$`, $options: 'i' }
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (tagList.length > 0) {
        filter.$or = [
          { mealTypes: { $in: tagList } },
          { nutritionLabels: { $in: tagList } },
        ]
      }
    }

    let sort = {}
    if (order === 'new') sort = { createdAt: -1 }
    else if (order === 'top') sort = { 'rating.rateValue': -1 }
    else if (order === 'trending') sort = { views: -1 }

    const collection = db.collection('recipes')
    const [recipes, totalCount] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    res.json({ recipeList: recipes, total_results: totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /searchAutoCompleteRecipes — quick title search for autocomplete
router.get('/searchAutoCompleteRecipes', async (req, res) => {
  try {
    const db = getDB()
    const { title } = req.query
    const recipes = await db
      .collection('recipes')
      .find(
        { title: { $regex: escapeRegex(title || ''), $options: 'i' }, ...RECIPE_VISIBLE },
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getTrendingRecipes
router.get('/getTrendingRecipes', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getRecipe — fetch single recipe and increment view count
router.get('/getRecipe', async (req, res) => {
  try {
    const db = getDB()
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })

    // A soft-hidden recipe is treated as not found for the public — and the
    // non-match means views aren't incremented either.
    const recipe = await db.collection('recipes').findOneAndUpdate(
      { ...recipeIdQuery(id), ...RECIPE_VISIBLE },
      { $inc: { views: 1 } },
      { returnDocument: 'after' }
    )

    if (!recipe) return res.status(404).json({ error: 'Not found' })

    // Fire-and-forget global stats increment
    db.collection('stats').updateOne(
      { _id: 'globalStats' },
      { $inc: { totalRecipeViews: 1 } }
    )

    res.json(recipe)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /addRecipe
router.post('/addRecipe', verifyToken, requireActive, async (req, res) => {
  try {
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
    // Server stamps _id, userId, and counters — client-supplied values are discarded
    const newId = new ObjectId()
    const docToInsert = { ...body, _id: newId, userId: uid, numTimesSaved: 0, numTimesMade: 0, views: 0 }
    await db.collection('recipes').insertOne(docToInsert)
    await db.collection('userRecipeData').updateOne(
      { _id: uid },
      { $push: { userRecipes: { recipeId: newId } } },
      { upsert: true }
    )
    res.status(201).json({ _id: newId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /editRecipe — owner-only edit. Social/derived counters and immutable
// metadata are never writable here (only EDITABLE_RECIPE_FIELDS are copied), so
// an edit can never reset a recipe's ratings, saves, or made-count. editedAt is
// stamped so the UI can surface that the recipe changed after people saved it.
router.put('/editRecipe', verifyToken, requireActive, async (req, res) => {
  try {
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

    // Whitelist: copy only editable fields from the client payload. Anything
    // else the client sends (rating, numTimesSaved, views, userId, _id, …) is
    // ignored.
    const update = {
      ...pickFields(body, EDITABLE_RECIPE_FIELDS),
      editedAt: Date.now().toString(),
    }

    const updated = await db.collection('recipes').findOneAndUpdate(
      recipeIdQuery(recipeId),
      { $set: update },
      { returnDocument: 'after' }
    )
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /deleteRecipe
router.delete('/deleteRecipe', verifyToken, async (req, res) => {
  try {
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
    // userRecipes only ever lives on the owner's doc, but pulling it across all
    // docs in the same updateMany is harmless and keeps this to one write.
    const session = getClient().startSession()
    try {
      await session.withTransaction(async () => {
        await db.collection('recipes').deleteOne(recipeIdQuery(recipeId), { session })
        await db.collection('ratings').deleteMany({ recipeId }, { session })
        await db.collection('userRecipeData').updateMany(
          {},
          {
            $pull: {
              savedRecipes: { recipeId },
              madeRecipes: { recipeId },
              userRecipes: { recipeId },
            },
          },
          { session }
        )
      })
    } finally {
      await session.endSession()
    }

    // External side effect — runs after the transaction commits and never
    // fails the request (an orphaned image is preferable to a 500 here).
    await deleteRecipeImage(recipe.recipeImage)

    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/recipes/:id/moderation — admin soft-hide / unhide.
// Bypasses the owner check (admin authority). Reversible: flips `status`
// between 'hidden' and 'active'.
router.patch('/admin/recipes/:id/moderation', verifyToken, requireAdmin, async (req, res) => {
  try {
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
    res.json({ _id: updated._id, status: updated.status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/recipes/:id/publish — admin de-publish / re-publish.
// Distinct from /moderation on purpose: this flips `status` between
// 'unpublished' and 'active' and stamps `publishUpdatedBy/At` (NOT `moderatedBy`)
// so an editorial de-publish never reads as a moderation takedown. Both states
// are filtered from public reads identically (util/moderation RECIPE_VISIBLE).
router.patch('/admin/recipes/:id/publish', verifyToken, requireAdmin, async (req, res) => {
  try {
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
    res.json({ _id: updated._id, status: updated.status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/recipes/:id/feature — admin curation. `featured` recipes are
// pinned to the front of the home trending row (see getTrendingRecipes).
router.patch('/admin/recipes/:id/feature', verifyToken, requireAdmin, async (req, res) => {
  try {
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
    res.json({ _id: updated._id, featured: updated.featured === true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /recipes/:id/save
router.post('/recipes/:id/save', verifyToken, requireActive, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getSavedRecipe
router.get('/getSavedRecipe', verifyToken, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /recipes/:id/save
router.delete('/recipes/:id/save', verifyToken, requireActive, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /madeRecipe
router.post('/madeRecipe', verifyToken, requireActive, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /checkMadeRecipe
router.get('/checkMadeRecipe', verifyToken, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
