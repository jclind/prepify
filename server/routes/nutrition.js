const { Router } = require('express')
const { verifyToken } = require('../middleware/auth')
const { makeUserLimiter } = require('../middleware/writeLimiter')
const { GENERIC_500_MESSAGE } = require('../util/respondServerError')

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

router.post('/details', verifyToken, nutritionLimiter, async (req, res) => {
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
    return res.status(500).json({ error: GENERIC_500_MESSAGE })
  }
})

module.exports = router
