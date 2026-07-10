const express = require('express')
const { asyncHandler } = require('../util/asyncHandler')
const router = express.Router()
const { getAuth } = require('firebase-admin/auth')
const { getDB } = require('../db')
const { getAccountCountsFor } = require('../util/accountCounts')
const { computeGamification } = require('../util/gamification')
const { RECIPE_VISIBLE } = require('../util/moderation')
const { publicRecipeCardProjection } = require('../util/recipeFields')

const PROFILE_RECIPE_LIMIT = 12

// GET /getPublicProfile?username=
// Public (no auth) read-only view of a user's profile: identity, bio/location,
// level/rank, earned achievements, and their published recipes. Resolves the
// username to a uid via the usernames collection (404 if not found). Avatar and
// display name come from Firebase Auth via the Admin SDK; on failure we fall
// back to the username so the profile still renders.
router.get('/getPublicProfile', asyncHandler(async (req, res) => {
  const { username } = req.query
  if (!username) {
    return res.status(400).json({ error: 'username is required' })
  }

  const db = getDB()
  const usernameDoc = await db
    .collection('usernames')
    .findOne({ username_lower: String(username).toLowerCase() })
  if (!usernameDoc) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  const uid = usernameDoc._id

  // Avatar + display name live in Firebase Auth; fetch via the Admin SDK in
  // parallel with the DB reads. On failure fall back to the username so the
  // profile still renders (deleted user / transient error).
  const fetchAuthRecord = async () => {
    try {
      const r = await getAuth().getUser(uid)
      return {
        displayName: r.displayName || usernameDoc.username,
        photoURL: r.photoURL || null,
      }
    } catch (err) {
      return { displayName: usernameDoc.username, photoURL: null }
    }
  }

  const [profile, counts, recipeStats, recipes, authRecord] = await Promise.all([
    db.collection('userProfiles').findOne({ _id: uid }),
    getAccountCountsFor(db, uid),
    // One aggregate over the publicly-visible recipes drives the header stats:
    // the total count plus cross-recipe sums of saves/made. Counting only
    // visible recipes keeps the totals honest and avoids leaking the existence
    // of held/hidden recipes (getAccountCountsFor is unfiltered — correct for
    // the owner's own account page, but it would inflate these public totals).
    db
      .collection('recipes')
      .aggregate([
        { $match: { userId: uid, ...RECIPE_VISIBLE } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            saves: { $sum: '$numTimesSaved' },
            made: { $sum: '$numTimesMade' },
          },
        },
      ])
      .toArray(),
    db
      // Public surface: exclude hidden / unpublished / pending_review recipes so
      // a held or taken-down recipe never appears on someone's public profile.
      .collection('recipes')
      .find({ userId: uid, ...RECIPE_VISIBLE })
      // Card projection: a profile card renders image/title/rating/time/price/
      // saves only, so don't ship the author's uid or internal fields it never reads.
      .project(publicRecipeCardProjection)
      // _id tiebreaker keeps ordering deterministic and aligned with the paged
      // /getPublicProfileRecipes endpoint (same sort) across the page boundary.
      .sort({ createdAt: -1, _id: 1 })
      .limit(PROFILE_RECIPE_LIMIT)
      .toArray(),
    fetchAuthRecord(),
  ])
  const stats = recipeStats[0] ?? { count: 0, saves: 0, made: 0 }

  // Privacy gate. A profile the user has switched to private reads as
  // not-found (404) — the same response as a username that was never taken — so
  // the existence of the account isn't leaked. hideLocation keeps the rest of
  // the profile public but strips the location.
  if (profile?.isPublic === false) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  const location = profile?.hideLocation ? '' : profile?.location ?? ''

  const gamification = computeGamification(counts, [])
  const earnedAchievements = gamification.achievements.filter(a => a.earned)

  res.json({
    username: usernameDoc.username,
    displayName: authRecord.displayName,
    photoURL: authRecord.photoURL,
    bio: profile?.bio ?? '',
    location,
    level: gamification.level,
    rank: gamification.rank,
    xp: gamification.xp,
    xpNext: gamification.xpNext,
    pct: gamification.pct,
    achievements: earnedAchievements,
    recipes,
    recipesTotalCount: stats.count,
    recipesSavesTotal: stats.saves,
    recipesMadeTotal: stats.made,
  })
}))

// GET /getPublicProfileRecipes?username=&page=&recipesPerPage=
// Lightweight, paginated companion to /getPublicProfile: returns just the next
// page of a user's publicly-visible recipes (+ the full total) so the profile
// page can "load more" without re-fetching the whole profile/gamification
// payload. Same visibility filter and privacy gate as the profile endpoint (a
// private profile reads as not-found so its recipes can't be paged either). The
// default page size matches the profile's initial batch so page 1 picks up
// exactly where the profile payload left off.
router.get('/getPublicProfileRecipes', asyncHandler(async (req, res) => {
  const { username } = req.query
  if (!username) {
    return res.status(400).json({ error: 'username is required' })
  }

  const db = getDB()
  const usernameDoc = await db
    .collection('usernames')
    .findOne({ username_lower: String(username).toLowerCase() })
  if (!usernameDoc) {
    return res.status(404).json({ error: 'Profile not found' })
  }
  const uid = usernameDoc._id

  // Privacy gate — mirror /getPublicProfile so a private profile can't be paged.
  const profile = await db.collection('userProfiles').findOne({ _id: uid })
  if (profile?.isPublic === false) {
    return res.status(404).json({ error: 'Profile not found' })
  }

  // Floor at 0 so a negative ?page never produces a negative .skip() (which
  // MongoDB rejects, surfacing as a 500 instead of a clean first page).
  const pageNum = Math.max(0, parseInt(req.query.page) || 0)
  // Clamp to [1, PROFILE_RECIPE_LIMIT] so a client can't request an oversized
  // page, and — like pageNum above — so a negative recipesPerPage never yields a
  // negative .skip() (which MongoDB rejects as a 500). The upper Math.min alone
  // let a negative value through.
  const perPage = Math.min(
    Math.max(1, parseInt(req.query.recipesPerPage) || PROFILE_RECIPE_LIMIT),
    PROFILE_RECIPE_LIMIT
  )

  const filter = { userId: uid, ...RECIPE_VISIBLE }
  const [recipes, totalCount] = await Promise.all([
    db
      .collection('recipes')
      .find(filter)
      // Card projection — see /getPublicProfile above: no author uid / internal fields.
      .project(publicRecipeCardProjection)
      // _id tiebreaker matches /getPublicProfile's sort so paging stays aligned
      // (no skipped/duplicated recipe when two share a createdAt at a boundary).
      .sort({ createdAt: -1, _id: 1 })
      .skip(pageNum * perPage)
      .limit(perPage)
      .toArray(),
    db.collection('recipes').countDocuments(filter),
  ])

  res.json({ recipes, totalCount })
}))

module.exports = router
