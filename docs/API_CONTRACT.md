# API Contract

Generated from static analysis of `src/api/`, `src/context/`, `src/pages/`, and `src/Components/`.
Read-only audit — no files modified.

---

## Axios Client Setup

**File:** `src/api/http-common.ts`

### Primary instance (`http`)
- **Base URL:** `import.meta.env.VITE_API_URL || 'http://localhost:4000'`
- **Default headers:** `Content-Type: application/json`
- **Request interceptor:** If `auth.currentUser` exists, fetches a fresh Firebase ID token and sets `Authorization: Bearer <token>` on every request. If the user is logged out, no header is set — **the header is omitted, not sent as an empty string**.
- All main-server paths are relative (no leading `/`, no `/api/` prefix) — e.g., `recipes`, `getRecipe`, `addRecipe`.

### External instance (`nutrition`)
- **Base URL:** `https://api.edamam.com/api`
- Used only for Edamam nutrition lookups. No Firebase auth. CORS headers set on the client (ineffective for server-to-server; these should be on the server response, not the request).

---

## Auth / Users

All endpoints hit the main server (`VITE_API_URL`). Auth is via the interceptor unless noted.

### GET /getUsername
- **Called from:** `src/api/auth.ts` → `AuthAPI.getUsername(userId?)`
- **Used by:** `AuthContext`, `Navbar`, `Account`, `Profile`, `RecipeControls`, `ReviewsContainer`, `getSingleUserReviews`, `checkIfReviewed`, `getReviews`
- **Request:** Query param `userId` (Firebase UID string)
  - If no `userId` argument is passed, the caller resolves the UID from `auth.currentUser` before calling.
- **Response:** `result.data` typed as `string | null` (the username string)
- **Auth:** Bearer token via interceptor (always present if user is logged in)
- **Error handling:** No try/catch anywhere in `AuthAPI.getUsername`. Call sites in components do not universally catch errors.

### GET /checkUsernameAvailability
- **Called from:** `src/api/auth.ts` → `AuthAPI.checkUsernameAvailability(username)`
- **Used by:** `AuthContext.signUp`, `UsernameInput` (debounced, 500ms)
- **Request:** Query param `username` (string)
  - **Bug:** URL is constructed as `?&username=` (double ampersand — the leading `&` is spurious).
- **Response:** `result.data` typed as `boolean` (true = available)
- **Auth:** Bearer token via interceptor
- **Error handling:** No catch in `AuthAPI`. `UsernameInput` handles error state locally.

### POST /setUsername
- **Called from:** `src/api/auth.ts` → `AuthAPI.setUsername(userId, username)`
- **Used by:** `AuthContext.signUp`, `AuthContext.updateProfileData`
- **Request:** Both params sent as query params: `?userId=<uid>&username=<username>`. No request body.
- **Response:** Void (return value unused)
- **Auth:** Bearer token via interceptor
- **Error handling:** No catch anywhere.

---

## Recipes

### GET /recipes
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getAllRecipes(page, order, tags, cuisine, recipesPerPage, query)`
- **Used by:** `src/pages/Recipes/Recipes.tsx`
- **Request:** Query params:
  - `q` — search string (default `''`)
  - `page` — 0-based page index (default `0`)
  - `recipesPerPage` — integer (default `5`)
  - `order` — sort order string (default `'new'`)
  - `cuisine` — string (default `''`)
  - `tags` — comma-separated string, only appended when `tags.length > 0` (e.g. `&tags=vegan,quick`)
- **Response:** `result.data` typed as `RecipeDBResponseType`:
  ```typescript
  {
    recipeList: RecipeType[]
    page: number
    filters: {}
    entries_per_page: number
    total_results: number
  }
  ```
- **Auth:** Bearer token via interceptor
- **Error handling:** Call site uses `.then().catch().finally()` — errors caught.

### GET /searchAutoCompleteRecipes
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.searchAutoCompleteRecipes(title)`
- **Used by:** `src/Components/SearchRecipesInput/SearchRecipesInput.tsx`
- **Request:** Query param `title` (string, default `''`)
- **Response:** `result.data` typed as `RecipeSearchResponseType[]`:
  ```typescript
  {
    _id: string
    title: string
    recipeImage: string
    totalTime: number
    rating: { rateCount: number; rateValue: number }
    servingPrice: number
    nutritionLabels: string[]
    servings: number
  }[]
  ```
