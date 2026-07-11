const { Router } = require('express')
const { rateLimit } = require('express-rate-limit')
const { asyncHandler } = require('../util/asyncHandler')
const { ObjectId } = require('mongodb')
const { getDB } = require('../db')
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth')
const { recordAudit, recordAuditMany } = require('../util/auditLog')
const { notifyInBackground, notifyBugReportFiled } = require('../util/email')

const router = Router()

// A bug report is user-submitted product feedback, distinct from a content
// `report` (moderation). Anyone — including logged-out visitors — can file one,
// so the shape carries an optional reporterUid/email plus auto-captured client
// context (route, browser, app version) for triage.
const CATEGORIES = ['bug', 'confusing', 'idea', 'other']
const RESOLUTIONS = ['resolved', 'dismissed']
const MAX_DESCRIPTION_LEN = 2000
const MAX_EMAIL_LEN = 254
const MAX_CONTEXT_LEN = 500 // url / userAgent / appVersion individually
const DEFAULT_PER_PAGE = 20
const MAX_PER_PAGE = 100 // cap the admin page size so one query can't pull the whole collection

// Trim and hard-cap a free-text field; non-strings collapse to ''. Keeps any one
// field from bloating a document or the admin queue regardless of client input.
function boundedString(val, max) {
  return typeof val === 'string' ? val.trim().slice(0, max) : ''
}

// Tighter per-IP limit than the global /api backstop: a submit form is the kind
// of public, unauthenticated endpoint a script would hammer. Skipped under Jest
// (supertest fires many requests from one IP); the global limiter does the same.
// The 429 body matches the house `{ error, code: 'RATE_LIMITED' }` JSON shape
// (writeLimiter.js's makeUserLimiter) instead of express-rate-limit's default
// plain-text message, so every API surface's 429 is uniform — this is a plain
// `rateLimit()` (not a makeUserLimiter instance, since it's keyed by IP, not
// req.uid) so the shape has to be set here explicitly.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'You’re doing that too quickly — wait a moment and try again.', code: 'RATE_LIMITED' },
})

// POST /bug-reports — anyone (logged-in or not) files a bug report. optionalAuth
// attaches req.uid when a valid token is present; anonymous submissions are kept
// and may carry an email for follow-up.
router.post('/bug-reports', submitLimiter, optionalAuth, asyncHandler(async (req, res) => {
  const db = getDB()
  const { category, description, url, appVersion, email } = req.body

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }
  const desc = boundedString(description, MAX_DESCRIPTION_LEN)
  if (!desc) {
    return res.status(400).json({ error: 'description is required' })
  }
  // Email is optional; when present it must look minimally like an address.
  const reporterEmail = boundedString(email, MAX_EMAIL_LEN)
  if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
    return res.status(400).json({ error: 'email must be a valid address' })
  }

  const doc = {
    _id: new ObjectId(),
    reporterUid: req.uid || null,
    reporterEmail: reporterEmail || null,
    category,
    description: desc,
    // User-Agent is read server-side (more reliable than a client-sent value);
    // url + appVersion come from the client since only it knows the SPA route
    // and the build it's running.
    url: boundedString(url, MAX_CONTEXT_LEN),
    userAgent: boundedString(req.headers['user-agent'], MAX_CONTEXT_LEN),
    appVersion: boundedString(appVersion, MAX_CONTEXT_LEN),
    status: 'open',
    createdAt: new Date(),
  }
  await db.collection('bugReports').insertOne(doc)

  // Ping the admin so a new report doesn't sit unseen in the queue. Background +
  // best-effort: a slow/missing email provider never affects the submitter.
  notifyInBackground(
    notifyBugReportFiled({
      category: doc.category,
      description: doc.description,
      url: doc.url,
      reporterLabel: doc.reporterUid ? `uid ${doc.reporterUid}` : doc.reporterEmail || 'anonymous',
    })
  )

  res.status(201).json(doc)
}))

