# Prepify Refactor — Source of Truth

Last updated: 2026-05-11

---

## The Plan

| Phase | Name                        | Status         |
| ----- | --------------------------- | -------------- |
| 1     | Audit & Inventory           | ✅ Complete    |
| 2     | Types & Contracts           | ✅ Complete    |
| 3     | Data Fetching (React Query) | ✅ Complete    |
| 4     | Component Architecture      | 🔲 Not started |
| 5     | Server Cleanup              | 🔲 Not started |
| 6     | Polish                      | 🔲 Not started |

**Rules that apply to every phase:**

- No feature work during refactor phases — behavior identical before/after each commit
- One focused PR per task; server and frontend always in separate PRs
- One git commit per phase (or per task if a phase has multiple PRs)
- Claude Code prompts: plan-and-pause before executing, `REFACTOR_NOTES.md` for flagging issues without acting

---

## Decision Log

| Date       | Decision                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-10 | `server-ingredients/` → **delete entirely**. It was the server component of `@jclind/ingredient-parser`, which has since moved to a different location. No callers, no wiring needed. No reference to it should exist after deletion.            |
| 2026-05-10 | Client-generated `_id` on recipe creation → **change the contract**. Server will generate the `_id` and return it; client will use the server response for navigation. Requires a migration plan for any existing documents (see Phase 5 notes). |
| 2026-05-10 | Redundant `userId` in query params alongside Bearer token → **trust the token only**. Backend will extract user identity from the verified Firebase token everywhere. Client-supplied `userId` params will be ignored on all endpoints.          |
| 2026-05-10 | Import style standard → **`src/`-absolute imports** across all frontend files. Already configured in `vite.config.ts`. Phase 2 will sweep and enforce this mechanically.                                                                         |
| 2026-05-10 | `@vitest/coverage-v8` → **installed**. Coverage now available as a baseline for all subsequent phases.                                                                                                                                           |

---

## Phase 1 — Audit & Inventory ✅

**Completed:** 2026-05-10
**Commit:** _(no source changes — audit only)_

### Output documents (do not delete)

- `API_CONTRACT.md` — every frontend API call mapped: method, URL, request/response shape, auth pattern, error handling. Primary source of truth for the Phase 5 backend build.
- `PROJECT_AUDIT.md` — dead code, legacy artifacts, stale docs, orphaned assets, and redundant config. Confidence-tiered (High/Medium/Low).
- `PATTERN_AUDIT.md` — inconsistent conventions across the codebase; includes the React Query migration hit list (10 components, priority-ordered).
- `TEST_BASELINE.md` — all test suite results (208 passing), coverage gap analysis by refactor risk, and 5 recommended test files to write before Phase 3.

### Key findings summary

**Dead code to remove (High confidence, safe to act on in Phase 2):**

- `src/shared/types/` — empty directory, not git-tracked
- `decs.d.ts` stale entries: `react-alert`, `react-helmet`, `react-star-ratings`, `uuid` — all dead
- `server-ingredients/` — entire directory (see decision log)
- `prepify-precheck.js`, `prepify-db-diagnostic.txt`, `prepify-db-diagnostic-2.txt`, `prepify-api-test-results.md` — session artifacts
- `README.old.md`, `browser-audit.md`, `CYPRESS_AUDIT.md`, `src/INGREDIENT_PARSER_AUDIT.md`, `src/INGREDIENT_PARSER_INTEGRATION_NOTES.md` — stale docs

**Structural anomalies to fix:**

- `src/pages/SingleRecipe/RecipeNotFound.js/` — directory named with `.js` suffix; rename to `RecipeNotFound/`
- `src/index.jsx` — only `.jsx` file in the project; rename to `index.tsx`

**API contract flags (drives Phase 5 backend build):**

