import { parseIngredientString } from '@jclind/ingredient-parser'
import axios, { type AxiosResponse } from 'axios'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import dietLabels from 'src/recipeData/dietLabels'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import {
  IngredientsType,
  NewReviewType,
  NutritionDataType,
  OptionalReviewType,
  RecipeDBResponseType,
  RecipeEditFormType,
  RecipeFormType,
  RecipeSearchResponseType,
  RecipeType,
  ReviewType,
} from 'types'
import AuthAPI from 'src/api/auth'
import { fetchIngredientEnrichment } from 'src/api/ingredientParserApi'
import { http, nutrition } from 'src/api/http-common'
import { v4 as uuidv4 } from 'uuid'

export const ADD_RECIPE_AUTH_ERROR = 'AUTH_ERROR'

export type EditRecipeResult =
  | { status: 'success'; recipe: RecipeType }
  | { status: 'auth-error' }
  | { status: 'error'; message: string }

export type GetAllRecipesParams = {
  page?: number
  order?: string
  /** OR-based tag match (mealTypes ∪ nutritionLabels) — used by Home. */
  tags?: string[]
  cuisine?: string
  recipesPerPage?: number
  query?: string
  /** Any of the selected meal types. */
  mealTypes?: string[]
  /** Conjunctive (AND) diet filter — recipe must carry every label. */
  diets?: string[]
}

