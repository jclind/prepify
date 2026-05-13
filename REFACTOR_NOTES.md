# Refactor Notes

Issues flagged during refactor phases that require a decision or future action.

---

## Phase 2-C: src/-Absolute Import Sweep

**Date:** 2026-05-10

### Flagged — left alone

#### `package.json` imports (outside `src/`)

Two files import `package.json` from the project root via deep relative paths:

- `src/Components/Footer/Footer.tsx` — `import pjson from '../../../package.json'`
- `src/Components/ReleaseNotes/ReleaseNotes.tsx` — `import packageJSON from '../../../package.json'`

These resolve outside of `src/` and cannot be rewritten to a `src/`-absolute path.

**Phase 6 suggestion:** Replace with a `VITE_APP_VERSION` env var (populated from `package.json` at build time via `vite.config.ts` `define`). This eliminates the cross-boundary import and works at runtime without bundling the whole manifest.

### Skipped — barrel/index re-exports

`src/pages/AddRecipe/Dnd/index.ts` — all three exports are same-directory re-exports (`./DndContext`, `./Drop`, `./Drag`). These are correct as-is and were not converted.

### `types.d.ts` → `src/types.ts`

The root `types.d.ts` was moved to `src/types.ts` (renamed from `.d.ts` to `.ts`).

- `tsconfig.json` now has `"paths": { "types": ["src/types"] }` so the bare `'types'` specifier continues to resolve correctly for TypeScript.
- `vite.config.ts` now has `types: path.resolve(__dirname, './src/types')` in the `resolve.alias` block so Vite resolves the bare specifier at bundle time.
- `src/Components/RecipeThumbnail/RecipeThumbnail.tsx` was the only file using the old relative path (`'../../../types'`); updated to `'types'`.
- All other files were already using the bare `'types'` specifier and required no change to their import lines.

### `ignoreDeprecations: "6.0"` in tsconfig.json

`tsconfig.json` now includes `"ignoreDeprecations": "6.0"` to suppress `TS5101`, a `baseUrl` deprecation warning that surfaced when the `paths` alias for `types` was added in Phase 2-C. The `paths` entry requires `baseUrl` to be set, and TypeScript 6.0 flags `baseUrl` as deprecated (slated to stop functioning in TS 7.0).

**Phase 6 action required:** This must be resolved before any TypeScript major version upgrade. The fix is to migrate from `baseUrl` + `paths` to a `paths`-only setup with relative entries, or to adopt project-level aliases via `imports` in `package.json` (Node.js subpath imports).

### Known type errors (pre-existing, not introduced by Phase 2-C)

**`src/App.tsx:41` — TS2746**

`AuthProvider` in `src/context/AuthContext.tsx` declares `children` as `React.ReactElement` (a single element), but `App.tsx` passes three children (`<Toaster>`, `<ScrollToTop>`, `<Routes>`). Pre-existing error — silently ignored because `tsc --noEmit` was not being run as a CI gate.

Fix in Phase 2-D: change `children: React.ReactElement` to `children: React.ReactNode` in `AuthContext.tsx`.

**`src/index.tsx:7` — TS2345**

`document.getElementById('root')` returns `HTMLElement | null`, but `createRoot()` expects a non-null `Container`. The underlying code bug predates Phase 2-B, but was invisible to tsc when the file was `index.jsx` (not in tsc scope without `allowJs`/`checkJs`). The Phase 2-B rename to `index.tsx` brought it into scope.

Fix in Phase 2-D: add a non-null assertion (`document.getElementById('root')!`) or a null guard.

### Phase 2-D candidate: `any` fields in `src/types.ts`

Several fields in `NutritionDataType` (and `RecipeType.nutritionData`) are typed as `any`. These should be addressed in Phase 2-D with concrete types derived from the Edamam API response shape:

```ts
// NutritionDataType
yield: any           // should be number
calories: any        // should be number
totalWeight: any     // should be number
cautions: any[]      // should be string[]
totalNutrients: any  // should be Record<string, NutrientDetail>
totalDaily: any      // should be Record<string, NutrientDetail>
ingredients: any[]   // should be typed ingredient response objects
totalNutrientsKCal: any // should be Record<string, NutrientDetail>

// RecipeType
nutritionData: any   // should be NutritionDataType | null
```

---

## Phase 2-E-1: Frontend test baseline (new test files)

**Date:** 2026-05-11

### `TrendingRecipes` — always-false loading class condition

`src/Components/TrendingRecipes/TrendingRecipes.tsx` line 23:

```tsx
className={`recipes ${recipes.length < 0 ? '' : 'loading'}`}
```

`recipes.length < 0` is always `false`, so the container div always carries the `loading` CSS class, even when recipes are fully loaded. The dead branch (`''`) is never reached.

**Impact:** Cosmetic — a `loading` class is always present regardless of state. Tests document the rendered output; the class never switches.

