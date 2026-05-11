# Test Baseline — 2026-05-10

## Suite Results

### Frontend (Vitest v4.1.5)
- **Passed: 78 / Total: 78**
- Failed: 0
- Coverage: Not available — `@vitest/coverage-v8` is not installed. Running `npm test -- --coverage` fails with `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`.
- Note: The `SingleRecipe > shows error message and does not crash when getRecipe throws` test prints a console stack trace during its run. This is expected — the test verifies error-handling behavior and the test itself passes.

### Server (Jest, --runInBand)
- **Passed: 95 / Total: 95**
- Failed: 0

### Server-Ingredients (Jest)
- **Passed: 35 / Total: 35**
- Failed: 0

### E2E (Cypress)
- Not run as part of this baseline (requires a running frontend + backend).
- 3 test files with 7 total tests:
  - `auth.cy.ts` — 2 tests (login flow, logout)
  - `browse.cy.ts` — 3 tests (page loads, search filters, click navigates to single recipe)
  - `recipe.cy.ts` — 2 tests (renders title/ingredients/instructions, save/unsave toggle)
- All intercept real API endpoints via fixtures; Firebase auth uses a custom `cy.login()` command.

---

## Test File Inventory

### Frontend (`src/test/`)

#### `App.test.tsx` — 1 test
**What it tests:** App component mounts without throwing. Firebase is fully mocked; `onAuthStateChanged` never fires its callback, so only the loading spinner renders — no page components mount.
**Gaps:** No authenticated state, no routing, no page-level rendering. Purely a smoke test.

---

#### `AddRecipe.test.tsx` — 13 tests
**What it tests:**
- Submit button has `invalid` class on empty render
- Clicking submit on empty form shows all required-field errors (title, image, description, servings, prep time, ingredients, instructions, meal type)
- Title error for empty field
- Title error when > 50 characters; no error at exactly 50
- Submit button transitions to `valid` class only after all required fields are filled
- Clicking submit when valid calls `RecipeAPI.addRecipe`
- Form resets to empty defaults after successful submission
- Error message shown when `addRecipe` returns `null`
- Loading indicator replaces submit text while submission is in flight
- Servings value of 0 treated as invalid
- Cook time is optional (does not block submission)
- Field error clears for a corrected field on re-submit; other errors remain

**Gaps:**
- No test for cuisine selection
- No test for network error thrown (vs `null` returned) by `addRecipe`
- No test for image upload failure
- Navigation after successful creation is not verified

---

#### `IngredientsContainer.test.tsx` — 3 tests
**What it tests:**
- Adding an ingredient via the mocked input appends it to the list
- Removing an ingredient by id filters it out
- "Reorder" button toggles to "Done" and back

**Gaps:**
- `getIngredientData` is mocked but never triggered in any test (ingredient data enrichment is untested)
- No DnD reorder behavior
- No empty-state rendering verified independently

---

#### `InstructionsContainer.test.tsx` — 3 tests
**What it tests:**
- Typing text and pressing Enter appends a step
- Empty input on Enter does not add a step
- Removing a step removes it from the list

**Gaps:**
- No DnD reorder
- No character limit enforcement (if any)

---

#### `RatingsAndReviews.test.tsx` — 29 tests
Covers four separate components:

**`Ratings` (5 tests):** Auth-gated display ("Sign In To Rate" vs star widget); clicking star calls `addRating` with correct args; average rating display for 0 count and non-zero count.

**`ReviewsList` (6 tests):** Empty state; "No Reviews" suppressed when `currUserReview` exists; "More Reviews" button visibility; clicking it calls `getNextReviewsPage`; reviews with text are rendered.

**`AddReview` (8 tests):** Button always visible; no-uid alert instead of textarea; uid opens textarea; rating=0 validation error; text < 5 chars error; valid submission calls `newReview`; `setCurrUserReview` callback on success; close hides textarea without API call.

