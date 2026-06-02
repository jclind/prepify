import { vi } from 'vitest'

// Stub VITE_EDAMAM env vars before the module under test is imported.
vi.stubEnv('VITE_EDAMAM_APP_ID', 'test-app-id')
vi.stubEnv('VITE_EDAMAM_APP_KEY', 'test-app-key')

// Mock firebase/storage so uploadRecipeImage doesn't reach the real SDK.
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn().mockResolvedValue(undefined),
  getDownloadURL: vi.fn().mockResolvedValue('https://fake.cdn/image.jpg'),
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue('test-uid'),
    getUsername: vi.fn().mockResolvedValue('testuser'),
  },
}))

const httpPost = vi.fn()
const httpPut = vi.fn()
const nutritionPost = vi.fn()
vi.mock('src/api/http-common', () => ({
  http: {
    post: (...args: unknown[]) => httpPost(...args),
    put: (...args: unknown[]) => httpPut(...args),
  },
  nutrition: { post: (...args: unknown[]) => nutritionPost(...args) },
}))

// Import after mocks are in place.
import RecipeAPI from 'src/api/recipes'
import type { RecipeEditFormType, RecipeFormType, RecipeType } from 'types'

const makeFormData = (): RecipeFormType => ({
  title: 'Soft-fail Test Recipe',
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  fridgeLife: 0,
  freezerLife: 0,
  description: 'Recipe for asserting nutrition failure does not abort creation',
  ingredients: [
    {
      id: 'i1',
      parsedIngredient: {
        ingredient: 'Flour',
        quantity: 2,
        unit: 'cups',
        unitPlural: 'cups',
        symbol: null,
        minQty: 2,
        maxQty: 2,
        originalIngredientString: '2 cups flour',
        comment: '',
      },
      ingredientData: null,
    },
  ],
  instructions: [{ id: 'in1', content: 'Mix well', index: 1 }],
  recipeImage: new File([''], 'photo.jpg', { type: 'image/jpeg' }),
  cuisine: '',
  mealTypes: ['Dinner'],
})

describe('RecipeAPI.addRecipe — nutrition soft-fail (High #4)', () => {
  beforeEach(() => {
    httpPost.mockReset()
    nutritionPost.mockReset()
  })

  it('still POSTs the recipe and returns the server _id when getRecipeNutrition rejects', async () => {
    // Simulate Edamam being unreachable
    nutritionPost.mockRejectedValue(new Error('Edamam unreachable'))
    // Server accepts and returns an _id
    httpPost.mockResolvedValue({ data: { _id: 'srv-1' } })

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    expect(result).toBe('srv-1')
    // The recipe POST fires even though nutrition failed
    expect(httpPost).toHaveBeenCalledTimes(1)
    expect(httpPost.mock.calls[0][0]).toBe('api/addRecipe')

    // The submitted payload carries null nutrition fields (soft-fail degradation)
    const submittedRecipe = httpPost.mock.calls[0][1]
    expect(submittedRecipe.nutritionData).toBeNull()
    expect(submittedRecipe.nutritionLabels).toBeNull()
  })

  it('still POSTs the recipe and returns the _id when getRecipeNutrition resolves with empty data', async () => {
    nutritionPost.mockResolvedValue({ data: null })
    httpPost.mockResolvedValue({ data: { _id: 'srv-2' } })

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    expect(result).toBe('srv-2')
    expect(httpPost).toHaveBeenCalledWith('api/addRecipe', expect.any(Object))
  })
})