**Phase 4 suggestion:** Fix the condition to `recipes.length === 0 ? 'loading' : ''` or remove the class toggle entirely if unused by CSS.

---

### `TrendingRecipes` — no error state

`TrendingRecipes` calls `RecipeAPI.getTrendingRecipes(4).then(...)` with no `.catch`. If the fetch fails (rejected Promise), the unhandled rejection is swallowed silently and the component stays in skeleton state indefinitely. No error UI exists.

**Impact:** Users see an infinite loading spinner on network failure with no feedback.

**Testing note:** The rejection case cannot be asserted in Vitest without triggering an unhandled-rejection warning (Vitest treats unhandled rejections as test errors because the source has no `.catch`). The test in `Home.test.tsx` documents the equivalent visible behavior using a resolved-empty case (`mockResolvedValue([])`), which also produces perpetual skeleton cards.

**Phase 3/4 suggestion:** React Query migration will expose an `isError` state; add an error UI at that point.

---

### `ReviewsContainer` — no loading indicator

`ReviewsContainer` has no loading state of its own. Between mount and when `ReviewFilters` sets `reviewListSort` (which triggers the first `getReviews` call), the component shows AddReview and an empty review list — visually identical to the "zero reviews" resolved state. There is no spinner or skeleton during the data fetch.

**Impact:** Minor UX gap; pre-existing behavior. React Query migration (Phase 3) will surface `isLoading`.

---

## Phase 2-E-2: Server test — POST /api/ingredients/parse

**Date:** 2026-05-11

### Unauthenticated route

`POST /api/ingredients/parse` has no `verifyToken` middleware guard. Every other route in the main server requires a Firebase Bearer token. This is the only route without auth. The test in `server/__tests__/ingredients.test.js` documents this as current behavior (not an endorsement). See the "Auth gap" test case.

**Phase 4/5 suggestion:** Add `verifyToken` middleware to this route for consistency, or document intentionally that the parse endpoint is public.

### `SPOONACULAR_API_KEY` is undefined during tests

`dotenv` is loaded in `server/index.js` only — not in `server/app.js`. Test files import `app.js` directly, so `process.env.SPOONACULAR_API_KEY` is `undefined` at test time. Because `ingredientParser` is mocked this has no effect on test correctness, but the options-forwarding test explicitly documents this as current behavior.

### Prompt template note — Jest vs Vitest

The original Phase 2-E-2 prompt template said "use vitest (shared with server)." This was incorrect: the server uses Jest (configured via `server/jest.config.js`), and the root Vitest config explicitly excludes server files via `include: ['src/**/*.test.{ts,tsx}']`. Vitest is not installed in `server/node_modules`.

**Action:** Future server test prompts must say **Jest** (not Vitest). Run server tests with `npm test --prefix server`.

---

## Phase 2-B: Pre-existing tsc errors surfaced by index.jsx → index.tsx rename

**Date:** 2026-05-10

Running `tsc --noEmit` after the Phase 2-B rename reveals two pre-existing type errors:

1. `src/App.tsx:41` — JSX children prop mismatch (`ReactElement` expected, multiple children provided). Unrelated to Phase 2-B; existed before any changes.

2. `src/index.tsx:7` — `HTMLElement | null` passed where `Container` is expected (strict null check on `document.getElementById('root')`). This code error existed in `src/index.jsx` but was silently ignored by tsc because `.jsx` files are not type-checked without `allowJs: true`. The rename to `.tsx` makes it visible to tsc.

**Action needed (not in scope for Phase 2-B):** Fix both errors in a future pass. The `index.tsx` fix is a one-liner (`!` non-null assertion or a null guard). The `App.tsx` fix requires investigating the router/children structure.

---

## Phase 3-B: SingleRecipe.tsx — useQuery migration notes

**Date:** 2026-05-11

### Pre-existing bug — `updateRecipeLocalStorage` uses closure `servingSize` instead of `numServings` parameter

`src/pages/SingleRecipe/SingleRecipe.tsx` — the `updateRecipeLocalStorage` helper:

```ts
if (currRecipeLocalStorageIndex !== -1) {
  localStorageRecipeArr[currRecipeLocalStorageIndex].numServings = servingSize  // closure
} else {
  localStorageRecipeArr.push({ recipeId, numServings })  // parameter
}
```

The `if` branch writes the closure variable `servingSize` instead of the `numServings` parameter. The `else` branch correctly uses the parameter. No observable effect today because the function is always called as `updateRecipeLocalStorage(currRecipe._id, servingSize)` — the two values are identical. The parameter is dead code in the update path.

**Phase 4 suggestion:** Replace `servingSize` with `numServings` in the `if` branch to make the function self-contained.

### Behavioral difference — background re-fetch re-reads serving size from localStorage

