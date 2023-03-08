import {
  IngredientResponseType,
  IngredientData,
  ParsedIngredient,
} from '@jclind/ingredient-parser'

export type RecipeType = {
  _id: string
  title: string
  prepTime: number
  cookTime: number | null
  servings: number
  fridgeLife: number | null
  freezerLife: number | null
  description: string
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  recipeImage: string
  nutritionData: any
  totalTime: number
  authorId: string
  rating: {
    rateCount: number
    rateValue: number
  }
  createdAt: string
  editedAt: null | string
  servingPrice: number | null
  cuisine: string
  mealTypes: string[]
  nutritionLabels: string[] | null
}
export type RecipeFormType = {
  title: string
  prepTime: number
  cookTime: number | null
  servings: number
  fridgeLife: number | null
  freezerLife: number | null
  description: string
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  recipeImage: File
  cuisine: string
  mealTypes: string[]
}

export type LabelType = { label: string; id: string }
export type IngredientsType =
  | {
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData
      id: string
    }
  | {
      error?: {
        message: string
      }
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData | null
      id: string
    }
  | LabelType
export type InstructionsType =
  | { content: string; index: number; id: string }
  | LabelType

export interface NutritionDataType {
  uri: string
  yield: any
  calories: any
  totalWeight: any
  dietLabels: string[]
  healthLabels: string[]
  cautions: any[]
  totalNutrients: any
  totalDaily: any
  ingredients: any[]
  totalNutrientsKCal: any
}

export interface RecipeDBResponseType {
  recipeList: RecipeType[]
  page: number
  filters: {}
  entries_per_page: number
  total_results: number
}
export interface RecipeSearchResponseType {
  _id: string
  title: string
  recipeImage: string
  totalTime: number
  rating: {
    rateCount: number
    rateValue: number
  }
  servingPrice: number
  nutritionLabels: string[]
  servings: number
}
export interface GetSavedRecipesResponseType {
  _id: string
  userRecipes: {
    recipeId: string
  }[]
  savedRecipes: {
    recipeId: string
    dateSaved: string
  }[]
}

export interface ReviewType {
  userId: string
  recipeId: string
  reviewText: string
  rating: number
  reviewCreatedAt: string
}
export interface NewReviewType {
  userId: string
  recipeId: string
  reviewText: string
}

export interface AddRecipeErrorType {
  title: string
  image: string
  description: string
  servings: string
  prepTime: string
  cookTime: string
  ingredients: string
  instructions: string
  cuisine: string
  course: string
}
