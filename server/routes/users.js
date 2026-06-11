const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')
const { recipeIdInQuery } = require('../util/recipeIdQuery')

const router = Router()

// Hard ceiling on client-requested page sizes (audit §4.5); mirrors recipes.js.
const MAX_PER_PAGE = 50

// GET /getCreatedRecipes — recipes authored by the current user, with pagination
router.get('/getCreatedRecipes', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { page = 0, recipesPerPage = 6, order } = req.query
    const uid = req.uid

    const sort = order === 'old' ? { createdAt: 1 } : { createdAt: -1 }

    const pageNum = parseInt(page) || 0
    const perPage = Math.min(parseInt(recipesPerPage) || 6, MAX_PER_PAGE)

    const collection = db.collection('recipes')
    const filter = { userId: uid }
    const [recipes, totalCount] = await Promise.all([
      collection
        .find(filter)
        .sort(sort)
        .skip(pageNum * perPage)
        .limit(perPage)
        .toArray(),
      collection.countDocuments(filter),
    ])

    res.json({ recipes, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getSavedRecipes — with dateSaved sorting
router.get('/getSavedRecipes', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { page = 0, recipesPerPage = 5, order } = req.query
    const uid = req.uid

    const userData = await db.collection('userRecipeData').findOne({ _id: uid })
    let savedRecipes = userData?.savedRecipes ?? []
    const totalCount = savedRecipes.length

    if (order === 'new') {
      savedRecipes = [...savedRecipes].sort((a, b) => Number(b.dateSaved) - Number(a.dateSaved))
    } else if (order === 'old') {
      savedRecipes = [...savedRecipes].sort((a, b) => Number(a.dateSaved) - Number(b.dateSaved))
    }

    const pageNum = parseInt(page) || 0
    const perPage = Math.min(parseInt(recipesPerPage) || 5, MAX_PER_PAGE)
    const pageSlice = savedRecipes.slice(pageNum * perPage, (pageNum + 1) * perPage)
    const recipeIds = pageSlice.map((entry) => entry.recipeId)

    const recipes =
      recipeIds.length > 0
        ? await db.collection('recipes').find(recipeIdInQuery(recipeIds)).toArray()
        : []

    res.json({ recipes, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
