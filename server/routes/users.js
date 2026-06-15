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

// Field sorts order by attributes that live on the recipe docs (title, rating,
// cook time) rather than on the saved-entry (dateSaved), so getSavedRecipes
// has to fetch the docs before it can sort. Save-time orders ('newAdd'/'oldAdd'
// and the legacy 'new'/'old') and any unknown value fall back to the cheaper
// sort-then-page-then-fetch path below.
const FIELD_SORTS = {
  alpha: (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
  rating: (a, b) => {
    const av = Number(a?.rating?.rateValue) || 0
    const bv = Number(b?.rating?.rateValue) || 0
    if (bv !== av) return bv - av // higher average first
    return (Number(b?.rating?.rateCount) || 0) - (Number(a?.rating?.rateCount) || 0)
  },
  timeShort: (a, b) => (Number(a.totalTime) || 0) - (Number(b.totalTime) || 0),
  timeLong: (a, b) => (Number(b.totalTime) || 0) - (Number(a.totalTime) || 0),
}

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
  const { page = 0, recipesPerPage = 5, order } = req.query
  const uid = req.uid

  // A repeated ?collectionId= makes Express hand us an array; collapse to the
  // first value so `.includes(collectionId)` compares against a string, not an
  // array object (which would silently match nothing).
  const collectionId = Array.isArray(req.query.collectionId)
    ? req.query.collectionId[0]
    : req.query.collectionId

  // Optional case-insensitive title search. A repeated ?q= arrives as an array;
  // take the first value, like collectionId above.
  const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q
  const q = (typeof rawQ === 'string' ? rawQ : '').trim().toLowerCase()

  const userData = await db.collection('userRecipeData').findOne({ _id: uid })
  let savedRecipes = userData?.savedRecipes ?? []

  // A collection is a view over the master saved list — filter to its members.
  if (collectionId) {
    savedRecipes = savedRecipes.filter((e) =>
      (e.collectionIds ?? []).includes(collectionId)
    )
  }

  const pageNum = parseInt(page) || 0
  const perPage = Math.min(parseInt(recipesPerPage) || 5, MAX_PER_PAGE)

  // A title search or a field sort (title/rating/cook time) both order/filter by
  // the recipe docs themselves, so materialize the whole saved set (visible
  // only), filter/sort the docs, then page. totalCount counts what survives —
  // soft-hidden or non-matching recipes drop out entirely rather than leaving
  // holes in a page. The cheaper save-time fast path below handles the common
  // case (no search, no field sort).
  const fieldSort = typeof order === 'string' ? FIELD_SORTS[order] : undefined
  if (q || fieldSort) {
    const allIds = savedRecipes.map((entry) => entry.recipeId)
    let docs =
      allIds.length > 0
        ? await db
            .collection('recipes')
            .find({ ...recipeIdInQuery(allIds), ...RECIPE_VISIBLE })
            .toArray()
        : []
    if (q) {
      docs = docs.filter((d) => String(d.title || '').toLowerCase().includes(q))
    }
    if (fieldSort) {
      docs.sort(fieldSort)
    } else {
      // No field sort: keep save-time order over the filtered docs by looking up
      // each doc's saved date from its entry.
      const savedAt = new Map(
        savedRecipes.map((e) => [String(e.recipeId), Number(e.dateSaved)])
      )
      const oldestFirst = order === 'old' || order === 'oldAdd'
      docs.sort((a, b) => {
        const av = savedAt.get(String(a._id)) || 0
        const bv = savedAt.get(String(b._id)) || 0
        return oldestFirst ? av - bv : bv - av
      })
    }
    const recipes = docs.slice(pageNum * perPage, (pageNum + 1) * perPage)
    return res.json({ recipes, totalCount: docs.length })
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
