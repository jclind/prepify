const { Router } = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const admin = require('firebase-admin')
const { getDB } = require('../db')
const { verifyToken, requireAdmin } = require('../middleware/auth')
const { USER_STATUSES } = require('../util/userStatus')
const { recordAudit, AUDIT_ACTIONS, AUDIT_TARGET_TYPES } = require('../util/auditLog')
const { notifyInBackground, notifyAccountStatus } = require('../util/email')

const router = Router()

const DEFAULT_PER_PAGE = 25
const MAX_PER_PAGE = 50
const MAX_REASON_LEN = 500

// Analytics time-window bounds (days) for the over-time series, plus how many
// recent admin actions the dashboard surfaces.
const DEFAULT_DAYS = 30
const MIN_DAYS = 7
const MAX_DAYS = 90
const RECENT_ACTIONS_LIMIT = 10

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Attach each audit entry's actor username in one batched lookup, so a page of
// entries shows "@admin did X" without a per-row query. Shared by the audit
// trail and the analytics "recent actions" feed. The live `usernames` lookup
// wins (an admin who renamed shows their current handle), but falls back to a
// username captured on the row at action time — the only label left for a
// self-service account deletion, which removes the actor's `usernames` doc in
// the same cascade that writes the audit row.
async function enrichActors(db, entries) {
  const actorUids = [...new Set(entries.map((e) => e.actorUid).filter(Boolean))]
  const actorDocs = actorUids.length
    ? await db.collection('usernames').find({ _id: { $in: actorUids } }).toArray()
    : []
  const actorByUid = Object.fromEntries(actorDocs.map((d) => [d._id, d.username]))
  return entries.map((e) => ({
    ...e,
    actorUsername: actorByUid[e.actorUid] || e.actorUsername || null,
  }))
}

// Build a complete, zero-filled daily time series for the last `days` days
// (inclusive of today, oldest first) from a [{ _id: 'YYYY-MM-DD', count }]
// aggregation result. Filling the gaps server-side means the client always
// receives one bucket per day and never has to reason about missing dates.
function buildDailySeries(aggRows, days, now = new Date()) {
  const byDate = Object.fromEntries(aggRows.map((r) => [r._id, r.count]))
  const series = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    series.push({ date, count: byDate[date] || 0 })
  }
  return series
}

// One aggregation that buckets a collection's `createdAt` by UTC day since the
// cutoff. Returns rows shaped for buildDailySeries.
function dailyCreatedAgg(db, collection, cutoff) {
  return db
    .collection(collection)
    .aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray()
}