**`RecipeReview` (10 tests):** Displays username, text, star rating; Edit/Delete hidden for non-author; shown for author; Edit enters mode with pre-filled textarea; Cancel restores original text; identical text skips `editReview`; short text skips `editReview`; valid edit calls API and updates display; Delete opens confirmation modal; confirming calls `deleteReview` and `setCurrUserReview(null)`.

**Gaps:**
- `RatingsAndReviews.tsx` (the parent orchestrator) is not tested — it fetches reviews on mount, manages rating state, and coordinates sub-components
- `ReviewsContainer.tsx` is not tested — handles pagination, loading state, and review list assembly
- `ReviewFilters`, `ReviewInteractionOptions`, `ReviewOptions` components are untested
- No test for `getReviews` failure within the review rendering flow

---

#### `Recipes.test.tsx` — 11 tests
**What it tests:**
- 4 loading skeleton cards shown before API resolves
- Recipe thumbnails rendered after API resolves
- "No Results Found" when `total_results: 0`
- "Load More" visible when more results exist; absent when all loaded
- "Load More" disabled during in-flight fetch; re-enabled after
- Clicking "Load More" calls `getAllRecipes` with incremented page number
- "Load More" appends results rather than replacing them
- Changing sort filter resets list and fetches from page 0
- URL query `?q=taco-tuesday` is normalized to `"taco tuesday"` before the API call
- Error message shown when `getAllRecipes` throws

**Gaps:**
- `RecipeFilters` component is mocked (filter UI interactions untested)
- `SearchRecipesInput` is mocked entirely
- No test for cuisine/meal-type/nutrition-label filter params being forwarded

---

#### `RecipeThumbnail.test.tsx` — 9 tests
**What it tests:**
- Loading state: no `<img>`, no price/time text
- Full data render: image src, title, price (formatted to dollars), time, rating
- No image: skeleton shown (no `<img>`) when `recipeImage` is empty string
- Rating "0" displayed (not NaN) when `rateCount` is 0
- Time singular ("1 min") and plural ("30 mins")
- Click navigates to `/recipes/:id`
- No navigation when `loading=true`

**Gaps:**
- No test for long titles or truncation behavior
- No test when `totalTime` is null/undefined

---

#### `SingleRecipe.test.tsx` — 9 tests
**What it tests:**
- Loading state shown in header while API call is pending
- Recipe title rendered after API resolves
- `RecipeNotFound` shown when response has no `title`
- `RecipeNotFound` shown when response is `null`
- `RatingsAndReviews` not rendered while loading
- `RatingsAndReviews` mounts after load completes
- Serving size read from localStorage on mount
- Changing serving size writes new value back to localStorage
- Error message displayed when `getRecipe` throws

**Gaps:**
- `RecipeControls`, `SaveRecipeBtn`, `MadeRecipeBtn` are all mocked — save/unsave/made flows are untested at the unit level (partially covered by E2E only)
- No unit test for different auth states (logged-in user sees different controls)
- Nutrition data display is not tested

---

### Server (`server/__tests__/`)

#### `auth.test.js` — 13 tests
**Routes covered:** `GET /getUsername`, `GET /checkUsernameAvailability`, `POST /setUsername`
**What it tests:** Missing/null userId validation (400); not-found (404); valid lookup; username availability true/false; no-auth rejection (401); uid mismatch (403); conflict when taken by another user (409); create new entry; update existing; setting own existing name is not a conflict.
**Gaps:** No test for `POST /setUsername` with missing `username` query param; no concurrent-write scenario.

---

#### `recipes.test.js` — 40 tests
**Routes covered:** `GET /recipes`, `POST /addRecipe`, `PUT /saveRecipe`, `PUT /unsaveRecipe`, `GET /health`, `GET /getRecipe`, `DELETE /deleteRecipe`, `GET /getSavedRecipe`, `POST /madeRecipe`, `GET /checkMadeRecipe`, `GET /searchAutoCompleteRecipes`, `GET /getTrendingRecipes`

**What it tests:** Pagination (`page`, `recipesPerPage`), text search (case-insensitive), field validation, counter manipulation prevention, auth (401/403), CRUD operations, view increment, saved-list 409 conflict and 404 not-found, `numTimesSaved` floor at 0, `$addToSet` deduplication for madeRecipes, field projection for autocomplete, trending sort and limit capping.

