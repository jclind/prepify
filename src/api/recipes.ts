import { parseIngredientString } from '@jclind/ingredient-parser'
import axios, { type AxiosResponse } from 'axios'
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import {
  AccountTabCounts,
  IngredientsType,
  NewReviewType,
  NutritionDataType,
  CreatedRecipeCardType,
  OptionalReviewType,
  OwnReviewStatus,
  RecipeCardType,
  RecipeDBResponseType,
  RecipeEditFormType,
  RecipeFormType,
  RecipeSearchResponseType,
  RecipeType,
  ReviewType,
  SavedRecipeCardType,
} from 'types'
import AuthAPI from 'src/api/auth'
import { fetchIngredientEnrichment } from 'src/api/ingredientParserApi'
import { http } from 'src/api/http-common'
import { v4 as uuidv4 } from 'uuid'

export const ADD_RECIPE_AUTH_ERROR = 'AUTH_ERROR'

// Matches the code server/middleware/writeLimiter.js's makeUserLimiter carries
// on a 429 body ({ error, code: 'RATE_LIMITED' }) — the ingredient-parse
// limiter (server/routes/ingredients.js) is built from that same factory.
export const INGREDIENT_RATE_LIMIT_CODE = 'RATE_LIMITED'
// Fallback wait when the server didn't send a usable Retry-After header
// (shouldn't happen — express-rate-limit sets it whenever standardHeaders is
// on — but a stale proxy/CDN could strip it).
const DEFAULT_RATE_LIMIT_RETRY_SEC = 60

// Legacy ratings docs (pre-D1) store `rating` as a stringified number; new
// writes are floats and review-only docs are null. Normalize at the API
// boundary so the typed contract (`rating: number | null`) holds regardless
// of doc age.
const coerceRating = (r: unknown): number | null => {
  if (r == null || r === '') return null
  const n = Number(r)
  return Number.isNaN(n) ? null : n
}

type EditRecipeResult =
  | { status: 'success'; recipe: RecipeType }
  | { status: 'auth-error' }
  | { status: 'error'; message: string }

// addRecipe mirrors EditRecipeResult so the create path can surface the same
// things an edit can: a server moderation block (status: 'error', message) and a
// medium-confidence hold (status: 'success', pendingReview: true) where the recipe
// saved but is withheld from public reads until an admin clears it.
export type AddRecipeResult =
  | { status: 'success'; id: string; pendingReview: boolean }
  | { status: 'auth-error' }
  | { status: 'error'; message: string }

type GetAllRecipesParams = {
  page?: number
  order?: string
  /** OR-based tag match (mealTypes ∪ nutritionLabels) — used by Home. */
  tags?: string[]
  cuisine?: string
  recipesPerPage?: number
  query?: string
  /** Any of the selected meal types. */
  mealTypes?: string[]
  /** Conjunctive (AND) diet filter — recipe must carry every label. */
  diets?: string[]
}

/** Distinct filter values that actually exist in the catalog. */
type RecipeFacets = {
  cuisines: string[]
  diets: string[]
  mealTypes: string[]
}

