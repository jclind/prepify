const { rateLimit } = require('express-rate-limit')

// Shared "slow down" copy for the content-write surfaces. parseLimiter
// (routes/ingredients.js) builds its own limiter from the same factory but keeps
// its own wording.
const WRITE_LIMIT_MESSAGE =
  'You’re doing that too quickly — wait a moment and try again.'

// Factory for a per-USER rate limiter. Each call returns an INDEPENDENT limiter
// with its own in-memory bucket, so mounting one instance per surface gives each
// surface its own budget (see the per-surface instances below). Keyed by
// req.uid, so each instance MUST be mounted after verifyToken. It complements —
// does not replace — the coarse global per-IP backstop in app.js: that one is
// per-IP (shared behind a NAT, evadable by rotating IPs) and can't bound a
// single account; every one of these writes also triggers a paid classifier
// call (OpenAI, plus Cloud Vision on recipe images), so write-spam directly
// burns moderation quota.
//
// Skipped under Jest, where supertest fires many requests per user in seconds;
// the dedicated writeLimiter.test.js flips NODE_ENV to exercise the real
// behaviour. Cypress E2E stays well under the cap.
//
// NOTE (multi-instance): the default store is in-memory and per-process. On a
// multi-replica deploy the effective cap is limit×replicas/min and it resets on
// restart — an acceptable abuse backstop (it still bounds a single account hard
// on any one instance), but move to a shared store (Redis) if we ever need an
// exact global cap. windowMs is a param only so the tests can exercise window
// reset with a short window; production always uses the 60s default.
function makeUserLimiter({
  limit = 30,
  windowMs = 60 * 1000,
  message = WRITE_LIMIT_MESSAGE,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.uid,
    skip: () => process.env.NODE_ENV === 'test',
    // Carry a stable `code` like every other client error (CONTENT_BLOCKED,
    // ACCOUNT_BANNED, ALREADY_REPORTED) so the FE can branch on the 429 — e.g.
    // show a dedicated "slow down" affordance — instead of string-matching the
    // message.
    message: { error: message, code: 'RATE_LIMITED' },
  })
}

// ONE limiter PER surface rather than a single shared bucket. Previously all
// content writes (recipe + review + profile) drew from ONE 30/min/user bucket,
// so a legitimate cross-surface burst — publish a recipe, fix a few reviews,
// then tweak your profile — could 429 even though no single surface was abused.
// Separate instances ⇒ separate buckets, so each surface is bounded on its own
// and normal mixed activity never trips the limit; scripted spam of any one
// surface still hits its cap at 30/min. A real user never approaches 30 writes
// to a single surface in a minute, so only abuse is affected.
const recipeWriteLimiter = makeUserLimiter()
const reviewWriteLimiter = makeUserLimiter()
const profileWriteLimiter = makeUserLimiter()

module.exports = {
  makeUserLimiter,
  recipeWriteLimiter,
  reviewWriteLimiter,
  profileWriteLimiter,
}
