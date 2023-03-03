// import React, { useContext } from 'react'
// import {
//   getStorage,
//   ref,
//   getDownloadURL,
//   uploadBytesResumable,
// } from 'firebase/storage'
// import { useAuth } from './AuthContext'
// import RecipeAPI from '../api/recipes'
// import ObjectID from 'bson-objectid'
// import {
//   IngredientsType,
//   NutritionDataType,
//   RecipeFormType,
//   RecipeType,
// } from 'types'
// import dietLabels from '../recipeData/dietLabels'
// import { calculateServingPrice } from 'src/util/calculateServingPrice'

// type RecipeProviderProps = {
//   children: React.ReactNode
// }

// type RecipeProviderValueType = {
//   getRecipe: (recipeId: string) => void
//   searchRecipes: (
//     recipeQuery: string,
//     tag: string,
//     page: number,
//     order: string,
//     recipesPerPage: number
//   ) => void
//   searchAutoCompleteRecipes: (title: string) => void
//   getTrendingRecipes: (limit: number) => void
//   addRecipe: (
//     recipeData: RecipeFormType,
//     setProgress: (val: number) => void
//   ) => void
//   saveRecipe: (userId: string, recipeId: string) => void
//   getSavedRecipe: (userId: string, recipeId: string) => void
//   unsaveRecipe: (userId: string, recipeId: string) => void
//   validateTag: (currTagText: string, tagsArr: { text: string }[]) => void
//   searchTags: (str: string, tagsArr: { text: string }[]) => void
//   getTopTags: (limit: number) => void
//   addRating: (recipeId: string, rating: number) => void
//   newReview: (recipeId: string, text: string) => void
//   checkIfReviewed: (recipeId: string) => void
//   editReview: (recipeId: string, text: string) => void
//   deleteReview: (recipeId: string) => void
//   getReviews: (
//     recipeId: string,
//     filter: string,
//     page: number,
//     reviewsPerPage: number
//   ) => void
//   getSavedRecipes: (page: number, recipesPerPage: number, order: string) => void
// }

// const RecipeContext = React.createContext<RecipeProviderValueType | null>(null)

// export function useRecipe() {
//   return useContext(RecipeContext)
// }

// const RecipeProvider = ({ children }: RecipeProviderProps) => {
//   const authResult = useAuth()
//   const user = authResult?.user ?? null

//   const getRecipe = async (recipeId: string) => {
//     if (recipeId) {
//       return await RecipeAPI.getRecipe(recipeId)
//     }
//     return null
//   }

//   // const searchRecipes = async (
//   //   recipeQuery: string,
//   //   tag: string,
//   //   page: number,
//   //   order: string,
//   //   recipesPerPage: number
//   // ) => {
//   //   if (recipeQuery) {
//   //     return await RecipeAPI.search(
//   //       recipeQuery,
//   //       tag,
//   //       page,
//   //       order,
//   //       recipesPerPage
//   //     )
//   //   }

//   //   return await RecipeAPI.search(recipeQuery, tag, page, order, recipesPerPage)
//   // }
//   // const searchAutoCompleteRecipes = async (title: string) => {
//   //   if (title) {
//   //     return await RecipeAPI.searchAutoComplete(title)
//   //   }
//   //   return []
//   // }

//   // const getTrendingRecipes = async (limit: number) => {
//   //   return await RecipeAPI.getTrendingRecipes(limit)
//   // }

// Uploads image to firebase storage and returns url of image to be kept in database
// const uploadRecipeImage = async (
//   imageURI: RecipeType['recipeImage'],
//   setProgress: (val: number) => void
// ): Promise<string> => {
//   if (imageURI) {
//     const imageBlobRes = await fetch(imageURI)
//     setProgress(0.4)
//     const imageBlob = await imageBlobRes.blob()
//     setProgress(0.5)
//     const storage = getStorage()

//     const recipeImagesRef = ref(
//       storage,
//       `recipeImages/${new Date().toString()}`
//     )

