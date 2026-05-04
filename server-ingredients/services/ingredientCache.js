async function checkCache(db, name) {
  const collection = db.collection('ingredients')
  const cached = await collection.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  })
  return cached
}

async function writeCache(db, ingredientData) {
  const collection = db.collection('ingredients')
  await collection.updateOne(
    { name: ingredientData.name },
    { $set: ingredientData },
    { upsert: true }
  )
}

module.exports = { checkCache, writeCache }
