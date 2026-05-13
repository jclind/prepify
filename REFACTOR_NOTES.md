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

> **Status update (2026-05-13):** resolved in Phase 5-F — `verifyToken` added to the route and the "Auth gap" test inverted to assert 401. See the Phase 5-F entry below for details.

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

## Phase 5-F: AUTH GAP closed on POST /api/ingredients/parse

**Date:** 2026-05-13

The ingredient parser route was the only protected-feature route in the server without `verifyToken`. The Phase 5-A audit flagged this as an AUTH GAP; the unauthenticated-behavior test in `ingredients.test.js` was documenting it explicitly ("not an endorsement"). This phase closes it.

### Server (`server/routes/ingredients.js`)

`router.post('/parse', verifyToken, ...)` — middleware added in the same position used by every other protected route. Handler body untouched.

### Tests (`server/__tests__/ingredients.test.js`)

- "Auth gap" test (asserted 200 with no Authorization header) flipped polarity: now `rejects request with no auth token (401)`, and the "documents current behaviour — not an endorsement" comment block deleted.
- `AUTH_HEADER = { Authorization: 'Bearer fake-test-token' }` added; `.set(AUTH_HEADER)` applied to the seven existing 200/400/500 cases that previously didn't carry a token. The firebase-admin auto-mock resolves any Bearer token to `{ uid: 'test-uid' }`, so no other test wiring changed.

### No frontend changes

`src/api/ingredientParserApi.ts` uses the same `http` axios instance whose request interceptor (`src/api/http-common.ts`) attaches the Firebase ID token whenever a user is signed in. Per API_CONTRACT.md, the call site already runs from an authenticated context (AddRecipe page is gated by sign-in).

### Verification

- `npm test --prefix server` → 91/91 (net zero: one test replaced, not added/removed).

---

## Phase 5-G: Test-coverage pass + DELETE /deleteRecipe ownership fix

**Date:** 2026-05-13

### Coverage audit summary

Five test files (`auth`, `recipes`, `reviews`, `users`, `ingredients`) cover every route. The prompt's five coverage targets were mostly already covered by the Phase 5-B → 5-F test churn. Two genuine gaps surfaced — one of which was a real security bug in the route, not just a missing assertion.

### Route fix — `DELETE /deleteRecipe` ownership check

The handler used to delete by `recipeId` only, with no check that the requester owns the recipe. Any authenticated user could delete any recipe. Fixed:

```js
const recipe = await db.collection('recipes').findOne({ _id: recipeId })
if (!recipe) return res.status(404).json({ error: 'Recipe not found' })
if (recipe.userId !== uid) return res.status(403).json({ error: 'Forbidden' })
await db.collection('recipes').deleteOne({ _id: recipeId })
```

This relies on the `userId` field that Phase 5-D started stamping on inserts. Existing recipes in production that pre-date Phase 5-D may not have this field — they would now match `recipe.userId !== uid` (undefined !== anything) and 403, effectively locking the owner out. **Flagged for Phase 6** under the existing _id-migration note: same one-time backfill needed (stamp `userId` on pre-Phase-5-D recipes from whatever source-of-truth exists — likely `userRecipeData.userRecipes`).

### Tests added

`recipes.test.js`:
- `GET /recipes` — explicit "succeeds without an Authorization header (route is public)" assertion. Documents the intentional anonymous-browse behavior so a future stray `verifyToken` can't silently break it.
- `DELETE /deleteRecipe` — "rejects deletion attempt by non-owner (403)". Re-seeds the recipe with a different `userId`, expects 403, asserts the recipe still exists.
- Existing positive-path test now seeds `userId: TEST_UID` on the recipe (otherwise the new ownership check would 403 it).

`reviews.test.js`:
- `POST /addRating` — explicit 401 without auth.
- `POST /editReview` — explicit 401 without auth.
- `DELETE /deleteReview` — explicit 401 without auth.
- `POST /newReview` — "ignores client-supplied username in body and stores token-resolved username". Sends `username: OTHER_USERNAME` in the body; asserts the stored ratings doc has `TEST_USERNAME` and that no doc was written under `OTHER_USERNAME`.

