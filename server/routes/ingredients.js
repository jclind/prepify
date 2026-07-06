const { Router } = require('express')
const { ingredientParser } = require('@jclind/ingredient-parser')
const { verifyToken } = require('../middleware/auth')
const { makeUserLimiter } = require('../middleware/writeLimiter')
const { GENERIC_500_MESSAGE } = require('../util/respondServerError')
const { asyncHandler } = require('../util/asyncHandler')

const router = Router()

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
    // prod and decide whether to seed the proxy cache.
    if (!ingredientData) {
      console.warn(
        '[ingredients/parse] enrichment miss',
        JSON.stringify({ ingredientString })
      )
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
