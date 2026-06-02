import { IngredientData, ParsedIngredient } from '@jclind/ingredient-parser'

export type RecipeType = {
  _id: string
  // Firebase uid of the author. Stamped server-side and returned by GET
  // /getRecipe; the source of truth for ownership checks (authorUsername is a
  // display snapshot that goes stale if the user renames).
  userId?: string
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
  nutritionData: NutritionDataType | null
  totalTime: number
  authorUsername: string
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
  views: number
  numTimesSaved: number
  numTimesMade: number
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

// Same shape as RecipeFormType, but the image is optional: when editing, an
// unchanged recipe keeps its existing stored image URL and no new File is set.
export type RecipeEditFormType = Omit<RecipeFormType, 'recipeImage'> & {
  recipeImage?: File
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

interface NutrientInfo {
  label: string
  quantity: number
  unit: string
}

export interface NutritionDataType {
  uri: string
  yield: number
  calories: number
  totalWeight: number
  dietLabels: string[]
  healthLabels: string[]
  cautions: string[]
  totalNutrients: Record<string, NutrientInfo>
  totalDaily: Record<string, NutrientInfo>
  ingredients: unknown[] // TODO: Edamam parsed-ingredient shape — not accessed directly in this codebase
  totalNutrientsKCal: Record<string, NutrientInfo>
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
export type OptionalReviewType = {
  _id: string
  username: string
  recipeId: string
  rating: string
  ratingLastUpdated: string
  reviewCreatedAt?: string
  reviewLastUpdated?: string
  reviewText?: string
  recipeTitle?: string
  recipeImage?: string
}
export type ReviewType = {
  _id: string
  username: string
  recipeId: string
  rating: string
  ratingLastUpdated: string
  reviewCreatedAt: string
  reviewLastUpdated: string
  reviewText: string
}

export interface NewReviewType {
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
  mealType: string
}
