// Shared 500 responder. Logs the real error (with route context) server-side
// and returns a generic message to the client, so infrastructure failures —
// e.g. a Mongo `connect ECONNREFUSED <internal-host>` — never leak internal
// details to callers. Use in every route catch block instead of echoing
// err.message. See docs/SECURITY_AUDIT_2026-06-11.md §4 item 2.

// The one generic client-facing 500 body. Exported so every site that emits a
// generic 500 (the app.js error backstop, `requireActive` in middleware/auth.js,
// ingredients.js with its own richer logging) shares one literal. Route handlers
// reach this body indirectly: util/asyncHandler forwards their rejections to the
// backstop, so they no longer call respondServerError directly.
const GENERIC_500_MESSAGE = 'Internal server error'

function respondServerError(res, err, req) {
  const where = req ? `${req.method} ${req.originalUrl}` : 'server'
  console.error(`[500] ${where}`, err)
  return res.status(500).json({ error: GENERIC_500_MESSAGE })
}

module.exports = { respondServerError, GENERIC_500_MESSAGE }