// There is no central user record (P2 introduces a `users` status doc, but it
// only exists once a user has been actioned). The closest thing to a roster is
// the `usernames` collection (`_id = uid`), created at onboarding. So the admin
// user list is built from `usernames`, left-joined with status + activity counts.
//
// Given a page of username docs ({ _id: uid, username }), batch-load everything
// needed to render them: status, #recipes authored, #reviews written, and #open
// reports targeting the user (review reports by username + recipe reports on
// recipes they authored). All queries are scoped to this page's users.
async function enrichUsers(db, usernameDocs) {
  const uids = usernameDocs.map((d) => d._id)
  const usernames = usernameDocs.map((d) => d.username).filter(Boolean)

  const [recipes, reviewAgg, statusDocs] = await Promise.all([
    db
      .collection('recipes')
      .find({ userId: { $in: uids } }, { projection: { _id: 1, userId: 1 } })
      .toArray(),
    db
      .collection('ratings')
      // Count actual reviews, not bare ratings: a `ratings` doc with an empty
      // reviewText is a star-only rating, not a written review, so it must not
      // inflate the "reviews" column.
      .aggregate([
        { $match: { username: { $in: usernames }, reviewText: { $exists: true, $nin: ['', null] } } },
        { $group: { _id: '$username', count: { $sum: 1 } } },
      ])
      .toArray(),
    db.collection('users').find({ _id: { $in: uids } }).toArray(),
  ])

  const recipeCountByUid = {}
  const ownerByRecipeId = {}
  recipes.forEach((r) => {
    recipeCountByUid[r.userId] = (recipeCountByUid[r.userId] || 0) + 1
    ownerByRecipeId[String(r._id)] = r.userId
  })
  const reviewCountByUsername = Object.fromEntries(
    reviewAgg.map((r) => [r._id, r.count])
  )
  const statusByUid = Object.fromEntries(statusDocs.map((d) => [d._id, d]))

  // Open reports touching any user on this page (review reports keyed by
  // username; recipe reports keyed by an owned recipe id), tallied per uid.
  const recipeIds = Object.keys(ownerByRecipeId)
  const openReportDocs = await db
    .collection('reports')
    .find({
      status: 'open',
      $or: [
        { reportedUsername: { $in: usernames } },
        { recipeId: { $in: recipeIds } },
      ],
    })
    .toArray()
  const openReportsByUid = {}
  const uidByUsername = Object.fromEntries(usernameDocs.map((d) => [d.username, d._id]))
  openReportDocs.forEach((rep) => {
    const uid =
      rep.targetType === 'review'
        ? uidByUsername[rep.reportedUsername]
        : ownerByRecipeId[String(rep.recipeId)]
    if (uid) openReportsByUid[uid] = (openReportsByUid[uid] || 0) + 1
  })

  return usernameDocs.map((d) => {
    const statusDoc = statusByUid[d._id]
    return {
      uid: d._id,
      username: d.username || null,
      status: statusDoc?.status || 'active',
      statusReason: statusDoc?.statusReason || null,
      statusUpdatedAt: statusDoc?.statusUpdatedAt || null,
      statusUpdatedBy: statusDoc?.statusUpdatedBy || null,
      counts: {
        recipes: recipeCountByUid[d._id] || 0,
        reviews: reviewCountByUsername[d.username] || 0,
        openReports: openReportsByUid[d._id] || 0,
      },
    }
  })
}

// GET /admin/users?query=&page=&perPage= — search/list users for moderation.
// Primary search is a username prefix (case-insensitive). A query containing '@'
// is treated as an email and resolved through Firebase Auth; an exact uid match
// is also honored. Empty query lists all users alphabetically.
router.get('/admin/users', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const query = (req.query.query || '').trim()
  const page = Math.max(parseInt(req.query.page) || 1, 1)
  const perPage = Math.min(
    parseInt(req.query.perPage) || DEFAULT_PER_PAGE,
    MAX_PER_PAGE
  )

  // Email lookup: resolve to a uid via Firebase, then surface that one user.
  if (query.includes('@')) {
    try {
      const fbUser = await admin.auth().getUserByEmail(query)
      const usernameDoc =
        (await db.collection('usernames').findOne({ _id: fbUser.uid })) || {
          _id: fbUser.uid,
          username: null,
        }
      const [enriched] = await enrichUsers(db, [usernameDoc])
      return res.json({ users: [{ ...enriched, email: fbUser.email }], totalCount: 1 })
    } catch (e) {
      return res.json({ users: [], totalCount: 0 })
    }
  }

  const filter = query
    ? {
        $or: [
          { username_lower: { $regex: '^' + escapeRegex(query.toLowerCase()) } },
          { _id: query },
        ],
      }
    : {}

  const totalCount = await db.collection('usernames').countDocuments(filter)
  const usernameDocs = await db
    .collection('usernames')
    .find(filter)
    .sort({ username_lower: 1 })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .toArray()

  const users = await enrichUsers(db, usernameDocs)
  res.json({ users, totalCount })
}))

