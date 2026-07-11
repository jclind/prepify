import { describe, it, expect } from 'vitest'
import {
  validateRecipeForm,
  isRecipeFormValid,
  ValidatableRecipeForm,
} from 'src/pages/AddRecipe/recipeFormValidation'
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
} from 'src/util/recipeLimits'
import { IngredientsType, InstructionsType } from 'types'

const ingredient = (id: string): IngredientsType => ({
  id,
  parsedIngredient: {
    ingredient: 'Flour',
    quantity: 1,
    unit: 'cup',
    comment: null,
    originalIngredientString: '1 cup Flour',
  },
  ingredientData: null,
})

const instruction = (id: string, index: number): InstructionsType => ({
  id,
  content: 'Mix',
  index,
})

// A fully-valid form; individual tests clone + break one field.
const validForm = (): ValidatableRecipeForm => ({
  title: 'My Great Recipe',
  recipeImage: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
  existingImageUrl: undefined,
  description: 'A delicious recipe',
  servings: 4,
  prepTime: { hours: 0, minutes: 30 },
  ingredients: [ingredient('i1')],
  instructions: [instruction('s1', 1)],
  mealTypes: ['dinner'],
})

describe('validateRecipeForm', () => {
  it('returns no errors for a fully-valid form', () => {
    const errors = validateRecipeForm(validForm())
    expect(errors).toEqual({})
    expect(isRecipeFormValid(errors)).toBe(true)
  })

  it('flags every required field on a fully-empty form', () => {
    const errors = validateRecipeForm({
      title: '',
      recipeImage: undefined,
      existingImageUrl: undefined,
      description: '',
      servings: '',
      prepTime: null,
      ingredients: [],
      instructions: [],
      mealTypes: [],
    })
    expect(errors.title).toBe('Title is required')
    expect(errors.image).toBe('Image is required')
    expect(errors.description).toBe('Description is required')
    expect(errors.servings).toBe('Servings amount is required')
    expect(errors.prepTime).toBe('Prep time is required')
    expect(errors.ingredients).toBe('Recipe must contain ingredients')
    expect(errors.instructions).toBe('Instructions are required')
    expect(errors.mealType).toBe('Meal type required')
    expect(isRecipeFormValid(errors)).toBe(false)
  })

  it('accepts a stored image (edit mode) with no newly-picked file', () => {
    const errors = validateRecipeForm({
      ...validForm(),
      recipeImage: undefined,
      existingImageUrl: 'https://example.com/stored.jpg',
    })
    expect(errors.image).toBeUndefined()
  })

  it('treats a whitespace-only title as missing', () => {
    // Regression: `!form.title` let an all-spaces title through (truthy string),
    // publishing a recipe with a blank <h1>. The check now trims first.
    const errors = validateRecipeForm({ ...validForm(), title: '     ' })
    expect(errors.title).toBe('Title is required')
    expect(isRecipeFormValid(errors)).toBe(false)
    // Surrounding whitespace on an otherwise-valid title is fine (trimmed on submit).
    expect(validateRecipeForm({ ...validForm(), title: '  Soup  ' }).title).toBeUndefined()
  })

  it('treats a whitespace-only description as missing', () => {
    // Mirrors the whitespace-title rule: `!form.description` let '   ' through.
    const errors = validateRecipeForm({ ...validForm(), description: '   ' })
    expect(errors.description).toBe('Description is required')
    expect(isRecipeFormValid(errors)).toBe(false)
  })

  it('caps the title length', () => {
    const ok = validateRecipeForm({ ...validForm(), title: 'A'.repeat(TITLE_MAX_LENGTH) })
    expect(ok.title).toBeUndefined()
    const tooLong = validateRecipeForm({
      ...validForm(),
      title: 'A'.repeat(TITLE_MAX_LENGTH + 1),
    })
    expect(tooLong.title).toBe(`Title cannot exceed ${TITLE_MAX_LENGTH} characters`)
  })

  it('caps the description length', () => {
    const tooLong = validateRecipeForm({
      ...validForm(),
      description: 'A'.repeat(DESCRIPTION_MAX_LENGTH + 1),
    })
    expect(tooLong.description).toBe(
      `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
    )
  })

  it('caps ingredient and instruction counts', () => {
    const errors = validateRecipeForm({
      ...validForm(),
      ingredients: Array.from({ length: MAX_INGREDIENTS + 1 }, (_, i) =>
        ingredient(`i${i}`)
      ),
      instructions: Array.from({ length: MAX_INSTRUCTIONS + 1 }, (_, i) =>
        instruction(`s${i}`, i + 1)
      ),
    })
    expect(errors.ingredients).toBe(
      `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
    )
    expect(errors.instructions).toBe(
      `A recipe cannot have more than ${MAX_INSTRUCTIONS} instructions`
    )
  })

  it('treats servings of 0 / "" as missing', () => {
    expect(validateRecipeForm({ ...validForm(), servings: '' }).servings).toBe(
      'Servings amount is required'
    )
    expect(validateRecipeForm({ ...validForm(), servings: 0 }).servings).toBe(
      'Servings amount is required'
    )
  })

  it('rejects negative or fractional servings', () => {
    // Regression: `!form.servings` only caught falsy values, letting negative
    // and fractional servings (e.g. -2, 1.5) through as "valid". Contract:
    // servings must be a positive integer (>= 1).
    expect(
      validateRecipeForm({ ...validForm(), servings: -2 }).servings
    ).toBe('Servings must be a whole number of at least 1')
    expect(
      validateRecipeForm({ ...validForm(), servings: 1.5 }).servings
    ).toBe('Servings must be a whole number of at least 1')
    expect(
      validateRecipeForm({ ...validForm(), servings: 1 }).servings
    ).toBeUndefined()
  })

  it('requires prep time, but a truthy {0,0} object (zero total) passes', () => {
    expect(validateRecipeForm({ ...validForm(), prepTime: null }).prepTime).toBe(
      'Prep time is required'
    )
    expect(
      validateRecipeForm({ ...validForm(), prepTime: { hours: 0, minutes: 0 } }).prepTime
    ).toBeUndefined()
  })

  it('blocks submission while ingredient enrichment is still in flight', () => {
    const errors = validateRecipeForm({
      ...validForm(),
      ingredientsPending: true,
    })
    expect(errors.ingredients).toMatch(/still loading/i)
    expect(isRecipeFormValid(errors)).toBe(false)
  })

  it('does not block once enrichment settled (flag false or omitted)', () => {
    expect(
      validateRecipeForm({ ...validForm(), ingredientsPending: false })
        .ingredients
    ).toBeUndefined()
    expect(validateRecipeForm(validForm()).ingredients).toBeUndefined()
  })

  it('an empty ingredient list wins over the pending flag', () => {
    // Pending implies an optimistic row exists, but if the list is empty the
    // required-field message is the actionable one.
    const errors = validateRecipeForm({
      ...validForm(),
      ingredients: [],
      ingredientsPending: true,
    })
    expect(errors.ingredients).toBe('Recipe must contain ingredients')
  })
})