### Audit-vs-reality discrepancy — GET /recipes is public

The prompt's coverage target #2 said `GET /api/recipes` should be "auth required". The route is intentionally public — the browse endpoint serves anonymous visitors (homepage, trending). Decision: test reality, not the prompt. The new public-route assertion documents this.

### Prompt mocking instructions vs established infra — followed established infra

The prompt said "Mock MongoDB collection calls using jest.fn() — do not connect to a real database" and "Mock verifyToken middleware to inject req.uid = 'test-uid'". Every existing test file in the suite uses `mongodb-memory-server` (started in `setup.js`) plus the `server/__mocks__/firebase-admin.js` auto-mock that resolves any Bearer token to `{ uid: 'test-uid' }`. Mixing two strategies in one test suite would be confusing; the prompt also said "Use the same patterns as server/__tests__/ingredients.test.js" — which uses the established infra. Followed the latter.

### Verification

- `npm test --prefix server` → 97/97 (was 91; +6 new cases).
- `npm test -- --run` → 109/109.
- `tsc --noEmit` → clean.

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

---

## Phase 6-C: `checkUsernameAvailability` URL fix + missing `src/api/auth.ts` test coverage

**Date:** 2026-05-13

### Fix applied

`src/api/auth.ts:19` had a malformed query string with a spurious `&` after the `?`:

```diff
-    `api/checkUsernameAvailability?&username=${username}`
+    `api/checkUsernameAvailability?username=${username}`
```

The URL parsed correctly in practice (Express/`URLSearchParams` discard the empty parameter before `&`), which is why it never broke. But it looked broken in network logs and was the kind of typo that quietly invites real bugs the next time someone copies the pattern.

### Test-coverage gap (not closed in this commit)

`src/api/auth.ts` has no test file. None of the three query-string-building methods are exercised by a test that asserts URL shape:

- `getUsername` → `api/getUsername?userId=…`
- `checkUsernameAvailability` → `api/checkUsernameAvailability?username=…` (the bug fixed above)
- `setUsername` → `api/setUsername?username=…`

UI callers (`src/context/AuthContext.tsx`, `src/Components/Form/UsernameInput.tsx`) are also untested, so nothing in the suite would have caught the `?&` typo.

**Recommended follow-up (separate commit):** add `src/test/api/auth.test.ts` that mocks `http` and asserts the exact URL each method calls. Three small assertions would have caught this bug at write time and would protect the other two methods from the same class of error.

---

## Phase 6-D: removed bogus CORS response headers from `nutrition` axios instance

**Date:** 2026-05-13

### Fix applied

`src/api/http-common.ts` — the `nutrition` axios instance (used for the Edamam `nutrition-details` POST in `src/api/recipes.ts:177`) was configured with three response-side CORS headers on its request config:

```diff
 export const nutrition = axios.create({
   baseURL: 'https://api.edamam.com/api',
   headers: {
     'Content-type': 'application/json',
-    'Access-Control-Allow-Headers': 'Content-Type',
-    'Access-Control-Allow-Origin': 'http://localhost:3000',
-    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
   },
 })
```

`Access-Control-Allow-*` headers are set by **servers in responses**, not by clients in requests. Setting them on an axios instance was a no-op at best: the browser still issues the request, and CORS is enforced by Edamam's response. At worst, sending these as custom request headers bloated the CORS preflight's `Access-Control-Request-Headers` list (it asked Edamam to permit four headers when only `content-type` was actually needed). Edamam's CORS policy happens to allow the bigger set, which is why the call has been working — the headers were misleading, not actively broken.

`Content-type: application/json` is kept as it's a legitimate request header for the POST body.

### Manual smoke-test owed before Phase 6-I