class RecipeAPIClass {
  async getAllRecipes({
    page = 0,
    order = 'new',
    // `tags` is OR-based (used by the Home meal lookup). `diets` is the
    // conjunctive (AND) dietary filter; `mealTypes` matches any selected meal.
    tags = [],
    cuisine = '',
    recipesPerPage = 5,
    query = '',
    mealTypes = [],
    diets = [],
  }: GetAllRecipesParams = {}): Promise<RecipeDBResponseType> {
    // Build via URLSearchParams so every value is encoded — search terms and
    // multi-word cuisines (e.g. "Middle Eastern") would otherwise corrupt the
    // query string.
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      recipesPerPage: String(recipesPerPage),
      order,
      cuisine,
    })
    if (tags.length > 0) params.set('tags', tags.join(','))
    if (mealTypes.length > 0) params.set('mealTypes', mealTypes.join(','))
    if (diets.length > 0) params.set('diets', diets.join(','))

    const result = await http.get(`api/recipes?${params.toString()}`)
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
    return await http.post(`api/recipes/${recipeId}/save`)
  }
  async getSavedRecipe(
    recipeId = ''
  ): Promise<{ recipeId: string; dateSaved: string } | null> {
    const result = await http.get(`api/getSavedRecipe?recipeId=${recipeId}`)
    return result.data
  }
  // The current user's saved recipe ids — one request the whole grid can share.
  async getSavedRecipeIds(): Promise<string[]> {
    const result = await http.get('api/getSavedRecipeIds')
    return result.data
  }
  async unsaveRecipe(recipeId = ''): Promise<AxiosResponse> {
    return await http.delete(`api/recipes/${recipeId}/save`)
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
      // Cypress bridge: skip the real Firebase Storage SDK during E2E runs so
      // tests don't need to intercept multipart/preflight upload protocol.
      // VITE_CYPRESS is inlined at build time, so production bundles tree-shake
      // this branch entirely (the condition becomes `'false' === 'true'`).
      if (import.meta.env.VITE_CYPRESS === 'true') {
        setProgress(40)
        setProgress(50)
        setProgress(70)
        return 'https://cypress.test/fake-recipe-image.jpg'
      }
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

  // The editable subset of a recipe document, assembled from the form data plus
  // the values computed at submit time. addRecipe layers creation-only fields
  // (authorUsername, rating, counters…) on top; editRecipe sends it as-is. Single
  // source for the field list so the two paths can't drift.
  private buildEditableRecipeFields(
    data: RecipeFormType | RecipeEditFormType,
    computed: {
      recipeImage: string
      nutritionData: NutritionDataType | null
      nutritionLabels: string[] | null
      servingPrice: number
      totalTime: number
    }
  ) {
    return {
      title: data.title,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      fridgeLife: data.fridgeLife,
      freezerLife: data.freezerLife,
      description: data.description,
      ingredients: data.ingredients,
      instructions: data.instructions,
      cuisine: data.cuisine,
      mealTypes: data.mealTypes,
      recipeImage: computed.recipeImage,
      nutritionData: computed.nutritionData,
      nutritionLabels: computed.nutritionLabels,
      servingPrice: computed.servingPrice,
      totalTime: computed.totalTime,
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
        ...this.buildEditableRecipeFields(recipeData, {
          recipeImage,
          nutritionData,
          nutritionLabels,
          servingPrice,
          totalTime,
        }),
        authorUsername,
        rating: {
          rateCount: 0,
          rateValue: 0,
        },
        createdAt: new Date().getTime().toString(),
        editedAt: null,
        views: 0,
        numTimesSaved: 0,
        numTimesMade: 0,
      }
      setProgress(90)
      const result = await http.post<{ _id: string }>('api/addRecipe', returnRecipeData)
      return result.data._id
    } catch (error: unknown) {
      console.error('addRecipe failed:', error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return ADD_RECIPE_AUTH_ERROR
      }
      return null
    }
  }

  async editRecipe(
    recipeId: string,
    recipeData: RecipeEditFormType,
    originalRecipe: RecipeType,
    setProgress: (val: number) => void
  ): Promise<EditRecipeResult> {
    try {
      setProgress(10)
      // Image: only upload when the user picked a new file. Otherwise the recipe
      // keeps its existing stored image URL.
      let recipeImage = originalRecipe.recipeImage
      if (recipeData.recipeImage) {
        recipeImage = await this.uploadRecipeImage(
          recipeData.recipeImage,
          setProgress
        )
      }
      setProgress(80)
      // Serving price is a local calculation (no API cost), so always recompute —
      // it depends on both ingredients and servings.
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)

      // Nutrition is a paid Edamam call, so only re-run it when the ingredient set
      // actually changed; minor edits (title, instructions, times) reuse the
      // stored nutrition data and labels. Compare the exact strings the lookup
      // would send, element-wise.
      const newIngredients = this.buildNutritionIngredients(recipeData.ingredients)
      const oldIngredients = this.buildNutritionIngredients(originalRecipe.ingredients)
      const ingredientsChanged =
        newIngredients.length !== oldIngredients.length ||
        newIngredients.some((ingr, i) => ingr !== oldIngredients[i])

      let nutritionData = originalRecipe.nutritionData
      let nutritionLabels = originalRecipe.nutritionLabels
      if (ingredientsChanged) {
        const nutritionDataRes = await this.getRecipeNutrition(
          recipeData.ingredients
        )
        // getRecipeNutrition soft-fails to null when Edamam is unreachable. Only
        // overwrite when it actually returned data — otherwise a transient lookup
        // failure during an ingredient edit would erase the recipe's existing
        // nutrition facts for all viewers.
        if (nutritionDataRes.nutritionData) {
          nutritionData = nutritionDataRes.nutritionData
          nutritionLabels = nutritionDataRes.dietLabels
        }
      }
      setProgress(90)
      // Only the editable fields are sent; the server whitelists these and never
      // lets ratings/saves/counters be overwritten.
      const payload = this.buildEditableRecipeFields(recipeData, {
        recipeImage,
        nutritionData,
        nutritionLabels,
        servingPrice,
        totalTime,
      })
      const res = await http.put<RecipeType>(
        `api/editRecipe?recipeId=${recipeId}`,
        payload
      )
      return { status: 'success', recipe: res.data }
    } catch (error: unknown) {
      console.error('editRecipe failed:', error)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return { status: 'auth-error' }
        // Surface the server's reason (e.g. 403 Forbidden, 404 Not found) so a
        // stale edit page doesn't show a misleading "try again" for an error a
        // retry can't fix.
        const message =
          error.response?.data?.error ??
          'Failed to update recipe. Please try again.'
        return { status: 'error', message }
      }
      return { status: 'error', message: 'Failed to update recipe. Please try again.' }
    }
  }
  // The exact ingredient strings sent to Edamam for nutrition lookup. Shared by
  // getRecipeNutrition and editRecipe so the "did the ingredients change?" check
  // compares the same representation that actually drives the nutrition result.
  buildNutritionIngredients(ingrArr: IngredientsType[]): string[] {
    const ingr: string[] = []
    ingrArr.forEach(ing => {
      if ('parsedIngredient' in ing) {
        const { quantity, unit, ingredient } = ing.parsedIngredient
        if (quantity) {
          ingr.push(`${quantity} ${unit || ''} ${ingredient}`)
        }
      }
    })
    return ingr
  }
  async getRecipeNutrition(ingrArr: IngredientsType[]): Promise<{ nutritionData: NutritionDataType | null; dietLabels: string[] | null }> {
    try {
      const ingrData: { title: string; ingr: string[] } = {
        title: 'recipe 1',
        ingr: this.buildNutritionIngredients(ingrArr),
      }
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
    } catch (error: unknown) {
      console.error('getRecipeNutrition failed:', error)
      return { nutritionData: null, dietLabels: null }
    }
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
    // Phase A: enrichment is soft-fail. A thrown network error (server down, timeout,
    // 5xx surfaced as axios rejection) must not bubble up — callers stick on the
    // loading state and the ingredient never appears. Wrap and degrade to the
    // parsed-only IngredientsType so the ingredient is still added to the recipe.
    try {
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
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ingredient enrichment request failed'
      return {
        error: { message },
        parsedIngredient,
        ingredientData: null,
        id: uuidv4(),
      }
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
  async getCreatedRecipes(
    page: number,
    recipesPerPage: number,
    order: string
  ): Promise<{ recipes: RecipeType[]; totalCount: number } | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get(
      `api/getCreatedRecipes?page=${page}&recipesPerPage=${recipesPerPage}&order=${order}`
    )
    return result.data
  }
}

const RecipeAPI = new RecipeAPIClass()

export default RecipeAPI
