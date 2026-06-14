const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')
const { recipeIdInQuery } = require('../util/recipeIdQuery')
const { getAccountCountsFor } = require('../util/accountCounts')
const { RECIPE_VISIBLE } = require('../util/moderation')

const router = Router()

// Hard ceiling on client-requested page sizes (audit §4.5); mirrors recipes.js.
const MAX_PER_PAGE = 50

// GET /getCreatedRecipes — recipes authored by the current user, with pagination
router.get('/getCreatedRecipes', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { page = 0, recipesPerPage = 6, order } = req.query
  const uid = req.uid

  const sort = order === 'old' ? { createdAt: 1 } : { createdAt: -1 }

  const pageNum = parseInt(page) || 0
  const perPage = Math.min(parseInt(recipesPerPage) || 6, MAX_PER_PAGE)

  const collection = db.collection('recipes')
  // Don't surface soft-hidden recipes in the author's own created list.
  const filter = { userId: uid, ...RECIPE_VISIBLE }
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
}))

// GET /getSavedRecipes — the saved-recipe list, paged and sorted by save time,
// optionally narrowed to one collection (?collectionId).
router.get('/getSavedRecipes', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const { page = 0, recipesPerPage = 5, order, collectionId } = req.query
  const uid = req.uid

  const userData = await db.collection('userRecipeData').findOne({ _id: uid })
  let savedRecipes = userData?.savedRecipes ?? []

  // A collection is a view over the master saved list — filter to its members.
  if (collectionId) {
    savedRecipes = savedRecipes.filter((e) =>
      (e.collectionIds ?? []).includes(collectionId)
    )
  }

  const totalCount = savedRecipes.length

  // Sort by save time. Accept both the legacy ('new'/'old') and current
  // ('newAdd'/'oldAdd') param spellings; default to most-recently-saved first.
  const oldestFirst = order === 'old' || order === 'oldAdd'
  savedRecipes = [...savedRecipes].sort((a, b) =>
    oldestFirst
      ? Number(a.dateSaved) - Number(b.dateSaved)
      : Number(b.dateSaved) - Number(a.dateSaved)
  )

  const pageNum = parseInt(page) || 0
  const perPage = Math.min(parseInt(recipesPerPage) || 5, MAX_PER_PAGE)
  const pageSlice = savedRecipes.slice(pageNum * perPage, (pageNum + 1) * perPage)
  const recipeIds = pageSlice.map((entry) => entry.recipeId)

  const recipeDocs =
    recipeIds.length > 0
      ? await db
          .collection('recipes')
          .find({ ...recipeIdInQuery(recipeIds), ...RECIPE_VISIBLE })
          .toArray()
      : []

  // find() returns natural order, not the requested save-time order — re-key by
  // id so the response preserves the sort. Compare as strings so legacy string
  // _ids and native ObjectId _ids resolve to the same key. Recipes filtered out
  // by RECIPE_VISIBLE (soft-hidden) simply drop from the page.
  const byId = new Map(recipeDocs.map((r) => [String(r._id), r]))
  const recipes = recipeIds.map((id) => byId.get(String(id))).filter(Boolean)

  res.json({ recipes, totalCount })
}))

// GET /getAccountCounts — aggregate item counts for the account-page tabs
// (saved, ratings, recipes, drafts) for the authenticated user, in one round
// trip so the nav doesn't need four separate list requests.
router.get('/getAccountCounts', verifyToken, asyncHandler(async (req, res) => {
  const counts = await getAccountCountsFor(getDB(), req.uid)
  res.json(counts)
}))

module.exports = router