This change cannot be verified by the automated suite — no test mocks or asserts the Edamam call (see grep: only `src/api/http-common.ts` referenced `Access-Control-Allow`, no test files). The CI checks (tsc, vitest) only confirm we didn't break compilation or existing tests.

**Action required before Phase 6-I:** in a running dev server (`npm start`) with valid `VITE_EDAMAM_APP_ID` / `VITE_EDAMAM_APP_KEY` set, create a recipe through the AddRecipe flow and confirm:

1. The POST to `https://api.edamam.com/api/nutrition-details` returns 200 (DevTools → Network).
2. Nutrition data is populated on the resulting recipe (calories, dietLabels, etc. appear on the SingleRecipe page).
3. No CORS error in the browser console.

If any of those fail, the most likely culprit is that Edamam's CORS policy was specifically allowing the bogus headers and not `*` — in which case the fix is to file a Phase 6 note, not to revert (the headers were still wrong; the response handling would need a different fix).

---

## Phase 6-E: `GET /api/getUsername` returns `null` on missing doc (eliminates signup race 404s)

**Date:** 2026-05-13

### The bug

During email/password signup in `src/context/AuthContext.tsx:123-172`:

1. `createUserWithEmailAndPassword` resolves → Firebase fires `onAuthStateChanged` → `setUser(userInstance)`.
2. `signUp`'s `.then` kicks off `AuthAPI.setUsername(username)` — POST in flight, not awaited.
3. React rerenders. The `useEffect` at line 258 reacts to `[loading, user]` and calls `AuthAPI.getUsername(user.uid)`.
4. The GET races the POST. The user doc usually doesn't exist yet → `GET /api/getUsername` returned **404**.
5. Axios threw → unhandled promise rejection. `Navbar`, `Account`, and other mount-time `useQuery` callers each fired their own racing GETs, producing the visible "two 404 responses before the username resolves" symptom (TanStack Query's default retries eventually picked up the username once `setUsername` committed).

This bug was not previously logged in any refactor doc — discovered during Phase 6 cleanup.

### Fix applied (option-b)

`server/routes/auth.js:16` — replace the 404 with a 200 + `null` body when the doc doesn't exist:

```diff
-    if (!doc) return res.status(404).json({ error: 'User not found' })
+    if (!doc) return res.json(null)
```

`server/__tests__/auth.test.js:30-33` — flipped from asserting `status: 404` to asserting `status: 200, body: null`.

### Why option (b) over (a) or (c)

- **(a) client retry/backoff**: Would have to be applied at each of the 8 `getUsername` call sites (or wrapped centrally). Doesn't fix the type-vs-reality mismatch.
- **(c) sequence the calls**: Doesn't actually apply here — `signUp` does not itself call `getUsername`. The racing GET comes from a `useEffect` reacting to `setUser`, which Firebase fires independently. Properly sequencing would require a gating ref *on top of* the await chain — two changes.
- **(b) server returns null**: One server line + one server test update. The client `AuthAPI.getUsername` is already typed `Promise<string | null>`; the null branch was unreachable before this fix. All 8 call sites (`AuthContext.tsx:196, 260`, `Navbar.tsx:40`, `Account.tsx:21`, `Profile.tsx:28`, `ReviewOptions.tsx:29`, `RecipeControls.tsx:56`, `recipes.ts:109, 238, 250`) already have null-handling and now correctly exercise it. Fewest moving parts.

400 (missing/invalid `userId`) and 500 (server errors) are unchanged. Only the "doc not found" branch flipped.

### Residual trade-off — potential `/create-username` flash on signup

`AuthContext.tsx:260` previously read:

```ts
AuthAPI.getUsername(user.uid).then(username => {
  if (!username) navigate('/create-username')
})
```

Before this fix, the 404 threw → `.then` body never ran → no redirect.
**After this fix**, the `.then` body runs with `null` during the race window → `navigate('/create-username')` fires. A beat later, `setUsername` commits and `signUp`'s own `.then` calls `navigate('/')`. Net effect on signup: brief flash of `/create-username` before landing on home (~50-200ms race window in production).

For the *genuinely* missing-username case — first-time Google sign-in, etc. — this same redirect is the **correct** behavior and was silently broken before (the 404 was an unhandled rejection). So this fix repairs that path while introducing a transient flash on email/password signup.

### Follow-up (not in this commit) — gating ref to suppress the flash

If QA observes the flash, the smallest mitigation is a gating ref in `AuthProvider`:

```ts
const isSigningUpRef = useRef(false)
// set to true at the top of signUp, false after setUsername commits or fails

useEffect(() => {
  if (isSigningUpRef.current) return
  if (!loading && user && user.uid) {
    AuthAPI.getUsername(user.uid).then(username => {
      if (!username) navigate('/create-username')
    })
  }
}, [loading, user])
```

This keeps the useEffect's redirect intact for the genuinely-no-username case while suppressing it for the duration of signup. Track as a Phase 6 candidate if observed.

### Verification

- `npm test --prefix server` → 97/97 (test updated in this commit).
- `npm test` (Vitest) → 109/109 (no client tests assert against the 404 response shape).
- `tsc --noEmit` → clean (server-only change; client types unchanged).

Manual smoke-test owed before Phase 6-I: sign up a fresh account and confirm (a) no 404s in the Network panel for `/api/getUsername`, (b) no visible `/create-username` flash before landing on home. If the flash is visible, schedule the gating-ref follow-up.

---

## Phase 6-G: save/unsave routes — `PUT` → `POST/DELETE`, REST path params

**Date:** 2026-05-13

### Closes Phase 5-E deferral

Phase 5-E standardized review/rating mutations to POST/DELETE but explicitly left `PUT /api/saveRecipe` and `PUT /api/unsaveRecipe` as out-of-scope toggles (REFACTOR.md:162, 169; REFACTOR_NOTES.md:598). Phase 6-G picks up that thread.

### Server (`server/routes/recipes.js`)

```diff
-router.put('/saveRecipe', verifyToken, async (req, res) => {
-  const { recipeId } = req.query
+router.post('/recipes/:id/save', verifyToken, async (req, res) => {
+  const recipeId = req.params.id
```

```diff
-router.put('/unsaveRecipe', verifyToken, async (req, res) => {
-  const { recipeId } = req.query
+router.delete('/recipes/:id/save', verifyToken, async (req, res) => {
+  const recipeId = req.params.id
```

Handler bodies unchanged aside from the source of `recipeId`. Identity still flows from `req.uid` (Phase 5-C). Response shapes (`{ saved: true }` / `{ unsaved: true }` with 200) kept as-is to minimize blast radius — no callers read the body.

### Why same path + different verbs

The resource being mutated is *the user's saved-state for a recipe* — one resource, two operations. REST convention: same path, different verb. `POST /recipes/:id/save` creates the saved-state entry; `DELETE /recipes/:id/save` removes it. Mirrors Phase 5-E's pattern.

A `/save` + `/unsave` split (POST on one path, DELETE on another) was considered and rejected — `/unsave` reads as an action, `DELETE /save` reads as "remove the save," which is more idiomatic REST.

### Client (`src/api/recipes.ts`)

```diff
-  return await http.put(`api/saveRecipe?recipeId=${recipeId}`)
+  return await http.post(`api/recipes/${recipeId}/save`)
```

```diff
-  return await http.put(`api/unsaveRecipe?recipeId=${recipeId}`)
+  return await http.delete(`api/recipes/${recipeId}/save`)
```

### Tests updated

- `server/__tests__/recipes.test.js` — 5 cases re-aimed at the new verb + path; describe headers renamed. Assertion logic unchanged (same 200/404/409, same DB-state checks).
- `cypress/e2e/recipe.cy.ts:45-46` — intercepts re-aimed: `PUT … /api/saveRecipe*` → `POST … /api/recipes/*/save`; `PUT … /api/unsaveRecipe*` → `DELETE … /api/recipes/*/save`. Alias names unchanged.

### UI — no changes

`src/pages/SingleRecipe/Buttons/SaveRecipeBtn.tsx` is the only call site. It goes through `RecipeAPI.saveRecipe(recipeId)` / `unsaveRecipe(recipeId)`, doesn't read the response body, and only sets local React Query cache state. The verb/URL change is fully encapsulated in `RecipeAPI`.

### Verification

- `tsc --noEmit` → clean.
- `npm test --prefix server` → 97/97.
- `npm test` (Vitest) → 110/110.

Cypress is not part of the default test pipeline (`npm test` only runs Vitest; server suite runs via `--prefix server`). **Manual verification owed before Phase 6-I:** run `npx cypress run --spec cypress/e2e/recipe.cy.ts` and confirm the save/unsave path passes with the new intercept verbs/paths.

---

## Phase 6-H (follow-up candidate): sibling save-related routes still on old shape

**Date logged:** 2026-05-13 — **not done in this commit**.

After Phase 6-G, the sibling save-related routes remain on the old flat-name + `?recipeId=` query-string shape, creating a stylistic inconsistency:

- `GET /api/getSavedRecipe?recipeId=...`
- `POST /api/madeRecipe?recipeId=...`
- `GET /api/checkMadeRecipe?recipeId=...`

A consistent REST refactor would land them at:

- `GET /api/recipes/:id/save` (natural pair to the new POST/DELETE on the same path)
- `POST /api/recipes/:id/made` and `GET /api/recipes/:id/made`

Deferred because:

1. `getSavedRecipe` has more callers than the save/unsave pair and a different response contract (returns array of save-entry objects, not a 200/saved boolean) — needs its own scoped pass with attention to caller shape.
2. `madeRecipe` / `checkMadeRecipe` are a separate sub-feature ("I made this" tracking) and renaming them deserves its own commit, not a bundle with save.
3. Bundling all four into Phase 6-G would triple the diff for what is a clean verb fix.

Pick this up in a future Phase 6 task (or a Phase 7 server-API consistency pass if scope sprawls).

---

## Phase 6 — Cypress: pre-existing `signIn` failure unrelated to 6-G

**Date:** 2026-05-13

### Status

The Cypress smoke-test owed before Phase 6-I (`npx cypress run --spec cypress/e2e/recipe.cy.ts`) was run after Phase 6-G. The save/unsave path failed at the `cy.signIn(...)` step. The same failure is confirmed pre-existing — identical error reproduced against the commit *before* 6-G — so it is **not a regression** introduced by the route refactor. The save/unsave intercepts themselves cannot be exercised end-to-end until `signIn` is unblocked.

### Root cause (user investigation, 2026-05-13)

The test-mode flag the app reads at `src/client/db.ts:17` (`import.meta.env.VITE_CYPRESS === 'true'`) is not being supplied to the Vite dev server when Cypress is launched directly:

1. `VITE_CYPRESS` is not present in `.env`. `.env.example:13` has it as `VITE_CYPRESS=false`.
2. Commit `ca03cde` (2026-05-10, "fix: replace deprecated Cypress.env() with typed constant and disable allowCypressEnv") removed the `env:` block from `cypress.config.ts` and added `allowCypressEnv: false` to silence the Cypress 15 deprecation warning. The `env:` block previously held `API_URL`; `VITE_CYPRESS` was never in it.

The `npm run test:e2e:dev` and `test:e2e:ci` scripts in `package.json` set `VITE_CYPRESS=true` inline (`VITE_CYPRESS=true start-server-and-test start ...`), so end-to-end runs *through those scripts* work. Running `npx cypress run` directly against an already-running `npm start` (the more natural local workflow) does not propagate the var to Vite, so the app sees `VITE_CYPRESS === undefined` and `signIn` short-circuits.

### Fix candidates (not in this commit)

Per user investigation, two viable approaches — pick whichever fits the Cypress 15 deprecation posture better:

1. **Add `env: { VITE_CYPRESS: 'true' }` to `cypress.config.ts`** alongside the existing `allowCypressEnv: false`. *Note for future implementer:* verify this actually reaches the Vite dev server at run time — Cypress's `env:` block is normally for Cypress's own runtime, not Vite's. May need to be combined with another mechanism (e.g. a Vite plugin reading from Cypress, or shelling out via `setupNodeEvents`).
2. **Restore `allowCypressEnv: true`** in `cypress.config.ts` and **add `VITE_CYPRESS=true` to `.env`** (committed) or to the local dev shell environment. The dev server picks it up on next restart.

Either way, validate by hitting `import.meta.env.VITE_CYPRESS` in the browser DevTools console after a fresh `npm start` and confirming the value is the string `'true'`.

### Why not fix in this commit

Out of scope for Phase 6-G (save/unsave verb refactor) and would conflate two unrelated changes in one diff. Logging here so a future Phase 6 commit (or Phase 7 if it sprawls) can pick it up cleanly.

### Outstanding smoke tests still owed (does not block 6-I close-out, but tracking)

- Phase 6-D: Edamam nutrition POST — verify in browser that creating a recipe still loads nutrition data with no CORS error.
- Phase 6-E: signup race — verify in browser that signing up produces no 404s on `/api/getUsername` and no `/create-username` flash.
- Phase 6-G: save/unsave end-to-end — blocked on the Cypress `signIn` fix above; re-run `npx cypress run --spec cypress/e2e/recipe.cy.ts` once unblocked.

---

## Phase 6-F: `TrendingRecipes` always-false `.loading` className fixed

**Date:** 2026-05-13

### Resolves Phase 2-E-1 bug + Phase 5 follow-up

The condition `recipes.length < 0 ? '' : 'loading'` at `src/Components/TrendingRecipes/TrendingRecipes.tsx:20` was always-true (array lengths can't be negative), so the wrapper div carried the `.loading` class permanently — even after recipes were populated. Phase 2-E-1 flagged it; Phase 3-C intentionally preserved it during the React Query migration to keep behavior identical; Phase 5 line 341 listed the fix as a Phase 5/6 follow-up. Resolved here.

### Fix

Destructured `isLoading` from the existing `useQuery` and replaced the broken condition:

```diff
-  const { data } = useQuery<RecipeType[]>({
+  const { data, isLoading } = useQuery<RecipeType[]>({
     queryKey: ['trending-recipes'],
     queryFn: () => RecipeAPI.getTrendingRecipes(4),
   })
   ...
-      <div className={`recipes ${recipes.length < 0 ? '' : 'loading'}`}>
+      <div className={`recipes ${isLoading ? 'loading' : ''}`}>
```

`isLoading` is true on initial fetch (no data yet) and false after resolution — including the empty-array case, which means the broken `recipes.length === 0` edge case never appears.

### Regression test added

`src/test/Home.test.tsx` — new test `does not carry the .loading class on the recipes wrapper after recipes resolve`. Renders with one mock recipe, awaits `recipe-thumb`, and asserts `.trending-recipes .recipes.loading` is absent. This is the first className-level assertion in the suite for TrendingRecipes and would have caught the original bug.

### Pre-existing UX gap (intentionally untouched)

The inner ternary `recipes.length > 0 ? thumbs : skeletons` still renders 4 skeletons indefinitely if a successful fetch resolves with an empty array (no "Trending" content yet). This is documented in Phase 2-E-1 line 100 and the Phase 5 notes at line 333-341 (no distinction between "still fetching" and "fetched with no data"). Out of scope for this commit; left as a future UX/empty-state design task.

### Verification

- `tsc --noEmit` → clean.
- `npm test` (Vitest) → 110/110 (was 109, +1 regression test).
- `npm test --prefix server` → 97/97 (no server changes, sanity-run).
