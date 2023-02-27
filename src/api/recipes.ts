import ObjectID from 'bson-objectid'
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import dietLabels from 'src/recipeData/dietLabels'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import {
  IngredientsType,
  NutritionDataType,
  RecipeFormType,
  RecipeType,
} from 'types'
import AuthAPI from './auth'
import { http, nutrition } from './http-common'

class RecipeAPIClass {
  getAll(page = 0, order = 'new', tags = [], query = '') {
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

    return http.get(
      `recipes?q=${query}&page=${page}&order=${order}${tagsArrParam}`
    )
  }
  search(query: string, tag = '', page = 0, order = 'new', recipesPerPage = 5) {
    return http.get(
      `recipes?q=${query.toString()}&page=${page}&tag=${tag}&order=${order}&recipesPerPage=${recipesPerPage}`
    )
  }
  async searchAutoComplete(title = '') {
    return await http.get(`searchAutoCompleteRecipes?title=${title}`)
  }
  async getTrendingRecipes(limit = 4) {
    return await http.get(`getTrendingRecipes?limit=${limit}`)
  }
  async getRecipe(id: string) {
    return await http.get(`getRecipe?id=${id}`)
  }

  async saveRecipe(userId = '', recipeId = '') {
    return await http.put(`saveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  async getSavedRecipe(userId = '', recipeId = '') {
    return await http.get(
      `getSavedRecipe?userId=${userId}&recipeId=${recipeId}`
    )
  }
  async unsaveRecipe(userId = '', recipeId = '') {
    return await http.put(`unsaveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  uploadRecipeImage = async (
    imageURI: RecipeType['recipeImage'],
    setProgress: (val: number) => void
  ): Promise<string> => {
    if (imageURI) {
      const imageBlobRes = await fetch(imageURI)
      setProgress(0.4)
      const imageBlob = await imageBlobRes.blob()
      setProgress(0.5)
      const storage = getStorage()

      const recipeImagesRef = ref(
        storage,
        `recipeImages/${new Date().toString()}`
      )

      await uploadBytesResumable(recipeImagesRef, imageBlob)
      setProgress(0.7)
      const fileUrl = await getDownloadURL(recipeImagesRef)
      setProgress(0.75)
      return fileUrl
    } else {
      // !ERROR
      console.log('No Image Provided')
      return ''
    }
  }

  async addRecipe(
    recipeData: RecipeFormType,
    setProgress: (val: number) => void
  ) {
    // !FIX
    const uid = AuthAPI.getUID()
    if (!uid) return

    try {
      setProgress(0.1)
      const authorId: string = uid
      const recipeImage: string = await this.uploadRecipeImage(
        recipeData.recipeImage,
        setProgress
      )
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      setProgress(0.8)
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
      setProgress(0.9)
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

  async newReview(recipeId: string, text: string) {
    const uid = AuthAPI.getUID()
    if (!uid) return null

    const data = {
      userId: uid,
      recipeId,
      reviewText: text,
    }
    return await http.put(`newReview`, data)
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
