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
const nutritionPost = vi.fn()
vi.mock('src/api/http-common', () => ({
  http: { post: (...args: unknown[]) => httpPost(...args) },
  nutrition: { post: (...args: unknown[]) => nutritionPost(...args) },
}))

// Import after mocks are in place.
import RecipeAPI from 'src/api/recipes'
import type { RecipeFormType } from 'types'

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
