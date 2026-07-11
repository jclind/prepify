import { AddRecipeErrorType, IngredientsType, InstructionsType } from 'types'
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
} from 'src/util/recipeLimits'

export type TimeVal = { hours: number; minutes: number } | null

export type RecipeFormErrors = Partial<AddRecipeErrorType>

// Single source for the pending-enrichment copy: rendered as the ingredients
// field error here, and matched by useRecipeForm to decide whether a blocked
// submit warrants the "just wait" toast (only when this is the sole blocker).
export const INGREDIENTS_PENDING_MESSAGE =
  'Ingredient details are still loading — one moment before publishing'

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
  // True while any ingredient row's nutrition/price lookup is still in flight.
  // Not a form value — it gates submission so a recipe can't be persisted with
  // ingredientData:null and an understated serving price. Optional so callers
  // validating pure form values (tests, future consumers) can omit it.
  ingredientsPending?: boolean
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

  // Trim before the presence check so an all-whitespace title (`"   "`) counts as
  // missing rather than passing a truthiness test and publishing a blank <h1>.
  // The length check runs on the trimmed value too, since the payload is trimmed
  // on submit (see useRecipeForm.handleSubmit).
  const trimmedTitle = form.title.trim()
  if (!trimmedTitle) {
    errors.title = 'Title is required'
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters`
  }

  if (!form.recipeImage && !form.existingImageUrl) {
    errors.image = 'Image is required'
  }

  // Trim before the presence check, same as title: an all-whitespace
  // description must count as missing, not pass a truthiness test.
  const trimmedDescription = form.description.trim()
  if (!trimmedDescription) {
    errors.description = 'Description is required'
  } else if (form.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
  }

  // Servings must be a positive whole number — a truthiness check alone let
  // negative and fractional values (e.g. -2, 1.5) through. Coerce with Number()
  // rather than assuming a real `number`: FormInput's generic setVal passes the
  // raw input string straight through (untyped cast), so `form.servings` is
  // sometimes a numeric string at runtime despite the `number | ''` type.
  if (!form.servings) {
    errors.servings = 'Servings amount is required'
  } else {
    const numServings = Number(form.servings)
    if (!Number.isInteger(numServings) || numServings < 1) {
      errors.servings = 'Servings must be a whole number of at least 1'
    }
  }
  if (!form.prepTime) errors.prepTime = 'Prep time is required'

  if (form.ingredients.length <= 0) {
    errors.ingredients = 'Recipe must contain ingredients'
  } else if (form.ingredients.length > MAX_INGREDIENTS) {
    errors.ingredients = `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
  } else if (form.ingredientsPending) {
    // In-flight lookups settle on their own (bounded by the enrichment
    // timeout), so this error clears reactively without user action. Rows that
    // already settled as errored don't block — the user was told and may
    // publish without the price data.
    errors.ingredients = INGREDIENTS_PENDING_MESSAGE
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
