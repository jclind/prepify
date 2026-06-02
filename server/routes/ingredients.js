const { Router } = require('express')
const { ingredientParser } = require('@jclind/ingredient-parser')
const { verifyToken } = require('../middleware/auth')

const router = Router()

router.post('/parse', verifyToken, async (req, res) => {
  const { ingredientString, options } = req.body
  if (!ingredientString || typeof ingredientString !== 'string') {
    return res.status(400).json({ error: 'ingredientString must be a non-empty string' })
  }
  try {
    const result = await ingredientParser(
      ingredientString,
      process.env.SPOONACULAR_API_KEY,
      options
    )
    // Spoonacular migrated CDN: spoonacular.com/cdn → img.spoonacular.com.
    // The @jclind/ingredient-parser package still constructs the old URL
    // (node_modules/@jclind/ingredient-parser/dist/src/funcs/ingredientParser.js:47).
    // Rewrite here, at the funnel, before the response leaves the server.
    if (result && result.ingredientData && typeof result.ingredientData.imagePath === 'string') {
      result.ingredientData.imagePath = result.ingredientData.imagePath.replace(
        'https://spoonacular.com/cdn/ingredients_',
        'https://img.spoonacular.com/ingredients_'
      )
    }
    // Phase A: structured warn when enrichment didn't fully succeed.
    // Soft-fail by design — we still return 200 with the parsed-only payload —
    // but log so we can see in prod which ingredient strings are missing enrichment.
    if (result && (result.error || !result.ingredientData)) {
      console.warn(
        '[ingredients/parse] enrichment incomplete',
        JSON.stringify({
          ingredientString,
          parsedName: result.parsedIngredient && result.parsedIngredient.ingredient,
          hasIngredientData: Boolean(result.ingredientData),
          error: result.error || null,
        })
      )
    }
    return res.json(result)
  } catch (err) {
    // Phase A: full error with stack so we can debug network / Spoonacular failures in prod.
    console.error(
      '[ingredients/parse] parser threw',
      JSON.stringify({ ingredientString, message: err && err.message }),
      err && err.stack
    )
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
