const express = require('express')
const admin = require('firebase-admin')
const { asyncHandler } = require('../util/asyncHandler')
const router = express.Router()
const { getDB } = require('../db')
const { verifyToken, requireActive } = require('../middleware/auth')
const { recordAudit } = require('../util/auditLog')

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

// Validates the two privacy toggles. Both are required booleans — the client
// always sends the current state of each switch. Returns an error string, or
// null when valid.
function validatePrivacy(isPublic, hideLocation) {
  if (typeof isPublic !== 'boolean') {
    return 'isPublic must be a boolean'
  }
  if (typeof hideLocation !== 'boolean') {
    return 'hideLocation must be a boolean'
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
router.get('/getUsername', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const doc = await db.collection('usernames').findOne({ _id: req.uid })
  if (!doc) return res.json(null)
  res.json(doc.username)
}))

// GET /checkUsernameAvailability?username=...
// Returns true if username is available, false if taken
router.get('/checkUsernameAvailability', asyncHandler(async (req, res) => {
  const { username } = req.query
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' })
  }
  const db = getDB()
  const existing = await db
    .collection('usernames')
    .findOne({ username_lower: username.toLowerCase() })
  res.json(existing === null)
}))

// GET /getMyStatus — the authenticated user's own moderation status, so the
// client can show a persistent "account suspended/banned" banner up front
// instead of only failing on a write. NOT behind requireActive: a suspended
// user must be able to read their own status.
router.get('/getMyStatus', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const doc = await db.collection('users').findOne({ _id: req.uid })
  res.json({
    status: doc?.status || 'active',
    statusReason: doc?.statusReason || null,
  })
}))

// POST /setUsername?username=...
// Creates or updates the username for the authenticated user
router.post('/setUsername', verifyToken, requireActive, asyncHandler(async (req, res) => {
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

  // The user's current handle, captured before the write so we can propagate a
  // rename to the places that denormalize the username (see below).
  const prevDoc = await db.collection('usernames').findOne({ _id: uid })
  const prevUsername = prevDoc?.username || null

  try {
    await db.collection('usernames').updateOne(
      { _id: uid },
      {
        $set: { username, username_lower: usernameLower },
        // Stamp the account's first-seen time once, so admin analytics can
        // chart signups over time. Legacy docs created before this won't have
        // it (and are excluded from the signup series) — see GET /admin/analytics.
        $setOnInsert: { createdAt: new Date() },
      },
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

  // Ratings (which carry the reviews) and review reports denormalize the
  // username — their documents are keyed by it, not by uid — so a rename has to
  // be carried across or a user's existing reviews keep the old handle and
  // detach from their profile + the moderation queue. New name is guaranteed
  // free (checked above), so there's no collision with another user's rows.
  if (prevUsername && prevUsername !== username) {
    await db
      .collection('ratings')
      .updateMany({ username: prevUsername }, { $set: { username } })
    await db
      .collection('reports')
      .updateMany(
        { reportedUsername: prevUsername },
        { $set: { reportedUsername: username } }
      )
  }

  res.json({ success: true })
}))

// GET /getProfile
// Returns the authenticated user's own profile fields (bio + location), or
// empty strings when nothing has been saved yet. Scoped to req.uid like
// /getUsername so a user only ever reads their own profile.
router.get('/getProfile', verifyToken, asyncHandler(async (req, res) => {
  const db = getDB()
  const doc = await db.collection('userProfiles').findOne({ _id: req.uid })
  res.json({
    bio: doc?.bio ?? '',
    location: doc?.location ?? '',
    // Privacy toggles default to "public, location shown" when the fields are
    // absent, so every pre-existing profile stays visible exactly as before.
    isPublic: doc?.isPublic ?? true,
    hideLocation: doc?.hideLocation ?? false,
  })
}))

// POST /updateProfile
// Upserts the authenticated user's bio + location. Empty strings are allowed
// and clear the field. Values are trimmed before storage.
router.post('/updateProfile', verifyToken, requireActive, asyncHandler(async (req, res) => {
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
}))

// POST /updatePrivacy
// Upserts the authenticated user's privacy toggles (public-profile +
// hide-location). These gate the public /u/:username view served by
// GET /getPublicProfile.
router.post('/updatePrivacy', verifyToken, requireActive, asyncHandler(async (req, res) => {
  const { isPublic, hideLocation } = req.body || {}
  const validationError = validatePrivacy(isPublic, hideLocation)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }
  const db = getDB()
  await db.collection('userProfiles').updateOne(
    { _id: req.uid },
    { $set: { isPublic, hideLocation, updatedAt: new Date() } },
    { upsert: true }
  )
  res.json({ success: true })
}))

// GET /exportMyData
// Assembles a JSON copy of everything stored for the authenticated user and
// returns it as a file download. Read-only. Everything keys on the stable uid
// (ratings carry `userId` since D1); the username is still surfaced as a
// top-level display field.
router.get('/exportMyData', verifyToken, asyncHandler(async (req, res) => {
  const uid = req.uid
  const db = getDB()
  const usernameDoc = await db.collection('usernames').findOne({ _id: uid })
  const username = usernameDoc?.username || null

  const [profile, userRecipeData, recipes, drafts, ratings] = await Promise.all([
    db.collection('userProfiles').findOne({ _id: uid }),
    db.collection('userRecipeData').findOne({ _id: uid }),
    db.collection('recipes').find({ userId: uid }).toArray(),
    db.collection('recipeDrafts').find({ userId: uid }).toArray(),
    db.collection('ratings').find({ userId: uid }).toArray(),
  ])

  const data = {
    exportedAt: new Date().toISOString(),
    username,
    profile: profile
      ? {
          bio: profile.bio ?? '',
          location: profile.location ?? '',
          isPublic: profile.isPublic ?? true,
          hideLocation: profile.hideLocation ?? false,
        }
      : null,
    savedRecipes: userRecipeData?.savedRecipes ?? [],
    recipes,
    drafts,
    ratings,
  }

  res.setHeader(
    'Content-Disposition',
    'attachment; filename="prepify-data.json"'
  )
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(data, null, 2))
}))

