# Prepify Refactor — Source of Truth

Last updated: 2026-05-13

---

## The Plan

| Phase | Name                        | Status         |
| ----- | --------------------------- | -------------- |
| 1     | Audit & Inventory           | ✅ Complete    |
| 2     | Types & Contracts           | ✅ Complete    |
| 3     | Data Fetching (React Query) | ✅ Complete    |
| 4     | Component Architecture      | ✅ Complete    |
| 5     | Server Cleanup              | ✅ Complete    |
| 6     | Polish                      | 🔲 Not started |

**Rules that apply to every phase:**

- No feature work during refactor phases — behavior identical before/after each commit
- One focused PR per task; server and frontend always in separate PRs
- One git commit per phase (or per task if a phase has multiple PRs)
- Claude Code prompts: plan-and-pause before executing, `REFACTOR_NOTES.md` for flagging issues without acting
- All Claude Code prompt files use fenced code blocks (triple backticks, no language tag) — one block per prompt for easy copying

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

---

## Phase 2 — Types & Contracts ✅

**Completed:** 2026-05-11

### Tasks completed

- **2-A:** Removed dead code (server-ingredients/, session artifacts, stale docs, decs.d.ts entries)
- **2-B:** Structural fixes — renamed `RecipeNotFound.js/` → `RecipeNotFound/`, `index.jsx` → `index.tsx`
- **2-C:** Swept all frontend files to `src/`-absolute import style; moved `types.d.ts` → `src/types.ts`; added tsconfig paths alias and vite alias for `'types'` specifier
- **2-D:** TypeScript hygiene — `tsc --noEmit` passes clean; fixed pre-existing TS errors surfaced by 2-B; standardized component signatures; typed event handlers and catch blocks
- **2-E-1:** Wrote 4 frontend test files (`Home.test.tsx`, `Account.test.tsx`, `ReviewsContainer.test.tsx`, `RatingsAndReviews.integration.test.tsx`)
- **2-E-2:** Wrote `server/__tests__/ingredients.test.js`

### Deferred to later phases

- `package.json` cross-boundary imports in Footer and ReleaseNotes → Phase 6 (`VITE_APP_VERSION` env var)
- `ignoreDeprecations: "6.0"` in tsconfig.json → Phase 6 (migrate off `baseUrl` + `paths`)
- Several `src/api/recipes.ts` return types left as `unknown` pending Phase 5 server shape finalization
- react-select `onChange` cast pattern → Phase 4 (fix at JSX call site with `Select<T, false>`)

---

## Phase 3 — Data Fetching (React Query) ✅

**Completed:** 2026-05-11

### Tasks completed

All 10 components from the PATTERN_AUDIT.md hit list migrated from `useEffect`+`useState` to TanStack Query v5:

1. `Recipes.tsx` — `getAllRecipes()`, paginated + filtered
2. `SingleRecipe.tsx` — `getRecipe(id)`
3. `TrendingRecipes.tsx` — `getTrendingRecipes(4)`, error state added via `isError`
4. `SearchRecipesInput.tsx` — `searchAutoCompleteRecipes()`, debounced
5. `Account.tsx` — `AuthAPI.getUsername()`
6. `Navbar.tsx` — `AuthAPI.getUsername()`
7. `SavedRecipes.tsx` — `getSavedRecipes()`, paginated
8. `UserRatings.tsx` — `getSingleUserReviews()`, paginated
9. `RatingsAndReviews.tsx` — `checkIfReviewed()`
10. `ReviewsContainer.tsx` — `getReviews()`, paginated, loading state added

---

## Phase 4 — Component Architecture ✅

**Completed:** 2026-05-12

### Tasks completed

- **4-A through 4-D:** Component composition and prop-drilling cleanup per PATTERN_AUDIT.md
- `tsc --noEmit` passes clean
- All tests passing (109 frontend tests via Vitest, server tests via Jest)
- Build succeeds

### Notes

- `PHASE4_PROMPTS.md` at project root — **delete this file** (Phase 4 is complete)

---

## Phase 5 — Server Cleanup ✅

**Completed:** 2026-05-13

**Goal:** Clean the Express backend against API_CONTRACT.md — fix the routing, identity, payload-shape, and HTTP-method inconsistencies that accumulated before this refactor.

**Architecture:** Express + MongoDB Node.js driver + `firebase-admin` for server-side token verification.

### Tasks completed

