const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const { ObjectId } = require('mongodb')
const { getDB } = require('../db')
const { verifyToken, requireAdmin, requireActive } = require('../middleware/auth')
const { recipeIdQuery } = require('../util/recipeIdQuery')
const { recordAudit, recordAuditMany } = require('../util/auditLog')
const { notifyInBackground, notifyReportResolved, notifyReportResolvedMany } = require('../util/email')

const router = Router()

// A report targets either a recipe or a single review. Reviews have no stable
// id (they live in `ratings` keyed by username+recipeId), so a review report
// must carry `reportedUsername` alongside `recipeId` to identify the target.
const TARGET_TYPES = ['recipe', 'review']
const REASONS = ['spam', 'inappropriate', 'offensive', 'copyright', 'dangerous', 'other']
const RESOLUTIONS = ['resolved', 'dismissed']
const MAX_DETAILS_LEN = 1000

// Build the query that identifies a single target, used for the
// one-open-report-per-reporter-per-target rate limit.
function targetMatch({ targetType, recipeId, reportedUsername }) {
  return targetType === 'review'
    ? { targetType, recipeId, reportedUsername }
    : { targetType, recipeId }
}

// POST /reports — any logged-in user files a report. Rate-limited to one OPEN
// report per (reporter, target) so a single user can't flood the queue.
router.post('/reports', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const db = getDB()
  const { targetType, recipeId, reportedUsername, reason, details } = req.body

  if (!TARGET_TYPES.includes(targetType)) {
    return res.status(400).json({ error: "targetType must be 'recipe' or 'review'" })
  }
  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ error: 'recipeId is required' })
  }
  if (targetType === 'review' && (!reportedUsername || typeof reportedUsername !== 'string')) {
    return res.status(400).json({ error: 'reportedUsername is required for review reports' })
  }
  if (!REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid reason' })
  }
  if (details != null && (typeof details !== 'string' || details.length > MAX_DETAILS_LEN)) {
    return res.status(400).json({ error: `details must be a string under ${MAX_DETAILS_LEN} chars` })
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
    recipeId,
    ...(targetType === 'review' ? { reportedUsername } : {}),
    reporterUid: req.uid,
    reason,
    details: details || '',
    status: 'open',
    createdAt: new Date(),
  }
  await db.collection('reports').insertOne(doc)
  res.status(201).json(doc)
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
      const recipe = await db
        .collection('recipes')
        .findOne(recipeIdQuery(r.recipeId), {
          projection: { title: 1, recipeImage: 1, status: 1, userId: 1 },
        })
      let review = null
      if (r.targetType === 'review') {
        review = await db
          .collection('ratings')
          .findOne(
            { username: r.reportedUsername, recipeId: r.recipeId },
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
  // Notify the reporter that action was taken. Dismiss is intentionally silent.
  if (status === 'resolved') notifyInBackground(notifyReportResolved(updated.reporterUid))
  res.json(updated)
}))

module.exports = router