- **Auth:** Bearer token via interceptor
- **Error handling:** Call site uses `.then().catch()` — errors caught.

### GET /getTrendingRecipes
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getTrendingRecipes(limit)`
- **Used by:** `src/Components/TrendingRecipes/TrendingRecipes.tsx` (called with `limit=4`)
- **Request:** Query param `limit` (integer, default `4`)
- **Response:** `result.data` typed as `RecipeType[]`
- **Auth:** Bearer token via interceptor
- **Error handling:** Call site uses `.then()` with no `.catch()` — errors silently dropped.

### GET /getRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getRecipe(id)`
- **Used by:** `src/pages/SingleRecipe/SingleRecipe.tsx`
- **Request:** Query param `id` (recipe `_id` string)
- **Response:** `result.data` typed as `RecipeType`:
  ```typescript
  {
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
    recipeImage: string           // Firebase Storage URL
    nutritionData: any
    totalTime: number
    authorUsername: string
    rating: { rateCount: number; rateValue: number }
    createdAt: string             // epoch ms as string
    editedAt: null | string
    servingPrice: number | null
    cuisine: string
    mealTypes: string[]
    nutritionLabels: string[] | null
    views: number
    numTimesSaved: number
    numTimesMade: number
  }
  ```
- **Auth:** Bearer token via interceptor
- **Error handling:** Call site uses `.then().catch()` — errors caught.

### POST /addRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.addRecipe(recipeData, setProgress)`
- **Used by:** `src/pages/AddRecipe/AddRecipe.tsx`
- **Request body:** Full `RecipeType & { userId: string }` object. **All fields are computed client-side before submission:**
  ```typescript
  {
    _id: string           // Client-generated BSON ObjectID (via bson-objectid)
    userId: string        // Firebase UID (from auth.currentUser)
    title: string
    prepTime: number
    cookTime: number | null
    servings: number
    fridgeLife: number | null
    freezerLife: number | null
    description: string
    ingredients: IngredientsType[]   // Already parsed + enriched
    instructions: InstructionsType[]
    recipeImage: string   // Firebase Storage download URL (image uploaded before this call)
    nutritionData: NutritionDataType | null   // From Edamam, already fetched
    totalTime: number     // prepTime + (cookTime ?? 0), client-computed
    authorUsername: string
    rating: { rateCount: 0; rateValue: 0 }   // Always zero on creation
    createdAt: string     // new Date().getTime().toString() — epoch ms as string
    editedAt: null
    servingPrice: number  // Client-computed from ingredient price data
    cuisine: string
    mealTypes: string[]
    nutritionLabels: string[] | null  // Filtered from Edamam dietLabels/healthLabels
    views: 0
    numTimesSaved: 0
    numTimesMade: 0
  }
  ```
- **Response:** Not destructured — only the side-effect matters. On success the function returns `recipeId` (the client-generated `_id`).
- **Auth:** Bearer token via interceptor
- **Error handling:** Wrapped in try/catch; returns `null` on error.
- **Note:** The recipe `_id` is generated client-side. The backend must accept (or at least not reject) a client-supplied `_id`.

### DELETE /deleteRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.deleteRecipe(recipeId, userId)`
- **Used by:** `src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls.tsx`
- **Request:** Query params `recipeId` and `userId`
- **Response:** `result.data` — the caller checks for an `error` property on the returned object.
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant — see Flags).
- **Error handling:** No catch at call site.

---

## Recipe Saves

### PUT /saveRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.saveRecipe(userId, recipeId)`
- **Used by:** `src/pages/SingleRecipe/Buttons/SaveRecipeBtn.tsx`
- **Request:** Query params `userId` and `recipeId`
- **Response:** Not destructured (raw axios response returned)
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant — see Flags).
- **Error handling:** No catch.

