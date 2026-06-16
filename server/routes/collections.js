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
// a live member count and a cover (the most-recently-saved member). Count and
// cover both reflect only *visible* members (those present in imageById), so the
// badge matches what opening the collection actually shows — the saved grid
// filters soft-hidden/removed recipes, and counting raw membership would read
// higher than the grid. coverImage is filled in by the GET handler (one batched
// lookup); every other caller passes no members, so count is 0 / cover null.
function withStats(collection, savedEntries, imageById = new Map()) {
  let count = 0
  let coverRecipeId = null
  let coverImage = null
  let coverDate = -Infinity
  for (const entry of savedEntries) {
    if (!(entry.collectionIds ?? []).includes(collection.id)) continue
    // A hidden or removed member is absent from imageById — skip it so it counts
    // toward neither the badge nor the cover.
    const key = String(entry.recipeId)
    if (!imageById.has(key)) continue
    count += 1
    // Cover = the most-recently-saved visible member. (Strictly-newer wins, so
    // equal dateSaved ties resolve deterministically to the first.)
    const d = Number(entry.dateSaved) || 0
    if (d > coverDate) {
      coverDate = d
      coverRecipeId = entry.recipeId
      coverImage = imageById.get(key)
    }
  }
  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt,
    count,
    coverRecipeId,
    coverImage,
  }
}

// GET /collections — the current user's collections, each with a live count.
router.get('/collections', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const userData = await db
    .collection('userRecipeData')
    .findOne({ _id: req.uid }, { projection: { collections: 1, savedRecipes: 1 } })
  const saved = userData?.savedRecipes ?? []
  const collections = userData?.collections ?? []

  // Resolve cover art in one batched lookup: fetch the visible recipes (with
  // images) among all collection members, then let withStats pick each
  // collection's cover as its most-recently-saved *visible* member. Resolving
  // visibility before the cover is chosen (rather than after) means a hidden or
  // removed newest member can't blank out a cover that older visible members
  // could still provide.
  const memberIds = [
    ...new Set(
      saved
        .filter((e) => (e.collectionIds ?? []).length > 0)
        .map((e) => e.recipeId)
    ),
  ]
  let imageById = new Map()
  if (memberIds.length > 0) {
    const docs = await db
      .collection('recipes')
      .find(
        { ...recipeIdInQuery(memberIds), ...RECIPE_VISIBLE },
        { projection: { recipeImage: 1 } }
      )
      .toArray()
    imageById = new Map(docs.map((d) => [String(d._id), d.recipeImage ?? null]))
  }

  res.json(collections.map((c) => withStats(c, saved, imageById)))
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

  // The read-then-write above is friendly but not atomic: two concurrent creates
  // (a double-click, two tabs) can both pass it and push the same name twice. So
  // the actual push is a single guarded update — it only appends when no existing
  // member matches the name case-insensitively, evaluated server-side against the
  // live document. A lost race ends with matchedCount 0 → 409. ($expr/$toLower
  // also catch legacy collections, so no name_lower field is needed.) Ensure the
  // doc exists first so the guarded push never has to upsert (which would 11000
  // on an unrelated concurrent first-create instead of pushing).
  const nameLower = name.toLowerCase()
  try {
    await db
      .collection('userRecipeData')
      .updateOne({ _id: req.uid }, { $setOnInsert: { collections: [] } }, { upsert: true })
  } catch (err) {
    if (err.code !== 11000) throw err // ignore the concurrent-insert race
  }
  const pushed = await db.collection('userRecipeData').updateOne(
    {
      _id: req.uid,
      $expr: {
        $eq: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$collections', []] },
                cond: { $eq: [{ $toLower: '$$this.name' }, nameLower] },
              },
            },
          },
          0,
        ],
      },
    },
    { $push: { collections: collection } }
  )
  if (pushed.matchedCount === 0) {
    return res.status(409).json({ error: 'A collection with that name already exists' })
  }
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

  // The read-then-write above is friendly but not atomic — like create, two
  // concurrent renames toward the same name can both pass it. So the actual
  // $set is guarded server-side against the live document: it only applies when
  // no OTHER collection already holds the name (case-insensitive). A lost race
  // ends with matchedCount 0 → 409, mirroring POST /collections.
  const nameLower = name.toLowerCase()
  const renamed = await db.collection('userRecipeData').updateOne(
    {
      _id: req.uid,
      'collections.id': id,
      $expr: {
        $eq: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$collections', []] },
                cond: {
                  $and: [
                    { $eq: [{ $toLower: '$$this.name' }, nameLower] },
                    { $ne: ['$$this.id', id] },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    },
    { $set: { 'collections.$.name': name } }
  )
  if (renamed.matchedCount === 0) {
    return res.status(409).json({ error: 'A collection with that name already exists' })
  }
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
      // Atomic guard against a concurrent double-save (double-tap / two tabs):
      // only push when the recipe isn't already in the saved list, and only bump
      // numTimesSaved when this request is the one that actually pushed. upsert
      // handles the first-ever save (no userRecipeData doc yet); a request that
      // loses the race against an existing doc fails the `$ne` match and surfaces
      // as a duplicate-_id error we swallow as a no-op.
      let pushed = false
      try {
        const result = await db.collection('userRecipeData').updateOne(
          { _id: req.uid, 'savedRecipes.recipeId': { $ne: recipeId } },
          {
            $push: {
              savedRecipes: { recipeId, dateSaved: Date.now().toString(), collectionIds },
            },
          },
          { upsert: true }
        )
        pushed = result.modifiedCount > 0 || result.upsertedCount > 0
      } catch (err) {
        if (err?.code !== 11000) throw err
        // Lost the race to a concurrent save — already saved, nothing to do.
      }
      if (pushed) {
        await db
          .collection('recipes')
          .updateOne(recipeIdQuery(recipeId), { $inc: { numTimesSaved: 1 } })
      }
    }
    res.json({ recipeId, collectionIds, saved: true })
  })
)

module.exports = router
