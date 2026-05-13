const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

const router = Router()

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

    const pageNum = parseInt(page)
    const perPage = parseInt(recipesPerPage)
    const pageSlice = savedRecipes.slice(pageNum * perPage, (pageNum + 1) * perPage)
    const recipeIds = pageSlice.map((entry) => entry.recipeId)

    const recipes =
      recipeIds.length > 0
        ? await db.collection('recipes').find({ _id: { $in: recipeIds } }).toArray()
        : []

    res.json({ recipes, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
