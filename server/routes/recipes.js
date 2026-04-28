const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

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
        { projection: { _id: 1, title: 1, recipeImage: 1 } }
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
      { _id: id },
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
    if (body.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const requiredFields = ['_id', 'title', 'ingredients', 'instructions', 'mealTypes']
    const missing = requiredFields.filter(f => {
      const val = body[f]
      return val == null || val === '' || (Array.isArray(val) && val.length === 0)
    })
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` })
    }
    // Enforce safe defaults — don't trust client-supplied counters
    const docToInsert = { ...body, numTimesSaved: 0, numTimesMade: 0, views: 0 }
    const result = await db.collection('recipes').insertOne(docToInsert)
    await db.collection('userRecipeData').updateOne(
      { _id: body.userId },
      { $push: { userRecipes: { recipeId: body._id } } },
      { upsert: true }
    )
    res.json({ insertedId: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /deleteRecipe
// TODO: protect with auth middleware — verify userId matches token uid
router.delete('/deleteRecipe', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { recipeId, userId } = req.query
    if (!recipeId || !userId) {
      return res.status(400).json({ error: 'recipeId and userId are required' })
    }
    if (userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await db.collection('recipes').deleteOne({ _id: recipeId })
    await db.collection('userRecipeData').updateOne(
      { _id: userId },
      { $pull: { userRecipes: { recipeId } } }
    )
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /saveRecipe
// TODO: protect with auth middleware
router.put('/saveRecipe', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    if (req.query.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const existingData = await db.collection('userRecipeData').findOne({ _id: userId })
    const alreadySaved = existingData?.savedRecipes?.some(e => e.recipeId === recipeId) ?? false
    if (alreadySaved) {
      return res.status(409).json({ error: 'Recipe already saved' })
    }
    await db.collection('userRecipeData').updateOne(
      { _id: userId },
      { $push: { savedRecipes: { recipeId, dateSaved: Date.now().toString() } } },
      { upsert: true }
    )
    await db.collection('recipes').updateOne(
      { _id: recipeId },
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
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    if (req.query.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const userData = await db.collection('userRecipeData').findOne({ _id: userId })
    const match =
      userData?.savedRecipes?.find((entry) => entry.recipeId === recipeId) ?? null
    res.json(match)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /unsaveRecipe
// TODO: protect with auth middleware
router.put('/unsaveRecipe', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    if (req.query.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const savedData = await db.collection('userRecipeData').findOne({ _id: userId })
    const isSaved = savedData?.savedRecipes?.some(e => e.recipeId === recipeId) ?? false
    if (!isSaved) {
      return res.status(404).json({ error: 'Recipe not in saved list' })
    }
    await db.collection('userRecipeData').updateOne(
      { _id: userId },
      { $pull: { savedRecipes: { recipeId } } }
    )
    await db.collection('recipes').updateOne(
      { _id: recipeId },
      [{ $set: { numTimesSaved: { $max: [{ $subtract: ['$numTimesSaved', 1] }, 0] } } }]
    )
    res.json({ unsaved: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /madeRecipe
// TODO: protect with auth middleware
router.post('/madeRecipe', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    if (req.query.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await db.collection('recipes').updateOne(
      { _id: recipeId },
      { $inc: { numTimesMade: 1 } }
    )
    await db.collection('userRecipeData').updateOne(
      { _id: userId },
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
    const { userId, recipeId } = req.query
    if (!userId || !recipeId) {
      return res.status(400).json({ error: 'userId and recipeId are required' })
    }
    if (req.query.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const userData = await db.collection('userRecipeData').findOne({ _id: userId })
    const made =
      userData?.madeRecipes?.some((entry) => entry.recipeId === recipeId) ?? false
    res.json({ made })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
