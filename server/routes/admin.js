const { Router } = require('express')
const admin = require('firebase-admin')
const { getDB } = require('../db')
const { verifyToken, requireAdmin } = require('../middleware/auth')
const { USER_STATUSES } = require('../util/userStatus')
const { recordAudit, AUDIT_ACTIONS, AUDIT_TARGET_TYPES } = require('../util/auditLog')

const router = Router()

const DEFAULT_PER_PAGE = 25
const MAX_PER_PAGE = 50
const MAX_REASON_LEN = 500

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
router.get('/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /admin/users/:uid — single-user detail (adds email + recent content).
router.get('/admin/users/:uid', verifyToken, requireAdmin, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/users/:uid/status — set an account's moderation status.
// Guards: an admin can't change their own status, and can't suspend/ban another
// admin. Status is stored in the `users` collection (upserted), the single
// source of truth read by requireActive.
router.patch('/admin/users/:uid/status', verifyToken, requireAdmin, async (req, res) => {
  try {
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

    res.json({ uid, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /admin/audit?action=&targetType=&actorUid=&page=&perPage= — the moderation
// audit trail, newest first. Each row is enriched with the actor's username so
// the page can show "@admin did X" without a per-row lookup.
router.get('/admin/audit', verifyToken, requireAdmin, async (req, res) => {
  try {
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
    const actorUids = [...new Set(entries.map((e) => e.actorUid).filter(Boolean))]
    const actorDocs = actorUids.length
      ? await db.collection('usernames').find({ _id: { $in: actorUids } }).toArray()
      : []
    const actorByUid = Object.fromEntries(actorDocs.map((d) => [d._id, d.username]))

    const enriched = entries.map((e) => ({
      ...e,
      actorUsername: actorByUid[e.actorUid] || null,
    }))

    res.json({ entries: enriched, totalCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