//     await uploadBytesResumable(recipeImagesRef, imageBlob)
//     setProgress(0.7)
//     const fileUrl = await getDownloadURL(recipeImagesRef)
//     setProgress(0.75)
//     return fileUrl
//   } else {
//     // !ERROR
//     console.log('No Image Provided')
//     return ''
//   }
// }

//   // const getRecipeNutrition = async (ingrArr: IngredientsType[]) => {
//   //   const ingrData: { title: string; ingr: string[] } = {
//   //     title: 'recipe 1',
//   //     ingr: [],
//   //   }

//   //   ingrArr.forEach(ingr => {
//   //     if ('parsedIngredient' in ingr) {
//   //       const { quantity, unit, ingredient } = ingr.parsedIngredient

//   //       if (quantity) {
//   //         const str = `${quantity} ${unit || ''} ${ingredient}`
//   //         ingrData.ingr.push(str)
//   //       }
//   //     }
//   //   })
//   //   const nutritionResultRes = await RecipeAPI.getRecipeNutrition(ingrData)

//   //   const nutritionResult: NutritionDataType = nutritionResultRes.data

//   //   if (!nutritionResult) return { nutritionData: null, dietLabels: null }

//   //   const currDietLabels: string[] = []

//   //   const returnedNutritionLabels = [
//   //     ...nutritionResult.dietLabels,
//   //     ...nutritionResult.healthLabels,
//   //   ]

//   //   dietLabels.forEach(l => {
//   //     if (returnedNutritionLabels.includes(l.toUpperCase())) {
//   //       currDietLabels.push(l)
//   //     }
//   //   })

//   //   return { nutritionData: nutritionResult, dietLabels: currDietLabels }
//   // }

//   // const addRecipe = async (
//   //   recipeData: RecipeFormType,
//   //   setProgress: (val: number) => void
//   // ) => {
//   //   if (!user) return

//   //   try {
//   //     setProgress(0.1)
//   //     const authorId: string = user.uid
//   //     const recipeImage: string = await uploadRecipeImage(
//   //       recipeData.recipeImage,
//   //       setProgress
//   //     )
//   //     const servingPrice: number = calculateServingPrice(
//   //       recipeData.ingredients,
//   //       recipeData.servings
//   //     )
//   //     setProgress(0.8)
//   //     const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)
//   //     const nutritionDataRes = await getRecipeNutrition(recipeData.ingredients)
//   //     const nutritionData = nutritionDataRes.nutritionData
//   //     const nutritionLabels = nutritionDataRes.dietLabels
//   //     const recipeId = '' + ObjectID()
//   //     const returnRecipeData: RecipeType = {
//   //       _id: recipeId,
//   //       title: recipeData.title,
//   //       prepTime: recipeData.prepTime,
//   //       cookTime: recipeData.cookTime,
//   //       servings: recipeData.servings,
//   //       fridgeLife: recipeData.fridgeLife,
//   //       freezerLife: recipeData.freezerLife,
//   //       description: recipeData.description,
//   //       ingredients: recipeData.ingredients,
//   //       instructions: recipeData.instructions,
//   //       recipeImage,
//   //       nutritionData,
//   //       totalTime,
//   //       authorId,
//   //       rating: {
//   //         rateCount: 0,
//   //         rateValue: 0,
//   //       },
//   //       createdAt: new Date().getTime().toString(),
//   //       editedAt: null,
//   //       servingPrice,
//   //       cuisine: recipeData.cuisine,
//   //       mealTypes: recipeData.mealTypes,
//   //       nutritionLabels,
//   //     }
//   //     setProgress(0.9)
//   //     await RecipeAPI.addRecipe(returnRecipeData)
//   //     return recipeId
//   //     // return await http.post('addRecipe', returnRecipeData)
//   //   } catch (error) {
//   //     console.log(error)
//   //     // !CATCH ERROR
//   //   }
//   // }