class RecipeAPIClass {
  async getAllRecipes({
    page = 0,
    order = 'new',
    // `tags` is OR-based (used by the Home meal lookup). `diets` is the
    // conjunctive (AND) dietary filter; `mealTypes` matches any selected meal.
    tags = [],
    cuisine = '',
    recipesPerPage = 5,
    query = '',
    mealTypes = [],
    diets = [],
  }: GetAllRecipesParams = {}): Promise<RecipeDBResponseType> {
    // Build via URLSearchParams so every value is encoded — search terms and
    // multi-word cuisines (e.g. "Middle Eastern") would otherwise corrupt the
    // query string.
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      recipesPerPage: String(recipesPerPage),
      order,
      cuisine,
    })
    if (tags.length > 0) params.set('tags', tags.join(','))
    if (mealTypes.length > 0) params.set('mealTypes', mealTypes.join(','))
    if (diets.length > 0) params.set('diets', diets.join(','))

    const result = await http.get(`api/recipes?${params.toString()}`)
    return result.data
  }
  async searchAutoCompleteRecipes(
    title = ''
  ): Promise<RecipeSearchResponseType[]> {
    // Encode the term so special characters (&, %, #, +, …) survive the
    // round-trip — mirrors getAllRecipes' URLSearchParams encoding above.
    const result = await http.get(
      `api/searchAutoCompleteRecipes?title=${encodeURIComponent(title)}`
    )
    return result.data
  }
  async getTrendingRecipes(limit = 4): Promise<RecipeCardType[]> {
    const result = await http.get(`api/getTrendingRecipes?limit=${limit}`)
    return result.data
  }
  // Personalized home row. Requires auth (token attached by the http
  // interceptor); returns [] when the user has too little signal to personalize.
  async getForYouRecipes(limit = 8): Promise<RecipeCardType[]> {
    const result = await http.get(`api/getForYouRecipes?limit=${limit}`)
    return result.data
  }
  // One random recipe for the "What should I cook?" button. Taste-aware when
  // signed in (token attached by the interceptor); a uniform random pick
  // otherwise. `excludeId` re-rolls without repeating the current pick. Resolves
  // null when the catalog is empty (404) so the caller can show a soft message.
  async getRandomRecipe(excludeId?: string): Promise<RecipeCardType | null> {
    const params = excludeId ? `?exclude=${encodeURIComponent(excludeId)}` : ''
    try {
      const result = await http.get(`api/recipes/random${params}`)
      return result.data
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null
      throw err
    }
  }
  async getRecipe(id: string): Promise<RecipeType> {
    const result = await http.get(`api/getRecipe?id=${id}`)
    return result.data
  }
  async deleteRecipe(recipeId: string): Promise<unknown> {
    const result = await http.delete(`api/deleteRecipe?recipeId=${recipeId}`)
    return result.data
  }

  async saveRecipe(recipeId = ''): Promise<AxiosResponse> {
    return await http.post(`api/recipes/${recipeId}/save`)
  }
  async getSavedRecipe(
    recipeId = ''
  ): Promise<{
    recipeId: string
    dateSaved: string
    collectionIds?: string[]
  } | null> {
    const result = await http.get(`api/getSavedRecipe?recipeId=${recipeId}`)
    return result.data
  }
  // The current user's saved recipe ids — one request the whole grid can share.
  async getSavedRecipeIds(): Promise<string[]> {
    const result = await http.get('api/getSavedRecipeIds')
    return result.data
  }
  async getRecipeFacets(): Promise<RecipeFacets> {
    const result = await http.get('api/recipes/facets')
    return result.data
  }
  async unsaveRecipe(recipeId = ''): Promise<AxiosResponse> {
    return await http.delete(`api/recipes/${recipeId}/save`)
  }
  async madeRecipe(recipeId: string): Promise<unknown> {
    if (!AuthAPI.getUID()) return

    const result = await http.post(`api/madeRecipe?recipeId=${recipeId}`)
    return result.data
  }
  async checkMadeRecipe(
    recipeId: string
  ): Promise<{ made: boolean } | undefined> {
    if (!AuthAPI.getUID()) return

    const result = await http.get(`api/checkMadeRecipe?recipeId=${recipeId}`)
    return result.data
  }

  uploadRecipeImage = async (
    imageFile: File,
    setProgress: (val: number) => void
  ): Promise<string> => {
    if (imageFile) {
      // Cypress bridge: skip the real Firebase Storage SDK during E2E runs so
      // tests don't need to intercept multipart/preflight upload protocol.
      // VITE_CYPRESS is inlined at build time, so production bundles tree-shake
      // this branch entirely (the condition becomes `'false' === 'true'`).
      if (import.meta.env.VITE_CYPRESS === 'true') {
        setProgress(40)
        setProgress(50)
        setProgress(70)
        return 'https://cypress.test/fake-recipe-image.jpg'
      }
      // Key the object by owner uid + a random uuid: `recipeImages/{uid}/{uuid}`
      // (BACKLOG I2). The old `recipeImages/{imageFile.name}` key let two users'
      // `photo.jpg` collide and — because the path carried no uid — meant
      // storage.rules could only auth-gate writes, not scope them to the owner.
      // The uid prefix lets the rule enforce `request.auth.uid == uid` (mirroring
      // profilePhotos/{uid}); the uuid makes the object collision-proof so we no
      // longer need the original filename. No extension is needed — Firebase sets
      // the content type from the File, and the I1 variant helper derives the
      // srcset stem from the object path regardless of extension.
      const uid = AuthAPI.getUID()
      if (!uid) {
        // Defensive: both addRecipe/editRecipe run behind auth, and the tightened
        // storage.rules would reject a uid-less write anyway — fail closed rather
        // than fall back to an unscoped path.
        throw new Error('Must be signed in to upload a recipe image')
      }
      const storage = getStorage()

      const recipeImagesRef = ref(storage, `recipeImages/${uid}/${uuidv4()}`)
      setProgress(40)
      await uploadBytes(recipeImagesRef, imageFile)
      setProgress(50)
      const fileUrl = await getDownloadURL(recipeImagesRef)
      setProgress(70)
      return fileUrl
    } else {
      return ''
    }
  }

  // Best-effort cleanup for a recipe image we just uploaded to Storage but which
  // ended up orphaned — the create/edit request to the server failed *after* the
  // upload succeeded, so the object exists with no recipe pointing at it. Call this
  // only with a URL for an image uploaded in the *current* submit (never an existing
  // recipe's stored image, which the edit path may reuse unchanged).
  private deleteRecipeImage = async (imageUrl: string): Promise<void> => {
    if (!imageUrl) return
    // Cypress E2E short-circuits uploadRecipeImage (no real object is written) and
    // hands back a fake URL that isn't a valid Storage ref — nothing to delete.
    if (import.meta.env.VITE_CYPRESS === 'true') return
    try {
      // ref(storage, url) resolves the object from its download URL, so we don't
      // need to thread the original StorageReference through the submit flow.
      await deleteObject(ref(getStorage(), imageUrl))
    } catch (err) {
      // The recipe submit already failed and its error is what the user needs to
      // see; a leftover image is a minor storage leak, so swallow this rather than
      // mask the real failure.
      console.error('Failed to clean up orphaned recipe image:', err)
    }
  }

  // The editable subset of a recipe document, assembled from the form data plus
  // the values computed at submit time. addRecipe layers creation-only fields
  // (authorUsername, rating, counters…) on top; editRecipe sends it as-is. Single
  // source for the field list so the two paths can't drift.
  private buildEditableRecipeFields(
    data: RecipeFormType | RecipeEditFormType,
    computed: {
      recipeImage: string
      nutritionData: NutritionDataType | null
      servingPrice: number
      totalTime: number
    }
  ) {
    return {
      title: data.title,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      fridgeLife: data.fridgeLife,
      freezerLife: data.freezerLife,
      description: data.description,
      ingredients: data.ingredients,
      instructions: data.instructions,
      cuisine: data.cuisine,
      mealTypes: data.mealTypes,
      // Author-selected diet tags. Unlike nutritionData (still computed from
      // Edamam), these come straight from the form.
      nutritionLabels: data.nutritionLabels,
      recipeImage: computed.recipeImage,
      nutritionData: computed.nutritionData,
      servingPrice: computed.servingPrice,
      totalTime: computed.totalTime,
    }
  }

  async addRecipe(
    recipeData: RecipeFormType,
    setProgress: (val: number) => void
  ): Promise<AddRecipeResult> {
    // Track the image uploaded in this submit so we can delete it if the server
    // rejects the recipe after the upload (create always uploads a fresh object).
    let uploadedImageUrl = ''
    try {
      setProgress(10)
      const authorUsername: string | null = await AuthAPI.getUsername()
      if (!authorUsername) throw Error('User does not exist')
      const recipeImage: string = await this.uploadRecipeImage(
        recipeData.recipeImage,
        setProgress
      )
      uploadedImageUrl = recipeImage
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      setProgress(80)
      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)
      // Diet labels now come from the form (recipeData.nutritionLabels); Edamam
      // only supplies the numeric nutrition facts.
      const nutritionData = await this.getRecipeNutrition(recipeData.ingredients)
      // The create body carries only what the server actually reads on create
      // (CREATABLE_RECIPE_FIELDS = editable content + authorUsername). Everything
      // else on a recipe is server-authoritative and stamped server-side, so we
      // don't send it: _id, the createdAt/editedAt timestamps (a client clock
      // must not dictate the "Newest"-sort position), the zeroed rating, and the
      // view/save/made counters. The server ignores any of these it receives —
      // omitting them keeps the payload honest about what's authoritative.
      const returnRecipeData: Omit<
        RecipeType,
        | '_id'
        | 'createdAt'
        | 'editedAt'
        | 'rating'
        | 'views'
        | 'numTimesSaved'
        | 'numTimesMade'
      > = {
        ...this.buildEditableRecipeFields(recipeData, {
          recipeImage,
          nutritionData,
          servingPrice,
          totalTime,
        }),
        authorUsername,
      }
      setProgress(90)
      const result = await http.post<{ _id: string; pendingReview?: boolean }>(
        'api/addRecipe',
        returnRecipeData
      )
      return {
        status: 'success',
        id: result.data._id,
        pendingReview: !!result.data.pendingReview,
      }
    } catch (error: unknown) {
      console.error('addRecipe failed:', error)
      // The recipe wasn't created, so any image we uploaded for it is now an
      // orphan — remove it (best-effort; never masks the error below).
      await this.deleteRecipeImage(uploadedImageUrl)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return { status: 'auth-error' }
        // Surface the server's reason (e.g. a 422 moderation block) so the user
        // sees why the recipe was rejected instead of a generic "try again".
        const message =
          error.response?.data?.error ??
          'Failed to create recipe. Please try again.'
        return { status: 'error', message }
      }
      return { status: 'error', message: 'Failed to create recipe. Please try again.' }
    }
  }

  async editRecipe(
    recipeId: string,
    recipeData: RecipeEditFormType,
    originalRecipe: RecipeType,
    setProgress: (val: number) => void
  ): Promise<EditRecipeResult> {
    // Only a *newly* uploaded image is eligible for cleanup on failure — never the
    // recipe's existing stored image, which stays live when the edit is reused.
    let uploadedImageUrl = ''
    try {
      setProgress(10)
      // Image: only upload when the user picked a new file. Otherwise the recipe
      // keeps its existing stored image URL.
      let recipeImage = originalRecipe.recipeImage
      if (recipeData.recipeImage) {
        recipeImage = await this.uploadRecipeImage(
          recipeData.recipeImage,
          setProgress
        )
        uploadedImageUrl = recipeImage
      }
      setProgress(80)
      // Serving price is a local calculation (no API cost), so always recompute —
      // it depends on both ingredients and servings.
      const servingPrice: number = calculateServingPrice(
        recipeData.ingredients,
        recipeData.servings
      )
      const totalTime: number = recipeData.prepTime + (recipeData.cookTime ?? 0)

      // Numeric nutrition is a paid Edamam call, so only re-run it when the
      // ingredient set actually changed; minor edits (title, instructions, times)
      // reuse the stored nutrition data. Diet labels are author-supplied via the
      // form, so they're not part of this check. Compare the exact strings the
      // lookup would send, element-wise.
      const newIngredients = this.buildNutritionIngredients(recipeData.ingredients)
      const oldIngredients = this.buildNutritionIngredients(originalRecipe.ingredients)
      const ingredientsChanged =
        newIngredients.length !== oldIngredients.length ||
        newIngredients.some((ingr, i) => ingr !== oldIngredients[i])

      let nutritionData = originalRecipe.nutritionData
      if (ingredientsChanged) {
        // getRecipeNutrition soft-fails to null when Edamam is unreachable. Only
        // overwrite when it actually returned data — otherwise a transient lookup
        // failure during an ingredient edit would erase the recipe's existing
        // nutrition facts for all viewers.
        const freshNutritionData = await this.getRecipeNutrition(
          recipeData.ingredients
        )
        if (freshNutritionData) {
          nutritionData = freshNutritionData
        }
      }
      setProgress(90)
      // Only the editable fields are sent; the server whitelists these and never
      // lets ratings/saves/counters be overwritten.
      const payload = this.buildEditableRecipeFields(recipeData, {
        recipeImage,
        nutritionData,
        servingPrice,
        totalTime,
      })
      const res = await http.put<RecipeType>(
        `api/editRecipe?recipeId=${recipeId}`,
        payload
      )
      return { status: 'success', recipe: res.data }
    } catch (error: unknown) {
      console.error('editRecipe failed:', error)
      // If the edit failed after uploading a new image, that new object is orphaned
      // (the recipe still points at its old image) — remove it. uploadedImageUrl is
      // empty when the edit reused the existing image, so that stays untouched.
      await this.deleteRecipeImage(uploadedImageUrl)
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return { status: 'auth-error' }
        // Surface the server's reason (e.g. 403 Forbidden, 404 Not found) so a
        // stale edit page doesn't show a misleading "try again" for an error a
        // retry can't fix.
        const message =
          error.response?.data?.error ??
          'Failed to update recipe. Please try again.'
        return { status: 'error', message }
      }
      return { status: 'error', message: 'Failed to update recipe. Please try again.' }
    }
  }
  // The exact ingredient strings sent to Edamam for nutrition lookup. Shared by
  // getRecipeNutrition and editRecipe so the "did the ingredients change?" check
  // compares the same representation that actually drives the nutrition result.
  buildNutritionIngredients(ingrArr: IngredientsType[]): string[] {
    const ingr: string[] = []
    ingrArr.forEach(ing => {
      if ('parsedIngredient' in ing) {
        const { quantity, unit, ingredient } = ing.parsedIngredient
        if (quantity) {
          ingr.push(`${quantity} ${unit || ''} ${ingredient}`)
        }
      }
    })
    return ingr
  }
  // Fetches the numeric nutrition facts (calories, macros…) for the given
  // ingredients via the server proxy (POST /api/nutrition/details), which holds
  // the Edamam app id/key server-side — they no longer ship in the client bundle.
  // Diet/health labels are no longer derived here — authors set those manually on
  // the form. Soft-fails to null so a lookup outage never blocks recipe
  // creation/editing.
  async getRecipeNutrition(
    ingrArr: IngredientsType[]
  ): Promise<NutritionDataType | null> {
    try {
      const ingrData: { title: string; ingr: string[] } = {
        title: 'recipe 1',
        ingr: this.buildNutritionIngredients(ingrArr),
      }
      const nutritionResultRes = await http.post('api/nutrition/details', ingrData)

      const nutritionResult: NutritionDataType = nutritionResultRes.data

      return nutritionResult ?? null
    } catch (error: unknown) {
      console.error('getRecipeNutrition failed:', error)
      return null
    }
  }

  // Ratings / Reviews
  async addRating(recipeId: string, rating: number): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.post(`api/addRating?recipeId=${recipeId}&rating=${rating}`)
  }

  async newReview(recipeId: string, text: string): Promise<ReviewType | null> {
    if (!AuthAPI.getUID()) return null

    const data: NewReviewType = {
      recipeId,
      reviewText: text,
    }
    const result = await http.post(`api/newReview`, data)
    return result.data
  }
  async checkIfReviewed(recipeId: string): Promise<OwnReviewStatus | null> {
    if (!AuthAPI.getUID()) return null

    const result = await http.get(`api/checkIfReviewed?recipeId=${recipeId}`)
    const data = result.data
    return data ? { ...data, rating: coerceRating(data.rating) } : data
  }
  async editReview(recipeId: string, text: string): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    // recipeId/text go in the JSON body (the axios instance defaults
    // Content-Type: application/json) — the server reads the body first,
    // falling back to query params for older clients.
    return await http.post('api/editReview', { recipeId, text })
  }
  async deleteReview(recipeId: string): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.delete(`api/deleteReview?recipeId=${recipeId}`)
  }
  // Removes only the user's star rating (keeps any written review).
  async removeRating(recipeId: string): Promise<AxiosResponse | null> {
    if (!AuthAPI.getUID()) return null
    return await http.delete(`api/removeRating?recipeId=${recipeId}`)
  }
  async getReviews(
    recipeId: string,
    filter = 'new',
    page: number,
    reviewsPerPage = 5
  ): Promise<{ reviews: ReviewType[]; totalCount: number }> {
    const result = await http.get(
      `api/getReviews?recipeId=${recipeId}&page=${page}&reviewsPerPage=${reviewsPerPage}&filter=${filter}`
    )
    const data = result.data
    return data
      ? {
          ...data,
          reviews: (data.reviews ?? []).map((r: ReviewType) => ({
            ...r,
            rating: coerceRating(r.rating),
          })),
        }
      : data
  }
  async getSingleUserReviews(
    page = 0,
    reviewsPerPage = 5,
    filter = 'new',
    returnRecipeData = false
  ): Promise<{ reviews: OptionalReviewType[]; totalCount: number } | null> {
    const username = await AuthAPI.getUsername()
    if (!username) return null
    const reviewResult = await http.get(
      `api/getSingleUserReviews?username=${username}&page=${page}&reviewsPerPage=${reviewsPerPage}&filter=${filter}&returnRecipeData=${returnRecipeData}`
    )
    const data = reviewResult.data
    return data
      ? {
          ...data,
          reviews: (data.reviews ?? []).map((r: OptionalReviewType) => ({
            ...r,
            rating: coerceRating(r.rating),
          })),
        }
      : data
  }

  // Ingredients
  async getIngredientData(val: string): Promise<IngredientsType> {
    const parsedIngredient = parseIngredientString(val)
    // Phase A: enrichment is soft-fail. A thrown network error (server down, timeout,
    // 5xx surfaced as axios rejection) must not bubble up — callers stick on the
    // loading state and the ingredient never appears. Wrap and degrade to the
    // parsed-only IngredientsType so the ingredient is still added to the recipe.
    try {
      const enrichment = await fetchIngredientEnrichment(parsedIngredient)

      // A clean lookup miss returns `data: null` (the server soft-fails to that;
      // a real proxy/network failure throws and is caught below). Surface it as
      // the row's error state so the UI shows its Retry affordance.
      if (!enrichment.data) {
        return {
          error: { message: 'No ingredient data returned' },
          parsedIngredient,
          ingredientData: null,
          id: uuidv4(),
        }
      }

      return {
        parsedIngredient,
        ingredientData: enrichment.data,
        id: uuidv4(),
      }
    } catch (err: unknown) {
      // A 429 from the parse limiter (server/routes/ingredients.js) is a
      // distinct, expected failure mode — not a generic outage — so it gets
      // its own honest message + a retryAt the caller can use to hold off the
      // retry affordance instead of immediately re-429ing.
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 429 &&
        (err.response.data as { code?: string } | undefined)?.code ===
          INGREDIENT_RATE_LIMIT_CODE
      ) {
        const retryAfterHeader = Number(err.response.headers?.['retry-after'])
        const retryAfterSec =
          Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader
            : DEFAULT_RATE_LIMIT_RETRY_SEC
        return {
          error: {
            message: `Too many ingredient lookups — wait ${retryAfterSec}s and retry.`,
            code: INGREDIENT_RATE_LIMIT_CODE,
            retryAt: Date.now() + retryAfterSec * 1000,
          },
          parsedIngredient,
          ingredientData: null,
          id: uuidv4(),
        }
      }
      const message =
        err instanceof Error ? err.message : 'Ingredient enrichment request failed'
      return {
        error: { message },
        parsedIngredient,
        ingredientData: null,
        id: uuidv4(),
      }
    }
  }

  // User
  async getSavedRecipes(
    page: number,
    recipesPerPage: number,
    order: string,
    collectionId?: string,
    q?: string
  ): Promise<{ recipes: SavedRecipeCardType[]; totalCount: number } | null> {
    if (!AuthAPI.getUID()) return null
    const params = new URLSearchParams({
      page: String(page),
      recipesPerPage: String(recipesPerPage),
      order,
    })
    if (collectionId) params.set('collectionId', collectionId)
    if (q && q.trim()) params.set('q', q.trim())
    const result = await http.get(`api/getSavedRecipes?${params.toString()}`)
    return result.data
  }
  async getCreatedRecipes(
    page: number,
    recipesPerPage: number,
    order: string
  ): Promise<{ recipes: CreatedRecipeCardType[]; totalCount: number } | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get(
      `api/getCreatedRecipes?page=${page}&recipesPerPage=${recipesPerPage}&order=${order}`
    )
    return result.data
  }
  // Aggregate counts for the account-page tabs in a single request. Skipped
  // (returns null) when nobody is signed in, like the other account queries.
  async getAccountCounts(): Promise<AccountTabCounts | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get('api/getAccountCounts')
    return result.data
  }
}

const RecipeAPI = new RecipeAPIClass()

export default RecipeAPI
