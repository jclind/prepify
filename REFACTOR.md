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
| 6     | Polish                      | ✅ Complete    |

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

## Phase 6 — Polish ✅

**Completed:** 2026-05-13

**Goal:** Final cleanup, documentation updates, performance, and anything deferred from earlier phases.

### Tasks completed

- **6-A:** `CLAUDE.md` env vars (`REACT_APP_*` → `VITE_*`), expanded Firebase glob to explicit names, flagged `VITE_OPEN_AI_API_KEY` / `VITE_INGREDIENT_PARSER_URL` as defined-but-unused, dropped `SASS_PATH`, added `SPOONACULAR_API_KEY` to server doc + `server/.env.example`, fixed stale `tags`/`types.d.ts`/`src/shared/types/` references, "both servers" → "the server".
- **6-B:** `public/manifest.json` rewritten with Prepify branding and brand colors (`#ff5722` / `#eeeeee`); `index.html` `<meta name="theme-color">` aligned; `public/sitemap.txt` deleted (mixed-domain; `sitemap.xml` is canonical).
- **6-C:** `checkUsernameAvailability` URL fix (`?&` → `?`); gap flagged in `REFACTOR_NOTES.md` that `src/api/auth.ts` has no test file at all.
- **6-D:** Removed bogus `Access-Control-Allow-*` request headers from the `nutrition` axios instance in `src/api/http-common.ts`; kept legitimate `Content-type`.
- **6-E:** `GET /api/getUsername` returns `null` (200) on missing doc instead of 404 — eliminates signup-race 404 noise. Aligns runtime with the existing `Promise<string | null>` client type. Residual `/create-username` flash risk documented.
- **6-F:** `TrendingRecipes` `.loading` className wired to `isLoading` from `useQuery`; the always-false `recipes.length < 0` guard removed. Regression test added.
- **6-G:** `saveRecipe` / `unsaveRecipe` standardized to REST shape — `POST /api/recipes/:id/save` and `DELETE /api/recipes/:id/save`. Closes the Phase 5-E deferral. Server tests + Cypress intercepts updated; UI unchanged (encapsulated in `RecipeAPI`).
- **Documentation breadcrumb:** added forward pointer from the Phase 2-E-2 historical "Auth gap" note to its Phase 5-F resolution so the entry isn't misread as an open item.

### Verification (close-out, 2026-05-13)

- Server Jest: **97/97** passing
- Frontend Vitest: **110/110** passing
- `tsc --noEmit`: clean
- `npm run build`: succeeds

### Commits on this branch (in order)

- `docs: fix CLAUDE.md env vars (REACT_APP_* → VITE_*) and other stale content` (6-A)
- `chore(public): replace CRA boilerplate manifest, drop mixed-domain sitemap.txt` (6-B)
- `fix(auth): drop spurious & from checkUsernameAvailability query string` (6-C)
- `fix(api): drop bogus CORS response headers from nutrition axios instance` (6-D)
- `fix(auth): return null from GET /getUsername on missing doc` (6-E)
- `fix(trending): wire .loading className to isLoading, drop always-false guard` (6-F)
- `docs(refactor-notes): cross-link Phase 2-E-2 auth-gap entry to Phase 5-F resolution` (breadcrumb)
- `refactor(recipes): save/unsave PUT → POST/DELETE on /api/recipes/:id/save` (6-G)
- `docs(refactor-notes): log pre-existing Cypress signIn failure (Phase 6 Cypress entry)` (Cypress 6-I prep)
- _Phase 6 close-out commit (this one): marks Phase 6 ✅ Complete and records deferrals below._

### Deferred from Phase 6 (not done)

These items appeared on the original Phase 6 known-items list (or surfaced during the phase) but were not executed. None block close-out; each has a reason it didn't fit this phase.

- **`uploadRecipeImage` unique filenames.** Originally listed at line 194. Fix touches the Firebase Storage upload path and may require a migration plan for any pre-existing colliding objects in the bucket. Better as its own focused PR than bundled with verb/URL polish.
- **`VITE_APP_VERSION` env var for Footer / ReleaseNotes.** Originally listed at line 198 (and flagged in Phase 2-C). Removing the cross-boundary `package.json` import requires either a Vite plugin or a `define()` injection — small surface but a real architectural choice about how to expose build metadata. Worth one targeted PR.
- **`ignoreDeprecations: "6.0"` in `tsconfig.json`.** Originally listed at line 199 (and flagged in Phase 2-C). Migrating off `baseUrl` + `paths` is a TypeScript-tooling refactor that should be tied to the next TS major-version upgrade — doing it now without that pressure invites re-doing it later.
- **Cypress `signIn` config fix.** ~~Confirmed pre-existing during Phase 6-G smoke-testing; rooted in `cypress.config.ts` `allowCypressEnv: false` (commit `ca03cde`) and missing `VITE_CYPRESS=true` in `.env`. Full diagnosis and two candidate fixes recorded in `REFACTOR_NOTES.md` under "Phase 6 — Cypress." Out of scope for any of the Phase 6 code fixes.~~ **Resolved 2026-05-14** via `.env.test` + `vite --mode test` — see "Vite v8 — VITE_CYPRESS shell env no longer surfaces to client bundle" in `REFACTOR_NOTES.md`.
- **Manual browser smoke-tests still owed:**
  - **Phase 6-D Edamam nutrition:** create a recipe in a running dev server and confirm nutrition data loads with no CORS error.
  - **Phase 6-E signup race:** sign up a fresh account and confirm no 404s on `/api/getUsername` and no `/create-username` flash.
  - **Phase 6-G save/unsave end-to-end:** blocked on the Cypress `signIn` fix above; re-run `npx cypress run --spec cypress/e2e/recipe.cy.ts` once unblocked.

Pick these up as a follow-on cleanup pass (or a Phase 7 if multiple land together).

---

## Session Handoff Protocol

At the end of each working session, run `/compress` to generate a handoff block.
Paste that block as the opening message of the next chat.
Each chat should be scoped to one phase where possible.

This file (`REFACTOR.md`) is the ground truth — it does not live in chat context.
Any new session should reference this file, not rely on conversation history.
