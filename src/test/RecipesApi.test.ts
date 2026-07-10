import { vi } from 'vitest'

// Mock firebase/storage so uploadRecipeImage doesn't reach the real SDK.
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: vi.fn().mockResolvedValue(undefined),
  getDownloadURL: vi.fn().mockResolvedValue('https://fake.cdn/image.jpg'),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue('test-uid'),
    getUsername: vi.fn().mockResolvedValue('testuser'),
  },
}))

const httpPost = vi.fn()
const httpPut = vi.fn()
const httpGet = vi.fn()
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
    get: (...args: unknown[]) => httpGet(...args),
  },
}))

// Import after mocks are in place.
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import type { ParsedIngredient } from '@jclind/ingredient-parser'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'
import type {
  IngredientsType,
  RecipeEditFormType,
  RecipeFormType,
  RecipeType,
} from 'types'

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
    expect(httpPost.mock.calls[0][0]).toBe('api/addRecipe')
    // Empty nutrition data degrades to an explicit null in the posted body.
    expect(httpPost.mock.calls[0][1].nutritionData).toBeNull()
  })
})

describe('RecipeAPI.addRecipe — orphaned-image cleanup (X3)', () => {
  beforeEach(() => {
    httpPost.mockReset()
    nutritionPost.mockReset()
    vi.mocked(deleteObject).mockClear()
    // Exercise the real (mocked-SDK) upload + cleanup path, not the Cypress stub.
    vi.stubEnv('VITE_CYPRESS', 'false')
    nutritionPost.mockResolvedValue({ data: null })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('deletes the just-uploaded image when the server rejects the recipe', async () => {
    httpPost.mockRejectedValue(
      Object.assign(new Error('rejected'), {
        isAxiosError: true,
        response: { status: 422, data: { error: 'Moderation block' } },
      })
    )

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    // The failure is still surfaced to the caller...
    expect(result).toEqual({ status: 'error', message: 'Moderation block' })
    // ...and the orphaned Storage object is removed (keyed by its download URL).
    expect(deleteObject).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ref).mock.calls.at(-1)?.[1]).toBe('https://fake.cdn/image.jpg')
  })

  it('does NOT delete the image when creation succeeds', async () => {
    httpPost.mockResolvedValue({ data: { _id: 'srv-ok' } })

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    expect(result.status).toBe('success')
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('still returns the server error even if the cleanup delete fails', async () => {
    httpPost.mockRejectedValue(
      Object.assign(new Error('rejected'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      })
    )
    vi.mocked(deleteObject).mockRejectedValueOnce(new Error('storage down'))

    const result = await RecipeAPI.addRecipe(makeFormData(), () => {})

    // A cleanup failure must not throw or mask the original create error.
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to create recipe. Please try again.',
    })
    expect(deleteObject).toHaveBeenCalledTimes(1)
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
  // Restore env after every test so a stubbed VITE_CYPRESS (set by the X3 cases
  // below) can't leak into later tests if an assertion throws mid-test.
  afterEach(() => {
    vi.unstubAllEnvs()
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
    // The lookup is fed the exact 'quantity unit name' strings for the NEW set.
    expect(nutritionPost).toHaveBeenCalledWith('api/nutrition/details', {
      title: 'recipe 1',
      ingr: ['1 cup Sugar'],
    })
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
    expect(nutritionPost).toHaveBeenCalledWith('api/nutrition/details', {
      title: 'recipe 1',
      ingr: ['1 cup Sugar'],
    })
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

  it('deletes a newly uploaded image when the edit fails (X3)', async () => {
    vi.mocked(deleteObject).mockClear()
    vi.stubEnv('VITE_CYPRESS', 'false')
    httpPut.mockRejectedValue(
      Object.assign(new Error('rejected'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      })
    )
    const withImage = makeEditData({
      recipeImage: new File([''], 'new.jpg', { type: 'image/jpeg' }),
    })

    await RecipeAPI.editRecipe('recipe-1', withImage, makeOriginal(), () => {})

    // The just-uploaded object (its download URL) is the one removed.
    expect(deleteObject).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ref).mock.calls.at(-1)?.[1]).toBe('https://fake.cdn/image.jpg')
  })

  it('does NOT delete the existing image when the edit reuses it and fails (X3)', async () => {
    vi.mocked(deleteObject).mockClear()
    vi.stubEnv('VITE_CYPRESS', 'false')
    httpPut.mockRejectedValue(
      Object.assign(new Error('rejected'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      })
    )

    // makeEditData() defaults recipeImage to undefined → the original stored image
    // is reused, so a failed edit must NOT delete the still-live original.
    await RecipeAPI.editRecipe('recipe-1', makeEditData(), makeOriginal(), () => {})

    expect(deleteObject).not.toHaveBeenCalled()
  })
})

describe('RecipeAPI.getAllRecipes — query-string encoding', () => {
  beforeEach(() => {
    httpGet.mockReset()
    httpGet.mockResolvedValue({ data: { recipes: [], totalCount: 0 } })
  })

  it('URL-encodes a multi-word cuisine', async () => {
    await RecipeAPI.getAllRecipes({ cuisine: 'Middle Eastern' })
    expect(httpGet.mock.calls[0][0]).toBe(
      'api/recipes?q=&page=0&recipesPerPage=5&order=new&cuisine=Middle+Eastern'
    )
  })

  it('URL-encodes an &-containing search term so it survives the round-trip', async () => {
    await RecipeAPI.getAllRecipes({ query: 'mac & cheese' })
    const url: string = httpGet.mock.calls[0][0]
    expect(url).toBe(
      'api/recipes?q=mac+%26+cheese&page=0&recipesPerPage=5&order=new&cuisine='
    )
    // The server-side parse recovers the raw term intact.
    const parsed = new URLSearchParams(url.split('?')[1])
    expect(parsed.get('q')).toBe('mac & cheese')
  })
})

describe('RecipeAPI.getIngredientData — RATE_LIMITED soft-fail (B3)', () => {
  beforeEach(() => {
    httpPost.mockReset()
  })

  it('returns an honest RATE_LIMITED error carrying retryAt from the Retry-After header', async () => {
    httpPost.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 429,
        data: { error: 'Too many ingredient lookups — wait a minute and try again.', code: 'RATE_LIMITED' },
        headers: { 'retry-after': '45' },
      },
    })

    const before = Date.now()
    const result = await RecipeAPI.getIngredientData('2 cups flour')
    const after = Date.now()

    expect('error' in result).toBe(true)
    if ('error' in result && result.error) {
      expect(result.error.code).toBe('RATE_LIMITED')
      expect(result.error.message).toMatch(/45s/)
      expect(result.error.retryAt).toBeGreaterThanOrEqual(before + 45_000)
      expect(result.error.retryAt).toBeLessThanOrEqual(after + 45_000)
    }
    expect(result.ingredientData).toBeNull()
  })

  it('falls back to a 60s wait when Retry-After is missing', async () => {
    httpPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: { code: 'RATE_LIMITED' }, headers: {} },
    })

    const before = Date.now()
    const result = await RecipeAPI.getIngredientData('2 cups flour')

    if ('error' in result && result.error) {
      expect(result.error.code).toBe('RATE_LIMITED')
      expect(result.error.retryAt).toBeGreaterThanOrEqual(before + 60_000)
    } else {
      throw new Error('expected an error variant')
    }
  })

  it('does not mistake a plain 500 for a rate limit (no code = generic error, no retryAt)', async () => {
    httpPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { error: 'proxy exploded' }, headers: {} },
    })

    const result = await RecipeAPI.getIngredientData('2 cups flour')

    if ('error' in result && result.error) {
      expect(result.error.code).toBeUndefined()
      expect(result.error.retryAt).toBeUndefined()
    } else {
      throw new Error('expected an error variant')
    }
  })
})