**Gaps:**
- `GET /recipes` filter params (cuisine, mealTypes, nutritionLabels) are not tested
- `GET /recipes` sort options (date, popularity) are not tested
- `PUT /saveRecipe` has no 401/403 tests
- `GET /getSavedRecipes` is in `users.test.js`, not here

---

#### `reviews.test.js` — 27 tests
**Routes covered:** `PUT /addRating`, `PUT /editReview`, `PUT /deleteReview`, `PUT /newReview`, `GET /checkIfReviewed`, `GET /getReviews`, `GET /getSingleUserReviews`

**What it tests:** Rating range validation (non-numeric, > 5, < 1, valid); author-only edit/delete (403 for non-author); new review creation and upsert; missing-username guard; pagination; empty `reviewText` filtering; `isCurrentUser` flag injection; `returnRecipeData` join.

**Gaps:**
- `PUT /addRating` has no 401 (no-auth) test
- Rating boundary at exactly 1 is not tested (only 0 and valid 4)
- No test for edit/delete when the review document doesn't exist (matchedCount=0 path)

---

#### `tags.test.js` — 8 tests
**Routes covered:** `POST /addRecipeTag`, `GET /searchRecipeTags`, `GET /getRecipeTags`

**What it tests:** Auth requirement; insert and return with `_id`; all tags without query; case-insensitive partial match; `selectedTags` exclusion; 10-result limit; default 5 results; `limit` param.

**Gaps:**
- No test for `POST /addRecipeTag` missing `text` body field
- No test for `searchRecipeTags` with empty-string `q` vs no `q`

---

#### `users.test.js` — 7 tests
**Routes covered:** `GET /getSavedRecipes`

**What it tests:** No-auth (401); missing `userId` (400); empty result set; saved recipes with `totalCount`; pagination; `order=new` (newest first); `order=old` (oldest first).

**Gaps:**
- Only one route is tested; no other user routes exist in this file because they reside in `recipes.js` and `auth.js`
- No test for invalid `order` value

---

### Server-Ingredients (`server-ingredients/`)

#### `routes/ingredient.test.js` — 15 tests
**What it tests:** `GET /health`; `GET /ingredient/:name` — cache hit, cache miss, name param forwarding, 500 on throw; `POST /ingredient` — created/no-op/conflict responses, all 400 validation cases (missing name, missing data, missing id, null id, empty name), correct param forwarding, 500 on throw.
**Gaps:** No auth test (the route uses Firebase auth but it is not mocked/tested here — the test builds a bare Express app without the auth middleware).

---

#### `services/ingredientStore.test.js` — 13 tests
**What it tests:** `findIngredient` — full cache hit, name-not-found null, name-found but ingredient-doc-missing null, name normalization before lookup; `writeIngredient` — created/no-op/conflict/upsert/normalization; race condition (duplicate key 11000) — same-id no-op, different-id conflict, non-dup error rethrow. Also documents a known type-coercion bug (string vs number `ingredientId` causes false conflict).
**Gaps:** No test for `findIngredient` when `ingredientData` field is present in doc but null.

---

#### `services/normalizeName.test.js` — 7 tests
**What it tests:** Lowercase, trim, hyphen→space, multiple hyphens, combined, no-op, empty string.
**Gaps:** None — full behavioral coverage for the function's documented contract.

---

### E2E (`cypress/e2e/`) — not run in baseline

#### `auth.cy.ts` — 2 tests
Login completes and nav shows username; logout shows login link.

#### `browse.cy.ts` — 3 tests
Browse page loads with recipe thumbnails; search input filters and updates URL; clicking a recipe navigates to single-recipe page.

#### `recipe.cy.ts` — 2 tests
Single recipe renders title, ingredients, instructions; save/unsave button toggle works when logged in.

---

## Coverage Gap Analysis

### High Risk — untested + will definitely change in Phase 3

