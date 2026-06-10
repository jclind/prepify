const express = require('express')
const router = express.Router()
const admin = require('firebase-admin')
const { getDB } = require('../db')
const { getAccountCountsFor } = require('../util/accountCounts')
const { computeGamification } = require('../util/gamification')

const PROFILE_RECIPE_LIMIT = 12

// GET /getPublicProfile?username=
// Public (no auth) read-only view of a user's profile: identity, bio/location,
// level/rank, earned achievements, and their published recipes. Resolves the
// username to a uid via the usernames collection (404 if not found). Avatar and
// display name come from Firebase Auth via the Admin SDK; on failure we fall
// back to the username so the profile still renders.
router.get('/getPublicProfile', async (req, res) => {
  try {
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
        const r = await admin.auth().getUser(uid)
        return {
          displayName: r.displayName || usernameDoc.username,
          photoURL: r.photoURL || null,
        }
      } catch (err) {
        return { displayName: usernameDoc.username, photoURL: null }
      }
    }

    const [profile, counts, recipes, authRecord] = await Promise.all([
      db.collection('userProfiles').findOne({ _id: uid }),
      // We already resolved the username to find the uid — pass it so the counts
      // helper doesn't look it up again.
      getAccountCountsFor(db, uid, usernameDoc.username),
      db
        .collection('recipes')
        .find({ userId: uid })
        .sort({ createdAt: -1 })
        .limit(PROFILE_RECIPE_LIMIT)
        .toArray(),
      fetchAuthRecord(),
    ])

    const gamification = computeGamification(counts, [])
    const earnedAchievements = gamification.achievements.filter(a => a.earned)

    res.json({
      username: usernameDoc.username,
      displayName: authRecord.displayName,
      photoURL: authRecord.photoURL,
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      level: gamification.level,
      rank: gamification.rank,
      xp: gamification.xp,
      xpNext: gamification.xpNext,
      pct: gamification.pct,
      achievements: earnedAchievements,
      recipes,
      recipesTotalCount: counts.recipes,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
