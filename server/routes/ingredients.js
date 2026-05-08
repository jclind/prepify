const { Router } = require('express')
const { ingredientParser } = require('@jclind/ingredient-parser')

const router = Router()

router.post('/parse', async (req, res) => {
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
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