The original `useEffect([], [])` fetched once on mount. The replacement `useEffect([fetchedRecipe])` runs whenever the query data reference changes — including TanStack Query background re-fetches (e.g., on window focus). On each re-run it re-reads `numServings` from localStorage and calls `setServingSize`.

No practical impact: `updateRecipeLocalStorage` keeps localStorage in sync with `servingSize` state, so the re-read always produces the current value. However, if structural sharing is disabled or the server returns a structurally different object, a spurious `setServingSize` call (same value) would trigger a re-render cycle through the `[servingSize]` effect.

**Phase 4 suggestion:** Guard with `useRef` (`servingSizeInitialized`) to match the original run-once semantics, or migrate to `useInfiniteQuery` / `initialData` pattern.

---

## Phase 3-C: TrendingRecipes.tsx — useQuery migration notes

**Date:** 2026-05-11

### Error behavior — renders skeleton on failure (same as loading)

The original component had no `.catch`, so a rejected fetch left `recipes` at `[]` indefinitely (skeleton cards). With `useQuery`, on error `data` is `undefined`; `data ?? []` produces `[]`, so the component renders the same 4 skeleton `RecipeThumbnail` components. No error UI was added — this is intentional per the migration constraint. The documented "unhandled rejection" behavior in Phase 2-E-1 no longer produces an unhandled rejection warning; `useQuery` captures the error in `isError` silently.

### `isLoading` not used

`isLoading` is not destructured from `useQuery` because the existing className ternary (`recipes.length < 0 ? '' : 'loading'`) is always `'loading'` regardless of state (the always-false bug documented in Phase 2-E-1). Preserving that exact expression means `isLoading` is irrelevant to the class logic. The bug is intentionally preserved.

---

## Phase 3-D: SearchRecipesInput.tsx — useQuery migration notes

**Date:** 2026-05-11

### `enabled` threshold: prompt said `> 0`, implementation uses `> 2`

The phase prompt specified `enabled: debouncedQuery.length > 0`, but the original code gates the fetch on `title.length > 2`. The implementation preserves `> 2` to honor the "no logic changes" rule. A query for 1–2 characters returns empty results in the original and continues to do so with the `> 2` guard.

**Phase 4 suggestion:** Decide the intended minimum length and set it consistently in one place.

### `debouncedQuery` initial value mirrors `defaultVal`

`debouncedQuery` is initialised to `defaultVal || ''` — the same value as `searchRecipeVal`. If `defaultVal` is longer than 2 characters, `useQuery` will fire on mount (before any debounce timer). This mirrors the original behaviour where `getAutoCompleteResult` was called immediately after mount when `searchRecipeVal` was pre-populated, except the original also had the 300ms timer protecting the first call. The practical impact is negligible (autocomplete on a pre-filled search box), but it is a subtle difference from the debounced path.

---

## Phase 3-A: Recipes.tsx — useQuery migration notes

**Date:** 2026-05-11

### useInfiniteQuery candidate (Phase 4)

`Recipes.tsx` is a candidate for `useInfiniteQuery` migration in Phase 4 — the current `useQuery` + manual accumulation pattern is a workaround for the load-more pattern that `useInfiniteQuery` handles natively.

The `useQuery` approach requires keeping `recipeList` and `totalResults` as separate state that is manually updated via a `useEffect` on the query result. `useInfiniteQuery` would own the accumulated pages directly, eliminate the data-accumulation effect, and expose `fetchNextPage` / `hasNextPage` as first-class API surface.

### Known behavior difference: extra query on URL navigation while paginated

If `location.search` changes while `currPage > 0` (e.g., user navigates to `/?q=something` from page 2 of results), TanStack Query fires an interim query with the old page + new URL params before the filter reset effect resets `currPage` to 0. The original code never made this extra call. No current test exercises this path.

Root fix: migrate to `useInfiniteQuery` (see above).

---

## Phase 3-H: RatingsAndReviews.tsx and ReviewsContainer.tsx — useQuery migration notes

**Date:** 2026-05-11

### `isLoading` available but not wired — Phase 4 candidate

Both components now get `isLoading` from `useQuery` but neither has loading UI:

- `RatingsAndReviews`: `isLoading` is not destructured from the `checkIfReviewed` query. No loading state existed before and none was added.
- `ReviewsContainer`: `isLoading` is not destructured from the `getReviews` query. As documented in Phase 2-E-1, no loading indicator existed before migration. **Phase 4 candidate:** wire `isLoading` to a spinner or skeleton in ReviewsContainer.

### `handleSortChange` replaces the `reviewListSort` useEffect

The original `ReviewsContainer` had:

```js
useEffect(() => {
  if (reviewListSort) {
    setReviewListPage(0)
    handleGetUserReviews(0, reviewListSort)
  }
}, [reviewListSort])
```

