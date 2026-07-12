// Wraps an async Express route handler so a rejected promise is forwarded to
// the central error-handling middleware (the backstop in app.js) via next(err),
// instead of every handler repeating the same try/catch + respondServerError.
// The backstop logs the real error and returns a generic body, so wrapped
// handlers can `throw`/reject freely and still never leak internals.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

module.exports = { asyncHandler }
