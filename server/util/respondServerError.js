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

// Sentry is a safe no-op without SENTRY_DSN (instrument.js skips init), so this
// require is free in dev/CI/tests.
const Sentry = require('@sentry/node')

// REPORTS TO SENTRY. It didn't until 2026-08-24, and that was a real blind spot:
// the Sentry capture lived ONLY in the app.js backstop, which sees errors
// forwarded via next(err). Every caller of this function returns its own 500 and
// never forwards, so those faults reached the client and the Railway log but were
// invisible to error monitoring. Confirmed against prod logs — an ingredient
// enrichment 500 was served to a user with no corresponding Sentry event.
// Capture never blocks or changes the client-facing response.
function respondServerError(res, err, req) {
  const where = req ? `${req.method} ${req.originalUrl}` : 'server'
  console.error(`[500] ${where}`, err)
  Sentry.captureException(err)
  return res.status(500).json({ error: GENERIC_500_MESSAGE })
}

module.exports = { respondServerError, GENERIC_500_MESSAGE }
