const { Router } = require('express')
const { ingredientParser } = require('@jclind/ingredient-parser')
const { verifyToken } = require('../middleware/auth')
const { makeUserLimiter } = require('../middleware/writeLimiter')
const { GENERIC_500_MESSAGE } = require('../util/respondServerError')
const { asyncHandler } = require('../util/asyncHandler')
const { getDB } = require('../db')

const router = Router()

// Per-ingredient price above which an *enriched* row is almost certainly a bad
// proxy gram-estimate rather than a real cost — a single home-recipe ingredient
// rarely exceeds this (a pound of premium meat/seafood tops out ~$12–15). Above
// it we record a `price_outlier` telemetry event for admin review. FLAG ONLY:
// the stored price is left untouched (clamping would mangle a legitimately
// expensive row like a pound of saffron). Surfaced by N1's "$10 parfait"
// investigation, where `1 cup strawberries` enriched to $25.34. Tune here.
const PRICE_OUTLIER_CENTS = 1500

// Normalize an ingredient string into a stable telemetry key: lowercase, drop a
// trailing comma-clause ("…strawberries, fresh or frozen" → "…strawberries"),
// collapse internal whitespace, trim, and cap length so a pathological input
// can't mint a huge _id. Quantity/unit are kept (they drive the price, so a
// per-quantity key is what a price_outlier wants).
function normalizeIngredientKey(str) {
  return String(str)
    .toLowerCase()
    .split(',')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

// Best-effort enrichment-quality telemetry. Upserts a per-(type, key) counter
// into `ingredientMisses` so admins can see which strings miss enrichment
// (`miss`) and which enrich to implausible prices (`price_outlier`) — the N6
// telemetry surface, with N1's price guard folded in as a second event type.
// Wrapped so a telemetry/DB failure NEVER affects the parse response (the route
// soft-fails on its own); the write is awaited only so it's deterministic under
// test — errors are swallowed here, so awaiting can't reject the handler.
async function recordIngredientTelemetry(type, ingredientString, extra = {}) {
  try {
    const normalized = normalizeIngredientKey(ingredientString)
    if (!normalized) return
    const now = new Date()
    await getDB()
      .collection('ingredientMisses')
      .updateOne(
        { _id: `${type}:${normalized}` },
        {
          $set: { type, normalized, raw: ingredientString, lastSeen: now, ...extra },
          $inc: { count: 1 },
          $setOnInsert: { firstSeen: now },
        },
        { upsert: true }
      )
  } catch (err) {
    console.error(
      '[ingredients/parse] telemetry write failed',
      JSON.stringify({ type, message: err && err.message })
    )
  }
}

// Every call can spend paid Spoonacular quota (via the parser's proxy), so this
// route gets its own tight per-user limit — an independent bucket from the
// content-write limiters (see middleware/writeLimiter), keyed by req.uid (set by
// verifyToken, which runs first), not IP, so shared NATs don't collide. 30/min
// comfortably covers the add-recipe flow — one parse per ingredient added, max
// 50 per recipe. Skipped under Jest along with the global limiter (see app.js).
const parseLimiter = makeUserLimiter({
  message: 'Too many ingredient lookups — wait a minute and try again.',
})

// Spoonacular migrated CDNs: the old spoonacular.com/cdn host now 301-redirects;
// img.spoonacular.com serves the image directly. The parser's buildImageUrl
// still constructs the old host (node_modules/@jclind/ingredient-parser/dist/
// cjs/enrich/spoonacular.js), so rewrite to the live host here, at the funnel,
// before the response leaves the server.
function rewriteImageHost(url) {
  if (typeof url !== 'string') return url
  return url.replace(
    'https://spoonacular.com/cdn/ingredients_',
    'https://img.spoonacular.com/ingredients_'
  )
}

// Project the v2 `IngredientData` onto Prepify's stable, persisted shape. Keeping
// the field names the app reads (`totalPriceUSACents`, `imagePath`) means every
// downstream consumer and every already-saved recipe document stays valid — the
// v2 renames (`price.cents`, `image`) are absorbed entirely at this boundary.
// Price/image are omitted when absent so the UI shows its soft-fail state ('—' /
// basket icon) instead of a misleading "$0.00" / broken thumbnail. Cents are
// rounded to whole cents to match v1's integer-cent convention (v2 prices are
// gram-estimated floats).
function mapIngredientData(data) {
  if (!data) return null
  const out = { name: data.name }
  if (data.image) out.imagePath = rewriteImageHost(data.image)
  if (data.price && typeof data.price.cents === 'number') {
    out.totalPriceUSACents = Math.round(data.price.cents)
  }
  if (Array.isArray(data.possibleUnits)) out.possibleUnits = data.possibleUnits
  if (data.category) out.category = data.category
  return out
}

router.post('/parse', verifyToken, parseLimiter, asyncHandler(async (req, res) => {
  const { ingredientString } = req.body
  if (!ingredientString || typeof ingredientString !== 'string') {
    return res.status(400).json({ error: 'ingredientString must be a non-empty string' })
  }
  try {
    // v2 is key-free on the client: the parser calls the hosted proxy (which
    // holds the Spoonacular key), so no API key is passed here. The proxy URL is
    // fixed server-side — optionally overridable via INGREDIENT_PARSER_PROXY_URL,
    // otherwise the package default. We deliberately do NOT forward any
    // client-supplied options, so a caller can't redirect the proxy target.
    const { data } = await ingredientParser(ingredientString, {
      imageSize: '100x100',
      ...(process.env.INGREDIENT_PARSER_PROXY_URL
        ? { serverUrl: process.env.INGREDIENT_PARSER_PROXY_URL }
        : {}),
    })

    const ingredientData = mapIngredientData(data)

    // Soft-fail by design: a clean lookup miss (no Spoonacular match) returns 200
    // with `ingredientData: null`. Log it so we can see which strings miss in
    // prod and decide whether to seed the proxy cache, and persist it for the
    // admin telemetry list (N6).
    if (!ingredientData) {
      console.warn(
        '[ingredients/parse] enrichment miss',
        JSON.stringify({ ingredientString })
      )
      await recordIngredientTelemetry('miss', ingredientString)
    } else if (
      typeof ingredientData.totalPriceUSACents === 'number' &&
      ingredientData.totalPriceUSACents >= PRICE_OUTLIER_CENTS
    ) {
      // Enriched, but to an implausible price — record it for admin review so a
      // bad proxy gram-estimate (the N1 "$10 parfait" class) is visible. The
      // price still flows through to the client unchanged; this is observability.
      await recordIngredientTelemetry('price_outlier', ingredientString, {
        name: ingredientData.name,
        priceCents: ingredientData.totalPriceUSACents,
      })
    }
    return res.json({ ingredientData })
  } catch (err) {
    // A throw here is an EnrichError (proxy/network failure) — distinct from a
    // clean miss. Full error with stack so we can debug proxy outages in prod.
    console.error(
      '[ingredients/parse] enrichment threw',
      JSON.stringify({ ingredientString, message: err && err.message }),
      err && err.stack
    )
    return res.status(500).json({ error: GENERIC_500_MESSAGE })
  }
}))

module.exports = router
