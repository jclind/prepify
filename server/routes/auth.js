const express = require('express')
const router = express.Router()
const { getDB } = require('../db')
const { verifyToken, requireActive } = require('../middleware/auth')

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30

// Mirrors the client-side rules in src/Components/Form/UsernameInput.tsx so the
// API can't be bypassed by calling it directly. Returns an error string, or
// null when the username is valid.
function validateUsername(username) {
  if (typeof username !== 'string' || !username) {
    return 'username is required'
  }
  if (/\s/.test(username)) {
    return 'Username cannot contain whitespace'
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`
  }
  return null
}

// GET /getUsername
// Returns the authenticated user's own username, or null if not set yet.
// Scoped to req.uid so a user can't enumerate other users' usernames by id;
// other users' usernames are surfaced through the reviews endpoints instead.
router.get('/getUsername', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const doc = await db.collection('usernames').findOne({ _id: req.uid })
    if (!doc) return res.json(null)
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
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username is required' })
    }
    const db = getDB()
    const existing = await db
      .collection('usernames')
      .findOne({ username_lower: username.toLowerCase() })
    res.json(existing === null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getMyStatus — the authenticated user's own moderation status, so the
// client can show a persistent "account suspended/banned" banner up front
// instead of only failing on a write. NOT behind requireActive: a suspended
// user must be able to read their own status.
router.get('/getMyStatus', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const doc = await db.collection('users').findOne({ _id: req.uid })
    res.json({
      status: doc?.status || 'active',
      statusReason: doc?.statusReason || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /setUsername?username=...
// Creates or updates the username for the authenticated user
router.post('/setUsername', verifyToken, requireActive, async (req, res) => {
  try {
    const { username } = req.query
    const validationError = validateUsername(username)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }
    const usernameLower = username.toLowerCase()
    const uid = req.uid
    const db = getDB()

    // Check the name isn't already taken by someone else (case-insensitive).
    const existing = await db
      .collection('usernames')
      .findOne({ username_lower: usernameLower })
    if (existing && existing._id !== uid) {
      return res.status(409).json({ error: 'Username already taken' })
    }

    try {
      await db.collection('usernames').updateOne(
        { _id: uid },
        { $set: { username, username_lower: usernameLower } },
        { upsert: true }
      )
    } catch (err) {
      // The unique index on username_lower is the source of truth: it closes
      // the race between the check above and this write, where two concurrent
      // requests could both pass the findOne.
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Username already taken' })
      }
      throw err
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
