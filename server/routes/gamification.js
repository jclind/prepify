const express = require('express')
const router = express.Router()
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')
const { getAccountCountsFor } = require('../util/accountCounts')
const { computeGamification, ACHIEVEMENTS } = require('../util/gamification')

const VALID_ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map(a => a.id))

// GET /getGamification
// The authenticated user's level, rank, XP progress, and achievements, all
// derived from their account counts. `newlyUnlocked` lists achievements that
// are earned but not yet acknowledged, so the client can fire the unlock toast.
// Read-only — acknowledging is a separate POST so the toast isn't silently
// consumed if it never gets shown.
router.get('/getGamification', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const [counts, profile] = await Promise.all([
      getAccountCountsFor(db, req.uid),
      db.collection('userProfiles').findOne({ _id: req.uid }),
    ])
    const seen = profile?.seenAchievements ?? []
    res.json(computeGamification(counts, seen))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /acknowledgeAchievements
// Records that the given achievement ids have been shown to the user, so the
// unlock toast won't fire again. Body: { ids: string[] }. Unknown ids are
// ignored; $addToSet makes it idempotent.
router.post('/acknowledgeAchievements', verifyToken, async (req, res) => {
  try {
    const { ids } = req.body || {}
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' })
    }
    const cleanIds = ids.filter(id => VALID_ACHIEVEMENT_IDS.has(id))
    if (cleanIds.length > 0) {
      await getDB()
        .collection('userProfiles')
        .updateOne(
          { _id: req.uid },
          { $addToSet: { seenAchievements: { $each: cleanIds } } },
          { upsert: true }
        )
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
