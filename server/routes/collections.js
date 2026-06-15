const { Router } = require('express')
const crypto = require('crypto')
const { asyncHandler } = require('../util/asyncHandler')
const { getDB } = require('../db')
const { verifyToken, requireActive } = require('../middleware/auth')
const { recipeIdQuery, recipeIdInQuery } = require('../util/recipeIdQuery')
const { RECIPE_VISIBLE } = require('../util/moderation')

const router = Router()

// Collections are user-defined folders layered over the master saved list. A
// recipe's membership is tagged on its savedRecipes entry (collectionIds), so a
// folder is just a view of the master list — unsaving a recipe drops it from
// every folder automatically, and per-folder counts can never drift from what's
// actually saved. The collection metadata (name) lives in a sibling
// userRecipeData.collections array. Nothing here mutates the saved set except
// the membership route, which auto-saves a recipe the first time it's filed.
const MAX_NAME_LEN = 50
const MAX_COLLECTIONS = 50

// Trim and hard-cap the name; non-strings collapse to '' so an empty result
// signals "missing/invalid" to every caller below.
function boundedName(val) {
  return typeof val === 'string' ? val.trim().slice(0, MAX_NAME_LEN) : ''
}

// Shape a stored collection + the user's saved entries into the API payload:
// a live member count and a cover (the most-recently-saved member). Counts are
// derived from membership so they always match the master saved list.
// coverImage is filled in by the GET handler (one batched lookup); every other
// caller leaves it null (a freshly-created collection has no members).
function withStats(collection, savedEntries) {
  let count = 0
  let coverRecipeId = null
  let coverDate = -Infinity
  for (const entry of savedEntries) {
    if (!(entry.collectionIds ?? []).includes(collection.id)) continue
    count += 1
    const d = Number(entry.dateSaved) || 0
    if (d >= coverDate) {
      coverDate = d
      coverRecipeId = entry.recipeId
    }
  }
  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt,
    count,
    coverRecipeId,
    coverImage: null,
  }
}

// GET /collections — the current user's collections, each with a live count.
router.get('/collections', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { collections: 1, savedRecipes: 1 } })
  const saved = userData?.savedRecipes ?? []
  const collections = (userData?.collections ?? []).map((c) => withStats(c, saved))

  // Resolve each cover id to an image URL in one batched, visibility-filtered
  // lookup so the client can render cover art without an extra round-trip. A
  // cover pointing at a soft-hidden or removed recipe resolves to null.
  const coverIds = collections.map((c) => c.coverRecipeId).filter(Boolean)
  if (coverIds.length > 0) {
    const docs = await db
      .collection('recipes')
      .find(
        { ...recipeIdInQuery(coverIds), ...RECIPE_VISIBLE },
        { projection: { recipeImage: 1 } }
      )
      .toArray()
    const imageById = new Map(docs.map((d) => [String(d._id), d.recipeImage ?? null]))
    for (const c of collections) {
      if (c.coverRecipeId) {
        c.coverImage = imageById.get(String(c.coverRecipeId)) ?? null
      }
    }
  }

  res.json(collections)
}))

// POST /collections — create a new (empty) collection.
router.post('/collections', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const name = boundedName(req.body?.name)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { collections: 1 } })
  const existing = userData?.collections ?? []
  if (existing.length >= MAX_COLLECTIONS) {
    return res
      .status(409)
      .json({ error: `You can have at most ${MAX_COLLECTIONS} collections` })
  }
  if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'A collection with that name already exists' })
  }
  const collection = { id: crypto.randomUUID(), name, createdAt: Date.now().toString() }
  await db
    .collection('userRecipeData')
    .updateOne({ _id: req.uid }, { $push: { collections: collection } }, { upsert: true })
  res.status(201).json(withStats(collection, []))
}))

// PATCH /collections/:id — rename a collection.
router.patch('/collections/:id', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { id } = req.params
  const name = boundedName(req.body?.name)
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { collections: 1 } })
  const existing = userData?.collections ?? []
  if (!existing.some((c) => c.id === id)) {
    return res.status(404).json({ error: 'Collection not found' })
  }
  if (existing.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'A collection with that name already exists' })
  }
  await db
    .collection('userRecipeData')
    .updateOne({ _id: req.uid, 'collections.id': id }, { $set: { 'collections.$.name': name } })
  res.json({ id, name })
}))

// DELETE /collections/:id — remove a collection. The recipes it held stay in
// the master saved list; only the folder and its membership tags go away.
router.delete('/collections/:id', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { id } = req.params
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { collections: 1 } })
  if (!(userData?.collections ?? []).some((c) => c.id === id)) {
    return res.status(404).json({ error: 'Collection not found' })
  }
  await db.collection('userRecipeData').updateOne(
    { _id: req.uid },
    {
      $pull: {
        collections: { id },
        // Drop the membership tag from every saved entry that referenced it.
        'savedRecipes.$[].collectionIds': id,
      },
    }
  )
  res.json({ deleted: true })
}))

// PATCH /recipes/:recipeId/collections — set which collections a saved recipe
// belongs to, in one call (drives the add-to-collection checkbox popover).
// Filing a not-yet-saved recipe auto-saves it to the master list first.
router.patch(
  '/recipes/:recipeId/collections',
  verifyToken,
  requireActive,
  asyncHandler(async (req, res) => {
    const db = getDB()
    const { recipeId } = req.params
    const requested = req.body?.collectionIds
    if (!Array.isArray(requested)) {
      return res.status(400).json({ error: 'collectionIds must be an array' })
    }
    const userData = await db.collection('userRecipeData').findOne({ _id: req.uid })
    const validIds = new Set((userData?.collections ?? []).map((c) => c.id))
    // Drop unknown ids so a stale client can't tag a recipe to a deleted folder.
    const collectionIds = [...new Set(requested.filter((id) => validIds.has(id)))]

    const isSaved = (userData?.savedRecipes ?? []).some((e) => e.recipeId === recipeId)
    if (isSaved) {
      await db.collection('userRecipeData').updateOne(
        { _id: req.uid, 'savedRecipes.recipeId': recipeId },
        { $set: { 'savedRecipes.$.collectionIds': collectionIds } }
      )
    } else {
      await db.collection('userRecipeData').updateOne(
        { _id: req.uid },
        {
          $push: {
            savedRecipes: { recipeId, dateSaved: Date.now().toString(), collectionIds },
          },
        },
        { upsert: true }
      )
      await db
        .collection('recipes')
        .updateOne(recipeIdQuery(recipeId), { $inc: { numTimesSaved: 1 } })
    }
    res.json({ recipeId, collectionIds, saved: true })
  })
)

module.exports = router
