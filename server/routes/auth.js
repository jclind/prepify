const express = require('express')
const router = express.Router()
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

// GET /getUsername?userId=...
// Returns the username for a given uid
router.get('/getUsername', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId || userId === 'null') {
      return res.status(400).json({ error: 'userId is required' })
    }
    const db = getDB()
    const doc = await db.collection('usernames').findOne({ _id: userId })
    if (!doc) return res.status(404).json({ error: 'User not found' })
    res.json(doc.username)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /checkUsernameAvailability?username=...
// Returns true if username is available, false if taken
router.get('/checkUsernameAvailability', async (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.status(400).json({ error: 'username is required' })
    const db = getDB()
    const existing = await db.collection('usernames').findOne({ username })
    res.json(existing === null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /setUsername?username=...
// Creates or updates the username for the authenticated user
router.post('/setUsername', verifyToken, async (req, res) => {
  try {
    const { username } = req.query
    if (!username) {
      return res.status(400).json({ error: 'username is required' })
    }
    const uid = req.uid
    const db = getDB()

    // Check username is not already taken by someone else
    const existing = await db.collection('usernames').findOne({ username })
    if (existing && existing._id !== uid) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    await db.collection('usernames').updateOne(
      { _id: uid },
      { $set: { username } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