### PUT /unsaveRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.unsaveRecipe(userId, recipeId)`
- **Used by:** `src/pages/SingleRecipe/Buttons/SaveRecipeBtn.tsx`
- **Request:** Query params `userId` and `recipeId`
- **Response:** Not destructured
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant).
- **Error handling:** No catch.

### GET /getSavedRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getSavedRecipe(userId, recipeId)`
- **Used by:** `src/pages/SingleRecipe/Buttons/SaveRecipeBtn.tsx`
- **Request:** Query params `userId` and `recipeId`
- **Response:** `result.data` typed as `GetSavedRecipesResponseType[]` (array):
  ```typescript
  {
    _id: string
    userRecipes: { recipeId: string }[]
    savedRecipes: { recipeId: string; dateSaved: string }[]
  }[]
  ```
  - The component uses this to determine if the current recipe is in `savedRecipes`.
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant).
- **Error handling:** No catch.

### GET /getSavedRecipes
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getSavedRecipes(page, recipesPerPage, order)`
- **Used by:** `src/pages/Account/SavedRecipes/SavedRecipes.tsx`
- **Request:** Query params: `userId`, `page`, `recipesPerPage`, `order`
  - `userId` is resolved internally via `AuthAPI.getUID()` before the call.
- **Response:** `result.data` typed as `{ recipes: RecipeType[]; totalCount: number } | null`
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant).
- **Error handling:** No catch.

---

## Recipe Made

### POST /madeRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.madeRecipe(recipeId)`
- **Used by:** `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx`
- **Request:** Query params `userId` (resolved internally) and `recipeId`. No body.
- **Response:** `result.data` — shape not typed, not destructured at call site.
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant).
- **Error handling:** Call site uses `.then().catch()` — errors caught.
- **Note:** Returns early without calling if `userId` is null (unauthenticated guard in the function).

### GET /checkMadeRecipe
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.checkMadeRecipe(recipeId)`
- **Used by:** `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx`
- **Request:** Query params `userId` (resolved internally) and `recipeId`
- **Response:** `result.data` — the component accesses `{ datesMade: [] }` on the result.
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant).
- **Error handling:** Call site uses `.then().catch()` — errors caught.

---

## Ratings & Reviews

### PUT /addRating
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.addRating(recipeId, rating)`
- **Used by:** `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings.tsx`
- **Request:** Query params `recipeId` (string) and `rating` (number — star value)
- **Response:** Not destructured (raw axios response returned)
- **Auth:** Bearer token via interceptor only. The server must extract `userId` from the token.
- **Error handling:** Fire-and-forget at call site — no `.then()` or `.catch()`.
- **Note:** Guards against unauthenticated call with `if (!AuthAPI.getUID()) return null`.

### PUT /newReview
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.newReview(recipeId, text)`
- **Used by:** `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/AddReview.tsx`
- **Request body:**
  ```typescript
  {
    userId: string    // Firebase UID
    recipeId: string
    reviewText: string
  }
  ```
- **Response:** `result.data` typed as `ReviewType`:
  ```typescript
  {
    _id: string
    username: string
    recipeId: string
    rating: string
    ratingLastUpdated: string
    reviewCreatedAt: string
    reviewLastUpdated: string
    reviewText: string
  }
  ```
- **Auth:** Bearer token via interceptor AND `userId` in request body (redundant — see Flags).
- **Error handling:** No catch at call site. Function returns `null` if unauthenticated.

### GET /checkIfReviewed
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.checkIfReviewed(recipeId)`
- **Used by:** Nowhere (unused — see Flags).
- **Request:** Query params `username` (resolved via `AuthAPI.getUsername()`) and `recipeId`
- **Response:** `result.data` — shape untyped
- **Auth:** Bearer token via interceptor
- **Error handling:** No catch.

