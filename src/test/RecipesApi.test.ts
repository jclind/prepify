import { vi } from 'vitest'

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
// Nutrition now goes through the server proxy (POST api/nutrition/details) on the
// shared `http` instance rather than a separate Edamam axios client. Keep the two
// concerns split in tests by routing that one URL to its own mock, so existing
// assertions on httpPost (e.g. calls[0] === 'api/addRecipe') stay accurate.
const nutritionPost = vi.fn()
vi.mock('src/api/http-common', () => ({
  http: {
    post: (url: string, ...rest: unknown[]) =>
      url === 'api/nutrition/details'
        ? nutritionPost(url, ...rest)
        : httpPost(url, ...rest),
    put: (...args: unknown[]) => httpPut(...args),
  },
}))

// Import after mocks are in place.
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { ref, uploadBytes } from 'firebase/storage'
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
  // Author-selected diet tags now come from the form, independent of Edamam.
  nutritionLabels: ['VEGAN'],
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

    expect(result).toEqual({ status: 'success', id: 'srv-1', pendingReview: false })
    // The recipe POST fires even though nutrition failed
    expect(httpPost).toHaveBeenCalledTimes(1)
    expect(httpPost.mock.calls[0][0]).toBe('api/addRecipe')

    // The submitted payload carries null numeric nutrition (soft-fail
    // degradation), but the author-selected diet labels are unaffected by the
    // Edamam outage — they come straight from the form.
    const submittedRecipe = httpPost.mock.calls[0][1]
    expect(submittedRecipe.nutritionData).toBeNull()
    expect(submittedRecipe.nutritionLabels).toEqual(['VEGAN'])
  })

  it('still POSTs the recipe and returns the _id when getRecipeNutrition resolves with empty data', async () => {
    nutritionPost.mockResolvedValue({ data: null })
    httpPost.mockResolvedValue({ data: { _id: 'srv-2' } })

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    expect(result).toEqual({ status: 'success', id: 'srv-2', pendingReview: false })
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
    // Mirrors the edit form, which pre-fills from the recipe's existing labels.
    nutritionLabels: ['Vegan'],
    ...overrides,
  })

  beforeEach(() => {
    httpPut.mockReset()
    nutritionPost.mockReset()
  })

  it('PUTs to the edit endpoint and returns the updated recipe on success', async () => {
    httpPut.mockResolvedValue({ data: { _id: 'recipe-1', title: 'Edited Title' } })
    const result = await RecipeAPI.editRecipe(
      'recipe-1',
      makeEditData(),
      makeOriginal(),
      () => {}
    )
    expect(result).toEqual({
      status: 'success',
      recipe: { _id: 'recipe-1', title: 'Edited Title' },
    })
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

  it('keeps the existing nutrition when an ingredient edit hits a failed Edamam lookup', async () => {
    // Edamam unreachable => getRecipeNutrition soft-fails to null.
    nutritionPost.mockRejectedValue(new Error('Edamam down'))
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
    // The soft-fail must NOT erase the recipe's stored numeric nutrition; diet
    // labels are form-driven and pass through regardless.
    expect(payload.nutritionData).toEqual({ uri: 'orig' })
    expect(payload.nutritionLabels).toEqual(['Vegan'])
  })

  it('returns auth-error on a 401', async () => {
    httpPut.mockRejectedValue(
      Object.assign(new Error('unauthorized'), {
        isAxiosError: true,
        response: { status: 401, data: {} },
      })
    )
    const result = await RecipeAPI.editRecipe(
      'recipe-1',
      makeEditData(),
      makeOriginal(),
      () => {}
    )
    expect(result).toEqual({ status: 'auth-error' })
  })

  it('surfaces the server error message on a non-auth failure (e.g. 403)', async () => {
    httpPut.mockRejectedValue(
      Object.assign(new Error('request failed'), {
        isAxiosError: true,
        response: { status: 403, data: { error: 'Forbidden' } },
      })
    )
    const result = await RecipeAPI.editRecipe(
      'recipe-1',
      makeEditData(),
      makeOriginal(),
      () => {}
    )
    expect(result).toEqual({ status: 'error', message: 'Forbidden' })
  })
})

describe('RecipeAPI.uploadRecipeImage — uid-keyed Storage path (I2)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(ref).mockClear()
    vi.mocked(uploadBytes).mockClear()
    vi.mocked(AuthAPI.getUID).mockReturnValue('test-uid')
  })

  it('keys the upload at recipeImages/{uid}/{uuid}, never the raw filename', async () => {
    // The suite runs with VITE_CYPRESS='true' (the fake-URL short-circuit); stub it
    // off so the real, mocked-SDK upload path runs and we can inspect the ref path.
    vi.stubEnv('VITE_CYPRESS', 'false')
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })

    const url = await RecipeAPI.uploadRecipeImage(file, () => {})

    // getDownloadURL mock => the stored original URL is returned unchanged.
    expect(url).toBe('https://fake.cdn/image.jpg')
    // ref(storage, path): the object path is scoped to the owner uid + a uuid, so
    // two users' "photo.jpg" can't collide and storage.rules can scope by uid.
    const objectPath = vi.mocked(ref).mock.calls[0][1]
    expect(objectPath).toMatch(
      /^recipeImages\/test-uid\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(objectPath).not.toContain('photo.jpg')
    expect(uploadBytes).toHaveBeenCalledOnce()
  })

  it('fails closed (throws, no upload) when there is no authenticated uid', async () => {
    vi.stubEnv('VITE_CYPRESS', 'false')
    vi.mocked(AuthAPI.getUID).mockReturnValueOnce(null)
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })

    await expect(RecipeAPI.uploadRecipeImage(file, () => {})).rejects.toThrow(
      /signed in/i
    )
    // Never reaches the SDK — no unscoped/uid-less object is written.
    expect(ref).not.toHaveBeenCalled()
  })
})
