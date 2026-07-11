const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { ObjectId } = require('mongodb')
const { getDB } = require('../db')
const { verifyToken, requireActive } = require('../middleware/auth')
const { draftWriteLimiter } = require('../middleware/writeLimiter')
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
router.post('/', verifyToken, requireActive, draftWriteLimiter, asyncHandler(async (req, res) => {
  const db = getDB()
  const boundsError = validateRecipeBounds(req.body)
  if (boundsError) {
    return res.status(400).json({ error: boundsError })
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

  // Cap the number of drafts per user. A plain read-then-insert (count, then
  // insert if under the cap) is a TOCTOU: concurrent POSTs can all pass the
  // count before any of them lands, overshooting the cap. Unlike the
  // save/unsave conditional-filter pattern in recipes.js, there's no single
  // document to condition an atomic write on here — each draft is its own
  // document, so a per-request conditional filter can't see sibling requests'
  // not-yet-committed inserts either.
  //
  // Instead, enforce the cap post-insert: insert unconditionally, then
  // recompute the caller's *current* drafts sorted oldest-first (by _id) and
  // delete anything beyond the cap. This converges under arbitrary
  // concurrent interleaving because every pass reads live state and targets
  // the same well-defined "newest beyond the cap" set — redundant or
  // out-of-order trims from racing requests agree and are idempotent
  // (deleting an already-deleted id is a no-op). Whichever requests' docs
  // land outside the surviving oldest-N find themselves deleted and reply
  // 409; concurrent POSTs at the cap admit only as many as there's room for.
  const ids = await db
    .collection('recipeDrafts')
    .find({ userId: req.uid }, { projection: { _id: 1 } })
    .sort({ _id: 1 })
    .toArray()
  const overflow = ids.slice(MAX_DRAFTS_PER_USER)
  if (overflow.length > 0) {
    await db
      .collection('recipeDrafts')
      .deleteMany({ _id: { $in: overflow.map((d) => d._id) } })
  }
  const survived = ids
    .slice(0, MAX_DRAFTS_PER_USER)
    .some((d) => d._id.equals(doc._id))
  if (!survived) {
    return res.status(409).json({
      code: 'DRAFT_LIMIT',
      error: `You've reached the maximum of ${MAX_DRAFTS_PER_USER} saved drafts. Delete some from your Drafts to start a new one.`,
    })
  }
  res.status(201).json(doc)
}))

// GET /drafts — list the current user's drafts, newest-updated first.
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const drafts = await db
    .collection('recipeDrafts')
    .find({ userId: req.uid })
    .sort({ updatedAt: -1 })
    .toArray()
  res.json(drafts)
}))

// GET /drafts/:id — fetch a single draft (used when resuming). Owner-only.
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
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
}))

// PUT /drafts/:id — overwrite a draft's content (autosave). Owner-only. Only
// whitelisted content fields are written; userId/createdAt/_id are immutable.
//
// The client must echo back the `updatedAt` of the version it's editing from;
// the update is conditioned on the stored draft still carrying that value, so
// a tab that's saved on top of a since-changed draft gets a 409 instead of
// blindly clobbering it with a full `$set` of its (now-stale) content.
//
// EXCEPTION — the unload keepalive flush (src/api/drafts.ts:flushDraftKeepalive)
// sends `supersede: true`. That flush carries the freshest edits the user made
// right before leaving the page, so it must land unconditionally: it drops the
// `updatedAt` precondition and matches on `{_id}` alone (still ownership-checked
// above), so it can never 409 against a normal autosave that raced ahead of it —
// the newest content always wins the unload race. It is deliberately the ONLY
// path that sets the flag; regular debounced autosave (updateDraft) never does,
// so a routine save still 409s on a real cross-tab conflict. A supersede write
// can still 404 if the draft was deleted in the interim — see the no-match
// branch below — so a keepalive flush never resurrects a deleted draft (#307).
//
// Deliberately NO draftWriteLimiter here (unlike POST above). This is the
// 1.5s-debounce autosave path — continuous typing alone can produce ~40
// legitimate writes/min, well over a stock 30/min per-uid cap, so reusing the
// POST limiter here would throttle normal editing, not abuse. It also must
// never be the request that eats a 429 for #294's keepalive flush on tab
// unload. Damage from PUT spam is bounded another way: it can only rewrite
// the caller's OWN drafts (ownership-checked above), and the draft set itself
// is capped at MAX_DRAFTS_PER_USER by POST's post-insert trim, so there's no
// unbounded resource growth to protect against here.
router.put('/:id', verifyToken, requireActive, asyncHandler(async (req, res) => {
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
  const { updatedAt: baseUpdatedAt, supersede } = req.body
  // The unload flush sets `supersede: true` to write unconditionally (see the
  // route comment). Only a normal autosave requires — and is conditioned on —
  // the `updatedAt` precondition.
  const isSupersede = supersede === true
  if (!isSupersede && typeof baseUpdatedAt !== 'string') {
    return res.status(400).json({ error: 'Missing updatedAt precondition' })
  }
  const update = {
    ...pickFields(req.body, RECIPE_CONTENT_FIELDS),
    updatedAt: Date.now().toString(),
  }
  // A supersede flush matches on `{_id}` alone so a stale base version still
  // lands; a normal save conditions on the base `updatedAt` and 409s on a
  // mismatch. `supersede` is not a RECIPE_CONTENT_FIELD, so pickFields never
  // persists it onto the draft document.
  const filter = isSupersede ? { _id } : { _id, updatedAt: baseUpdatedAt }
  const updated = await db
    .collection('recipeDrafts')
    .findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' })
  if (!updated) {
    // Either someone else's save moved `updatedAt` out from under this
    // request, or the draft was deleted in the interim — distinguish so the
    // caller doesn't render a conflict banner for a draft that's simply gone.
    const latest = await db.collection('recipeDrafts').findOne({ _id })
    if (!latest) {
      return res.status(404).json({ error: 'Draft not found' })
    }
    return res.status(409).json({
      code: 'DRAFT_CONFLICT',
      error: 'This draft was updated elsewhere. Reload it to see the latest version.',
      draft: latest,
    })
  }
  res.json(updated)
}))

// DELETE /drafts/:id — remove a draft (manual delete, or cleanup after the
// recipe is published). Owner-only.
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
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
}))

module.exports = router
