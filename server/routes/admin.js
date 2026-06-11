const { Router } = require('express')
const admin = require('firebase-admin')
const { getDB } = require('../db')
const { verifyToken, requireAdmin } = require('../middleware/auth')
const { USER_STATUSES } = require('../util/userStatus')

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
      .aggregate([
        { $match: { username: { $in: usernames } } },
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

    res.json({ uid, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