// POST /deleteAccount
// Permanently deletes the authenticated user and all of their data. Removes the
// Mongo records first (across every collection that keys on the user) and the
// Firebase Auth account last, so a partial failure leaves the auth account — and
// therefore a way back in to retry — intact rather than orphaning data behind a
// deleted login.
// Intentionally NOT behind requireActive (unlike updateProfile/updatePrivacy): a
// suspended or banned user must still be able to delete their account and export
// their data — those are the two writes a moderated user is always allowed.
router.post('/deleteAccount', verifyToken, asyncHandler(async (req, res) => {
  const uid = req.uid
  const db = getDB()

  // The username is only needed for the audit label now — every collection
  // below keys on the stable uid (ratings carry `userId` since D1).
  const usernameDoc = await db.collection('usernames').findOne({ _id: uid })
  const username = usernameDoc?.username || null

  await db.collection('usernames').deleteOne({ _id: uid })
  await db.collection('userProfiles').deleteOne({ _id: uid })
  await db.collection('users').deleteOne({ _id: uid })
  await db.collection('userRecipeData').deleteOne({ _id: uid })
  await db.collection('recipes').deleteMany({ userId: uid })
  await db.collection('recipeDrafts').deleteMany({ userId: uid })
  await db.collection('ratings').deleteMany({ userId: uid })

  // Leave a trail in the audit log (best-effort) so an admin can see that the
  // account was self-deleted rather than removed by moderation.
  await recordAudit(db, {
    action: 'user.delete',
    actorUid: uid,
    targetType: 'user',
    targetId: uid,
    targetLabel: username ? `@${username}` : null,
  })

  await admin.auth().deleteUser(uid)

  res.json({ success: true })
}))

module.exports = router