- [CRITICAL] Client-generated `_id` on recipe creation (decided: change to server-generated — see decision log)
- [CRITICAL] Ingredient parser routing: `/api/ingredients/parse` uses `/api/` prefix; all other routes are bare. Standardize to `/api/` prefix on all routes in Phase 5.
- [HIGH] Redundant `userId` in 10+ endpoints alongside Bearer token (decided: trust token only — see decision log)
- [HIGH] `username` passed in query for review endpoints — backend should resolve from token UID, not trust client-supplied value
- [MEDIUM] Five unused API functions: `search()`, `addRecipeTag()`, `searchRecipeTags()`, `getRecipeTags()`, `checkIfReviewed()` — do not implement backend routes for these until there is a UI caller
- [MEDIUM] All review/rating mutations use `PUT` instead of `POST`/`DELETE` — non-standard; standardize in Phase 5

**Test coverage gaps (address before Phase 3):**
Write these 5 test files before Phase 3 begins:

1. `src/test/Home.test.tsx`
2. `src/test/Account.test.tsx` (or per-tab: SavedRecipes, UserRatings, UserRecipes)
3. `src/test/ReviewsContainer.test.tsx`
4. `src/test/RatingsAndReviews.integration.test.tsx`
5. `server/__tests__/ingredients.test.js`

---

## Phase 2 — Types & Contracts ✅

**Completed:** 2026-05-11
**Commit:** _(squash pending — tasks committed separately as 2-A through 2-E)_

### Tasks completed

- **2-A:** Removed dead code — `server-ingredients/`, session artifacts, stale docs, stale `decs.d.ts` entries
- **2-B:** Fixed structural anomalies — renamed `RecipeNotFound.js/` → `RecipeNotFound/`, `index.jsx` → `index.tsx`
- **2-C:** Swept all frontend files to `src/`-absolute import style; moved `types.d.ts` → `src/types.ts`; updated `tsconfig.json` paths alias and `vite.config.ts` alias
- **2-D:** TypeScript hygiene — fixed `any` in event handlers, catch blocks, react-select style configs; added missing return type annotations; `tsc --noEmit` passes clean
- **2-E:** Wrote 5 missing test files; frontend now at 109 passing tests across 12 files; server Jest suite has new `server/__tests__/ingredients.test.js`

### Key outcomes

- `src/types.ts` replaces root `types.d.ts`; `NutritionDataType` fields typed with concrete types or `unknown[]`; `NutrientInfo` interface added
- `tsconfig.json` has `"ignoreDeprecations": "6.0"` — must be resolved before any TS major version upgrade (Phase 6)
- Server tests use **Jest** (not Vitest) — `npm test --prefix server`. Vitest `include` glob excludes `server/`. Future server test prompts must say Jest explicitly.
- `POST /api/ingredients/parse` has no `verifyToken` guard — unauthenticated gap documented, fix in Phase 5

### Deferred items (see REFACTOR_NOTES.md for full detail)

- `src/api/recipes.ts` — 7 methods without explicit return types; revisit in Phase 5 once server shapes are finalized
- `tsconfig.json` `ignoreDeprecations: "6.0"` / `baseUrl` deprecation — Phase 6
- react-select `onChange` cast pattern — Phase 4 (specify `Select<T, false>` at call site)
- Three bugs documented but not fixed: `recipes.length < 0` dead condition in `TrendingRecipes`, silent rejected-fetch swallow in `TrendingRecipes`, no loading indicator in `ReviewsContainer` — addressed naturally during Phase 3 React Query migration

### Phase 2-D detail — deferred type items

**`src/api/recipes.ts` — methods without explicit return types (revisit in Phase 5):**

- `checkMadeRecipe`, `checkIfReviewed`, `searchRecipeTags`, `getRecipeTags`, `getReviews`, `getSavedRecipes`, `getSingleUserReviews` — return types unknown; callers destructure shaped objects but server shapes not yet finalized

**`src/api/recipes.ts` — partially typed return values:**

- `saveRecipe` / `unsaveRecipe` — `Promise<AxiosResponse>` with no generic param; revisit with `AxiosResponse<T>` in Phase 5
- `deleteRecipe` / `madeRecipe` — `Promise<unknown>`; cast as `{ error?: string }` at call site in `RecipeControls.tsx`

**`src/types.ts` — `NutritionDataType.ingredients: unknown[]`:**