- **5-A:** Audit current server against API_CONTRACT.md — gap table produced (output captured in this conversation's history; ambiguities flagged in `REFACTOR_NOTES.md` Phase 5 section).
- **5-B:** Added `/api/` prefix to every server route via `app.js` mount path changes. Deleted `server/routes/tags.js` and `server/__tests__/tags.test.js` (no UI callers). Frontend axios calls (`src/api/recipes.ts`, `src/api/auth.ts`) and Cypress intercepts updated to match. Removed 4 unused frontend methods (`search`, `addRecipeTag`, `searchRecipeTags`, `getRecipeTags`). Audit-correction note added for `checkIfReviewed` (the Phase 1 audit incorrectly listed it as unused; it has an active caller in `RatingsAndReviews.tsx` and was kept).
- **5-C:** Stripped client-supplied `userId`/`username` from every protected route. `req.uid` is the only source of identity. Frontend `RecipeAPI`/`AuthAPI` method signatures dropped their `userId` args. `NewReviewType.userId` field removed. `POST /api/addRecipe` now stamps `userId: req.uid` server-side.
- **5-D:** Server generates `_id` via `new ObjectId()` on recipe creation. Response is `{ _id }` with 201. Frontend `bson-objectid` removed and dropped from `package.json`.
- **5-E:** Review/rating HTTP methods standardized — `addRating`, `newReview`, `editReview` now POST; `deleteReview` now DELETE. 4 stale `// TODO: protect with verifyToken` comments deleted.
- **5-F:** Added `verifyToken` to `POST /api/ingredients/parse`, closing the AUTH GAP flagged in 5-A.
- **5-G:** Coverage pass — added 6 explicit assertions (3 × 401 for review/rating mutations, 1 spoofed-`username`-in-body test for `newReview`, 1 public-browse assertion for `GET /recipes`, 1 non-owner-403 test for `DELETE /deleteRecipe`). Also a real route fix: `DELETE /deleteRecipe` now does an ownership check (it previously allowed any authenticated user to delete any recipe).

### Verification (close-out, 2026-05-13)

- Server Jest: **97/97** passing
- Frontend Vitest: **109/109** passing
- `tsc --noEmit`: clean
- `npm run build`: succeeds
- Residual grep across `server/`: no `req.query.userId` or `req.body.userId` used for identity; no `router.put` on review/rating routes; no client-supplied `_id` accepted on creation. The two remaining `router.put` calls (`/saveRecipe`, `/unsaveRecipe`) are recipe-save toggles, explicitly out of 5-E scope.

### Deferred to Phase 6

- **MongoDB `_id` migration:** Pre-Phase-5-D recipes have string `_id` values; new recipes have native `ObjectId` `_id`. All read routes filter `{ _id: <string> }` — works for old docs but won't match new docs without a coercion helper or a one-time data migration. Same story for `deleteRecipe`'s new ownership check (pre-Phase-5-D recipes lack a `userId` field and will 403 their own owners). One backfill addresses both.
- **`GET /api/getReviews`** still reads `username` from query for its `isCurrentUser` per-row flag. Recommend moving that flag computation client-side and dropping the param — keeps anonymous review browsing working.
- **`GET /api/getSingleUserReviews`** target-vs-identity ambiguity. Revisit when a public-profile UI is in scope.
- **`PUT /api/saveRecipe`, `PUT /api/unsaveRecipe`** also non-idempotent mutations. Worth converting to POST/DELETE alongside a future round of recipe-save UX work.

### Commits on this branch (in order)

- `refactor(api): standardize /api prefix on routes; remove dead tag endpoints (Phase 5-B)`
- `refactor(api): trust the token — drop client userId/username for identity (Phase 5-C)`
- `refactor(recipes): server-generate _id on creation, drop bson-objectid (Phase 5-D)`
- `refactor(reviews): PUT → POST/DELETE on review/rating mutations (Phase 5-E)`
- `refactor(ingredients): require auth on POST /api/ingredients/parse (Phase 5-F)`
- `test(server): close coverage gaps + fix DELETE /deleteRecipe ownership (Phase 5-G)`
- _5-H close-out commit (this one): updates REFACTOR.md, lands `PHASE5_PROMPTS.md` source._

Server test note: Server tests use **Jest** (`npm test --prefix server`). Vitest is not installed in `server/node_modules`.

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
- Replace `package.json` cross-boundary imports in Footer/ReleaseNotes with `VITE_APP_VERSION` env var (flagged in Phase 2-C)
- Resolve `ignoreDeprecations: "6.0"` in tsconfig.json — migrate off `baseUrl` + `paths` before any TS major version upgrade (flagged in Phase 2-C)

**Prompts:** _(to be written after Phase 5 complete)_

---

## Session Handoff Protocol

At the end of each working session, run `/compress` to generate a handoff block.
Paste that block as the opening message of the next chat.
Each chat should be scoped to one phase where possible.

This file (`REFACTOR.md`) is the ground truth — it does not live in chat context.
Any new session should reference this file, not rely on conversation history.
