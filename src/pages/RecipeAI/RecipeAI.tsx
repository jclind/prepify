import React, { useEffect, useState } from 'react'
import { Configuration, OpenAIApi } from 'openai'
import { ingredientParser } from '@jclind/ingredient-parser'
import { createClient } from 'pexels'
import { IngredientsType, RecipeType } from 'types'
import { v4 as uuidv4 } from 'uuid'
import RecipeAPI from 'src/api/recipes'

const prompt = `Can you give me a recipe to use the following ingredients: ramen, chicken broth, pork. Can you return this recipe in the following json object format?

{
  title: string,
  servings: number,
  prepTime: number (minutes),
  cookTime (minutes),
  fridgeLife: number
  (days),
  freezerLife: number (days),
  description: string,
  ingredients: string[],
  instructions: { content: string; index: number; id: string }[],
  servingPrice: number (cents),
  cuisine: string,
  mealTypes: string[]
}

Please make ingredient quantity exact if it exists and format ingredients as such: '{quantity (if applicable)} {unit (if applicable)} {ingredient}, {comment / other ingredient words}

`

type AIRecipeType = {
  title: string
  prepTime: number
  cookTime: number
  fridgeLife: number
  freezerLife: number
  description: string
  ingredients: string[]
  instructions: { content: string; index: number; id: string }[]
  servingPrice: number
  cuisine: string
  mealTypes: string[]
  servings: number
}

const RecipeAI = () => {
  const [recipe, setRecipe] = useState<RecipeType | null>(null)

  const getRecipeImage = async (query: string) => {
    const client = createClient(
      'fvpVxl22aTqFfJ6QPucvsMdXfGu2DecJI6aBAadSqYCVznJTdf6fW3cg'
    )
    const photosRes = await client.photos.search({ query, per_page: 1 })
    if ('photos' in photosRes) {
      const photoURL = photosRes.photos[0].url
      return photoURL
    } else {
      return null
    }
  }

  useEffect(() => {
    const openai = new OpenAIApi(
      new Configuration({
        apiKey: process.env.REACT_APP_OPEN_AI_API_KEY,
      })
    )
    const callAI = async () => {
      const chatCompletionRes = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      })
      const recipeData: AIRecipeType = JSON.parse(
        chatCompletionRes.data.choices[0].message?.content || '{}'
      )
      const apiKey: string = process.env.REACT_APP_SPOONACULAR_API_KEY ?? ''
      const ingredientPromises = recipeData.ingredients.map((ingr: string) => {
        return ingredientParser(ingr.toLowerCase(), apiKey)
      })

      const ingredients: IngredientsType[] = (
        await Promise.all(ingredientPromises)
      ).map(ingr => {
        return { ...ingr, id: uuidv4() }
      })
      // recipeData.ingredients = ingredients

      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)
      const recipeImage = (await getRecipeImage(recipeData.title)) ?? ''
      const nutritionDataRes = await RecipeAPI.getRecipeNutrition(ingredients)
      const nutritionData = nutritionDataRes.nutritionData
      const nutritionLabels = nutritionDataRes.dietLabels
      // recipeData.recipeImage = recipeImage
      const updatedRecipeData: RecipeType = {
        ...recipeData,
        _id: uuidv4(),
        ingredients,
        recipeImage,
        nutritionData,
        nutritionLabels,
        totalTime,
        rating: {
          rateCount: 0,
          rateValue: 0,
        },
        createdAt: new Date().getTime().toString(),
        editedAt: null,
        views: 0,
        numTimesSaved: 0,
        numTimesMade: 0,
        authorUsername: 'PrepifyAI',
        authorId: 'recipe-ai-id',
      }
      console.log(updatedRecipeData)
      setRecipe(updatedRecipeData)
    }

    callAI()
  }, [])

  return <div className='page'>RecipeAI</div>
}

export default RecipeAI
