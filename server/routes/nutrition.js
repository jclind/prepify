const { Router } = require('express')
const Sentry = require('@sentry/node')
const { verifyToken, requireActive } = require('../middleware/auth')
const { makeUserLimiter } = require('../middleware/writeLimiter')
const { makePaidQuotaLimiter } = require('../util/paidQuota')
const { GENERIC_500_MESSAGE } = require('../util/respondServerError')
const { asyncHandler } = require('../util/asyncHandler')
const { MAX_INGREDIENTS } = require('../util/recipeLimits')

const router = Router()

const EDAMAM_URL = 'https://api.edamam.com/api/nutrition-details'

// Edamam's nutrition-details call spends paid quota and its app id/key must stay
// server-side — they used to ship in the client bundle as VITE_EDAMAM_APP_ID/KEY,
// which is publicly readable. This proxy lets the keys live only in server env.
// Own tight per-user bucket, mirroring /api/ingredients/parse: keyed by req.uid
// (set by verifyToken, which runs first), not IP, so shared NATs don't collide,
// and skipped under Jest along with the global limiter (see app.js).
const nutritionLimiter = makeUserLimiter({
  message: 'Too many nutrition lookups — wait a minute and try again.',
})

// Daily spend ceiling on the paid Edamam surface (audit H1) — a per-account and a
// global daily cap on top of the per-minute limiter, so a Sybil swarm of fresh
// accounts can't drain the nutrition budget across the day. Caps are overridable
// via PAID_QUOTA_NUTRITION_USER_DAILY / PAID_QUOTA_NUTRITION_GLOBAL_DAILY. A real
// user hits nutrition once per recipe save, so 150/account/day is far above human
// use while still bounding a single rogue account hard.
const nutritionQuota = makePaidQuotaLimiter({
  surface: 'nutrition',
  perUserDaily: 150,
  globalDaily: 6000,
  message: 'Daily nutrition-lookup limit reached — please try again tomorrow.',
})

// requireActive sits between verifyToken and the limiter (the house write-surface
// order, mirroring /api/ingredients/parse) so a just-suspended/banned account —
// whose ID token stays valid for up to ~1h — can't keep burning paid Edamam
// quota through this proxy (audit L1).
router.post('/details', verifyToken, requireActive, nutritionLimiter, nutritionQuota, asyncHandler(async (req, res) => {
  const { ingr, title } = req.body
  if (
    !Array.isArray(ingr) ||
    ingr.length === 0 ||
    !ingr.every(i => typeof i === 'string')
  ) {
    return res
      .status(400)
      .json({ error: 'ingr must be a non-empty array of strings' })
  }
  // Bound the array length (audit H1 rollup): a recipe can't exceed MAX_INGREDIENTS
  // rows, so a payload larger than that is either malformed or an attempt to make
  // one paid Edamam call do the work of many. The 100 kb body limit alone let
  // thousands of short strings through.
  if (ingr.length > MAX_INGREDIENTS) {
    return res
      .status(400)
      .json({ error: `ingr cannot contain more than ${MAX_INGREDIENTS} items` })
  }

  const appId = process.env.EDAMAM_APP_ID
  const appKey = process.env.EDAMAM_APP_KEY
  if (!appId || !appKey) {
    // Misconfiguration (keys absent). The client soft-fails nutrition to null on
    // any non-2xx, so degrade gracefully rather than blocking the recipe save.
    console.error('[nutrition/details] EDAMAM_APP_ID/EDAMAM_APP_KEY not configured')
    return res.status(503).json({ error: 'Nutrition service unavailable' })
  }

  try {
    const url = `${EDAMAM_URL}?app_id=${encodeURIComponent(
      appId
    )}&app_key=${encodeURIComponent(appKey)}`
    // Bound the upstream call. Unlike the old client-side lookup (a hung request
    // was the browser's problem), this now runs inside the Express handler on
    // every save — without a timeout a slow/hung Edamam endpoint would hold the
    // handler (and a rate-limiter slot) for undici's multi-minute default. On
    // timeout the AbortError lands in the catch below → 500 → client soft-fails
    // to null, same as any other lookup failure. 10s comfortably covers a normal
    // nutrition-details response (typically 1–3s).
    const edamamRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Edamam requires a title; the client never used a real one.
        title: typeof title === 'string' && title ? title : 'recipe 1',
        ingr,
      }),
      signal: AbortSignal.timeout(10000),
    })

    // Edamam answers 404/555 when it can't compute nutrition for the given
    // ingredients — an expected outcome, not a server fault. Treat any non-2xx
    // as a soft failure: respond 200 with null so the client's existing
    // null-guard keeps the recipe save working without nutrition data, and the
    // http-common 5xx→Sentry reporter isn't tripped by routine "no data" cases.
    if (!edamamRes.ok) {
      console.warn('[nutrition/details] Edamam returned', edamamRes.status)
      return res.json(null)
    }

    const data = await edamamRes.json()
    return res.json(data)
  } catch (err) {
    // Network/parse failure reaching Edamam. 500 → the client catch soft-fails
    // to null too; the real error is logged here, never echoed to the client.
    console.error(
      '[nutrition/details] lookup failed',
      err && err.message,
      err && err.stack
    )
    // Report to Sentry. This route returns its own 500 rather than forwarding
    // via next(err), so the app.js backstop never sees it — without this the
    // fault reaches the user and the Railway log but not error monitoring.
    // Proven blind in the 2026-08 prod logs. Capture can't change the response.
    Sentry.captureException(err)
    return res.status(500).json({ error: GENERIC_500_MESSAGE })
  }
}))

module.exports = router