describe('RecipeAPI.editRecipe', () => {
  const sharedIngredient = () => ({
    id: 'i1',
    parsedIngredient: {
      ingredient: 'Flour',
      quantity: 2,
      unit: 'cups',
      unitPlural: 'cups',
      symbol: null,
      minQty: 2,
      maxQty: 2,
      originalIngredientString: '2 cups flour',
      comment: '',
    },
    ingredientData: null,
  })

  const makeOriginal = (): RecipeType => ({
    _id: 'recipe-1',
    title: 'Original Title',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    fridgeLife: 0,
    freezerLife: 0,
    description: 'Original description',
    ingredients: [sharedIngredient()],
    instructions: [{ id: 'in1', content: 'Mix well', index: 1 }],
    recipeImage: 'https://cdn/original.jpg',
    nutritionData: { uri: 'orig' } as unknown as RecipeType['nutritionData'],
    totalTime: 30,
    authorUsername: 'testuser',
    rating: { rateCount: 5, rateValue: 4 },
    createdAt: '1000',
    editedAt: null,
    servingPrice: 100,
    cuisine: '',
    mealTypes: ['Dinner'],
    nutritionLabels: ['Vegan'],
    views: 10,
    numTimesSaved: 2,
    numTimesMade: 1,
  })

  const makeEditData = (
    overrides: Partial<RecipeEditFormType> = {}
  ): RecipeEditFormType => ({
    title: 'Edited Title',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    fridgeLife: 0,
    freezerLife: 0,
    description: 'Edited description',
    ingredients: [sharedIngredient()],
    instructions: [{ id: 'in1', content: 'Mix well', index: 1 }],
    recipeImage: undefined,
    cuisine: '',
    mealTypes: ['Dinner'],
    ...overrides,
  })

  beforeEach(() => {
    httpPut.mockReset()
    nutritionPost.mockReset()
  })

  it('PUTs to the edit endpoint and resolves true on success', async () => {
    httpPut.mockResolvedValue({ data: {} })
    const result = await RecipeAPI.editRecipe(
      'recipe-1',
      makeEditData(),
      makeOriginal(),
      () => {}
    )
    expect(result).toBe(true)
    expect(httpPut.mock.calls[0][0]).toBe('api/editRecipe?recipeId=recipe-1')
    expect(httpPut.mock.calls[0][1].title).toBe('Edited Title')
  })

  it('reuses the existing image and stored nutrition when ingredients are unchanged', async () => {
    httpPut.mockResolvedValue({ data: {} })
    await RecipeAPI.editRecipe('recipe-1', makeEditData(), makeOriginal(), () => {})

    // No new file picked + unchanged ingredients => no Edamam call.
    expect(nutritionPost).not.toHaveBeenCalled()
    const payload = httpPut.mock.calls[0][1]
    expect(payload.recipeImage).toBe('https://cdn/original.jpg')
    expect(payload.nutritionData).toEqual({ uri: 'orig' })
    expect(payload.nutritionLabels).toEqual(['Vegan'])
  })

  it('recomputes nutrition when the ingredients change', async () => {
    nutritionPost.mockResolvedValue({
      data: { uri: 'new', dietLabels: [], healthLabels: [] },
    })
    httpPut.mockResolvedValue({ data: {} })

    const changed = makeEditData({
      ingredients: [
        {
          ...sharedIngredient(),
          parsedIngredient: {
            ...sharedIngredient().parsedIngredient,
            ingredient: 'Sugar',
            quantity: 1,
            unit: 'cup',
            originalIngredientString: '1 cup sugar',
          },
        },
      ],
    })

    await RecipeAPI.editRecipe('recipe-1', changed, makeOriginal(), () => {})

    expect(nutritionPost).toHaveBeenCalledTimes(1)
    const payload = httpPut.mock.calls[0][1]
    expect(payload.nutritionData).toEqual({
      uri: 'new',
      dietLabels: [],
      healthLabels: [],
    })
  })

  it('uploads and uses a new image when one is provided', async () => {
    httpPut.mockResolvedValue({ data: {} })
    const withImage = makeEditData({
      recipeImage: new File([''], 'new.jpg', { type: 'image/jpeg' }),
    })

    await RecipeAPI.editRecipe('recipe-1', withImage, makeOriginal(), () => {})

    const payload = httpPut.mock.calls[0][1]
    // The test env runs uploadRecipeImage's Cypress branch (VITE_CYPRESS='true'),
    // which returns this stub URL — proving the upload path ran rather than the
    // original image being reused.
    expect(payload.recipeImage).toBe('https://cypress.test/fake-recipe-image.jpg')
    expect(payload.recipeImage).not.toBe('https://cdn/original.jpg')
  })
})
