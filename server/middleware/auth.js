const admin = require('firebase-admin')
const { getDB } = require('../db')
const { isBlocked } = require('../util/userStatus')

// Initialize once — guard against double init
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.uid = decoded.uid
    // Admin identity rides the existing token via a custom claim — no per-request
    // DB lookup. Stashed here so owner-only write routes can offer an admin bypass
    // without decoding the token a second time.
    req.isAdmin = decoded.admin === true
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Soft auth for otherwise-public routes that want to behave differently for an
// admin (e.g. let an admin still load a hidden/unpublished recipe). Sets req.uid
// / req.isAdmin when a valid token is present, but NEVER rejects — an anonymous
// or bad-token request just continues with req.isAdmin undefined.
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1])
      req.uid = decoded.uid
      req.isAdmin = decoded.admin === true
    } catch (err) {
      // Ignore — treat as anonymous.
    }
  }
  next()
}

// Gate for admin-only routes. Must run after verifyToken (relies on req.isAdmin).
function requireAdmin(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Gate for write routes that a suspended/banned user must not perform. Runs
// after verifyToken (relies on req.uid). Reads the `users` status record — a
// single indexed findOne by _id; only applied to mutations, never reads. An
// account with no record (every legacy user) is 'active' and passes through.
// The 403 carries a machine code + reason so the client can show a clear
// message instead of a generic error.
async function requireActive(req, res, next) {
  try {
    const doc = await getDB().collection('users').findOne({ _id: req.uid })
    const status = doc?.status || 'active'
    if (isBlocked(status)) {
      return res.status(403).json({
        error:
          status === 'banned'
            ? 'Your account has been banned.'
            : 'Your account is suspended.',
        code: status === 'banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
        reason: doc?.statusReason || null,
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

module.exports = { verifyToken, optionalAuth, requireAdmin, requireActive }