describe('RecipeAPI.getReviews — legacy rating normalization (coerceRating)', () => {
  beforeEach(() => {
    httpGet.mockReset()
  })

  it("coerces '4.5'→4.5 and ''/'abc'→null at the API boundary", async () => {
    httpGet.mockResolvedValue({
      data: {
        totalCount: 3,
        reviews: [
          { reviewText: 'stringified float', rating: '4.5' },
          { reviewText: 'rating-less legacy doc', rating: '' },
          { reviewText: 'corrupt value', rating: 'abc' },
        ],
      },
    })

    const result = await RecipeAPI.getReviews('recipe-1', 'new', 0)

    expect(result.reviews.map(r => r.rating)).toEqual([4.5, null, null])
  })
})

describe('RecipeAPI.getRecipeNutrition — ingr payload rules', () => {
  const parsed = (overrides: Partial<ParsedIngredient> = {}): ParsedIngredient => ({
    ingredient: 'Flour',
    quantity: 2,
    unit: 'cups',
    unitPlural: 'cups',
    symbol: null,
    minQty: 2,
    maxQty: 2,
    originalIngredientString: '2 cups flour',
    comment: '',
    ...overrides,
  })

  beforeEach(() => {
    nutritionPost.mockReset()
    nutritionPost.mockResolvedValue({ data: null })
  })

  it('sends "quantity unit name" rows, dropping labels and quantity-less rows', async () => {
    const ingredients: IngredientsType[] = [
      { id: 'i1', parsedIngredient: parsed(), ingredientData: null },
      // Section label — no parsedIngredient, must not reach Edamam.
      { id: 'lbl', label: 'For the sauce' },
      // No quantity — unparseable by the lookup, dropped.
      {
        id: 'i2',
        parsedIngredient: parsed({
          ingredient: 'Salt',
          quantity: null,
          unit: null,
          originalIngredientString: 'Salt to taste',
        }),
        ingredientData: null,
      },
      // No unit — padded with '' (double space preserved by the template).
      {
        id: 'i3',
        parsedIngredient: parsed({
          ingredient: 'Eggs',
          quantity: 3,
          unit: null,
          originalIngredientString: '3 eggs',
        }),
        ingredientData: null,
      },
    ]

    await RecipeAPI.getRecipeNutrition(ingredients)

    expect(nutritionPost).toHaveBeenCalledWith('api/nutrition/details', {
      title: 'recipe 1',
      ingr: ['2 cups Flour', '3  Eggs'],
    })
  })
})

describe('RecipeAPI.uploadRecipeImage — uid-keyed Storage path (I2)', () => {
  beforeEach(() => {
    // Order-independence: earlier suites now also exercise the mocked upload path,
    // so clear the shared SDK mocks before each assertion on call counts here.
    vi.mocked(ref).mockClear()
    vi.mocked(uploadBytes).mockClear()
  })
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
