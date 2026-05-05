const fetch = require('node-fetch')

async function fetchFromSpoonacular(name, apiKey) {
  const searchUrl = `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(name)}&apiKey=${apiKey}&number=1`

  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    throw new Error(`Spoonacular search failed: ${searchRes.status}`)
  }

  const searchData = await searchRes.json()
  if (!searchData.results || searchData.results.length === 0) {
    throw new Error(`No results found for ingredient: ${name}`)
  }

  const ingredientId = searchData.results[0].id

  const detailsUrl = `https://api.spoonacular.com/food/ingredients/${ingredientId}/information?amount=1&unit=grams&apiKey=${apiKey}`
  const detailsRes = await fetch(detailsUrl)
  if (!detailsRes.ok) {
    throw new Error(`Spoonacular details failed: ${detailsRes.status}`)
  }

  const details = await detailsRes.json()

  return {
    id: details.id,
    name: details.name,
    image: details.image,
    nutrition: details.nutrition,
    possibleUnits: details.possibleUnits,
    estimatedCost: details.estimatedCost,
    aisle: details.aisle,
  }
}

module.exports = { fetchFromSpoonacular }
