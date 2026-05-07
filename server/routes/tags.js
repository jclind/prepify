const { Router } = require('express')
const { getDB } = require('../db')
const { verifyToken } = require('../middleware/auth')

const router = Router()

// POST /addRecipeTag
router.post('/addRecipeTag', verifyToken, async (req, res) => {
  try {
    const db = getDB()
    const { text } = req.body
    const doc = { text }
    const result = await db.collection('tags').insertOne(doc)
    res.json({ ...doc, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /searchRecipeTags
router.get('/searchRecipeTags', async (req, res) => {
  try {
    const db = getDB()
    const { q = '', selectedTags = '' } = req.query
    const excluded = selectedTags.split(',').map((t) => t.trim()).filter(Boolean)

    const conditions = [{ text: { $regex: q, $options: 'i' } }]
    if (excluded.length > 0) conditions.push({ text: { $nin: excluded } })
    const filter = { $and: conditions }

    const tags = await db.collection('tags').find(filter).limit(10).toArray()
    res.json(tags)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /getRecipeTags
router.get('/getRecipeTags', async (req, res) => {
  try {
    const db = getDB()
    const limit = parseInt(req.query.limit) || 5
    const tags = await db.collection('tags').find({}).limit(limit).toArray()
    res.json(tags)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
