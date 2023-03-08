import { IngredientResponse, ingredientParser } from '@jclind/ingredient-parser'

import ObjectID from 'bson-objectid'
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage'
import dietLabels from 'src/recipeData/dietLabels'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import {
  GetSavedRecipesResponseType,
  IngredientsType,
  NewReviewType,
  NutritionDataType,
  RecipeDBResponseType,
  RecipeFormType,
  RecipeSearchResponseType,
  RecipeType,
  ReviewType,
} from 'types'
import AuthAPI from './auth'
import { http, nutrition } from './http-common'
import { v4 as uuidv4 } from 'uuid'

class RecipeAPIClass {
  async getAllRecipes(
    page = 0,
    order = 'new',
    tags = [],
    query = ''
  ): Promise<RecipeDBResponseType[]> {
    let tagsArrParam = '' // For tags that have been chosen
    if (tags.length > 0) {
      tagsArrParam += '&tags='
      tags.forEach((tag, idx) => {
        tagsArrParam += `${tag},`

        // When the last tag is reached, leave off the last comma for backend array processing
        if (idx === tags.length - 1) {
          tagsArrParam += `${tag}`
        }
      })
    }

    return await http.get(
      `recipes?q=${query}&page=${page}&order=${order}${tagsArrParam}`
    )
  }
  search(
    query: string,
    tag = '',
    page = 0,
    order = 'new',
    recipesPerPage = 5
  ): Promise<RecipeDBResponseType[]> {
    return http.get(
      `recipes?q=${query.toString()}&page=${page}&tag=${tag}&order=${order}&recipesPerPage=${recipesPerPage}`
    )
  }
  async searchAutoCompleteRecipes(
    title = ''
  ): Promise<RecipeSearchResponseType[]> {
    const result = await http.get(`searchAutoCompleteRecipes?title=${title}`)
    return result.data
  }
  async getTrendingRecipes(limit = 4): Promise<RecipeType[]> {
    const result = await http.get(`getTrendingRecipes?limit=${limit}`)
    return result.data
  }
  async getRecipe(id: string): Promise<RecipeType> {
    const result = await http.get(`getRecipe?id=${id}`)
    return result.data
  }