//   // const saveRecipe = async (userId: string, recipeId: string) => {
//   //   return await RecipeAPI.saveRecipe(userId, recipeId)
//   // }
//   // const getSavedRecipe = async (userId: string, recipeId: string) => {
//   //   return await RecipeAPI.getSavedRecipe(userId, recipeId)
//   // }
//   // const unsaveRecipe = async (userId: string, recipeId: string) => {
//   //   return await RecipeAPI.unsaveRecipe(userId, recipeId)
//   // }

//   // Tags
//   const addTags = (tags: string[]) => {
//     tags.forEach(tag => {
//       RecipeAPI.addRecipeTag(tag)
//     })
//   }

//   const validateTag = (currTagText: string, tagsArr: { text: string }[]) => {
//     if (currTagText.length < 3) return false
//     if (currTagText.length > 20) return false
//     const tagExists = tagsArr.filter(tag => tag.text === currTagText)
//     if (tagExists.length !== 0) return false

//     return true
//   }

//   // const searchTags = async (str: string, tagsArr: { text: string }[]) => {
//   //   // If tags array exists and the length is greater than 0, get text from each tags object and push to tagsArrText variable
//   //   const tagsArrText =
//   //     tagsArr && tagsArr.length > 0 ? tagsArr.map(tag => tag.text) : []

//   //   return await RecipeAPI.searchRecipeTags(str, tagsArrText)
//   // }

//   // const getTopTags = async (limit: number) => {
//   //   return await RecipeAPI.getRecipeTags(limit)
//   // }

//   // Reviews
//   // const addRating = async (recipeId: string, rating: number) => {
//   //   const uid: string = user?.uid ?? ''
//   //   return await RecipeAPI.addRating(uid, recipeId, rating)
//   // }

//   // const newReview = async (recipeId: string, text: string) => {
//   //   const uid: string = user?.uid ?? ''
//   //   const data = {
//   //     userId: uid,
//   //     recipeId,
//   //     reviewText: text,
//   //   }

//   //   return await RecipeAPI.newReview(data)
//   // }
//   // const checkIfReviewed = async (recipeId: string) => {
//   //   const uid: string = user?.uid ?? ''
//   //   return await RecipeAPI.checkIfReviewed(uid, recipeId)
//   // }
//   // const editReview = async (recipeId: string, text: string) => {
//   //   const uid: string = user?.uid ?? ''
//   //   return await RecipeAPI.editReview(uid, recipeId, text)
//   // }
//   // const deleteReview = async (recipeId: string) => {
//   //   const uid: string = user?.uid ?? ''
//   //   return await RecipeAPI.deleteReview(uid, recipeId)
//   // }
//   // const getReviews = async (
//   //   recipeId: string,
//   //   filter: string,
//   //   page: number,
//   //   reviewsPerPage: number
//   // ) => {
//   //   const uid: string = user?.uid ?? ''

//   //   return await RecipeAPI.getReviews(
//   //     uid,
//   //     recipeId,
//   //     filter,
//   //     page,
//   //     reviewsPerPage
//   //   )
//   // }

//   // User recipe data
//   const getSavedRecipes = async (
//     page: number,
//     recipesPerPage: number,
//     order: string
//   ) => {
//     const uid: string = user?.uid ?? ''
//     return await RecipeAPI.getSavedRecipes(uid, page, recipesPerPage, order)
//   }

//   const value: RecipeProviderValueType = {
//     getRecipe,
//     searchRecipes,
//     searchAutoCompleteRecipes,
//     getTrendingRecipes,
//     addRecipe,
//     saveRecipe,
//     getSavedRecipe,
//     unsaveRecipe,
//     validateTag,
//     searchTags,
//     getTopTags,
//     addRating,
//     newReview,
//     checkIfReviewed,
//     editReview,
//     deleteReview,
//     getReviews,
//     getSavedRecipes,
//   }
//   return (
//     <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
//   )
// }

// export default RecipeProvider