// GET /admin/users/:uid — single-user detail (adds email + recent content).
router.get('/admin/users/:uid', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const uid = req.params.uid
  const usernameDoc =
    (await db.collection('usernames').findOne({ _id: uid })) || {
      _id: uid,
      username: null,
    }
  const [enriched] = await enrichUsers(db, [usernameDoc])

  let email = null
  try {
    const fbUser = await admin.auth().getUser(uid)
    email = fbUser.email || null
  } catch (e) {
    // No Firebase user (or lookup failed) — detail still renders without email.
  }

  const [recentRecipes, recentReviews] = await Promise.all([
    db
      .collection('recipes')
      .find({ userId: uid }, { projection: { title: 1, recipeImage: 1, status: 1 } })
      .limit(5)
      .toArray(),
    usernameDoc.username
      ? db
          .collection('ratings')
          .find({ username: usernameDoc.username })
          .limit(5)
          .toArray()
      : Promise.resolve([]),
  ])

  res.json({ ...enriched, email, recentRecipes, recentReviews })
}))

// PATCH /admin/users/:uid/status — set an account's moderation status.
// Guards: an admin can't change their own status, and can't suspend/ban another
// admin. Status is stored in the `users` collection (upserted), the single
// source of truth read by requireActive.
router.patch('/admin/users/:uid/status', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const uid = req.params.uid
  const { status, reason } = req.body

  if (!USER_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${USER_STATUSES.join(', ')}` })
  }
  if (typeof reason === 'string' && reason.length > MAX_REASON_LEN) {
    return res
      .status(400)
      .json({ error: `reason must be at most ${MAX_REASON_LEN} characters` })
  }
  if (uid === req.uid) {
    return res.status(400).json({ error: 'You cannot change your own status.' })
  }

  // An admin cannot suspend/ban a fellow admin.
  try {
    const target = await admin.auth().getUser(uid)
    if (target.customClaims?.admin === true) {
      return res
        .status(403)
        .json({ error: 'Cannot change the status of another admin.' })
    }
  } catch (e) {
    return res.status(404).json({ error: 'User not found' })
  }

  await db.collection('users').updateOne(
    { _id: uid },
    {
      $set: {
        status,
        statusReason: status === 'active' ? null : reason || null,
        statusUpdatedBy: req.uid,
        statusUpdatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  const targetUsernameDoc = await db.collection('usernames').findOne({ _id: uid })
  const auditAction =
    status === 'suspended' ? 'user.suspend' : status === 'banned' ? 'user.ban' : 'user.activate'
  await recordAudit(db, {
    action: auditAction,
    actorUid: req.uid,
    targetType: 'user',
    targetId: uid,
    targetLabel: targetUsernameDoc?.username ? `@${targetUsernameDoc.username}` : uid,
    reason: status === 'active' ? null : reason || null,
  })

  // Notify the affected user on suspend/ban (background). Activation is silent.
  notifyInBackground(notifyAccountStatus(uid, status, reason))

  res.json({ uid, status })
}))

// GET /admin/audit?action=&targetType=&actorUid=&page=&perPage= — the moderation
// audit trail, newest first. Each row is enriched with the actor's username so
// the page can show "@admin did X" without a per-row lookup.
router.get('/admin/audit', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const { action, targetType, actorUid } = req.query
  const page = Math.max(parseInt(req.query.page) || 1, 1)
  const perPage = Math.min(parseInt(req.query.perPage) || DEFAULT_PER_PAGE, MAX_PER_PAGE)

  const filter = {}
  if (typeof action === 'string' && AUDIT_ACTIONS.includes(action)) filter.action = action
  if (typeof targetType === 'string' && AUDIT_TARGET_TYPES.includes(targetType)) {
    filter.targetType = targetType
  }
  if (typeof actorUid === 'string' && actorUid) filter.actorUid = actorUid

  const [entries, totalCount] = await Promise.all([
    db
      .collection('auditLog')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray(),
    db.collection('auditLog').countDocuments(filter),
  ])

  // Batch-resolve actor usernames for this page.
  const enriched = await enrichActors(db, entries)

  res.json({ entries: enriched, totalCount })
}))

// GET /admin/analytics?days= — single overview payload for the admin dashboard:
// headline totals, daily over-time series (reports filed / recipes / signups),
// and the most recent admin actions. `days` is clamped to [MIN_DAYS, MAX_DAYS].
//
// Caveat on usersOverTime: the `usernames` collection only started carrying a
// `createdAt` with this change (setUsername $setOnInsert), so the signup series
// only reflects accounts created from that point forward — older users have no
// timestamp and are excluded. Recipe/report series are fully historical.
router.get('/admin/analytics', verifyToken, requireAdmin, asyncHandler(async (req, res) => {
  const db = getDB()
  const days = Math.min(
    Math.max(parseInt(req.query.days) || DEFAULT_DAYS, MIN_DAYS),
    MAX_DAYS
  )
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1))
  cutoff.setUTCHours(0, 0, 0, 0)

  const [
    userCount,
    recipeStatusAgg,
    featuredCount,
    reviewCount,
    reportStatusAgg,
    moderationActionAgg,
    autoDismissedCount,
    reportsDaily,
    recipesDaily,
    usersDaily,
    recentRaw,
  ] = await Promise.all([
    db.collection('usernames').countDocuments(),
    // A missing status is a legacy 'active' recipe (legacy-safe — same rule the
    // public read paths use via $nin).
    db
      .collection('recipes')
      .aggregate([
        { $group: { _id: { $ifNull: ['$status', 'active'] }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db.collection('recipes').countDocuments({ featured: true }),
    // Count written reviews only, not bare star ratings (same rule as enrichUsers).
    db.collection('ratings').countDocuments({ reviewText: { $exists: true, $nin: ['', null] } }),
    db
      .collection('reports')
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray(),
    // Automated-moderation tallies (all-time, like the other totals). autohold =
    // recipes the classifier held for review; content.blocked = writes it refused
    // outright. One aggregation over the two system actions (uses the action index).
    db
      .collection('auditLog')
      .aggregate([
        { $match: { action: { $in: ['recipe.autohold', 'content.blocked'] } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ])
      .toArray(),
    // Automod-filed reports an admin later dismissed. NOTE: dismissing does not
    // (yet) restore a held recipe's status — this counts flags cleared, not
    // content republished. See moderation follow-ups (approve/restore path).
    db.collection('reports').countDocuments({ source: 'automod', status: 'dismissed' }),
    dailyCreatedAgg(db, 'reports', cutoff),
    dailyCreatedAgg(db, 'recipes', cutoff),
    dailyCreatedAgg(db, 'usernames', cutoff),
    db
      .collection('auditLog')
      .find({})
      .sort({ createdAt: -1 })
      .limit(RECENT_ACTIONS_LIMIT)
      .toArray(),
  ])

  const recipeByStatus = Object.fromEntries(recipeStatusAgg.map((r) => [r._id, r.count]))
  const recipeTotal = recipeStatusAgg.reduce((sum, r) => sum + r.count, 0)
  const reportByStatus = Object.fromEntries(reportStatusAgg.map((r) => [r._id, r.count]))
  const modByAction = Object.fromEntries(moderationActionAgg.map((r) => [r._id, r.count]))

  const recentActions = await enrichActors(db, recentRaw)

  res.json({
    days,
    totals: {
      users: userCount,
      recipes: {
        total: recipeTotal,
        active: recipeByStatus.active || 0,
        hidden: recipeByStatus.hidden || 0,
        unpublished: recipeByStatus.unpublished || 0,
        featured: featuredCount,
      },
      reviews: reviewCount,
      reports: {
        open: reportByStatus.open || 0,
        resolved: reportByStatus.resolved || 0,
        dismissed: reportByStatus.dismissed || 0,
      },
      // Automated-moderation activity (all-time). See the audit actions
      // recipe.autohold / content.blocked and dismissed automod reports.
      moderation: {
        autoHeld: modByAction['recipe.autohold'] || 0,
        autoBlocked: modByAction['content.blocked'] || 0,
        autoFlagsDismissed: autoDismissedCount,
      },
    },
    reportsOverTime: buildDailySeries(reportsDaily, days, now),
    recipesOverTime: buildDailySeries(recipesDaily, days, now),
    usersOverTime: buildDailySeries(usersDaily, days, now),
    recentActions,
  })
}))

module.exports = router
