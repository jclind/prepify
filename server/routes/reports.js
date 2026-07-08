const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { ObjectId } = require('mongodb')
const { getDB } = require('../db')
const { verifyToken, requireAdmin, requireActive } = require('../middleware/auth')
const { makeUserLimiter } = require('../middleware/writeLimiter')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { recordAudit, recordAuditMany } = require('../util/auditLog')
const { restoreHeldRecipe } = require('../util/automod')
const { notifyInBackground, notifyReportResolved, notifyReportResolvedMany } = require('../util/email')

// An OPEN automod report is the queue half of a recipe hold; the other half is the
// recipe's `pending_review` status. Closing such a report directly (resolve OR
// dismiss) without restoring the recipe would strand it invisible forever, so any
// report-close path runs the held recipe back through restoreHeldRecipe. The
// status filter inside that helper means a recipe an admin has separately taken
// down ('hidden') is left down — only genuine strays (still 'pending_review') are
// restored.
//
// IMPORTANT — resolve and dismiss are treated IDENTICALLY here: both close the
// report, so both restore a still-held recipe to 'active'. "Resolve" does NOT take
// the recipe down. Taking a held recipe down is a SEPARATE action (admin recipe
// controls → Take down, or the /admin/recipes/:id/moderation route → 'hidden'),
// after which this guard becomes a no-op. So the rule is: to keep a held recipe
// down, hide it FIRST, then close its report. The admin UI enforces this by
// offering a held report only Approve / Take down (never a bare Resolve/Dismiss,
// which from the queue would silently publish the content) and by excluding held
// reports from bulk selection. This server guard is the backstop for direct API
// calls — it can't tell "resolve = publish" from "resolve = should've hidden", so
// it always restores; the takedown-first ordering is the contract that keeps a
// resolve from publishing content an admin meant to remove.
const isAutomodRecipeReport = (r) => r && r.source === 'automod' && r.targetType === 'recipe'

const router = Router()

// Per-user breadth limiter for filing reports, keyed by req.uid (an independent
// bucket from the content-write limiters — see middleware/writeLimiter). The
// one-open-report-per-(reporter,target) rule below already stops re-filing the
// SAME target, but nothing caps the breadth: one account could open a report
// against a distinct recipe/user/review every few seconds and bloat the
// moderation queue, with only the coarse global per-IP backstop applying. 10/min
// is far above any human's manual report cadence (read → pick a reason → submit)
// yet bounds a scripted breadth-spam run hard. Mounted after verifyToken so
// req.uid is set; skipped under Jest like every makeUserLimiter instance.
const reportLimiter = makeUserLimiter({
  limit: 10,
  message: 'You’re filing reports too quickly — wait a minute and try again.',
})

// A report targets a recipe, a single review, or a whole user. Reviews have no
// stable id (they live in `ratings` keyed by username+recipeId), so a review
// report carries `reportedUsername` alongside `recipeId`. A 'user' report
// targets a profile directly: it carries `reportedUsername` and has no recipeId.
const TARGET_TYPES = ['recipe', 'review', 'user']
const REASONS = ['spam', 'inappropriate', 'offensive', 'copyright', 'dangerous', 'incorrect_info', 'other']
// Reasons that only make sense for recipe content (wrong quantities, a bad price
// estimate, etc.) — rejected on review/user targets so the queue can trust that
// an `incorrect_info` report is always about a recipe. Kept in sync with the
// client's `recipeOnly` option flag (src/Components/ReportControl).
const RECIPE_ONLY_REASONS = ['incorrect_info']
const RESOLUTIONS = ['resolved', 'dismissed']
const MAX_DETAILS_LEN = 1000

// Both review and user reports name a reported account by handle (and snapshot
// its uid); recipe reports do not.
const namesUser = (targetType) => targetType === 'review' || targetType === 'user'

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Match a stored handle case-insensitively for the rate-limit query so a casing
// variant (BadUser vs baduser) can't sidestep the one-open-report-per-target
// limit. Anchored + escaped — reportedUsername isn't charset-validated here, so
// raw input must not leak regex metacharacters.
const handleMatch = (reportedUsername) => new RegExp(`^${escapeRegex(reportedUsername)}$`, 'i')

// Build the query that identifies a single target, used for the
// one-open-report-per-reporter-per-target rate limit.
function targetMatch({ targetType, recipeId, reportedUsername }) {
  if (targetType === 'recipe') return { targetType, recipeId }
  // review/user name an account; match the handle case-insensitively.
  const handle = { reportedUsername: handleMatch(reportedUsername) }
  return targetType === 'user'
    ? { targetType, ...handle }
    : { targetType, recipeId, ...handle }
}

