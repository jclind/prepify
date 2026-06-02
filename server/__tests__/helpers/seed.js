const { getDB } = require('../../db')

async function seedRecipe(recipe) {
  await getDB().collection('recipes').insertOne(recipe)
}

async function seedRecipes(recipes) {
  await getDB().collection('recipes').insertMany(recipes)
}

async function seedUser(uid, username) {
  await getDB()
    .collection('usernames')
    .insertOne({ _id: uid, username, username_lower: username.toLowerCase() })
}

async function seedUserRecipeData(uid, data) {
  await getDB().collection('userRecipeData').insertOne({ _id: uid, ...data })
}

async function seedTags(tags) {
  await getDB().collection('tags').insertMany(tags.map((text) => ({ text })))
}

async function seedRating(rating) {
  await getDB().collection('ratings').insertOne(rating)
}

module.exports = { seedRecipe, seedRecipes, seedUser, seedUserRecipeData, seedTags, seedRating }
