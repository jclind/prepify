# Prepify Refactor — Source of Truth

Last updated: 2026-05-10

---

## The Plan

| Phase | Name                        | Status         |
| ----- | --------------------------- | -------------- |
| 1     | Audit & Inventory           | ✅ Complete    |
| 2     | Types & Contracts           | 🔲 Not started |
| 3     | Data Fetching (React Query) | 🔲 Not started |
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

## Phase 2 — Types & Contracts 🔲

**Goal:** Establish shared TypeScript types, enforce import style, and remove dead code/artifacts. No logic changes. Frontend-only PR.

**Planned tasks (to be detailed in Claude Code prompts):**

- Remove dead code flagged in PROJECT_AUDIT.md (High confidence items only)
  - `server-ingredients/` directory
  - Root-level session artifact files
  - Stale docs and config entries
  - `decs.d.ts` stale entries
- Fix structural anomalies: rename `RecipeNotFound.js/` → `RecipeNotFound/`, `index.jsx` → `index.tsx`
- Sweep all frontend files to `src/`-absolute import style (mechanical, no logic changes)
- Standardize component signature pattern: `type Props` + `const X: FC<Props>` everywhere
- Fix `any` usages in TypeScript (event handlers, catch blocks, react-select style configs)
- Add missing return type annotations in `src/api/recipes.ts` and `src/api/auth.ts`
- Write 5 missing test files (see Phase 1 coverage gap list above)

**Prompts:** _(to be written — next step)_

---

### Phase 2-D — TypeScript Hygiene (complete)

**Completed:** 2026-05-11  
**Commit:** _(pending)_  
`tsc --noEmit` passes clean.

#### Deferred / flagged items

**`src/api/recipes.ts` — methods without explicit return types (revisit in Phase 5 once server shapes are finalized):**
- `checkMadeRecipe` — return type unknown (caller destructures `{ datesMade }`)
- `checkIfReviewed` — return type unknown (unused in current UI; flagged in Phase 1 as unnecessary)
- `searchRecipeTags` — return type unknown (unused in current UI)
- `getRecipeTags` — return type unknown (unused in current UI)
- `getReviews` — return type unknown (caller destructures `{ reviews, totalCount }`)
- `getSavedRecipes` — return type unknown (caller destructures `{ recipes, totalCount }`)
- `getSingleUserReviews` — return type unknown (caller destructures `{ reviews, totalCount }`)

**`src/api/recipes.ts` — partially typed return values:**
- `saveRecipe` / `unsaveRecipe` — return `Promise<AxiosResponse>`. Response body shape is untyped (generic `AxiosResponse` with no generic param). Revisit with `AxiosResponse<T>` once server response shapes are defined in Phase 5.
- `deleteRecipe` / `madeRecipe` — return `Promise<unknown>`. Response shape not modeled on the frontend. In `RecipeControls.tsx`, the result is cast as `{ error?: string }` to access the error field. Revisit in Phase 5.

**`src/types.ts` — `NutritionDataType.ingredients: unknown[]`:**
- The Edamam API returns a parsed-ingredient array here but the field is never accessed directly in this codebase. Typed as `unknown[]` with a TODO comment. Revisit if the ingredient breakdown UI is ever built.

**`src/context/client/db.ts` — `(window as any).__cy_signIn__`:**
- Left unchanged. This is an intentional Cypress test hook that exposes a sign-in helper on the window object for E2E tests. The `as any` is load-bearing; `as unknown` would break the assignment pattern.

**react-select `onChange` handler types:**
- react-select's `onChange` prop signature is `(newValue: MultiValue<T> | SingleValue<T>, actionMeta: ActionMeta<T>) => void` regardless of `isMulti`. TypeScript 6's `Array.isArray` predicate (`arg is any[]`) does not narrow `MultiValue<T>` (which is `readonly T[]`), so narrowing with `Array.isArray` doesn't work. All single-select `onChange` handlers cast `e as SingleValue<T>` at the top of the handler — safe because none of these Select components use `isMulti`. Revisit in Phase 4 when refactoring component architecture; at that point, specify `Select<T, false>` at the JSX call site to make TypeScript infer the narrower `onChange` type automatically.

---

## Phase 3 — Data Fetching (React Query) 🔲

**Goal:** Replace all `useEffect`+`useState` data fetching with TanStack Query (React Query). Behavior identical before/after.

**Migration hit list (from PATTERN_AUDIT.md, priority order):**

1. `Recipes.tsx` — `getAllRecipes()`, paginated + filtered, full three-state, 2 useEffects ✅ well-tested
2. `SingleRecipe.tsx` — `getRecipe(id)`, full three-state, 2 useEffects ✅ well-tested
3. `TrendingRecipes.tsx` — `getTrendingRecipes(4)`, loading only, missing error handling
4. `SearchRecipesInput.tsx` — `searchAutoCompleteRecipes()`, debounced, no states at all
5. `Account.tsx` — `AuthAPI.getUsername()`, no states
6. `Navbar.tsx` — `AuthAPI.getUsername()`, no states
7. `SavedRecipes.tsx` — `getSavedRecipes()`, paginated, loading only
8. `UserRatings.tsx` — `getSingleUserReviews()`, paginated, loading only
9. `RatingsAndReviews.tsx` — `checkIfReviewed()`, no states (parent orchestrator — needs tests first)
10. `ReviewsContainer.tsx` — `getReviews()`, paginated (needs tests first)

**Prompts:** _(to be written after Phase 2 complete)_

---

## Phase 4 — Component Architecture 🔲

**Goal:** Component composition, prop-drilling cleanup, and any structural refactors surfaced by PATTERN_AUDIT.md.

**Prompts:** _(to be written after Phase 3 complete)_

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

**Prompts:** _(to be written after Phase 5 complete)_

---

## Session Handoff Protocol

At the end of each working session, run `/compress` to generate a handoff block.
Paste that block as the opening message of the next chat.
Each chat should be scoped to one phase where possible.

This file (`REFACTOR.md`) is the ground truth — it does not live in chat context.
Any new session should reference this file, not rely on conversation history.
