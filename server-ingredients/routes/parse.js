const express = require('express')
const verifyToken = require('../middleware/auth')
const { checkCache, writeCache } = require('../services/ingredientCache')
const { fetchFromSpoonacular } = require('../services/spoonacular')

const router = express.Router()

router.post('/', verifyToken, async (req, res) => {
  try {
    const { ingredientString, spoonacularApiKey } = req.body

    if (!ingredientString || !spoonacularApiKey) {
      return res.status(400).json({ error: 'ingredientString and spoonacularApiKey are required' })
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
