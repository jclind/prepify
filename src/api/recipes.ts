import { parseIngredientString } from '@jclind/ingredient-parser'
import type { AxiosResponse } from 'axios'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import dietLabels from 'src/recipeData/dietLabels'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import {
  GetSavedRecipesResponseType,
  IngredientsType,
  NewReviewType,
  NutritionDataType,
  OptionalReviewType,
  RecipeDBResponseType,
  RecipeFormType,
  RecipeSearchResponseType,
  RecipeType,
  ReviewType,
} from 'types'
import AuthAPI from 'src/api/auth'
import { fetchIngredientEnrichment } from 'src/api/ingredientParserApi'
import { http, nutrition } from 'src/api/http-common'
import { v4 as uuidv4 } from 'uuid'

class RecipeAPIClass {
  async getAllRecipes(
    page = 0,
    order = 'new',
    tags: string[] = [],
    cuisine: string = '',
    recipesPerPage = 5,
    query = ''
  ): Promise<RecipeDBResponseType> {
    let tagsArrParam = '' // For tags that have been chosen
    if (tags.length > 0) {
      tagsArrParam += `&tags=${tags.join(',')}`
    }

    const result = await http.get(
      `api/recipes?q=${query}&page=${page}&recipesPerPage=${recipesPerPage}&order=${order}&cuisine=${cuisine}${tagsArrParam}`
    )
    return result.data
  }
  async searchAutoCompleteRecipes(
    title = ''
  ): Promise<RecipeSearchResponseType[]> {
    const result = await http.get(`api/searchAutoCompleteRecipes?title=${title}`)
    return result.data
  }
  async getTrendingRecipes(limit = 4): Promise<RecipeType[]> {
    const result = await http.get(`api/getTrendingRecipes?limit=${limit}`)
    return result.data
  }
  async getRecipe(id: string): Promise<RecipeType> {
    const result = await http.get(`api/getRecipe?id=${id}`)
    return result.data
  }
  async deleteRecipe(recipeId: string): Promise<unknown> {
    const result = await http.delete(`api/deleteRecipe?recipeId=${recipeId}`)
    return result.data
  }

  async saveRecipe(recipeId = ''): Promise<AxiosResponse> {
    return await http.put(`api/saveRecipe?recipeId=${recipeId}`)
  }
  async getSavedRecipe(recipeId = ''): Promise<GetSavedRecipesResponseType[]> {
    const result = await http.get(`api/getSavedRecipe?recipeId=${recipeId}`)
    return result.data
  }
  async unsaveRecipe(recipeId = ''): Promise<AxiosResponse> {
    return await http.put(`api/unsaveRecipe?recipeId=${recipeId}`)
  }
  async madeRecipe(recipeId: string): Promise<unknown> {
    if (!AuthAPI.getUID()) return

    const result = await http.post(`api/madeRecipe?recipeId=${recipeId}`)
    return result.data
  }
  async checkMadeRecipe(recipeId: string) {
    if (!AuthAPI.getUID()) return

    const result = await http.get(`api/checkMadeRecipe?recipeId=${recipeId}`)
    return result.data
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
      return ''
    }
  }

  async addRecipe(
    recipeData: RecipeFormType,
    setProgress: (val: number) => void
  ): Promise<string | null> {
    try {
      setProgress(10)
      const authorUsername: string | null = await AuthAPI.getUsername()
      if (!authorUsername) throw Error('User does not exist')
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
      const returnRecipeData: Omit<RecipeType, '_id'> = {
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
        authorUsername,
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
        views: 0,
        numTimesSaved: 0,
        numTimesMade: 0,
      }
      setProgress(90)
      const result = await http.post<{ _id: string }>('api/addRecipe', returnRecipeData)
      return result.data._id
    } catch (error: unknown) {
      return null
    }
  }
  async getRecipeNutrition(ingrArr: IngredientsType[]): Promise<{ nutritionData: NutritionDataType | null; dietLabels: string[] | null }> {
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
      `nutrition-details?app_id=${import.meta.env.VITE_EDAMAM_APP_ID}&app_key=${import.meta.env.VITE_EDAMAM_APP_KEY}`,
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

  // Ratings / Reviews
  async addRating(recipeId: string, rating: number): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.post(`api/addRating?recipeId=${recipeId}&rating=${rating}`)
  }

  async newReview(recipeId: string, text: string): Promise<ReviewType | null> {
    if (!AuthAPI.getUID()) return null

    const data: NewReviewType = {
      recipeId,
      reviewText: text,
    }
    const result = await http.post(`api/newReview`, data)
    return result.data
  }
  async checkIfReviewed(recipeId: string) {
    if (!AuthAPI.getUID()) return null

    const result = await http.get(`api/checkIfReviewed?recipeId=${recipeId}`)
    return result.data
  }
  async editReview(recipeId: string, text: string): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.post(`api/editReview?recipeId=${recipeId}&text=${text}`)
  }
  async deleteReview(recipeId: string): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.delete(`api/deleteReview?recipeId=${recipeId}`)
  }
  async getReviews(
    recipeId: string,
    filter = 'new',
    page: number,
    reviewsPerPage = 5
  ) {
    const username = await AuthAPI.getUsername()
    const result = await http.get(
      `api/getReviews?username=${username}&recipeId=${recipeId}&page=${page}&reviewsPerPage=${reviewsPerPage}&filter=${filter}`
    )
    return result.data
  }
  async getSingleUserReviews(
    page = 0,
    reviewsPerPage = 5,
    filter = 'new',
    returnRecipeData = false
  ): Promise<{ reviews: OptionalReviewType[]; totalCount: number } | null> {
    const username = await AuthAPI.getUsername()
    if (!username) return null
    const reviewResult = await http.get(
      `api/getSingleUserReviews?username=${username}&page=${page}&reviewsPerPage=${reviewsPerPage}&filter=${filter}&returnRecipeData=${returnRecipeData}`
    )
    return reviewResult.data
  }

  // Ingredients
  async getIngredientData(val: string): Promise<IngredientsType> {
    const parsedIngredient = parseIngredientString(val)
    const enrichment = await fetchIngredientEnrichment(parsedIngredient)

    if (enrichment.error || !enrichment.data) {
      return {
        error: enrichment.error ?? { message: 'No ingredient data returned' },
        parsedIngredient,
        ingredientData: null,
        id: uuidv4(),
      }
    }

    return {
      parsedIngredient,
      ingredientData: enrichment.data,
      id: uuidv4(),
    }
  }

  // User
  async getSavedRecipes(
    page: number,
    recipesPerPage: number,
    order: string
  ): Promise<{ recipes: RecipeType[]; totalCount: number } | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get(
      `api/getSavedRecipes?page=${page}&recipesPerPage=${recipesPerPage}&order=${order}`
    )
    return result.data
  }
}

const RecipeAPI = new RecipeAPIClass()

export default RecipeAPI