| Component / Route | Why it's high risk |
|---|---|
| `src/pages/Home/Home.tsx` | Fetches trending recipes via `useEffect`+`useState`; zero test coverage |
| `src/pages/Account/Account.tsx` | Two `useEffect` calls for user data fetching; zero test coverage |
| `src/pages/Account/SavedRecipes/SavedRecipes.tsx` | `useEffect` fetches saved recipes with pagination; zero test coverage |
| `src/pages/Account/UserRatings/UserRatings.tsx` | `useEffect` fetches user reviews; zero test coverage |
| `src/pages/Account/UserRecipes/UserRecipes.tsx` | Fetches user-created recipes; zero test coverage |
| `src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews.tsx` | Parent orchestrator that fetches reviews on mount; untested (only leaf sub-components are tested) |
| `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx` | Manages pagination, loading, and review assembly; zero test coverage |

---

### Medium Risk — partial tests + may change

| Component / Route | What's missing |
|---|---|
| `SingleRecipe.tsx` | Save/unsave/made flows are mocked out; auth-state-dependent UI not covered at unit level |
| `RatingsAndReviews` sub-components | `ReviewFilters`, `ReviewInteractionOptions`, `ReviewOptions` have no tests |
| `server/routes/ingredients.js` — `POST /parse` | The ingredient-parsing proxy route has no test at all |
| `server/__tests__/recipes.test.js` — `GET /recipes` | Filter params (cuisine, mealTypes, nutritionLabels, sort order) not tested |
| `server/__tests__/reviews.test.js` — `PUT /addRating` | No 401 test; boundary at rating=1 untested |

---

### Low Risk — well tested, changes are minor

| Component / Route | Notes |
|---|---|
| `RecipeThumbnail` | Loading, full render, navigation, edge cases all covered |
| `AddRecipe` form validation | Comprehensive coverage of all required fields and error states |
| `Recipes` (Browse page) | Loading, pagination, filtering, error, URL params all covered |
| `InstructionsContainer` | Add/remove/empty-guard covered |
| `IngredientsContainer` | Add/remove/reorder-toggle covered |
| All `server/routes/auth.js` routes | All happy paths and error paths covered |
| All `server/routes/reviews.js` routes | Comprehensive; minor gaps noted above |
| All `server/routes/tags.js` routes | All paths covered |
| All `server/routes/users.js` routes (getSavedRecipes) | Full CRUD + pagination + ordering covered |
| `server-ingredients` service logic | `ingredientStore`, `normalizeName` have thorough unit coverage including race conditions |

---

## Recommended additions before Phase 3

These are the 5 test files that would most reduce refactor risk when migrating data-fetching to React Query:

1. **`src/test/Home.test.tsx`** — The Home page fetches trending recipes with `useEffect` and is completely untested. A React Query migration will replace that effect; a test that mocks `getAllRecipes` / `getTrendingRecipes` and verifies loading → content → error states would catch regressions immediately.

2. **`src/test/Account.test.tsx`** (or per-tab files) — `Account`, `SavedRecipes`, `UserRatings`, and `UserRecipes` all have `useEffect`+`useState` data fetching and zero coverage. At minimum, a test for `SavedRecipes` (loading skeleton, rendered list, error state, pagination trigger) would cover the highest-traffic user flow.

3. **`src/test/ReviewsContainer.test.tsx`** — `ReviewsContainer` owns the `getReviews` call, pagination state, and `currUserReview` management that the existing `RatingsAndReviews.test.tsx` tests assume are already wired up. The parent component's data-fetch lifecycle is the most likely breakage point in a React Query migration.

4. **`src/test/RatingsAndReviews.integration.test.tsx`** — A test for the `RatingsAndReviews.tsx` parent that exercises the full component tree (mocking only the API client, not child components) would verify that the review-fetch → display pipeline works end-to-end, catching prop-drilling regressions introduced during refactor.

5. **`server/__tests__/ingredients.test.js`** — The `POST /parse` route in `server/routes/ingredients.js` has no tests. It is the only backend route with zero coverage. A supertest suite covering the happy path and auth failure would close this gap before any route-level refactoring.