// GET /admin/bug-reports — admin queue. Filter by status/category, paginate, and
// enrich each report's reporterUid with a username in one batched lookup.
router.get('/admin/bug-reports', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const { status, category } = req.query

  const filter = {}
  if (status && ['open', ...RESOLUTIONS].includes(status)) filter.status = status
  if (category && CATEGORIES.includes(category)) filter.category = category

  // Clamp paging so a malformed (NaN) or oversized perPage can't crash the
  // cursor or pull the whole collection in one query.
  const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE, 1), MAX_PER_PAGE)
  const page = Math.max(parseInt(req.query.page, 10) || 0, 0)
  const skip = page * perPage
  const limit = perPage

  const [reports, totalCount, openCount] = await Promise.all([
    db.collection('bugReports').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection('bugReports').countDocuments(filter),
    db.collection('bugReports').countDocuments({ status: 'open' }),
  ])

  // Resolve reporter usernames in one query (usernames is _id=uid → username),
  // so the queue shows "@user" without a per-row lookup. Anonymous reports
  // (null uid) simply have no username.
  const reporterUids = [...new Set(reports.map((r) => r.reporterUid).filter(Boolean))]
  const reporterDocs = reporterUids.length
    ? await db.collection('usernames').find({ _id: { $in: reporterUids } }).toArray()
    : []
  const usernameByUid = Object.fromEntries(reporterDocs.map((d) => [d._id, d.username]))
  const enriched = reports.map((r) => ({
    ...r,
    reporterUsername: r.reporterUid ? usernameByUid[r.reporterUid] || null : null,
  }))

  res.json({ reports: enriched, totalCount, openCount })
}))

// Most reports a single admin sweep would ever clear at once. Bounds the bulk
// updateMany and the audit insert.
const MAX_BULK = 100

// PATCH /admin/bug-reports/bulk — resolve/dismiss many in one sweep. Declared
// BEFORE /:id so 'bulk' isn't captured as an :id. Mirrors reports/bulk: only OPEN
// reports are touched, stamped with one timestamp, then re-read by that stamp so
// a report closed concurrently by another admin can't enter our audit trail.
router.patch('/admin/bug-reports/bulk', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
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

  const resolvedAt = new Date()
  const result = await db.collection('bugReports').updateMany(
    { _id: { $in: objectIds }, status: 'open' },
    { $set: { status, resolvedBy: req.uid, resolvedAt } }
  )

  const closed = result.modifiedCount
    ? await db
        .collection('bugReports')
        .find({ _id: { $in: objectIds }, resolvedBy: req.uid, resolvedAt })
        .toArray()
    : []

  await recordAuditMany(
    db,
    closed.map((r) => ({
      action: status === 'resolved' ? 'bugReport.resolve' : 'bugReport.dismiss',
      actorUid: req.uid,
      targetType: 'bugReport',
      targetId: r._id,
      targetLabel: r.category,
      metadata: { category: r.category, bulk: true },
    }))
  )

  res.json({ updated: result.modifiedCount })
}))

// PATCH /admin/bug-reports/:id — resolve or dismiss a single report.
router.patch('/admin/bug-reports/:id', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Bug report not found' })
  }
  const { status } = req.body
  if (!RESOLUTIONS.includes(status)) {
    return res.status(400).json({ error: "status must be 'resolved' or 'dismissed'" })
  }
  // Only OPEN reports can be closed — same invariant the bulk route enforces.
  // Guarding on status here means a report another admin already closed (or a
  // stale queue view) can't overwrite the original resolvedBy/resolvedAt or
  // write a second, misattributed audit entry.
  const _id = new ObjectId(req.params.id)
  const updated = await db.collection('bugReports').findOneAndUpdate(
    { _id, status: 'open' },
    { $set: { status, resolvedBy: req.uid, resolvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!updated) {
    // No open report matched: distinguish a missing id (404) from one that was
    // already closed (409) so the client can refresh rather than treat it as gone.
    const exists = await db.collection('bugReports').findOne({ _id }, { projection: { _id: 1 } })
    return res
      .status(exists ? 409 : 404)
      .json({ error: exists ? 'Bug report is already closed' : 'Bug report not found' })
  }
  await recordAudit(db, {
    action: status === 'resolved' ? 'bugReport.resolve' : 'bugReport.dismiss',
    actorUid: req.uid,
    targetType: 'bugReport',
    targetId: updated._id,
    targetLabel: updated.category,
    metadata: { category: updated.category },
  })
  res.json(updated)
}))

module.exports = router
