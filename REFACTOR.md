# Prepify Refactor — Source of Truth

Last updated: 2026-05-12

---

## The Plan

| Phase | Name                        | Status         |
| ----- | --------------------------- | -------------- |
| 1     | Audit & Inventory           | ✅ Complete    |
| 2     | Types & Contracts           | ✅ Complete    |
| 3     | Data Fetching (React Query) | ✅ Complete    |
| 4     | Component Architecture      | ✅ Complete    |
| 5     | Server Cleanup              | 🔲 Not started |
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

**Planned tasks (prompts in `PHASE5_PROMPTS.md`):**

- **5-A:** Audit current server against API_CONTRACT.md — produce gap table
- **5-B:** Add `/api/` prefix to all routes via app.js mount path changes only
- **5-C:** Strip client-supplied `userId`/`username` params; use `req.uid` everywhere
- **5-D:** Server-generated `_id` on recipe creation; remove `bson-objectid` from frontend
- **5-E:** Standardize review/rating HTTP methods (PUT → POST/DELETE); remove stale TODO comments
- **5-F:** Add `verifyToken` to `POST /api/ingredients/parse` (AUTH GAP fix)
- **5-G:** Server test coverage pass — Jest tests for all major route files
- **5-H:** Final verification + REFACTOR.md update + git commit

**Server test note:** Server tests use **Jest** (`npm test --prefix server`). Do not use Vitest for server tests — it is not installed in `server/node_modules`.

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