### PUT /editReview
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.editReview(recipeId, text)`
- **Used by:** `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview.tsx`
- **Request:** Query params `recipeId` and `text`. No body. No `userId`.
- **Response:** Not destructured (raw axios response returned)
- **Auth:** Bearer token via interceptor only — server must extract `userId` from token to authorize the edit.
- **Error handling:** No catch. Call site uses `.then()` with no error branch.

### PUT /deleteReview
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.deleteReview(recipeId)`
- **Used by:** `RecipeReview.tsx`, `ConfirmDeleteReviewModal.tsx`
- **Request:** Query params `userId` (resolved via `AuthAPI.getUID()`) and `recipeId`. No body.
- **Response:** Not destructured
- **Auth:** Bearer token via interceptor AND `userId` in query param (redundant — see Flags).
- **Error handling:** No catch. Call site uses `await` with no try/catch.

### GET /getReviews
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getReviews(recipeId, filter, page, reviewsPerPage)`
- **Used by:** `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx`
- **Request:** Query params:
  - `username` — resolved via `AuthAPI.getUsername()` before the call
  - `recipeId`
  - `page`
  - `reviewsPerPage` (default `5`)
  - `filter` (default `'new'`)
- **Response:** `result.data` — component destructures `{ reviews: ReviewType[], totalCount: number }`
- **Auth:** Bearer token via interceptor AND client-supplied `username` in query (trust issue — see Flags).
- **Error handling:** Call site uses `.then().catch()` — errors caught.

### GET /getSingleUserReviews
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getSingleUserReviews(page, reviewsPerPage, filter, returnRecipeData)`
- **Used by:** `src/pages/Account/UserRatings/UserRatings.tsx` (called with `returnRecipeData=true`)
- **Request:** Query params:
  - `username` — resolved via `AuthAPI.getUsername()` internally
  - `page` (default `0`)
  - `reviewsPerPage` (default `5`)
  - `filter` (default `'new'`)
  - `returnRecipeData` (boolean, default `false`)
- **Response:** `result.data` typed as `{ reviews: OptionalReviewType[]; totalCount: number }`:
  ```typescript
  {
    reviews: {
      _id: string
      username: string
      recipeId: string
      rating: string
      ratingLastUpdated: string
      reviewCreatedAt?: string
      reviewLastUpdated?: string
      reviewText?: string
      recipeTitle?: string     // only when returnRecipeData=true
      recipeImage?: string     // only when returnRecipeData=true
    }[]
    totalCount: number
  }
  ```
- **Auth:** Bearer token via interceptor AND client-supplied `username` in query (trust issue — see Flags).
- **Error handling:** No catch. Returns `null` if not authenticated.

---

## Tags (Unused)

All three tag endpoints are defined but never called anywhere in the application.

### POST /addRecipeTag
- **Request body:** String (raw tag text — not JSON object)
- **Response:** Not typed
- **Auth:** Bearer token via interceptor

### GET /searchRecipeTags
- **Request:** Query params `q` (search string) and `selectedTags` (comma-separated, only appended when non-empty)
- **Response:** Not typed (raw axios response returned)
- **Auth:** Bearer token via interceptor

### GET /getRecipeTags
- **Request:** Query param `limit` (integer, default `5`)
- **Response:** Not typed (raw axios response returned)
- **Auth:** Bearer token via interceptor

---

## Ingredient Parser Service

### POST /api/ingredients/parse
- **Called from:** `src/api/ingredientParserApi.ts` → `fetchIngredientEnrichment(parsedIngredient)`
- **Called via:** `RecipeAPI.getIngredientData()` → `fetchIngredientEnrichment()`
- **Used by:** `IngredientsInput.tsx`, `IngredientItem.tsx`
- **HTTP instance:** Uses the main `http` instance — same base URL as the main server (`VITE_API_URL`).
- **Request body:**
  ```typescript
  { ingredientString: string }   // the original raw string, e.g. "2 cups flour"
  ```
  - Note: `@jclind/ingredient-parser` parses the string locally first; only `originalIngredientString` is sent to the server for enrichment.
- **Response typed as `IngredientResponse` (from `@jclind/ingredient-parser`):**
  ```typescript
  // Success shape:
  { ingredientData: IngredientData }
  // Error shape:
  { ingredientData: IngredientData | null; error: { message: string } }
  ```
  The caller (`fetchIngredientEnrichment`) normalizes this into:
  ```typescript
  {
    source: 'cache' | 'spoonacular'   // always 'spoonacular' in current code — bug
    data: IngredientData | null
    error?: { message: string }
  }
  ```
