const { Router } = require('express')
const { ObjectId } = require('mongodb')
const { getDB, getClient } = require('../db')
const { verifyToken } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { validateRecipeBounds } = require('../util/recipeLimits')
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

    const filter = {}

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
        { title: { $regex: escapeRegex(title || ''), $options: 'i' } },
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
    const recipes = await db
      .collection('recipes')
      .find({})
      .sort({ views: -1 })
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

    const recipe = await db.collection('recipes').findOneAndUpdate(
      recipeIdQuery(id),
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
router.post('/addRecipe', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const body = req.body
    const uid = req.uid
    const requiredFields = ['title', 'ingredients', 'instructions', 'mealTypes']
    const missing = requiredFields.filter(f => {
      const val = body[f]
      return val == null || val === '' || (Array.isArray(val) && val.length === 0)
    })
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
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

// POST /recipes/:id/save
router.post('/recipes/:id/save', verifyToken, async (req, res) => {
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
router.delete('/recipes/:id/save', verifyToken, async (req, res) => {
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
router.post('/madeRecipe', verifyToken, async (req, res) => {
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
