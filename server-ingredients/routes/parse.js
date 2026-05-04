const express = require('express')
const { checkCache, writeCache } = require('../services/ingredientCache')
const { fetchFromSpoonacular } = require('../services/spoonacular')

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const spoonacularApiKey = process.env.SPOONACULAR_API_KEY

    if (!spoonacularApiKey) {
      return res.status(500).json({ error: 'Server misconfiguration: SPOONACULAR_API_KEY not set' })
    }

    const { ingredientString } = req.body

    if (!ingredientString) {
      return res.status(400).json({ error: 'ingredientString is required' })
    }

    const db = req.app.locals.db

    const name = ingredientString.trim()
    const cached = await checkCache(db, name)

    if (cached) {
      return res.json({ source: 'cache', data: cached })
    }

    const result = await fetchFromSpoonacular(name, spoonacularApiKey)
    await writeCache(db, result)

    res.json({ source: 'spoonacular', data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
