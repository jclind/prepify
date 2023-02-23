import React, { useContext } from 'react'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from 'firebase/storage'
import { useAuth } from './AuthContext'
import RecipeAPI from '../api/recipes'
import ObjectID from 'bson-objectid'
import {
  IngredientsType,
  NutritionDataType,
  RecipeFormType,
  RecipeType,
} from 'types'
import { UserCredential } from 'firebase/auth'
import dietLabels from '../recipeData/dietLabels'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
// type RecipeContextValueType = {
//   getRecipe: (recipeId: string) => Promise
//   searchRecipes
//   searchAutoCompleteRecipes
//   getTrendingRecipes
//   addRecipe
//   saveRecipe
//   getSavedRecipe
//   unsaveRecipe
//   validateTag
//   searchTags
//   getTopTags
//   addRating
//   newReview
//   checkIfReviewed
//   editReview
//   deleteReview
//   getReviews
//   getSavedRecipes
// }

type RecipeProviderProps = {
  children: React.ReactNode
}

const RecipeContext = React.createContext()

export function useRecipe() {
  return useContext(RecipeContext)
}

const RecipeProvider = ({ children }: RecipeProviderProps) => {
  const authResult = useAuth()
  const user = authResult?.user ?? null

  const getRecipe = async (recipeId: string): Promise<RecipeType | null> => {
    if (recipeId) {
      return await RecipeAPI.getRecipe(recipeId)
    }
    return null
  }

  const searchRecipes = async (
    recipeQuery: string,
    tag: string,
    page: number,
    order: string,
    recipesPerPage: number
  ): Promise<RecipeType[]> => {
    if (recipeQuery) {
      return await RecipeAPI.search(
        recipeQuery,
        tag,
        page,
        order,
        recipesPerPage
      )
    }

    return await RecipeAPI.search(recipeQuery, tag, page, order, recipesPerPage)
  }
  const searchAutoCompleteRecipes = async (
    title: string
  ): Promise<RecipeType[]> => {
    if (title) {
      return await RecipeAPI.searchAutoComplete(title)
    }
    return []
  }

  const getTrendingRecipes = async (limit: number): Promise<RecipeType[]> => {
    return await RecipeAPI.getTrendingRecipes(limit)
  }

  // Uploads image to firebase storage and returns url of image to be kept in database
  const uploadRecipeImage = async (
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

  const getRecipeNutrition = (ingrArr: IngredientsType[]) => {
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
    const nutritionResultRes = await RecipeAPI.getRecipeNutrition(ingrData)

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

  const addRecipe = async (
    recipeData: RecipeFormType,
    setProgress: (val: number) => void
  ) => {
    if (!user) return

    try {
      setProgress(0.1)
      const authorId: string = user.uid
      const recipeImage: string = await uploadRecipeImage(
        recipeData.recipeImage,
        setProgress
      )
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      setProgress(0.8)
      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)
      const nutritionDataRes = await getRecipeNutrition(recipeData.ingredients)
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
      await RecipeAPI.addRecipe(returnRecipeData)
      return recipeId
      // return await http.post('addRecipe', returnRecipeData)
    } catch (error) {
      console.log(error)
      // !CATCH ERROR
    }

    // setLoadingProgress(loadingProgress + 10)
    // console.log(recipeData.recipeImage)

    // // Get image url for submitted image, stored in firebase (for now)
    // const recipeImage = recipeData.recipeImage
    // const recipeImageUrl = await uploadImageToStorage(recipeImage)

    // setLoadingProgress(loadingProgress + 50)

    // const userUID = user.uid

    // const { prepTime, cookTime, additionalTime } = recipeData
    // const tempPrepTime = prepTime ? prepTime : 0
    // const tempCookTime = cookTime ? cookTime : 0
    // const tempAdditionalTime = additionalTime ? additionalTime : 0
    // const totalTime = (
    //   Number(tempPrepTime) +
    //   Number(tempCookTime) +
    //   Number(tempAdditionalTime)
    // ).toString()

    // const nutritionData = await getRecipeNutrition(recipeData.ingredients)

    // const recipeId = ObjectID()

    // const fullRecipeData = {
    //   ...recipeData,
    //   _id: recipeId,
    //   title: recipeData.title.toLowerCase(), // Needed for title search later on.
    //   nutritionData: nutritionData.data,
    //   totalTime,
    //   recipeImage: recipeImageUrl,
    //   authorId: userUID,
    //   rating: { rateCount: '0', rateValue: '0' },
    //   tags: recipeData.tags.map(tag => tag.text), // Map through tags to only return tag text which will be unique
    //   createdAt: Date.now().toString(),
    //   editedAt: null,
    // }

    // let tagsAreValid = true
    // // Validate each entered tag and return false if any tag is not valid
    // recipeData.tags.forEach(tag => {
    //   const isTagValid = validateTag(tag, recipeData.tags)
    //   if (!isTagValid) tagsAreValid = false // If the tag is not valid, set tagsAreValid to false to later return before adding recipe to database
    // })

    // if (!tagsAreValid) {
    //   return setError('Tags are not valid, please re-enter them correctly')
    // } else {
    //   addTags(recipeData.tags)
    // }

    // RecipeAPI.addRecipe(fullRecipeData)
    //   .then(() => {
    //     setLoading(false)
    //     setLoadingProgress(100)
    //   })
    //   .catch(err => {
    //     setError(err)
    //   })

    // setLoadingProgress(90)
    // return recipeId.toString()
  }

  const saveRecipe = async (userId, recipeId) => {
    return await RecipeAPI.saveRecipe(userId, recipeId)
  }
  const getSavedRecipe = async (userId, recipeId) => {
    return await RecipeAPI.getSavedRecipe(userId, recipeId)
  }
  const unsaveRecipe = async (userId, recipeId) => {
    return await RecipeAPI.unsaveRecipe(userId, recipeId)
  }

  // Tags
  const addTags = tags => {
    tags.forEach(tag => {
      RecipeAPI.addRecipeTag(tag)
    })
  }

  const validateTag = (currTagText, tagsArr) => {
    if (currTagText.length < 3) return false
    if (currTagText.length > 20) return false
    const tagExists = tagsArr.filter(tag => tag.text === currTagText)
    if (tagExists.length !== 0) return false

    return true
  }

  const searchTags = async (str, tagsArr) => {
    // If tags array exists and the length is greater than 0, get text from each tags object and push to tagsArrText variable
    const tagsArrText =
      tagsArr && tagsArr.length > 0 ? tagsArr.map(tag => tag.text) : []

    return await RecipeAPI.searchRecipeTags(str, tagsArrText)
  }

  const getTopTags = async limit => {
    return await RecipeAPI.getRecipeTags(limit)
  }

  // Reviews
  const addRating = async (recipeId, rating) => {
    return await RecipeAPI.addRating(user.uid, recipeId, rating)
  }

  const newReview = async (recipeId, text) => {
    const data = {
      userId: user.uid,
      recipeId,
      reviewText: text,
    }

    return await RecipeAPI.newReview(data)
  }
  const checkIfReviewed = async recipeId => {
    return await RecipeAPI.checkIfReviewed(user.uid, recipeId)
  }
  const editReview = async (recipeId, text) => {
    return await RecipeAPI.editReview(user.uid, recipeId, text)
  }
  const deleteReview = async recipeId => {
    return await RecipeAPI.deleteReview(user.uid, recipeId)
  }
  const getReviews = async (recipeId, filter, page, reviewsPerPage) => {
    const userId = user && user.uid ? user.uid : ''

    return await RecipeAPI.getReviews(
      userId,
      recipeId,
      filter,
      page,
      reviewsPerPage
    )
  }

  // User recipe data
  const getSavedRecipes = async (page, recipesPerPage, order) => {
    return await RecipeAPI.getSavedRecipes(
      user.uid,
      page,
      recipesPerPage,
      order
    )
  }

  const value = {
    getRecipe,
    searchRecipes,
    searchAutoCompleteRecipes,
    getTrendingRecipes,
    addRecipe,
    saveRecipe,
    getSavedRecipe,
    unsaveRecipe,
    validateTag,
    searchTags,
    getTopTags,
    addRating,
    newReview,
    checkIfReviewed,
    editReview,
    deleteReview,
    getReviews,
    getSavedRecipes,
  }
  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  )
}

export default RecipeProvider