  async saveRecipe(userId = '', recipeId = '') {
    return await http.put(`saveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  async getSavedRecipe(
    userId = '',
    recipeId = ''
  ): Promise<GetSavedRecipesResponseType[]> {
    const result = await http.get(
      `getSavedRecipe?userId=${userId}&recipeId=${recipeId}`
    )
    return result.data
  }
  async unsaveRecipe(userId = '', recipeId = '') {
    return await http.put(`unsaveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  uploadRecipeImage = async (
    imageFile: File,
    setProgress: (val: number) => void
  ): Promise<string> => {
    if (imageFile) {
      const storage = getStorage()

      const recipeImagesRef = ref(storage, `recipeImages/${imageFile.name}`)
      setProgress(40)
      await uploadBytes(recipeImagesRef, imageFile)
      setProgress(50)
      const fileUrl = await getDownloadURL(recipeImagesRef)
      setProgress(70)
      return fileUrl
    } else {
      console.log('enter image')
      return ''
    }
  }

  async addRecipe(
    recipeData: RecipeFormType,
    setProgress: (val: number) => void
  ): Promise<string | null> {
    // !FIX
    const uid = AuthAPI.getUID()
    if (!uid) return null

    try {
      setProgress(10)
      const authorId: string = uid
      const recipeImage: string = await this.uploadRecipeImage(
        recipeData.recipeImage,
        setProgress
      )
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      setProgress(80)
      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)
      const nutritionDataRes = await this.getRecipeNutrition(
        recipeData.ingredients
      )
      const nutritionData = nutritionDataRes.nutritionData
      const nutritionLabels = nutritionDataRes.dietLabels
      const recipeId = '' + ObjectID()
      const returnRecipeData: RecipeType = {
        _id: recipeId,
        title: recipeData.title,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        fridgeLife: recipeData.fridgeLife,
        freezerLife: recipeData.freezerLife,
        description: recipeData.description,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        recipeImage,
        nutritionData,
        totalTime,
        authorId,
        rating: {
          rateCount: 0,
          rateValue: 0,
        },
        createdAt: new Date().getTime().toString(),
        editedAt: null,
        servingPrice,
        cuisine: recipeData.cuisine,
        mealTypes: recipeData.mealTypes,
        nutritionLabels,
      }
      setProgress(90)
      await http.post('addRecipe', returnRecipeData)
      return recipeId
      // return await http.post('addRecipe', returnRecipeData)
    } catch (error) {
      console.log(error)
      // !CATCH ERROR
      return null
    }
  }
  async getRecipeNutrition(ingrArr: IngredientsType[]) {
    const ingrData: { title: string; ingr: string[] } = {
      title: 'recipe 1',
      ingr: [],
    }

    ingrArr.forEach(ingr => {
      if ('parsedIngredient' in ingr) {
        const { quantity, unit, ingredient } = ingr.parsedIngredient

        if (quantity) {
          const str = `${quantity} ${unit || ''} ${ingredient}`
          ingrData.ingr.push(str)
        }
      }
    })
    const nutritionResultRes = await nutrition.post(
      `nutrition-details?app_id=${process.env.REACT_APP_EDAMAM_APP_ID}&app_key=${process.env.REACT_APP_EDAMAM_APP_KEY}`,
      ingrData
    )

    const nutritionResult: NutritionDataType = nutritionResultRes.data

    if (!nutritionResult) return { nutritionData: null, dietLabels: null }

    const currDietLabels: string[] = []

    const returnedNutritionLabels = [
      ...nutritionResult.dietLabels,
      ...nutritionResult.healthLabels,
    ]

    dietLabels.forEach(l => {
      if (returnedNutritionLabels.includes(l.toUpperCase())) {
        currDietLabels.push(l)
      }
    })

    return { nutritionData: nutritionResult, dietLabels: currDietLabels }
  }

  async addRecipeTag(data: string) {
    return await http.post('addRecipeTag', data)
  }

  async searchRecipeTags(query: string, tagsArr: { text: string }[]) {
    const tagsArrText =
      tagsArr && tagsArr.length > 0 ? tagsArr.map(tag => tag.text) : []
    let tagsArrParam = '' // For tags that have already been chosen
    if (tagsArrText.length > 0) {
      tagsArrParam += '&selectedTags='
      tagsArrText.forEach(tag => {
        tagsArrParam += `${tag},`
      })
    }

    return await http.get(`searchRecipeTags?q=${query}${tagsArrParam}`)
  }

  async getRecipeTags(limit = 5) {
    return await http.get(`getRecipeTags?limit=${limit}`)
  }

  // Ratings / Reviews
  async addRating(recipeId: string, rating: number) {
    const uid = AuthAPI.getUID()

    if (!uid) return null

    return await http.put(
      `addRating?userId=${uid}&recipeId=${recipeId}&rating=${rating}`
    )
  }

  async newReview(
    recipeId: string,
    text: string
  ): Promise<{
    rating: { data: { rating: number } }
    userId: string
    reviewText: string
    reviewCreatedAt: string
  } | null> {
    const uid = AuthAPI.getUID()
    if (!uid) return null

    const data: NewReviewType = {
      userId: uid,
      recipeId,
      reviewText: text,
    }
    const result = await http.put(`newReview`, data)
    return result.data
  }
  async checkIfReviewed(recipeId: string) {
    const uid = AuthAPI.getUID()
    if (!uid) return null
    return await http.get(`checkIfReviewed?userId=${uid}&recipeId=${recipeId}`)
  }
  async editReview(recipeId: string, text: string) {
    const uid = AuthAPI.getUID()
    if (!uid) return null
    return await http.put(
      `editReview?userId=${uid}&recipeId=${recipeId}&text=${text}`
    )
  }
  async deleteReview(recipeId: string) {
    const uid = AuthAPI.getUID()
    if (!uid) return null
    return await http.put(`deleteReview?userId=${uid}&recipeId=${recipeId}`)
  }
  async getReviews(
    recipeId: string,
    filter = 'new',
    page: number,
    reviewsPerPage = 5
  ) {
    const uid = AuthAPI.getUID()
    if (!uid) return null
    return await http.get(
      `getReviews?userId=${uid}&recipeId=${recipeId}&page=${page}&reviewsPerPage=${reviewsPerPage}&filter=${filter}`
    )
  }

  // Ingredients
  async getIngredientData(val: string): Promise<IngredientsType> {
    const apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY

    if (!apiKey) {
      throw new Error('Spoonacular API key is not defined')
    }

    const result: IngredientResponse = await ingredientParser(val, apiKey)

    console.log(ingredientParser('1 Tablespoon Vinegar', apiKey))

    const data: IngredientsType = { ...result, id: uuidv4() }

    console.log(data)
    return data
  }

  // User
  async getSavedRecipes(page: number, recipesPerPage: number, order: string) {
    const uid = AuthAPI.getUID()
    if (!uid) return null
    return await http.get(
      `getSavedRecipes?userId=${uid}&page=${page}&recipesPerPage=${recipesPerPage}&order=${order}`
    )
  }
}

const RecipeAPI = new RecipeAPIClass()

export default RecipeAPI
