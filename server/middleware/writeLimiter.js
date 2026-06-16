const { rateLimit } = require('express-rate-limit')

// Per-USER limiter shared across the moderated content-write routes (recipe,
// review, profile, username, displayName, photo). It complements — does not
// replace — the coarse global per-IP backstop in app.js:
//   - The global limit is per-IP, so it's shared across everyone behind one NAT
//     and evadable by rotating IPs; it can't bound a single account.
//   - Every one of these writes now triggers a paid classifier call (OpenAI, plus
//     Cloud Vision on recipe images), so write-spam directly burns moderation
//     quota. This is the same reason /api/ingredients/parse got a per-user cap —
//     the moderated writes need the equivalent.
//
// ONE shared instance ⇒ one bucket per user across ALL these endpoints (e.g. a
// user can't dodge it by spreading 30 writes across recipes + reviews + profile).
// Keyed by req.uid, so it MUST be mounted after verifyToken. The window is sized
// well above any plausible human cadence — a real user never approaches 30 content
// writes in a minute — so only scripted abuse hits it. Skipped under Jest, where
// supertest fires many requests from one user in seconds (same as the global
// limiter); Cypress E2E stays well under the cap.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.uid,
  skip: () => process.env.NODE_ENV === 'test',
  // Carry a stable `code` like every other client error (CONTENT_BLOCKED,
  // ACCOUNT_BANNED, ALREADY_REPORTED) so the FE can branch on the 429 — e.g. show
  // a dedicated "slow down" affordance — instead of string-matching the message.
  message: { error: 'You’re doing that too quickly — wait a moment and try again.', code: 'RATE_LIMITED' },
})

module.exports = { writeLimiter }