- Edamam API field; never accessed in this codebase. Revisit if ingredient breakdown UI is built.

**`src/context/client/db.ts` — `(window as any).__cy_signIn__`:**

- Intentional Cypress test hook. `as any` is load-bearing; left unchanged.

**react-select `onChange` handler types:**

- All single-select handlers cast `e as SingleValue<T>`. Safe — none use `isMulti`. Revisit in Phase 4: specify `Select<T, false>` at JSX call site.

---

## Phase 3 — Data Fetching (React Query) ✅

**Completed:** 2026-05-11
**Commit:** _(one commit per task, 3-Setup through 3-H)_

### Tasks completed

- **3-Setup:** Installed `@tanstack/react-query` and `@tanstack/react-query-devtools`; wired `QueryClientProvider` in `src/index.tsx`
- **3-A:** `Recipes.tsx` — `getAllRecipes()`, paginated + filtered accumulation via `useQuery` + data effect
- **3-B:** `SingleRecipe.tsx` — `getRecipe(id)`, full three-state, `enabled: !!id`
- **3-C:** `TrendingRecipes.tsx` — `getTrendingRecipes(4)`, loading class behavior preserved
- **3-D:** `SearchRecipesInput.tsx` — `searchAutoCompleteRecipes()`, debounced with `enabled` guard
- **3-E:** `Account.tsx` and `Navbar.tsx` — `AuthAPI.getUsername()`, shared `['username', uid]` key, deduplicated by React Query
- **3-F:** `SavedRecipes.tsx` — `getSavedRecipes()`, paginated accumulation
- **3-G:** `UserRatings.tsx` — `getSingleUserReviews()`, paginated accumulation
- **3-H:** `RatingsAndReviews.tsx` and `ReviewsContainer.tsx` — `checkIfReviewed()` and `getReviews()`; `handleSortChange` atomically resets page + sort (replaces sort-change `useEffect`, avoids double-fetch race)
- **3-Verify:** 109/109 frontend tests, 103/103 server tests, clean build, no migration misses

### Key outcomes

- All `useEffect`+`useState` data fetching replaced with `useQuery`
- 7 remaining `useEffect` calls are correctly not migrated: `AuthContext.tsx` (auth gate, not a query), `UsernameInput.tsx` (form validation), and 5 Phase 4 candidates (see below)
- `Recipes.tsx` noted as `useInfiniteQuery` candidate in Phase 4 — current `useQuery` + manual accumulation is a functional workaround

### Query key conventions (for reference in Phase 4+)

| Data                | Key                                           |
| ------------------- | --------------------------------------------- |
| Recipe list         | `['recipes', { page, sort, filter, search }]` |
| Single recipe       | `['recipe', id]`                              |
| Trending recipes    | `['trending-recipes']`                        |
| Autocomplete        | `['recipe-autocomplete', debouncedQuery]`     |
| Username            | `['username', uid]`                           |
| Saved recipes       | `['saved-recipes', page]`                     |
| User reviews        | `['user-reviews', uid, page]`                 |
| Recipe reviews      | `['reviews', recipeId, sort, page]`           |
| Check made/reviewed | `['check-made', recipeId]`                    |

---

## Phase 4 — Component Architecture 🔲

**Goal:** Component composition, prop-drilling cleanup, structural refactors, and remaining React Query wiring deferred from Phase 3.

### Migration candidates (from Phase 3 verify report)

These 5 components still use `useEffect`+`useState` for data fetching and were out of scope for Phase 3. Each is a clean `useQuery` candidate:

| Component            | Fetch call                     | Notes                                                                                        |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `Profile.tsx`        | `AuthAPI.getUsername()`        | Biggest win: one query replaces a `loading` flag + 5 data fields                             |
| `MadeRecipeBtn.tsx`  | `RecipeAPI.checkMadeRecipe()`  | No fetch loading state currently; `isLoading` would enable a button skeleton for free        |
| `SaveRecipeBtn.tsx`  | `RecipeAPI.getSavedRecipe()`   | No fetch loading state currently; same pattern as `MadeRecipeBtn`                            |
| `RecipeControls.tsx` | `AuthAPI.getUsername(currUID)` | Drives `isUsersRecipe` (show/hide edit-delete); shares `['username', uid]` key — cached      |
| `ReviewOptions.tsx`  | `AuthAPI.getUsername(uid)`     | Drives `currUsername` (show/hide edit-delete on review); shares `['username', uid]` — cached |

