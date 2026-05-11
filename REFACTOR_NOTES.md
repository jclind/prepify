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

## Phase 3-A: Recipes.tsx — useQuery migration notes

**Date:** 2026-05-11

### useInfiniteQuery candidate (Phase 4)

`Recipes.tsx` is a candidate for `useInfiniteQuery` migration in Phase 4 — the current `useQuery` + manual accumulation pattern is a workaround for the load-more pattern that `useInfiniteQuery` handles natively.

The `useQuery` approach requires keeping `recipeList` and `totalResults` as separate state that is manually updated via a `useEffect` on the query result. `useInfiniteQuery` would own the accumulated pages directly, eliminate the data-accumulation effect, and expose `fetchNextPage` / `hasNextPage` as first-class API surface.

### Known behavior difference: extra query on URL navigation while paginated

If `location.search` changes while `currPage > 0` (e.g., user navigates to `/?q=something` from page 2 of results), TanStack Query fires an interim query with the old page + new URL params before the filter reset effect resets `currPage` to 0. The original code never made this extra call. No current test exercises this path.

Root fix: migrate to `useInfiniteQuery` (see above).
