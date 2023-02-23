import { IngredientResponseType } from '@jclind/ingredient-parser'

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
  recipeImage: string
  cuisine: string
  mealTypes: string[]
}

export type LabelType = { label: string; id?: string }
export type IngredientsType = IngredientResponseType | LabelType
export type InstructionsType =
  | { content: string; index: number; id?: string }
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