// POST /reports — any logged-in user files a report. Rate-limited two ways: a
// per-user breadth cap (reportLimiter, 10/min across all targets) and, below, one
// OPEN report per (reporter, target) so a single user can't flood the queue.
router.post('/reports', verifyToken, requireActive, reportLimiter, asyncHandler(async (req, res) => {
  const db = getDB()
  const { targetType, recipeId, reportedUsername, reason, details } = req.body

  if (!TARGET_TYPES.includes(targetType)) {
    return res.status(400).json({ error: "targetType must be 'recipe', 'review', or 'user'" })
  }
  // recipeId identifies recipe/review targets; a user report has none.
  if (targetType !== 'user' && (!recipeId || typeof recipeId !== 'string')) {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  if (namesUser(targetType) && (!reportedUsername || typeof reportedUsername !== 'string')) {
    return res.status(400).json({ error: 'reportedUsername is required for review and user reports' })
  }
  if (!REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid reason' })
  }
  if (RECIPE_ONLY_REASONS.includes(reason) && targetType !== 'recipe') {
    return res.status(400).json({ error: 'That reason only applies to recipe reports' })
  }
  if (details != null && (typeof details !== 'string' || details.length > MAX_DETAILS_LEN)) {
    return res.status(400).json({ error: `details must be a string under ${MAX_DETAILS_LEN} chars` })
  }

  // Resolve the reported account up front for review/user reports. The lookup
  // does triple duty: reject reports against a handle that doesn't exist, block
  // self-reports, and snapshot the stable uid (D1) so the report survives a
  // rename. The handle is still stored for display in the queue.
  let reportedUid = null
  if (namesUser(targetType)) {
    const reportedDoc = await db
      .collection('usernames')
      .findOne({ username_lower: reportedUsername.toLowerCase() })
    // A 'user' report must name a real account (any string is otherwise a valid
    // target). A review report's author is implied by an existing review, so a
    // missing handle there falls through to a null uid as before.
    if (targetType === 'user' && !reportedDoc) {
      return res.status(404).json({ error: 'No user with that username exists.' })
    }
    reportedUid = reportedDoc?._id || null
    if (reportedUid && reportedUid === req.uid) {
      return res.status(400).json({
        error:
          targetType === 'user'
            ? "You can't report yourself."
            : "You can't report your own review.",
      })
    }
  }

  const match = targetMatch({ targetType, recipeId, reportedUsername })
  const existing = await db.collection('reports').findOne({
    ...match,
    reporterUid: req.uid,
    status: 'open',
  })
  if (existing) {
    return res.status(409).json({
      code: 'ALREADY_REPORTED',
      error: 'You already have an open report for this content.',
    })
  }

  const doc = {
    _id: new ObjectId(),
    targetType,
    // user reports have no recipe; recipe/review reports always do.
    ...(targetType === 'user' ? {} : { recipeId }),
    ...(namesUser(targetType) ? { reportedUsername, reportedUid } : {}),
    reporterUid: req.uid,
    reason,
    details: details || '',
    status: 'open',
    createdAt: new Date(),
  }
  await db.collection('reports').insertOne(doc)
  // Don't echo the reported account's internal Firebase uid back to the
  // reporter — returning the raw doc turned this into a username→uid oracle
  // (file a 'user' report against any handle, read reportedUid off the 201).
  // The client never reads this body (it only toasts on success), so strip the
  // internal id; the rest of the doc stays for shape-compatibility.
  const { reportedUid: _omitReportedUid, ...safeDoc } = doc
  res.status(201).json(safeDoc)
}))

// GET /reports — admin queue. Filters by status/targetType, paginates, and
// enriches each report with a snapshot of the reported content for inline
// preview (recipe title/image, or the review text).
router.get('/reports', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const { status, targetType, page = 0, perPage = 20 } = req.query

  const filter = {}
  if (status && ['open', ...RESOLUTIONS].includes(status)) filter.status = status
  if (targetType && TARGET_TYPES.includes(targetType)) filter.targetType = targetType

  const skip = parseInt(page) * parseInt(perPage)
  const limit = parseInt(perPage)

  const [reports, totalCount, openCount] = await Promise.all([
    db.collection('reports').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection('reports').countDocuments(filter),
    db.collection('reports').countDocuments({ status: 'open' }),
  ])

  // Attach a lightweight snapshot of the target so the queue can render a
  // preview without a second round trip per row.
  const enriched = await Promise.all(
    reports.map(async (r) => {
      // user reports have no recipe to preview.
      const recipe = r.recipeId
        ? await db
            .collection('recipes')
            .findOne(recipeIdQuery(r.recipeId), {
              projection: { title: 1, recipeImage: 1, status: 1, userId: 1 },
            })
        : null
      let review = null
      if (r.targetType === 'review') {
        // ratings are keyed by the stable userId; username is a renameable
        // display field, so matching the stored handle blanks the preview once
        // the author renames (the reports.js twin of the S3 reviews.js fix).
        // Prefer the uid snapshotted on the report (D1); fall back to the handle
        // only for legacy/edge reports that never captured a reportedUid.
        const authorMatch = r.reportedUid
          ? { userId: r.reportedUid }
          : { username: r.reportedUsername }
        review = await db
          .collection('ratings')
          .findOne(
            { ...authorMatch, recipeId: r.recipeId },
            { projection: { reviewText: 1, rating: 1, moderationHidden: 1 } }
          )
      }
      return { ...r, target: { recipe, review } }
    })
  )

  res.json({ reports: enriched, totalCount, openCount })
}))

