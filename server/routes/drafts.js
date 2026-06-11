const { Router } = require('express')
const { ObjectId } = require('mongodb')
const { getDB } = require('../db')
const { verifyToken, requireActive } = require('../middleware/auth')
const { validateRecipeBounds } = require('../util/recipeLimits')
const { RECIPE_CONTENT_FIELDS, pickFields } = require('../util/recipeFields')

const router = Router()

// Max drafts a single user may keep at once. Generous enough that a normal user
// never hits it; it bounds collection growth and abuse (a client looping POST).
// Enforced on creation only — editing existing drafts is always allowed.
const MAX_DRAFTS_PER_USER = 25

// A draft is an in-progress recipe owned by a single user. Unlike a published
// recipe it is intentionally incomplete: every content field is optional, so
// only the bounds (max lengths/counts) are validated, never required-field
// presence. The recipe image is *not* part of a draft — it's re-picked when the
// user resumes (publishing still requires an image). See src/api/drafts.ts.
//
// Writes are whitelisted to RECIPE_CONTENT_FIELDS (shared with the recipe-edit
// route via util/recipeFields) so the client can't stash arbitrary keys or
// spoof userId / timestamps on a draft document.

// POST /drafts — create a new draft for the current user. Returns the new _id
// so the client can switch to update-on-autosave from then on.
router.post('/', verifyToken, requireActive, async (req, res) => {
  try {
    const db = getDB()
    const boundsError = validateRecipeBounds(req.body)
    if (boundsError) {
      return res.status(400).json({ error: boundsError })
    }
    // Cap the number of drafts per user. 409 + a machine-readable code so the
    // client can show a specific "delete some drafts" message and stop retrying.
    const draftCount = await db
      .collection('recipeDrafts')
      .countDocuments({ userId: req.uid })
    if (draftCount >= MAX_DRAFTS_PER_USER) {
      return res.status(409).json({
        code: 'DRAFT_LIMIT',
        error: `You've reached the maximum of ${MAX_DRAFTS_PER_USER} saved drafts. Delete some from your Drafts to start a new one.`,
      })
    }
    const now = Date.now().toString()
    const doc = {
      _id: new ObjectId(),
      userId: req.uid,
      ...pickFields(req.body, RECIPE_CONTENT_FIELDS),
      createdAt: now,
      updatedAt: now,
    }
    await db.collection('recipeDrafts').insertOne(doc)
    res.status(201).json(doc)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /drafts — list the current user's drafts, newest-updated first.
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const drafts = await db
      .collection('recipeDrafts')
      .find({ userId: req.uid })
      .sort({ updatedAt: -1 })
      .toArray()
    res.json(drafts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /drafts/:id — fetch a single draft (used when resuming). Owner-only.
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    const draft = await db
      .collection('recipeDrafts')
      .findOne({ _id: new ObjectId(req.params.id) })
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    if (draft.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(draft)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /drafts/:id — overwrite a draft's content (autosave). Owner-only. Only
// whitelisted content fields are written; userId/createdAt/_id are immutable.
router.put('/:id', verifyToken, requireActive, async (req, res) => {
  try {
    const db = getDB()
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    const _id = new ObjectId(req.params.id)
    // Check existence and ownership before validating the payload, so a caller
    // can't probe bounds-validity for a draft they don't own or that doesn't
    // exist (matches the editRecipe route's ordering).
    const draft = await db.collection('recipeDrafts').findOne({ _id })
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    if (draft.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const boundsError = validateRecipeBounds(req.body)
    if (boundsError) {
      return res.status(400).json({ error: boundsError })
    }
    const update = {
      ...pickFields(req.body, RECIPE_CONTENT_FIELDS),
      updatedAt: Date.now().toString(),
    }
    const updated = await db
      .collection('recipeDrafts')
      .findOneAndUpdate({ _id }, { $set: update }, { returnDocument: 'after' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /drafts/:id — remove a draft (manual delete, or cleanup after the
// recipe is published). Owner-only.
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    const _id = new ObjectId(req.params.id)
    const draft = await db.collection('recipeDrafts').findOne({ _id })
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    if (draft.userId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await db.collection('recipeDrafts').deleteOne({ _id })
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