- **Auth:** Bearer token via interceptor
- **Error handling:** No catch. Errors are wrapped in the return value rather than thrown.
- **Critical note:** This endpoint uses a path `/api/ingredients/parse` (with `/api/` prefix) unlike all other main-server endpoints. See Flags — routing conflict risk.

---

## External: Edamam Nutrition API

### POST /nutrition-details (Edamam)
- **Called from:** `src/api/recipes.ts` → `RecipeAPI.getRecipeNutrition(ingrArr)` (private, called by `addRecipe`)
- **Base URL:** `https://api.edamam.com/api` (separate `nutrition` axios instance)
- **Full path:** `https://api.edamam.com/api/nutrition-details?app_id=<VITE_EDAMAM_APP_ID>&app_key=<VITE_EDAMAM_APP_KEY>`
- **Request body:**
  ```typescript
  {
    title: 'recipe 1',    // hardcoded string
    ingr: string[]        // e.g. ["2 cups flour", "1 tsp salt"]
  }
  ```
  - Only ingredients that have a `parsedIngredient.quantity` are included; label-only entries are skipped.
- **Response typed as `NutritionDataType`:**
  ```typescript
  {
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
  ```
  The frontend filters `dietLabels` and `healthLabels` against a local list (`src/recipeData/dietLabels`) to produce `nutritionLabels`.
- **Auth:** No Firebase token. API key in query params.
- **Error handling:** No catch. Returns `{ nutritionData: null, dietLabels: null }` if result is falsy.

---

## Firebase Storage (Client-side)

### Firebase Storage upload (not HTTP)
- **Called from:** `RecipeAPI.uploadRecipeImage(imageFile, setProgress)` (private, called by `addRecipe`)
- **Path:** `recipeImages/<imageFile.name>` (no uniqueness guarantee — same filename overwrites)
- **Returns:** Firebase Storage download URL (used as `recipeImage` in POST /addRecipe)
- **Auth:** Firebase Client SDK auth
- **Error handling:** No explicit catch (wrapped in `addRecipe`'s outer try/catch)

---

## Flags

Prioritized by impact on the Express backend build.

### [CRITICAL] Ingredient parser routing ambiguity

`fetchIngredientEnrichment` calls `http.post('/api/ingredients/parse', ...)` using the **main server's base URL** (`VITE_API_URL`, default port 4000). All other main-server paths are bare (e.g., `recipes`, `getRecipe`) — no `/api/` prefix. The ingredient parser service is documented as a separate service on port 4001, but only one `VITE_API_URL` env var exists. The backend must either:
- Add a `/api/ingredients/parse` route on the main server that proxies to the ingredient parser service, or
- Serve both services behind a shared reverse proxy/gateway at the same origin.

There is no `VITE_INGREDIENT_PARSER_URL` or second axios instance for the ingredient parser.

### [CRITICAL] Client-generated `_id` on recipe creation

`addRecipe` generates a BSON ObjectID client-side (`ObjectID()` from `bson-objectid`) and sends it as `_id` in the POST body. The server must accept a client-supplied `_id` rather than generating its own. The returned value from `addRecipe` is this client-side `recipeId` — the server response is not read for the ID.

### [HIGH] Redundant `userId` in query params alongside Bearer token

The following endpoints receive both a Bearer token (sufficient for identity) and `userId` as a query parameter or body field:
- `DELETE /deleteRecipe` — query param
- `PUT /saveRecipe`, `PUT /unsaveRecipe`, `GET /getSavedRecipe`, `GET /getSavedRecipes` — query param
- `POST /madeRecipe`, `GET /checkMadeRecipe` — query param
- `PUT /deleteReview` — query param
- `PUT /newReview` — request body

The server must decide which to trust. The safe choice is to always extract the user from the verified token and ignore client-supplied `userId`. If `userId` in query params is load-bearing on the backend, that is a broken authorization model.

### [HIGH] `username` passed in query for review endpoints (trust issue)

`GET /getReviews` and `GET /getSingleUserReviews` send the current user's `username` as a query param (resolved via `AuthAPI.getUsername()` before the call). The backend receives an unverified, client-supplied username. For scoping reviews to the authenticated user (e.g., highlighting the user's own review), the backend should resolve the username from the verified token UID, not trust the query param.

