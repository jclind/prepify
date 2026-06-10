const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')
const { recipeIdInQuery } = require('../util/recipeIdQuery')

const router = Router()

// GET /getCreatedRecipes — recipes authored by the current user, with pagination
router.get('/getCreatedRecipes', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { page = 0, recipesPerPage = 6, order } = req.query
    const uid = req.uid

    const sort = order === 'old' ? { createdAt: 1 } : { createdAt: -1 }

    const pageNum = parseInt(page)
    const perPage = parseInt(recipesPerPage)

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

    const pageNum = parseInt(page)
    const perPage = parseInt(recipesPerPage)
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

// GET /getAccountCounts — aggregate item counts for the account-page tabs
// (saved, ratings, recipes, drafts) for the authenticated user, in one round
// trip so the nav doesn't need four separate list requests.
router.get('/getAccountCounts', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const uid = req.uid

    // Ratings live in the `ratings` collection keyed by username (there is no
    // uid on a rating), so resolve the caller's username first. A user with no
    // username yet simply has 0 ratings.
    const usernameDoc = await db.collection('usernames').findOne({ _id: uid })
    const username = usernameDoc?.username

    const [savedData, recipes, drafts, ratings] = await Promise.all([
      db.collection('userRecipeData').findOne({ _id: uid }),
      db.collection('recipes').countDocuments({ userId: uid }),
      db.collection('recipeDrafts').countDocuments({ userId: uid }),
      username
        ? db.collection('ratings').countDocuments({ username })
        : Promise.resolve(0),
    ])

    res.json({
      saved: savedData?.savedRecipes?.length ?? 0,
      ratings,
      recipes,
      drafts,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
