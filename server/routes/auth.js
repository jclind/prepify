const express = require('express')
const router = express.Router()
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30

const BIO_MAX_LENGTH = 300
const LOCATION_MAX_LENGTH = 80

// Validates the optional profile fields. bio/location are both optional and may
// be empty (an empty string clears the field). Length is checked against the
// trimmed value so trailing whitespace can't be used to exceed the limit.
// Returns an error string, or null when valid.
function validateProfile(bio, location) {
  if (bio != null && typeof bio !== 'string') {
    return 'bio must be a string'
  }
  if (location != null && typeof location !== 'string') {
    return 'location must be a string'
  }
  if (typeof bio === 'string' && bio.trim().length > BIO_MAX_LENGTH) {
    return `bio must be at most ${BIO_MAX_LENGTH} characters`
  }
  if (
    typeof location === 'string' &&
    location.trim().length > LOCATION_MAX_LENGTH
  ) {
    return `location must be at most ${LOCATION_MAX_LENGTH} characters`
  }
  return null
}

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
    if (!username) return res.status(400).json({ error: 'username is required' })
    const db = getDB()
    const existing = await db
      .collection('usernames')
      .findOne({ username_lower: username.toLowerCase() })
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

// GET /getProfile
// Returns the authenticated user's own profile fields (bio + location), or
// empty strings when nothing has been saved yet. Scoped to req.uid like
// /getUsername so a user only ever reads their own profile.
router.get('/getProfile', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const doc = await db.collection('userProfiles').findOne({ _id: req.uid })
    res.json({ bio: doc?.bio ?? '', location: doc?.location ?? '' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /updateProfile
// Upserts the authenticated user's bio + location. Empty strings are allowed
// and clear the field. Values are trimmed before storage.
router.post('/updateProfile', verifyToken, async (req, res) => {
  try {
    const { bio, location } = req.body || {}
    const validationError = validateProfile(bio, location)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }
    const db = getDB()
    await db.collection('userProfiles').updateOne(
      { _id: req.uid },
      {
        $set: {
          bio: typeof bio === 'string' ? bio.trim() : '',
          location: typeof location === 'string' ? location.trim() : '',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