Similarly, `GET /checkIfReviewed` sends `username` in query — though this endpoint is unused.

### [HIGH] Inconsistent authorization strategy across endpoints

`PUT /editReview` sends **no userId anywhere** — only the Bearer token. The backend must extract the user from the token to authorize edits.

`PUT /addRating` also sends no userId — token only.

But `PUT /deleteReview`, `PUT /newReview`, `GET /getSavedRecipes`, etc. all send userId redundantly. The backend has no consistent interface to rely on.

### [MEDIUM] Five unused API functions

These are defined and exported but never imported anywhere:

| Function | Endpoint | Return type issue |
|---|---|---|
| `RecipeAPI.search()` | `GET /recipes` | Returns raw `Promise<AxiosResponse>` not `.data` — broken if ever called |
| `RecipeAPI.addRecipeTag()` | `POST /addRecipeTag` | Sends a raw string as body, not JSON |
| `RecipeAPI.searchRecipeTags()` | `GET /searchRecipeTags` | Returns raw axios response |
| `RecipeAPI.getRecipeTags()` | `GET /getRecipeTags` | Returns raw axios response |
| `RecipeAPI.checkIfReviewed()` | `GET /checkIfReviewed` | Returns `result.data` (OK) |

`search()` is a dead alternative to `getAllRecipes` using a slightly different query shape (`tag` instead of `tags`) and is already broken (returns the full axios response object, not `.data`). The backend can safely not implement it.

### [MEDIUM] Client-side computation submitted as authoritative data

The following are computed on the client before `POST /addRecipe` and sent as-is:
- `servingPrice` — computed from ingredient price data in `@jclind/ingredient-parser`
- `nutritionData`, `nutritionLabels` — fetched from Edamam before submission
- `totalTime` — `prepTime + cookTime`
- `createdAt` — `new Date().getTime().toString()` (epoch ms as string, not ISO 8601)
- `rating` — always `{ rateCount: 0, rateValue: 0 }` (zero on creation)
- `views`, `numTimesSaved`, `numTimesMade` — always `0` on creation

The backend must decide whether to trust client-submitted `servingPrice` and `nutritionData` or recompute them.

### [MEDIUM] All review/rating mutations use `PUT` not `POST`/`DELETE`

`PUT /newReview`, `PUT /deleteReview`, `PUT /editReview`, `PUT /deleteRecipe` — review creation and deletion both use PUT (should be POST and DELETE respectively by REST convention). The backend can use any method, but it is non-standard and may cause routing surprises.

### [LOW] `fetchIngredientEnrichment` hardcodes `source: 'spoonacular'`

The `EnrichmentResult` type declares `source: 'cache' | 'spoonacular'`, but `fetchIngredientEnrichment` always returns `source: 'spoonacular'` regardless of whether the server served from cache. The `source` field is currently unused in the frontend but the contract is wrong.

### [LOW] Firebase Storage image names not unique

`uploadRecipeImage` uploads to `recipeImages/<imageFile.name>` with no unique prefix or hash. Two recipes using an image file with the same name will overwrite each other's image. Not a backend concern but worth noting before writing storage rules.

### [LOW] `checkUsernameAvailability` URL has a spurious `&`

`?&username=` — the leading `&` is harmless but non-standard. Express query parsers handle it correctly, but it should be fixed.

### [LOW] `getReviews` return type not statically typed

`getReviews` has no TypeScript return type annotation. The component at the call site destructures `{ reviews, totalCount }` — the backend must return `{ reviews: ReviewType[], totalCount: number }`.

### [LOW] `getTrendingRecipes` has no error catch at call site

`TrendingRecipes.tsx` calls `.then()` with no `.catch()`. A server error will produce an unhandled promise rejection.

### [LOW] Edamam CORS headers set on request (not response)

`nutrition` axios instance sets `Access-Control-Allow-*` headers on the outgoing request. These are response headers and have no effect when set by the client. This is dead config.