This was replaced by a `handleSortChange` wrapper passed to `ReviewFilters` as the `setReviewListSort` prop:

```js
const handleSortChange = (sort: string) => {
  setReviewListPage(0)
  setReviewListSort(sort)
}
```

**Why:** With `useQuery`, the fetch is driven by the query key `['reviews', recipeId, reviewListSort, reviewListPage]`. If the sort-change useEffect was kept (running after render), there is a window where the new sort is already in the key but the page has not yet reset to 0 — `useQuery` fires an interim query with `[recipeId, newSort, oldPage]` before the page reset takes effect. The handler collapses both state updates into the same event, so the key transitions directly to `[recipeId, newSort, 0]` with no intermediate query.

### Page increment timing changed

Same pattern as Phase 3-F and Phase 3-G: "More Reviews" now increments `reviewListPage` before the fetch (on click), rather than after a successful fetch. On fetch failure, the original would retry the same page; the new design would attempt the next page. The pre-existing lack of error state means this gap is silent — revisit when error handling is added.

### useInfiniteQuery candidate (Phase 4)

`ReviewsContainer` is a candidate for `useInfiniteQuery` migration in Phase 4, same as `Recipes.tsx`, `SavedRecipes.tsx`, and `UserRatings.tsx`.

---

## Phase 3-G: UserRatings.tsx — useQuery migration notes

**Date:** 2026-05-11

### Query key omits uid (prompt specified it, not implemented)

The phase prompt specified `['user-reviews', uid, page]` with uid from auth context. `getSingleUserReviews` resolves the username internally via `AuthAPI.getUsername()` — it takes no uid parameter. Including uid in the key would require importing auth context for a value not passed to the queryFn. Following the established `SavedRecipes` pattern (`['saved-recipes', selectOption.value, currPage]`), the key is `['user-reviews', selectOption.value, currPage]`.

**Phase 4 suggestion:** If cache isolation per user is needed (multi-account scenarios), add uid to both this key and the SavedRecipes key at the same time.

### `isMoreReviews` initial value: `true` → `false`

Original initialised `isMoreReviews` to `true`; migrated version uses `false` (matching `SavedRecipes`). Functionally equivalent: the Load More button is gated on `isMoreReviews && reviews.length > 0`, and `reviews` is empty before the first fetch completes.

### Page increment timing changed

Same as Phase 3-F (`SavedRecipes`): original incremented `page` after a successful fetch; the new design increments `currPage` before the fetch (on Load More click). On fetch failure, the original would retry the same page; the new design would attempt the next page. The pre-existing lack of error state means this gap is silent — revisit when error handling is added.

### useInfiniteQuery candidate (Phase 4)

`UserRatings.tsx` is a candidate for `useInfiniteQuery` migration in Phase 4, same as `Recipes.tsx` and `SavedRecipes.tsx`.

---

## Phase 3-E: Account.tsx and Navbar.tsx — useQuery migration notes

**Date:** 2026-05-11

### `enabled` condition mismatch between Account and Navbar

Account.tsx and Navbar.tsx have different `enabled` conditions for the `['username', uid]` query — Account skips the fetch when `authRes?.user?.displayName` is set, Navbar does not. Deduplication only fires for users without a display name. Revisit in Phase 4 to decide if these should be aligned.

---

## Phase 3-F: SavedRecipes.tsx — useQuery migration notes

**Date:** 2026-05-11

### Page increment timing changed

Original incremented `recipesPage` after a successful fetch; the new design increments `currPage` before the fetch (on Load More click). On fetch failure, the original would retry the same page; the new design would attempt the next page. The pre-existing lack of error state means this gap was already silent — but worth revisiting when error handling is added in Phase 4 or 5.

### useInfiniteQuery candidate (Phase 4)

`SavedRecipes.tsx` is a candidate for `useInfiniteQuery` migration in Phase 4, same as `Recipes.tsx`. The `useQuery` + manual accumulation pattern is a workaround for the load-more pattern that `useInfiniteQuery` handles natively.

---

## Phase 4-B: ReviewsContainer — loading indicator

**Date:** 2026-05-12

### Loading pattern inconsistency: TrendingRecipes vs SingleRecipe sub-components

Two distinct loading patterns coexist in the codebase:

**Implicit pattern (`TrendingRecipes.tsx`):** No `isLoading` flag is used. The component initialises its list to `[]`, and the skeleton UI is rendered whenever the list is empty — covering both the "loading" and "zero results" states with the same branch. There is no distinction between "still fetching" and "fetched with no data."

**Explicit pattern (`SingleRecipe` sub-components, `UserRatings.tsx`):** `isLoading` (or `isPending`) is destructured from `useQuery` and passed as a `loading` prop to child components. Children branch on `loading` to render `<Skeleton />` placeholders (via `react-loading-skeleton`) before data arrives, and show the real empty-state UI only after the query has settled.