// Most reports a single admin sweep would ever clear at once. Bounds the bulk
// updateMany and the audit insert.
const MAX_BULK = 100

// PATCH /reports/bulk — admin resolves/dismisses many reports in one sweep.
// Declared BEFORE /reports/:id so 'bulk' isn't captured as an :id. Only OPEN
// reports are touched (already-closed ids in the batch are simply skipped), and
// one audit entry is written per report actually closed.
router.patch('/reports/bulk', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const { ids, status } = req.body
  if (!RESOLUTIONS.includes(status)) {
    return res.status(400).json({ error: "status must be 'resolved' or 'dismissed'" })
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' })
  }
  if (ids.length > MAX_BULK) {
    return res.status(400).json({ error: `Cannot update more than ${MAX_BULK} reports at once` })
  }
  const objectIds = ids.filter((id) => typeof id === 'string' && ObjectId.isValid(id)).map((id) => new ObjectId(id))
  if (objectIds.length === 0) {
    return res.status(400).json({ error: 'No valid report ids' })
  }

  // Stamp every report this sweep closes with a single timestamp, then re-read
  // exactly those docs by our own (actorUid, resolvedAt) stamp. updateMany
  // can't return the modified docs, and re-reading by the stamp — rather than
  // a pre-update snapshot — means a report closed concurrently by another
  // admin can't slip into *our* audit trail.
  const resolvedAt = new Date()
  const result = await db.collection('reports').updateMany(
    { _id: { $in: objectIds }, status: 'open' },
    { $set: { status, resolvedBy: req.uid, resolvedAt } }
  )

  const closed = result.modifiedCount
    ? await db
        .collection('reports')
        .find({ _id: { $in: objectIds }, resolvedBy: req.uid, resolvedAt })
        .toArray()
    : []

  await recordAuditMany(
    db,
    closed.map((r) => ({
      action: status === 'resolved' ? 'report.resolve' : 'report.dismiss',
      actorUid: req.uid,
      targetType: 'report',
      targetId: r._id,
      targetLabel: r.reportedUsername ? `@${r.reportedUsername}` : r.recipeId,
      metadata: { targetType: r.targetType, recipeId: r.recipeId, bulk: true },
    }))
  )

  // Strand guard: any automod recipe report closed in this sweep clears a hold, so
  // restore those recipes (bounded by MAX_BULK above). Sequential to keep audit
  // writes orderly; the set is small.
  for (const r of closed.filter(isAutomodRecipeReport)) {
    await restoreHeldRecipe(db, r.recipeId, req.uid)
  }

  // Email each affected reporter once per sweep (resolve only; dismiss is
  // silent), in the background so a large sweep never blocks the response.
  if (status === 'resolved') {
    notifyInBackground(notifyReportResolvedMany(closed.map((r) => r.reporterUid)))
  }

  res.json({ updated: result.modifiedCount })
}))

// PATCH /reports/:id — admin resolves or dismisses a report. Resolving does NOT
// itself take content down; the admin takedown endpoints (on recipes/reviews)
// do that. This just closes the queue item and stamps who/when.
router.patch('/reports/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Report not found' })
  }
  const { status } = req.body
  if (!RESOLUTIONS.includes(status)) {
    return res.status(400).json({ error: "status must be 'resolved' or 'dismissed'" })
  }
  const updated = await db.collection('reports').findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { status, resolvedBy: req.uid, resolvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ error: 'Report not found' })
  await recordAudit(db, {
    action: status === 'resolved' ? 'report.resolve' : 'report.dismiss',
    actorUid: req.uid,
    targetType: 'report',
    targetId: updated._id,
    targetLabel: updated.reportedUsername ? `@${updated.reportedUsername}` : updated.recipeId,
    metadata: { targetType: updated.targetType, recipeId: updated.recipeId },
  })
  // Strand guard: if this report was an automod hold, closing it here would leave
  // the recipe stuck at 'pending_review' — restore it (no-op if already taken down).
  if (isAutomodRecipeReport(updated)) await restoreHeldRecipe(db, updated.recipeId, req.uid)
  // Notify the reporter that action was taken. Dismiss is intentionally silent.
  if (status === 'resolved') notifyInBackground(notifyReportResolved(updated.reporterUid))
  res.json(updated)
}))

module.exports = router
