// Shared 500 responder. Logs the real error (with route context) server-side
// and returns a generic message to the client, so infrastructure failures —
// e.g. a Mongo `connect ECONNREFUSED <internal-host>` — never leak internal
// details to callers. Use in every route catch block instead of echoing
// err.message. See docs/SECURITY_AUDIT_2026-06-11.md §4 item 2.
function respondServerError(res, err, req) {
  const where = req ? `${req.method} ${req.originalUrl}` : 'server'
  console.error(`[500] ${where}`, err)
  return res.status(500).json({ error: 'Internal server error' })
}

module.exports = { respondServerError }