Note on `RecipeControls` and `ReviewOptions`: both call `getUsername` with a uid — they will share the `['username', uid]` query key with `Account.tsx` and `Navbar.tsx` from Phase 3-E. React Query will serve these from cache with no extra network calls.

### Other known candidates

- `Recipes.tsx` — migrate from `useQuery` + manual accumulation to `useInfiniteQuery` (designed for load-more patterns); flagged during Phase 3-A
- `ReviewsContainer` — wire `isLoading` to a loading indicator now that it's available from React Query (intentionally deferred in Phase 3-H as a feature change)
- react-select `onChange` handlers — specify `Select<T, false>` at JSX call sites instead of casting `e as SingleValue<T>` (deferred from Phase 2-D)

**Prompts:** _(to be written after Phase 3 complete — next step)_

---

## Phase 5 — Server Cleanup 🔲

**Goal:** Rebuild/clean the Express backend using the API_CONTRACT.md as the source of truth.

**Architecture:** Express + MongoDB Node.js driver + `firebase-admin` for server-side token verification.

**Key backend decisions already made:**

- All routes use `/api/` prefix (standardizing from current mixed state)
- Server generates `_id` on recipe creation; returns it to client
- User identity always extracted from verified Firebase token; client-supplied `userId` ignored
- `username` for review scoping resolved from token UID, not query param
- Tag endpoints (`addRecipeTag`, `searchRecipeTags`, `getRecipeTags`) and `checkIfReviewed` — do not implement until there is a UI caller
- HTTP methods: standardize review/rating mutations to `POST`/`DELETE` (currently all `PUT`)
- Stale TODO comments in `server/routes/reviews.js` (4 comments on routes that are already protected) — remove
- `POST /api/ingredients/parse` missing `verifyToken` — add in Phase 5

**Client-generated `_id` migration plan:**

- Existing recipe documents in MongoDB already have client-generated ObjectID `_id` values — these are valid BSON ObjectIDs and do not need to change
- The change is purely in the creation flow: remove `bson-objectid` from the frontend, have the server generate `_id`, return it in the POST /addRecipe response, and update the client to read the ID from the response for navigation
- No data migration needed

**Prompts:** _(to be written after Phase 4 complete)_

---

## Phase 6 — Polish 🔲

**Goal:** Final cleanup, documentation updates, performance, and anything deferred from earlier phases.

**Known items:**

- Update `CLAUDE.md` env var section: replace `REACT_APP_*` references with correct `VITE_*` names; add `VITE_OPEN_AI_API_KEY` note (defined but unused — decide keep or remove)
- Update `public/manifest.json` from CRA boilerplate to Prepify branding
- Fix `public/sitemap.txt` mixed-domain issue (or delete in favor of `sitemap.xml`)
- Fix `uploadRecipeImage` to use unique filenames (hash or UUID prefix) to prevent overwrites
- Fix `checkUsernameAvailability` spurious `?&username=` double ampersand
- Remove CORS headers from the `nutrition` axios instance client-side request (they're server-side response headers; harmless but misleading)
- `src/api/http-common.ts` CORS comment cleanup
- Resolve `tsconfig.json` `ignoreDeprecations: "6.0"` / `baseUrl` deprecation before any TS major upgrade
- react-select `onChange` handlers: specify `Select<T, false>` at JSX call sites (if not done in Phase 4)

**Prompts:** _(to be written after Phase 5 complete)_

---

## Session Handoff Protocol

At the end of each working session, run `/compress` to generate a handoff block.
Paste that block as the opening message of the next chat.
Each chat should be scoped to one phase where possible.

This file (`REFACTOR.md`) is the ground truth — it does not live in chat context.
Any new session should reference this file, not rely on conversation history.
