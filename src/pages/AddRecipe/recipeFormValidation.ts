import { AddRecipeErrorType, IngredientsType, InstructionsType } from 'types'
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
} from 'src/util/recipeLimits'

export type TimeVal = { hours: number; minutes: number } | null

export type RecipeFormErrors = Partial<AddRecipeErrorType>

// The slice of the recipe-form state the validator reads. A structural subset of
// the full form state (see useRecipeForm) so this module carries no dependency on
// the hook — the hook's state is assignable to this shape.
export type ValidatableRecipeForm = {
  title: string
  recipeImage: File | undefined
  // Edit mode: a recipe with no newly-picked file is still valid if it kept its
  // existing stored image.
  existingImageUrl: string | undefined
  description: string
  servings: number | ''
  prepTime: TimeVal
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  mealTypes: string[]
}

// Pure validation: derive the field-error map from the current form values.
// Extracted from AddRecipe so both the live "keep errors in sync as fields are
// fixed" effect and unit tests can share one source of truth. Behaviour is
// identical to the former in-component validate() — same messages, same rules
// (cook time, cuisine and diet stay optional and are intentionally absent here).
export function validateRecipeForm(
  form: ValidatableRecipeForm
): RecipeFormErrors {
  const errors: RecipeFormErrors = {}

  if (!form.title) {
    errors.title = 'Title is required'
  } else if (form.title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters`
  }

  if (!form.recipeImage && !form.existingImageUrl) {
    errors.image = 'Image is required'
  }

  if (!form.description) {
    errors.description = 'Description is required'
  } else if (form.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
  }

  if (!form.servings) errors.servings = 'Servings amount is required'
  if (!form.prepTime) errors.prepTime = 'Prep time is required'

  if (form.ingredients.length <= 0) {
    errors.ingredients = 'Recipe must contain ingredients'
  } else if (form.ingredients.length > MAX_INGREDIENTS) {
    errors.ingredients = `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
  }

  if (form.instructions.length <= 0) {
    errors.instructions = 'Instructions are required'
  } else if (form.instructions.length > MAX_INSTRUCTIONS) {
    errors.instructions = `A recipe cannot have more than ${MAX_INSTRUCTIONS} instructions`
  }

  if (form.mealTypes.length <= 0) errors.mealType = 'Meal type required'

  return errors
}

// The form is submittable when no field produced an error.
export const isRecipeFormValid = (errors: RecipeFormErrors): boolean =>
  Object.keys(errors).length === 0