Phase 4-B follows the **explicit pattern** for `ReviewsContainer` / `ReviewsList` because:
- `ReviewsList` has a meaningful empty state ("No Reviews") that must not show during loading.
- The implicit pattern cannot distinguish "loading" from "zero reviews" without additional state.

**Phase 5 suggestion:** Migrate `TrendingRecipes` to the explicit pattern (`isLoading` + `<Skeleton />`) for consistency. The always-false `recipes.length < 0` bug (documented in Phase 2-E-1) should be fixed at the same time.

---

## Phase 5: API contract gap analysis — open questions

**Date:** 2026-05-13

The Phase 5 decisions (`/api/` prefix, server-generated `_id`, `req.uid`-only identity, server-side username resolution, no PUT for mutations, drop tag/checkIfReviewed endpoints, add auth to ingredient parser) were checked against the current server. Five ambiguities surfaced that the stated decisions do not resolve:

### Public read endpoints — should they require auth?

These routes currently have **no** `verifyToken` middleware. The frontend interceptor sends a Bearer token when a user is logged in, but the server does not enforce one:

- `GET /getUsername`
- `GET /checkUsernameAvailability`
- `GET /recipes`
- `GET /searchAutoCompleteRecipes`
- `GET /getTrendingRecipes`
- `GET /getRecipe`

Phase 5 says "all routes must use `/api/` prefix" but does not say whether browse/read endpoints should be locked behind auth. Logged-out users can hit the recipe browse pages today, which suggests these should stay public, but the decision is not explicit.

### `getReviews` — `isCurrentUser` flag for anonymous viewers

`GET /getReviews` currently uses a client-supplied `username` to compute `isCurrentUser` on each review row (used by `ReviewsContainer` to highlight the user's own review). If Phase 5 #4 is applied strictly — resolve username from token, add `verifyToken` — then anonymous viewers cannot read reviews at all. If we want anonymous viewers to read reviews (but never see an `isCurrentUser: true` row), the auth guard needs to be optional on this route, or the `isCurrentUser` flag needs to move client-side.

### `editReview` HTTP verb

Phase 5 #6 lists "POST or DELETE" as the allowed mutation verbs. `editReview` is neither a create nor a delete — it is an update. POST is the only listed option, but PATCH would be more conventional. Decide whether to use POST (per the stated decision) or relax the rule to allow PATCH.

### Mount-level vs. route-level `/api/` prefix

Two ways to add the `/api/` prefix:
- (a) Change `app.use('/', recipeRoutes)` → `app.use('/api', recipeRoutes)` in `server/app.js`. Routes inside each router stay as `/getRecipe`, etc.
- (b) Rewrite every route definition inside each router file to include `/api/`.

(a) is much smaller and matches how the ingredient router is already mounted (`app.use('/api/ingredients', …)`). The frontend's `src/api/*.ts` callers must be updated in either case.

### Frontend changes are co-required

Every Phase 5 server change forces a corresponding frontend change (path prefix, drop `userId`/`username` query params, read server-returned `_id`, switch HTTP verbs). The gap analysis lists server-side fixes only — the client work in `src/api/recipes.ts`, `src/api/auth.ts`, and `src/api/ingredientParserApi.ts` is the same task and must ship together to avoid a broken intermediate state.

---

## Phase 5-B: /api/ prefix migration + dead-route cleanup

**Date:** 2026-05-13

### Scope of changes

- `server/app.js` — every router now mounted at `/api/*` (was bare `/`). The ingredient router is already at `/api/ingredients` and unchanged.
- `server/routes/tags.js` — deleted (no UI callers).
- `server/__tests__/tags.test.js` — deleted (target routes are gone).
- `src/api/recipes.ts` — every bare http call re-prefixed with `api/`. Four genuinely-unused methods removed: `search`, `addRecipeTag`, `searchRecipeTags`, `getRecipeTags`.
- `src/api/auth.ts` — `getUsername`, `checkUsernameAvailability`, `setUsername` re-prefixed with `api/`.
- `src/api/ingredientParserApi.ts` — untouched (already on `/api/ingredients/parse`).
- `server/__tests__/{auth,recipes,reviews,users}.test.js` — all `request(app).<verb>('/<path>')` paths bulk-rewritten to `'/api/<path>'`. `/health` and `/api/ingredients/parse` were left alone.
- `cypress/e2e/{auth,browse,recipe}.cy.ts` — all 14 `cy.intercept(...)` URLs bulk-rewritten from `${api()}/<path>*` to `${api()}/api/<path>*` so the network stubs match the new frontend call paths. `cy.visit(...)` URLs are SPA routes (not API), left alone.

Verification:
- `npm test --prefix server` → 95/95 passing (5 suites).
- `npm test -- --run` → 109/109 passing.
- `tsc --noEmit` → clean.

### Audit correction — `checkIfReviewed` is NOT unused

The Phase 1 audit (recorded in `REFACTOR.md` under "API contract flags") listed `checkIfReviewed()` as one of five "unused API functions" and the Phase 5 decision log carried this through as "do not implement." This was incorrect.

`src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews.tsx:32` calls `RecipeAPI.checkIfReviewed(recipeId)` inside a TanStack `useQuery` to pre-fill the user's existing rating and review on the recipe page. This was migrated to `useQuery` in Phase 3-H and remained an active production caller throughout.

**Action taken in 5-B:**
- The `GET /checkIfReviewed` handler in `server/routes/reviews.js` was restored after being deleted in the initial staged diff for this phase.
- `RecipeAPI.checkIfReviewed` kept in `src/api/recipes.ts` (re-prefixed to `/api/`).
- Only the four genuinely-unused functions were removed.

**Correction to record elsewhere:** the Phase 1 finding "Five unused API functions" should read "Four unused API functions: `search()`, `addRecipeTag()`, `searchRecipeTags()`, `getRecipeTags()`." The `REFACTOR.md` decision-log/audit entries that group `checkIfReviewed` into "DO NOT IMPLEMENT" should be treated as superseded by this note.

### Things deliberately left for later 5-* sub-phases

The following remain present in this commit, by design (deferred to the listed sub-phase):
- Client-supplied `userId`/`username` query params (5-C)
- All review/rating mutations still on `PUT` (5-E)
- Client-generated `_id` in `RecipeAPI.addRecipe` via `bson-objectid` (5-D)
- `POST /api/ingredients/parse` still un-guarded (5-F)
- Four stale `// TODO: protect with verifyToken` comments above already-protected routes in `server/routes/reviews.js` (5-E)

---

## Phase 5-C: Token-only identity — drop client-supplied userId/username

**Date:** 2026-05-13

### Server routes updated

Every protected route that previously read `userId` (query/body) for ownership/scoping now uses `req.uid` from `verifyToken`. The redundant `userId === req.uid` guards (which only ever produced 403s if the client lied to itself) are gone.

- `POST /api/setUsername` — query.userId dropped; uses `req.uid`. Param signature: `?username=...`
- `GET /api/getSavedRecipes` — query.userId dropped; uses `req.uid`.
- `POST /api/addRecipe` — body.userId no longer trusted. Server stamps `userId: req.uid` on the inserted doc (overrides anything client sends). `userRecipeData` keyed by `req.uid`.
- `DELETE /api/deleteRecipe` — query.userId dropped; `userRecipeData` $pull keyed by `req.uid`.
- `PUT /api/saveRecipe`, `GET /api/getSavedRecipe`, `PUT /api/unsaveRecipe`, `POST /api/madeRecipe`, `GET /api/checkMadeRecipe` — same pattern; query.userId dropped, `req.uid` used.
- `GET /api/checkIfReviewed` — now requires `verifyToken`. Drops query.username. Resolves username server-side from `req.uid` via the `usernames` collection (matches the pattern already used by addRating/newReview/editReview/deleteReview). Recipe pages still pre-fill the user's existing rating; anonymous viewers no longer see this query at all (`enabled: !!uid` on the React Query caller already gates this).

### Server routes already correct (no change)

These review/rating mutations already resolved username server-side from `req.uid` before this phase — confirmed:
- `PUT /api/addRating`, `PUT /api/newReview`, `PUT /api/editReview`, `PUT /api/deleteReview`

### Server routes deliberately not touched (target-vs-identity exception)

- `GET /api/getUsername?userId=...` — public lookup; userId is a target ("name for uid X"), not identity.
- `GET /api/checkUsernameAvailability?username=...` — public; username is a target.

### Frontend changes (signatures + URL bodies)

`RecipeAPI` and `AuthAPI` methods whose `userId` arg was identity-only now drop the arg entirely. Callers updated:

- `AuthAPI.setUsername(uid, username)` → `setUsername(username)` — callers: `AuthContext.signup`, `AuthContext.updateProfileData`, `CreateUsername`.
- `RecipeAPI.deleteRecipe(recipeId, userId)` → `deleteRecipe(recipeId)` — caller: `RecipeControls`.
- `RecipeAPI.saveRecipe(userId, recipeId)`, `getSavedRecipe(userId, recipeId)`, `unsaveRecipe(userId, recipeId)` → all single-arg `(recipeId)` — caller: `SaveRecipeBtn`.
- `RecipeAPI.madeRecipe`, `checkMadeRecipe`, `getSavedRecipes`, `addRecipe`, `newReview`, `checkIfReviewed`, `deleteReview` — signatures unchanged externally (already single-arg or shape-stable), but internal request URLs/bodies dropped the now-dead `userId`/`username` params.
- `NewReviewType` (src/types.ts): dropped `userId` field. `RecipeAPI.addRecipe` no longer types its body literal with `& { userId: string }` — server stamps it now.

### Server tests

4 dead test cases removed (asserted 403 on userId/token mismatch — that code path is gone):
- `POST /setUsername > rejects if userId does not match token uid (403)`
- `DELETE /deleteRecipe > rejects if userId does not match token uid (403)`
- `GET /getSavedRecipe > rejects if userId does not match token uid (403)`
- `POST /madeRecipe > rejects if userId does not match token uid (403)`

1 dead "missing userId → 400" removed: `GET /getSavedRecipes > returns 400 if userId is missing` (userId param no longer exists).

`?userId=${TEST_UID}` stripped from all remaining test URLs. New positive assertion in `POST /addRecipe`: stored doc's `userId` equals the verified token UID, regardless of body payload.

`GET /checkIfReviewed` tests updated: now require `AUTH_HEADER`; new 401 test added; username query param dropped.

### Verification

- `npm test --prefix server` → 91/91 (was 95; -4 dead tests removed).
- `npm test -- --run` → 109/109.
- `tsc --noEmit` → clean.

### Flagged for later (NOT changed in this pass)

#### `GET /api/getReviews` — anonymous viewer + `isCurrentUser` flag

Still uses `req.query.username` to compute the per-row `isCurrentUser` flag. Currently unprotected; allows logged-out users to browse reviews on a recipe page (which is desirable). Strictly applying Phase 5 decision #4 would require `verifyToken` here, which would break anonymous browsing.

Decision recommended for a future phase: keep this route public, move `isCurrentUser` computation client-side (compare each `review.username` to the authed user's resolved username on the frontend, in `ReviewsContainer` or below). Then drop the username query param.

#### `GET /api/getSingleUserReviews` — target lookup or self-scope?

Reads `req.query.username` (no auth). Route shape says "reviews by user X" (target), but the only current UI caller is the Account → UserRatings tab fetching the **current user's** reviews. Two plausible directions:
- Treat as target — keep public, no change. Future Public-profile pages can reuse.
- Treat as self-scope — add verifyToken, drop the username param, resolve from token. Breaks future public-profile use case.

Decision not load-bearing now (current caller works either way). Revisit when a public-profile UI is in scope.

### No `users` collection — note for future

The username lookup pattern uses the existing `usernames` collection (`{_id: uid, username}`), not a `users` collection. This was already established before Phase 5-C and continues to be load-bearing. If a richer user profile is later needed, those fields can live alongside in `usernames` or in a new `users` collection — at which point this assumption needs revisiting.

---

## Phase 5-D: Server-generated _id on recipe creation

**Date:** 2026-05-13

### Server (`server/routes/recipes.js`)

`POST /api/addRecipe` now generates `_id` server-side via `new ObjectId()` from the native MongoDB driver. The handler explicitly overrides any client-supplied `_id` after spreading `req.body` into the insert document — symmetric with how `userId` is overridden from `req.uid` (Phase 5-C).

- `_id` removed from `requiredFields`.
- Response shape: `{ _id }` with status `201 Created` (was `{ insertedId }` at `200`).
- `userRecipeData.userRecipes` $push now uses the server-generated `newId` instead of `body._id`.

### Frontend (`src/api/recipes.ts`)

- `bson-objectid` import removed (the only usage in the codebase).
- `RecipeAPI.addRecipe` no longer pre-generates `_id`. The body literal is now typed as `Omit<RecipeType, '_id'>`. After `http.post`, the new id is read from `result.data._id` and returned to the caller (signature stays `Promise<string | null>`).
- `AddRecipe.tsx` caller is unchanged — it only checks the truthy/null return; the value is the new server-generated 24-char hex id instead of a client-generated one.

### Server tests

`POST /addRecipe > creates recipe...` updated:
- Sends `_id: 'client-supplied-id-should-be-ignored'` in the payload — server must ignore.
- Asserts `res.status === 201`, `res.body._id` matches `/^[a-f0-9]{24}$/`, and `_id !== payload._id`.
- Uses `new ObjectId(res.body._id)` for the subsequent `findOne` lookup.

### Dependency cleanup

`bson-objectid@^2.0.2` removed from root `package.json` dependencies. `npm install` regenerated the lockfile — no remaining references in either file.

### Existing data — no migration needed

Existing recipe documents in MongoDB already use client-generated ObjectID strings (24-char hex), which are valid BSON ObjectIDs. New recipes will have `_id` stored as a true BSON `ObjectId` value (not a string). Reads via `findOne({ _id: '<24-char hex>' })` may need attention later — MongoDB does not implicitly cast strings to ObjectIds in queries. Currently `GET /api/getRecipe?id=<string>` uses `{ _id: id }` with the string id verbatim; this works for the existing string-typed `_id` documents but will fail to match new ObjectId-typed `_id` documents.

**Flagged for follow-up (out of strict 5-D scope):** all read paths that filter recipes by `_id` (`getRecipe`, `deleteRecipe`, `saveRecipe`, `unsaveRecipe`, `madeRecipe`, `checkMadeRecipe`, `getSavedRecipes`, `getSavedRecipe`) currently use the raw string. To handle both old (string) and new (ObjectId) documents during a transition, those routes need either:
- An ObjectId-or-string coercion helper applied to each query, or
- A one-time data migration converting old `_id` strings to ObjectId values, after which all queries can wrap incoming ids in `new ObjectId()`.

This was not in scope for 5-D and existing data was the only consideration. The server tests use string `_id` values for seed fixtures (e.g. `recipe-001`), which still match the existing string-typed lookups — so tests pass without coercion. The 5-D `addRecipe` test wraps the returned id in `new ObjectId()` for its findOne, confirming the new docs are queryable by ObjectId.

### Verification

- `npm test --prefix server` → 91/91.
- `npm test -- --run` → 109/109.
- `tsc --noEmit` → clean.
- `npm run build` → succeeds.

---

## Phase 5-E: REST verb standardization on review/rating mutations

**Date:** 2026-05-13

### Verb changes

`server/routes/reviews.js`:

| Route | Was | Now | Rationale |
|---|---|---|---|
| `/addRating` | PUT | **POST** | Upsert write. Recompute of `recipe.rating` aggregate per call → not idempotent. |
| `/newReview` | PUT | **POST** | Upsert. Server stamps `reviewCreatedAt`/`reviewLastUpdated` to `Date.now()`. |
| `/editReview` | PUT | **POST** | Server stamps `reviewLastUpdated` to `Date.now().toString()` on every call → not idempotent. The prompt's "PUT if truly idempotent" exception does not apply. |
| `/deleteReview` | PUT | **DELETE** | Clears `reviewText` (soft delete). |

URLs and handler logic untouched — only the verb on the `router.<verb>(...)` registration changes.

### Frontend (`src/api/recipes.ts`)

- `addRating`, `newReview`, `editReview`: `http.put(...)` → `http.post(...)`
- `deleteReview`: `http.put(...)` → `http.delete(...)`

### Stale comments removed

All four review/rating routes already had `verifyToken` middleware applied (since Phase 5-A or earlier). The four `// TODO: protect with verifyToken` comments sitting above them were stale — deleted. The `// PUT /xxx` summary comments updated to the new verb in the same edits so the file documents itself accurately.

### Server tests

`server/__tests__/reviews.test.js`: all `request(app).put(...)` calls updated to `.post(...)` or `.delete(...)` to match the new server verbs. `describe('PUT /xxx', ...)` and `// ─── PUT /xxx ───` section comments updated to `POST` / `DELETE` for accuracy. No assertion changes.

No Cypress intercepts targeted these four routes (grep returned zero matches), so no e2e changes were needed.

### Verification

- `tsc --noEmit` → clean.
- `npm test --prefix server` → 91/91.
- `npm test -- --run` → 109/109.

### Out of scope (called out so it's clear what isn't moving)

- Path renames toward REST-canonical shapes like `/reviews/:id`, `/ratings/:id`. Prompt explicitly said "Do not change the URL paths — only the method." The current paths (`/addRating`, `/newReview`, `/editReview`, `/deleteReview`) remain.
- `PUT /api/saveRecipe` and `PUT /api/unsaveRecipe` in `recipes.js` — also non-idempotent mutations, but recipe-save toggles aren't review/rating routes. Phase 5-E scope was explicit.

---

## Phase 4-C: ReviewOptions.tsx — pre-existing bug

**Date:** 2026-05-12

### AbortController created but never connected to the API call

`src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewOptions.tsx` — the `useEffect` creates an `AbortController` and calls `abortController.abort()` in the cleanup, but the controller is never passed to `AuthAPI.getUsername(uid)`. The cleanup does nothing; the in-flight request is not cancelled on unmount.

```ts
const abortController = new AbortController()
const getCurrUsername = async () => {
  if (uid) {
    const un = await AuthAPI.getUsername(uid)  // controller not passed
    setCurrUsername(un)
  }
}
getCurrUsername()
return () => {
  abortController.abort()  // no-op
}
```

**Impact:** If the component unmounts before the request resolves, `setCurrUsername` is called on an unmounted component. React 18 silently ignores this (the strict-mode warning was removed), so there is no observable crash, but the cleanup is dead code.

**Fix:** Either pass an `AbortSignal` to the HTTP layer and honour it in `AuthAPI.getUsername`, or remove the AbortController entirely. The `useQuery` migration in Phase 4-C removes the effect entirely, eliminating the issue.
