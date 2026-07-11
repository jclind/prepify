# API Contract

The contract between the Express server (`server/`) and the React client (`src/api/`), regenerated
**2026-07-08** from the actual route handlers and client modules (three-way: `server/routes/` ↔
`src/api/` ↔ component call sites). The server code is the source of truth; per-route entries cite
`file:line` for the handler. The previous revision of this file predated the Express backend (it was
a client-only static analysis with "the backend must decide…" notes); every route below is now the
implemented behavior, not a proposal.

> **Regenerate when routes drift** with a three-way reconciliation pass: reconcile this file against the
> actual `server/routes/` handlers and the `src/api/` client modules, finding drift in params, response
> shapes, status/error codes, and auth requirements across all three; the server code is the source of
> truth. Fix the clear client mismatches and file the rest to [`BACKLOG.md`](BACKLOG.md). (This file was
> last regenerated that way in PR #262; the standing prompt was retired from `HIGH_VALUE_PROMPTS.md` once
> it shipped.)

## Route overview

73 routes + `GET /health`. Each section below documents its routes in full and ends with a
`#### DRIFT` list of client↔server mismatches found during regeneration.

| Section | Route file | Routes |
|---|---|---|
| [Recipes](#recipes) | `server/routes/recipes.js` | 20 (browse/read, create/edit/delete, admin moderation, saves, made) |
| [Ratings & Reviews](#ratings--reviews) | `server/routes/reviews.js` | 9 |
| [Auth & Account](#auth--account) | `server/routes/auth.js` | 11 |
| [User Content Lists](#user-content-lists) | `server/routes/users.js` | 3 |
| [Public Profiles](#public-profiles) | `server/routes/publicProfile.js` | 2 |
| [Collections](#collections) | `server/routes/collections.js` | 5 |
| [Recipe Drafts](#recipe-drafts) | `server/routes/drafts.js` | 5 |
| [Gamification](#gamification) | `server/routes/gamification.js` | 2 |
| [Ingredient Enrichment](#ingredient-enrichment) | `server/routes/ingredients.js` | 1 |
| [Nutrition (Edamam proxy)](#nutrition-edamam-proxy) | `server/routes/nutrition.js` | 1 |
| [Content Reports](#content-reports) | `server/routes/reports.js` | 4 |
| [Bug Reports](#bug-reports) | `server/routes/bugReports.js` | 4 |
| [Admin](#admin) | `server/routes/admin.js` | 6 |

### Drift highlights (2026-07-08 regeneration)

Full lists live in each section's `#### DRIFT` subsection. The load-bearing ones:

- **Real bug — `checkMadeRecipe` shape mismatch:** the server returns `{ made: boolean }`, but
  `MadeRecipeBtn.tsx` expects `{ datesMade?: string[] }`, so its "once an hour" re-make throttle
  silently resets on reload (see [DRIFT — recipes](#drift--recipes)).
- **Real bug (fixed with this regeneration) — `editReview` URL encoding:** the client interpolated
  raw review text into the query string; `&`, `#`, `%`, `+` in a review corrupted the edit. Now sent
  via axios `params` so it's encoded (see [DRIFT — reviews](#drift--reviews)).
- **Dead param (fixed with this regeneration):** `getReviews` sent a `username` query param the
  server never reads (identity is token-derived) — and resolved it with an extra `getUsername`
  request per reviews fetch. Removed.
- **Types over-promise:** several list endpoints are typed `RecipeType[]` in the client but the
  server ships lean card projections; `RecipeDBResponseType` declares fields `GET /api/recipes`
  never returns.
- The old contract's CRITICAL/HIGH flags are **resolved**: paths are `/api`-prefixed on one server,
  the server generates recipe `_id`s and stamps `userId` from the token, client-supplied
  `userId`/`username` are never trusted, and the nutrition/ingredient keys live server-side.

---

## Client setup

**File:** `src/api/http-common.ts` — single axios instance `http` used by every `src/api/` module.

- **Base URL:** `import.meta.env.VITE_API_URL || 'http://localhost:4000'`. All paths below are
  absolute from that base (they include the `/api` prefix).
- **Request interceptor:** if `auth.currentUser` exists, fetches a fresh Firebase ID token and sets
  `Authorization: Bearer <token>` on every request. Logged out ⇒ header omitted entirely.
- **Response interceptor:** (1) on a 403 whose body carries `code: 'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED'`,
  toasts the block message (+ `reason` when present) — callers still receive the rejection; (2) reports
  5xx and no-response network failures to Sentry (client 4xx stay out of the error stream).

## Server plumbing (applies to every route)

**File:** `server/app.js`.

- **Mounting:** every router is mounted under **`/api`**. Three routers get a deeper prefix:
  `/api/ingredients` (ingredients.js), `/api/nutrition` (nutrition.js), `/api/drafts` (drafts.js).
  All other route files declare their full path after `/api` (including the `/admin/...` routes,
  which live in their resource's file except for `server/routes/admin.js`).
- **Query parsing:** `app.set('query parser', 'simple')` — every query value stays a plain string
  (or string array), so `?id[$ne]=x`-style NoSQL-operator injection can't reach Mongo filters.
- **CORS:** allowlist from `FRONTEND_URLS` + Netlify deploy-preview pattern + (non-production only)
  any `localhost:3000–3010` origin. Rejected origins hit the error backstop as a 500-class CORS error.
- **Body parsing:** `express.json()` only — malformed JSON is a 400 via the backstop. `helmet()` on.
- **Proxy trust:** `trust proxy = 1` in production only (per-IP limiting sees real client IPs behind
  the platform's single reverse proxy; never trusted in dev).
- **Global rate limit:** per-IP, 1000 requests / 15 min across all of `/api`
  (429, standard `RateLimit-*` headers; skipped when `NODE_ENV=test`).
- **Error backstop:** errors thrown outside a handler's own try/catch return
  `{ error: 'Bad request' }` with the thrower's 4xx, or `{ error: <generic 500 message> }` for
  anything else; 5xx are captured to Sentry. Handlers themselves respond via
  `respondServerError` (generic body, real error logged) — **no route ever echoes a stack trace**.

### GET /health

- **Handler:** `server/app.js:66` — above the global limiter so monitors can't be throttled into a
  false "down". No auth. Returns `200 { status: 'ok' }`.

## Auth middleware glossary

**File:** `server/middleware/auth.js`. Per-route entries name these in their **Middleware** chain.

| Middleware | Behavior |
|---|---|
| `verifyToken` | Requires `Authorization: Bearer <Firebase ID token>`. 401 `{ error }` on missing/invalid. Sets `req.uid` and `req.isAdmin` (from the `admin` custom claim — no DB lookup). |
| `optionalAuth` | Sets `req.uid`/`req.isAdmin` when a valid token is present; **never rejects** — bad/absent token continues as anonymous. |
| `requireAdmin` | After `verifyToken`. 403 `{ error: 'Admin access required' }` unless `req.isAdmin`. |
| `requireActive` | After `verifyToken`; mutations only. Reads the user's `users` status doc; suspended/banned ⇒ 403 `{ error, code: 'ACCOUNT_SUSPENDED' \| 'ACCOUNT_BANNED', reason }`. No doc (legacy user) ⇒ active. |

**Identity rule:** every authed route derives the acting user from `req.uid` (the verified token).
Client-supplied `userId`/`username` values are never trusted for authorization.

## Per-user write limiters

**File:** `server/middleware/writeLimiter.js` — `makeUserLimiter` factory, keyed by `req.uid`
(mounted after `verifyToken`), 429 `{ error, code: 'RATE_LIMITED' }`, standard headers, skipped
under `NODE_ENV=test`. One independent in-memory bucket per surface (per process — a multi-replica
deploy multiplies the effective cap):

| Instance | Limit | Surfaces |
|---|---|---|
| `recipeWriteLimiter` | 12/min | recipe create/edit (tighter: each write can trigger a paid Cloud Vision scan) |
| `reviewWriteLimiter` | 30/min | rating/review writes |
| `profileWriteLimiter` | 30/min | profile writes |

Route-local limiters built from the same factory (e.g. ingredient parse, bug-report submit) are
noted on their routes.

---
## Recipes

All routes live in `server/routes/recipes.js`, mounted at `/api` (server/app.js). Every paginated route caps page size at `MAX_PER_PAGE = 50` (server/routes/recipes.js:28). "Card shape" below = `publicRecipeCardProjection` (server/util/recipeFields.js:96) — `{_id, title, recipeImage, cuisine, totalTime, servingPrice, rating, mealTypes, nutritionLabels, numTimesSaved}`. "Public detail shape" = `publicRecipeProjection` (recipeFields.js:68) — the full authored recipe plus `rating/views/numTimesSaved/numTimesMade/featured/userId/status`, structurally excluding the internal admin stamps (`moderatedBy/At`, `featuredBy/At`, `publishUpdatedBy/At`). All list/read paths filter by `RECIPE_VISIBLE` (`status ∉ ['hidden','unpublished','pending_review']`, legacy-safe `$nin` — server/util/moderation.js:22).

### Browse / read

### GET /api/recipes
- **Handler:** `server/routes/recipes.js:44`
- **Middleware:** none (public)
- **Request:** query — `q` (string, case-insensitive escaped-regex title substring), `page` (int, default 0), `recipesPerPage` (int, default 5, capped at 50), `order` (one of `popular` (default) | `new` | `old` | `cheapest` | `expensive` | `shortest` | `longest` | `top` | `trending`; unknown values fall back to `popular`; own-property lookup blocks `__proto__`/`constructor`), `cuisine` (exact case-insensitive match), `tags` (comma list or repeated param; OR match over `mealTypes ∪ nutritionLabels`), `mealTypes` (comma list, `$in`), `diets` (comma list, conjunctive `$all` — recipe must carry every label). Nothing is rejected; malformed values coerce to defaults.
- **Response:** `200` `{ recipeList: Card[], total_results: number }`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getAllRecipes()` — used by `src/pages/Recipes/Recipes.tsx`, `src/pages/Home/HomeBrowseByMeal.tsx`
- **Notes:** `_id` tiebreak on every sort keeps pagination stable; card projection means no `userId`/moderation stamps in list responses.

### GET /api/recipes/facets
- **Handler:** `server/routes/recipes.js:168`
- **Middleware:** none (public)
- **Request:** none
- **Response:** `200` `{ cuisines: string[], diets: string[], mealTypes: string[] }` (distinct stored values, nulls/empties dropped)
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getRecipeFacets()` — used by `src/pages/Recipes/Recipes.tsx`
- **Notes:** served from a 5-minute in-process TTL cache (`server/util/facetsCache.js:36`); add/edit/delete recipe writes invalidate it. The `distinct` is unfiltered by status, so held/hidden recipes still contribute facet values.

### GET /api/searchAutoCompleteRecipes
- **Handler:** `server/routes/recipes.js:218`
- **Middleware:** none (public)
- **Request:** query — `title` (string; missing/blank/non-string → `200 []`, never an error)
- **Response:** `200` array (max 8) of `{ _id, title, recipeImage, totalTime, servings, rating, nutritionLabels, servingPrice }`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.searchAutoCompleteRecipes()` — used by `src/Components/SearchRecipesInput/SearchRecipesInput.tsx`
- **Notes:** three deduped tiers fill the 8 slots — literal substring regex, `$text` index match (soft-fails to the next tier if the index is missing), then a Levenshtein fuzzy pass over a 1000-doc candidate cap for typos.

### GET /api/getTrendingRecipes
- **Handler:** `server/routes/recipes.js:308`
- **Middleware:** none (public)
- **Request:** query — `limit` (int, default 4, capped at 20)
- **Response:** `200` `Card[]`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getTrendingRecipes()` — used by `src/pages/Home/HomeTrending.tsx`
- **Notes:** sort `{ featured: -1, views: -1 }` — admin-curated `featured` recipes pin to the front, then most-viewed.

### GET /api/getForYouRecipes
- **Handler:** `server/routes/recipes.js:331`
- **Middleware:** `verifyToken`
- **Request:** query — `limit` (int, default 8, clamped to 1..20)
- **Response:** `200` `Card[]`; `200 []` when the user has fewer than `MIN_SIGNAL = 3` interactions (server/util/forYou.js:17) — the client hides the row. `401` from `verifyToken`.
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getForYouRecipes()` — used by `src/pages/Home/HomeForYou.tsx` (passes `limit=4`)
- **Notes:** content-based: taste profile from saves/makes/ratings, scores unseen visible recipes (never the user's own or already-seen), diversifies and shuffles the top tier per visit.

### GET /api/recipes/random
- **Handler:** `server/routes/recipes.js:373`
- **Middleware:** `optionalAuth`
- **Request:** query — `exclude` (string recipe id, optional; skips the just-shown pick on re-roll)
- **Response:** `200` single `Card`; `404 { error: 'No recipes available' }` when the catalog is empty
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getRandomRecipe()` — used by `src/pages/Home/HomeCookSuggestion.tsx`; the client maps the 404 to `null`
- **Notes:** signed-in user with ≥3 interactions gets a taste-weighted random pick; everyone else gets uniform `$sample` over visible non-own recipes, preferring unseen ones (relaxed only if the user has seen everything).

### GET /api/getRecipe
- **Handler:** `server/routes/recipes.js:441`
- **Middleware:** `optionalAuth`
- **Request:** query — `id` (required; `400 { error: 'id is required' }`)
- **Response:** `200` public detail shape (see intro). Admin callers instead get the **raw, unprojected** document regardless of moderation state, with `automodClassifier` attached (from the open automod report) when `status === 'pending_review'`. `404 { error: 'Not found' }` when missing — or, for non-admins, when the recipe is hidden/unpublished/pending (unless the caller is the owner and the recipe is only `pending_review`, in which case the owner gets their own recipe back).
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getRecipe()` — used by `src/pages/SingleRecipe/SingleRecipe.tsx`, `src/pages/EditRecipe/EditRecipe.tsx`
- **Notes:** the public read atomically increments `views` (and fire-and-forgets a global `stats.totalRecipeViews` bump); admin previews and owner pending-review views do **not** count a view.

### Create / edit / delete

### POST /api/addRecipe
- **Handler:** `server/routes/recipes.js:504`
- **Middleware:** `verifyToken`, `requireActive`, `recipeWriteLimiter`
- **Request:** body — recipe document. Required: `title`, `ingredients`, `instructions`, `mealTypes` (missing/blank/empty-array → `400 { error: 'Missing required fields: …' }`). Bounds (server/util/recipeLimits.js, each violation → `400 { error: <message> }`): title ≤ 50 chars (trimmed first), description ≤ 2000, ≤ 50 ingredients (each raw line ≤ 200 chars), ≤ 50 instructions (each ≤ 1000 chars); numeric fields must be finite numbers in range — `prepTime`/`cookTime`/`totalTime` 0–20160 int, `servings` 1–1000 int, `fridgeLife`/`freezerLife` 0–365 int, `servingPrice` 0–1,000,000. Only `CREATABLE_RECIPE_FIELDS` are persisted (content fields + `recipeImage`, `nutritionData`, `servingPrice`, `totalTime`, `authorUsername`, `createdAt`, `editedAt`); everything else (`status`, `featured`, `rating`, counters…) is ignored — the server stamps `_id`, `userId`, zeroed `rating`/`numTimesSaved`/`numTimesMade`/`views`.
- **Response:** `201 { _id: ObjectId, pendingReview: boolean }`; `422 { error: <friendly message>, code: 'CONTENT_BLOCKED' }` on a high-confidence automod verdict (server/util/automod.js:99); `401` (auth), `403` (`ACCOUNT_BANNED`/`ACCOUNT_SUSPENDED`), `429` (`RATE_LIMITED`)
- **Client:** `src/api/recipes.ts` → `RecipeAPI.addRecipe()` — used by `src/pages/AddRecipe/useRecipeForm.ts` (uploads image to Firebase Storage and fetches nutrition via the server proxy first, then posts)
- **Notes:** text + image are moderated concurrently (text fails open, image fails closed); a **medium** verdict still saves the recipe but holds it as `pending_review` via `holdRecipeForReview` (report filed first, then status flipped) and returns `pendingReview: true`. Also pushes `{recipeId}` onto the author's `userRecipeData.userRecipes` and busts the facets cache.

### PUT /api/editRecipe
- **Handler:** `server/routes/recipes.js:577`
- **Middleware:** `verifyToken`, `requireActive`, `recipeWriteLimiter`
- **Request:** query — `recipeId` (required; `400 { error: 'recipeId is required' }`); body — same required-fields + bounds validation as addRecipe (same 400s). Only `EDITABLE_RECIPE_FIELDS` are `$set` (content fields + `recipeImage`, `nutritionData`, `servingPrice`, `totalTime`); server stamps `editedAt`.
- **Response:** `200` the full updated recipe document (raw `findOneAndUpdate` result, **no** public projection); `404 { error: 'Recipe not found' }` (before ownership check, and again if deleted mid-request); `403 { error: 'Forbidden' }` when `recipe.userId !== req.uid`; `422 CONTENT_BLOCKED` on a high automod verdict (previous version stays); `401`/`403`/`429` per middleware
- **Client:** `src/api/recipes.ts` → `RecipeAPI.editRecipe()` — used by `src/pages/AddRecipe/useRecipeForm.ts` (via `src/pages/EditRecipe/EditRecipe.tsx`)
- **Notes:** image is only re-moderated when the URL changed. A medium verdict re-holds as `pending_review` — but never downgrades an existing `hidden`/`unpublished` takedown; a clean edit does **not** clear an existing hold. Busts the facets cache. Because the response is unprojected, internal admin stamps (`moderatedBy` etc.), if present, are returned to the owner here (recipes.js:638–655).

### DELETE /api/deleteRecipe
- **Handler:** `server/routes/recipes.js:659`
- **Middleware:** `verifyToken` (no `requireActive`, no rate limiter)
- **Request:** query — `recipeId` (required; `400 { error: 'recipeId is required' }`)
- **Response:** `200 { deleted: true }`; `404 { error: 'Recipe not found' }`; `403 { error: 'Forbidden' }` (not owner); `401`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.deleteRecipe()` — used by `src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls.tsx`
- **Notes:** runs `teardownRecipeDocs` in a Mongo transaction (server/util/teardownRecipe.js): deletes the recipe, all its `ratings` docs, and pulls its id from every user's `savedRecipes`/`madeRecipes`/`userRecipes`. Then busts the facets cache and best-effort deletes the Storage image after commit (a failure never 500s).

### Admin moderation / curation

### PATCH /api/admin/recipes/:id/moderation
- **Handler:** `server/routes/recipes.js:701`
- **Middleware:** `verifyToken`, `requireAdmin`
- **Request:** params — `id`; body — `status` must be exactly `'hidden'` or `'active'` (`400 { error: "status must be 'hidden' or 'active'" }`)
- **Response:** `200 { _id, status }`; `404 { error: 'Recipe not found' }`; `401`/`403`
- **Client:** `src/api/reports.ts` → `ReportAPI.setRecipeModeration()` — used by `src/Components/AdminRecipeControls/AdminRecipeControls.tsx`, `src/pages/Admin/Reports/Reports.tsx`
- **Notes:** stamps `moderatedBy`/`moderatedAt`; writes a `recipe.hide`/`recipe.unhide` audit row; hide sends the owner a background "recipe hidden" email (unhide is silent). Reversible soft-hide — bypasses the owner check.

### PATCH /api/admin/recipes/:id/approve
- **Handler:** `server/routes/recipes.js:745`
- **Middleware:** `verifyToken`, `requireAdmin`
- **Request:** params — `id`; no body
- **Response:** `200 { _id, status }` (status will be `'active'`); `409 { error: 'Recipe not found or not pending review' }` when the recipe isn't currently `pending_review` (also makes double-clicks idempotent); `401`/`403`
- **Client:** `src/api/admin.ts` → `AdminAPI.approveRecipe()` — used by `src/Components/AdminRecipeControls/AdminRecipeControls.tsx`, `src/pages/Admin/Reports/Reports.tsx`
- **Notes:** clears an **automated** hold via `restoreHeldRecipe` (scoped to `status: 'pending_review'`, so it can never resurrect an admin takedown; writes the `recipe.approve` audit), then closes the open automod report(s) as `dismissed`. Deliberate ordering: recipe goes live first, report closes second.

### PATCH /api/admin/recipes/:id/publish
- **Handler:** `server/routes/recipes.js:774`
- **Middleware:** `verifyToken`, `requireAdmin`
- **Request:** params — `id`; body — `published` must be a boolean (`400 { error: 'published must be a boolean' }`)
- **Response:** `200 { _id, status }` (`'active'` or `'unpublished'`); `404 { error: 'Recipe not found' }`; `401`/`403`
- **Client:** `src/api/admin.ts` → `AdminAPI.setRecipePublished()` — used by `src/Components/AdminRecipeControls/AdminRecipeControls.tsx`
- **Notes:** editorial de-publish, deliberately distinct from moderation — stamps `publishUpdatedBy/At` (not `moderatedBy`); audits `recipe.publish`/`recipe.unpublish`. Filtered from public reads identically to `hidden`.

### PATCH /api/admin/recipes/:id/feature
- **Handler:** `server/routes/recipes.js:805`
- **Middleware:** `verifyToken`, `requireAdmin`
- **Request:** params — `id`; body — `featured` must be a boolean (`400 { error: 'featured must be a boolean' }`)
- **Response:** `200 { _id, featured: boolean }`; `404 { error: 'Recipe not found' }`; `401`/`403`
- **Client:** `src/api/admin.ts` → `AdminAPI.setRecipeFeatured()` — used by `src/Components/AdminRecipeControls/AdminRecipeControls.tsx`
- **Notes:** stamps `featuredBy`/`featuredAt`; audits `recipe.feature`/`recipe.unfeature`. Featured recipes pin to the front of `getTrendingRecipes`.

### Saves

### POST /api/recipes/:id/save
- **Handler:** `server/routes/recipes.js:835`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** params — `id` (recipe id; the `400 'recipeId is required'` branch is unreachable since Express won't match an empty param)
- **Response:** `200 { saved: true }`; `409 { error: 'Recipe already saved' }`; `401`/`403`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.saveRecipe()` — used by `src/hooks/useSaveRecipe.ts`
- **Notes:** single atomic conditional write (`savedRecipes.recipeId $ne` filter + `$push {recipeId, dateSaved}`, upsert with dup-key retry) closes the double-save TOCTOU; `numTimesSaved` is incremented only when the push actually landed. Does not verify the recipe id exists.

### GET /api/getSavedRecipe
- **Handler:** `server/routes/recipes.js:871`
- **Middleware:** `verifyToken`
- **Request:** query — `recipeId` (required; `400 { error: 'recipeId is required' }`)
- **Response:** `200` the saved entry `{ recipeId: string, dateSaved: string, collectionIds?: string[] }` or `null` when not saved (`collectionIds` is written by the collections routes, not here); `401`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getSavedRecipe()` — used by `src/Components/AddToCollection/AddToCollectionPopover.tsx`

### GET /api/getSavedRecipeIds
- **Handler:** `server/routes/recipes.js:886`
- **Middleware:** `verifyToken`
- **Request:** none
- **Response:** `200 string[]` (the current user's saved recipe ids; `[]` when none); `401`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getSavedRecipeIds()` — used by `src/hooks/useSaveRecipe.ts` (one request resolves saved state for a whole grid)

### DELETE /api/recipes/:id/save
- **Handler:** `server/routes/recipes.js:895`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** params — `id` (recipe id)
- **Response:** `200 { unsaved: true }`; `404 { error: 'Recipe not in saved list' }`; `401`/`403`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.unsaveRecipe()` — used by `src/hooks/useSaveRecipe.ts`
- **Notes:** atomic conditional `$pull` (mirror of save); `numTimesSaved` decremented via a `$max` pipeline floor at 0, only when the pull removed an entry.

### Made

### POST /api/madeRecipe
- **Handler:** `server/routes/recipes.js:927`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** query — `recipeId` (required; `400 { error: 'recipeId is required' }`); no body
- **Response:** `200 { made: true }` — always, including repeat calls (unlike save there is no 409); `401`/`403`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.madeRecipe()` — used by `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx` (client no-ops to `undefined` when signed out)
- **Notes:** `$addToSet { madeRecipes: { recipeId } }` (idempotent, no date stored); the recipe's `numTimesMade` counter is bumped only on the user's first make, keyed off the atomic write result.

### GET /api/checkMadeRecipe
- **Handler:** `server/routes/recipes.js:957`
- **Middleware:** `verifyToken`
- **Request:** query — `recipeId` (required; `400 { error: 'recipeId is required' }`)
- **Response:** `200 { made: boolean }`; `401`
- **Client:** `src/api/recipes.ts` → `RecipeAPI.checkMadeRecipe()` — used by `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx` (client no-ops to `undefined` when signed out)

#### DRIFT — recipes

- **`checkMadeRecipe` response shape mismatch (real bug surface):** the server returns `{ made: boolean }` (server/routes/recipes.js:967) and stores made entries as `{ recipeId }` with no date, but `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx:20,29` casts the result to `{ datesMade?: string[] }` and derives `numTimesMade`/`lastDateMade` from it. `datesMade` is always `undefined` from the server, so the "once an hour" re-make throttle only works off the component's optimistic cache write within a session and silently resets on refetch/reload.
- **`RecipeDBResponseType` over-declares:** `src/types.ts:194` includes `page`, `filters`, `entries_per_page`, but `GET /api/recipes` only ever returns `{ recipeList, total_results }` (server/routes/recipes.js:154).
- **List endpoints typed as full `RecipeType[]` but server ships the lean card projection:** `getAllRecipes().recipeList`, `getTrendingRecipes()`, `getForYouRecipes()`, and `getRandomRecipe()` are all typed `RecipeType`/`RecipeType[]` in `src/api/recipes.ts:72,100,106,114`, yet the server projects `publicRecipeCardProjection` — fields like `description`, `ingredients`, `instructions`, `nutritionData`, `views`, `userId`, `createdAt`, `authorUsername` are absent at runtime.
- **`addRecipe` client sends fields the server discards:** `src/api/recipes.ts:280–288` posts `rating`, `views`, `numTimesSaved`, `numTimesMade` alongside the accepted fields; the server's `CREATABLE_RECIPE_FIELDS` whitelist ignores all four and stamps its own zeros (intentional server hardening — the client payload fields are dead weight).
- **`PUT /editRecipe` returns the raw document, not the public projection:** unlike `getRecipe`, the edit response (server/routes/recipes.js:638–655) carries any internal admin stamps (`moderatedBy/At`, `featuredBy/At`, `publishUpdatedBy/At`) present on the doc back to the owner — inconsistent with the whitelist rationale in `server/util/recipeFields.js`.
- **Unreferenced sort option:** `order=top` in `GET /recipes` (server/routes/recipes.js:131) has no client caller (`trending` is used by `src/pages/Home/HomeBrowseByMeal.tsx:61`; the browse UI uses the other seven).
- **Unreachable validation branches:** the `400 'recipeId is required'` guards in `POST /recipes/:id/save` (recipes.js:838) and `DELETE /recipes/:id/save` (recipes.js:898) can't fire — an empty `:id` never matches the route.
## Ratings & Reviews

All routes live in `server/routes/reviews.js`, mounted at `/api` (server/app.js). Rating and review data share a single `ratings` collection document keyed by the unique `{ userId, recipeId }` pair — a doc can be rating-only, review-only, or both, and every write route defaults the missing half's fields so the shape stays consistent. `username` on the doc is a denormalized display field written once on insert; identity is always the token-derived uid.

### POST /api/addRating
- **Handler:** `server/routes/reviews.js:21`
- **Middleware:** `verifyToken` → `requireActive` → `reviewWriteLimiter`
- **Request:** query `recipeId` (string, required), `rating` (string, required; parsed with `parseFloat`, must be 1–5 inclusive). No body.
  - `400 {error:'User not found'}` — no `usernames` doc for `req.uid` (checked before param validation, reviews.js:27-28)
  - `400 {error:'recipeId and rating are required'}` — missing/non-string params
  - `400 {error:'Invalid rating'}` — `parseFloat` yields NaN
  - `400 {error:'Rating must be between 1 and 5'}`
- **Response:** `200 {rated: true}`. Plus `401` (verifyToken), `403 {error, code, reason}` (requireActive), `429 {error, code:'RATE_LIMITED'}`.
- **Client:** `src/api/recipes.ts:435` → `RecipeAPI.addRating(recipeId, rating)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings.tsx:44`. Returns `null` without calling if not signed in.
- **Notes:** Upsert via `upsertWithDupRetry` on the unique `{userId, recipeId}` index (concurrent double-submit → E11000 retried as plain update). On insert, review fields are defaulted to `''`. Recomputes and persists the recipe's aggregate `rating: {rateCount, rateValue, breakdown}` via `recomputeRecipeRating` (server/util/recipeRating.js), which excludes moderation-hidden docs and non-numeric ratings. `breakdown` (added §D PR-A) is a `{1..5: number}` per-star histogram of the counted ratings (each bucketed by nearest whole star, buckets sum to `rateCount`); new recipes seed it all-zero, and the one-off backfill is `server/scripts/reconcileRatingAggregates.js --apply`.

### POST /api/newReview
- **Handler:** `server/routes/reviews.js:66`
- **Middleware:** `verifyToken` → `requireActive` → `reviewWriteLimiter`
- **Request:** body `{recipeId: string, reviewText: string}` (both required; `reviewText` may be empty string but must be a string).
  - `400 {error:'recipeId and reviewText are required'}`
  - `400 {error:'Review cannot exceed 2000 characters'}` — `DESCRIPTION_MAX_LENGTH` = 2000 (server/util/recipeLimits.js:7)
  - `422 {error: <friendly message>, code:'CONTENT_BLOCKED'}` — `moderateText(reviewText, 'review')` verdict not clean; both high and medium confidence block inline via `respondBlocked` (server/util/automod.js:99), which also fires a best-effort `content.blocked` audit row
  - `400 {error:'Username not found for this user'}` — no `usernames` doc
- **Response:** `200` = the full updated `ratings` document (re-fetched after upsert: `_id, userId, recipeId, username, rating, ratingLastUpdated, reviewText, reviewCreatedAt, reviewLastUpdated`, timestamps as `Date.now().toString()`). Plus `401/403/429` as above.
- **Client:** `src/api/recipes.ts:440` → `RecipeAPI.newReview(recipeId, text)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/AddReview.tsx:37`.
- **Notes:** Upsert on `{userId, recipeId}`; on insert `rating: null` is defaulted so a review-before-rating doc never poisons the aggregate. No rating recompute (text doesn't affect the score).

### GET /api/checkIfReviewed
- **Handler:** `server/routes/reviews.js:110`
- **Middleware:** `verifyToken`
- **Request:** query `recipeId` (string, required). `400 {error:'recipeId is required'}` otherwise.
- **Response:** `200 {reviewed: true, ...<full ratings doc>}` if the authenticated user has a doc for this recipe, else `200 {reviewed: false}`. Plus `401`.
- **Client:** `src/api/recipes.ts:450` → `RecipeAPI.checkIfReviewed(recipeId)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews.tsx:36` (react-query).
- **Notes:** Scoped strictly to `req.uid`; a "doc exists" answer, so `reviewed: true` also fires for rating-only docs with empty `reviewText`.

### POST /api/editReview
- **Handler:** `server/routes/reviews.js:127`
- **Middleware:** `verifyToken` → `requireActive` → `reviewWriteLimiter`
- **Request:** JSON body `{recipeId: string, text: string}` (both required; empty `text` allowed — only `null`/non-string rejected). The pre-§D query form (`?recipeId=&text=`) is still accepted as a **backward-compat fallback**; the body wins when both are present. The query form corrupts text containing `&`/`#`/`%`/`+` and is slated for removal one release after the frontend switches to the body (PR-B).
  - `400 {error:'recipeId and text are required'}`
  - `400 {error:'Review cannot exceed 2000 characters'}`
  - `422 {error, code:'CONTENT_BLOCKED'}` — same `moderateText` gate as /newReview
  - `404 {error:'Review not found'}` — update matched 0 docs (non-author can never match, since the filter is `{userId: req.uid, recipeId}`, so a miss is purely "no such doc" — not-found, not a permissions failure; normalized from `403` alongside the delete routes below, house convention per `drafts.js`)
- **Response:** `200 {edited: true}`. Plus `401/429`.
- **Client:** `src/api/recipes.ts:456` → `RecipeAPI.editReview(recipeId, text)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview.tsx:59`.
- **Notes:** Updates `reviewText` + `reviewLastUpdated` only. As of §D PR-A both create and edit accept a JSON body (`newReview`→`reviewText`, `editReview`→`text`); the field-name difference remains but the transport is now aligned.

### DELETE /api/deleteReview
- **Handler:** `server/routes/reviews.js:156`
- **Middleware:** `verifyToken` (deliberately no `requireActive`/rate limiter — self-service removal of own content stays allowed for suspended/banned accounts, per comment at reviews.js:189 which covers both delete routes)
- **Request:** query `recipeId` (string, required). `400 {error:'recipeId is required'}`; `404 {error:'Review not found'}` if the user has no doc for this recipe (normalized from `403` — see the DRIFT note below, now resolved).
- **Response:** `200 {deleted: true}`. Plus `401`.
- **Client:** `src/api/recipes.ts:461` → `RecipeAPI.deleteReview(recipeId)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview.tsx:68`.
- **Notes:** Removes the written review but KEEPS any star rating: if the doc has a numeric rating (`hasNumericRating`, handles legacy string ratings), only `reviewText`/`reviewLastUpdated` are blanked; otherwise the whole doc is deleted so no text-less/rating-less orphan remains. No aggregate recompute (the kept rating still counts; an orphan never counted).

### DELETE /api/removeRating
- **Handler:** `server/routes/reviews.js:192`
- **Middleware:** `verifyToken` (no `requireActive`, same rationale as /deleteReview)
- **Request:** query `recipeId` (string, required). `400 {error:'recipeId is required'}`; `404 {error:'Rating not found'}` if no doc.
- **Response:** `200 {removed: true}`. Plus `401`.
- **Client:** `src/api/recipes.ts:466` → `RecipeAPI.removeRating(recipeId)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings.tsx:57`.
- **Notes:** Mirror of /deleteReview: removes JUST the star, keeping a non-empty written review (`rating: null, ratingLastUpdated: ''`); deletes the doc entirely if there's no review text. Always recomputes the recipe aggregate so the removed star stops counting. The missing-doc status now matches /deleteReview and /editReview (404 on all three — see the DRIFT note below, now resolved).

### GET /api/getReviews
- **Handler:** `server/routes/reviews.js:229`
- **Middleware:** `optionalAuth` (anonymous-friendly)
- **Request:** query `recipeId` (string, required — `400 {error:'recipeId is required'}`), `page` (int, default 0), `reviewsPerPage` (int, default 5, capped at `MAX_PER_PAGE` = 50, reviews.js:18), `filter` (`'new'` → sort `reviewCreatedAt` desc, `'top'` → sort `rating` desc, anything else → natural order).
- **Response:** `200 {reviews: [...], totalCount: number}` — each review is the raw ratings doc (only docs with non-empty `reviewText` and not `moderationHidden` via `REVIEW_VISIBLE`, server/util/moderation.js:33) plus a derived `isCurrentUser: boolean` and, added in §D PR-A, the author's `photoURL: string | null` and `displayName: string | null`.
- **Client:** `src/api/recipes.ts:470` → `RecipeAPI.getReviews(recipeId, filter, page, reviewsPerPage)` — used by `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx:40` (react-query).
- **Notes:** `isCurrentUser` is derived from the *verified* token uid (`req.uid`) matching the doc's `userId` — never from any client-supplied identity. `photoURL`/`displayName` are resolved from Firebase Auth via a single deduped, batched `getAuth().getUsers()` keyed on the docs' stable `userId` (the rating doc stores neither); the lookup is failure-tolerant (a transient Admin-SDK error or a deleted/not-found reviewer yields `null` for both fields and never fails the list) — same degrade-gracefully pattern as `getPublicProfile`. Legacy docs lacking a `userId` skip the lookup entirely. Raw docs are spread as-is, so authors' `userId` (Firebase uid) and denormalized `username` are visible to anonymous callers.

### GET /api/getSingleUserReviews
- **Handler:** `server/routes/reviews.js:257`
- **Middleware:** none (public)
- **Request:** query `username` (required — `400 {error:'username is required'}`; only truthiness checked, no type check), `page` (int, default 0), `reviewsPerPage` (int, default 5, capped at 50), `filter` (`'new'`/`'top'` as above), `returnRecipeData` (string; recipe join only when exactly `'true'`).
- **Response:** `200 {reviews: [...], totalCount: number}`.
  - Unknown handle → `200 {reviews: [], totalCount: 0}` (not a 404).
  - With `returnRecipeData=true`, each review gains `recipeImage`, `recipeTitle`, and full `recipeData`, and ratings whose recipe is soft-hidden (`RECIPE_VISIBLE` statuses `hidden`/`unpublished`/`pending_review`) are filtered INSIDE the aggregation before paging, so `totalCount` counts only rows the list can actually show (the Load-More fix, reviews.js:282-290). The `$lookup` normalizes recipe `_id` via `$toString` to span native-ObjectId and legacy-string ids.
  - Without it, a plain find/count over `{userId, ...REVIEW_VISIBLE}` — note this variant includes rating-only docs (no `reviewText $ne ''` filter, unlike /getReviews), which is what the account "Ratings" list wants.
- **Client:** `src/api/recipes.ts:481` → `RecipeAPI.getSingleUserReviews(page, reviewsPerPage, filter, returnRecipeData)` — used by `src/pages/Account/UserRatings/UserRatings.tsx:121`. The client always resolves `username` from `AuthAPI.getUsername()` (own handle) and returns `null` if signed out.
- **Notes:** Addressed by public handle but resolved case-insensitively to the stable uid via `usernames.username_lower` before querying, so renames don't orphan the list. Suppresses moderation-hidden reviews even for the author viewing their own list.

### PATCH /api/admin/reviews/moderation
- **Handler:** `server/routes/reviews.js:367`
- **Middleware:** `verifyToken` → `requireAdmin`
- **Request:** body `{recipeId: string, username: string, moderationHidden: boolean}` (all required; `400 {error:'recipeId and username are required'}` / `400 {error:'moderationHidden must be a boolean'}`).
  - `404 {error:'Review not found'}` — either the handle resolves to no `usernames` doc, or no ratings doc matches `{userId, recipeId}`
- **Response:** `200 {recipeId, username: <canonical current handle>, moderationHidden}`. Plus `401`, `403` (requireAdmin).
- **Client:** `src/api/reports.ts:75` → `ReportAPI.setReviewModeration(recipeId, username, moderationHidden)` — used by `src/pages/Admin/Reports/Reports.tsx:121,143` (take down / restore from the reports queue).
- **Notes:** The handle is resolved case-insensitively to the stable uid and the match runs on `{userId, recipeId}` — never on the doc's denormalized (rename-stale) `username` field. Takedown sets a reversible `moderationHidden` flag plus `moderatedBy`/`moderatedAt` rather than blanking the text. Always recomputes the recipe aggregate (a hidden rating stops counting; restore re-counts it). Writes an audit row (`review.takedown`/`review.restore`, target `uid:recipeId`, labeled with the author's *current* handle) and, on takedown only, fires a background email to the author (`notifyReviewTakenDown`); restore is silent.

#### DRIFT — reviews

- ~~**`getReviews` client sends a `username` query param the server never reads**~~ **[fixed with this regeneration]** — the client awaited `AuthAPI.getUsername()` and appended `username=...` (literally `username=null` when signed out), but the handler destructures only `recipeId, page, reviewsPerPage, filter` (reviews.js:231) and derives `isCurrentUser` from the verified token uid. The dead param and its extra username round-trip are removed from `RecipeAPI.getReviews`.
- ~~**`editReview` interpolates raw review text into the URL query string without encoding**~~ **[fixed with this regeneration]** — the client built `` `api/editReview?recipeId=${recipeId}&text=${text}` `` with no encoding, so any `&`, `#`, `%`, or `+` in the edited text truncated or corrupted what the server received. `RecipeAPI.editReview` now passes both values via axios `params`, which URL-encodes them. (The remaining asymmetry — create sends body `reviewText`, edit sends query `text` — stands, below.)
- **Create/edit field-name asymmetry** — the review text is body `reviewText` on create (reviews.js:68) but body `text` on edit (reviews.js:128). As of §D PR-A both accept a JSON body (edit also still honors the legacy `?text=` query form as a fallback), so the transport is aligned; only the field name differs.
- ~~**Missing-doc status inconsistency between the two delete routes**~~ **[fixed]** — `/deleteReview` and `/editReview` used to return `403` for "you have no doc for this recipe" while `/removeRating` returned `404` for the identical case. Both routes key the lookup on `req.uid`, so a miss is purely not-found, never a permissions failure (house convention per `drafts.js`: 404 = no such doc, 403 = exists but not yours). All three now return `404 {error: 'Review not found'}` / `404 {error: 'Rating not found'}` respectively.
- **`getSingleUserReviews` is a public any-username endpoint whose only client caller queries the caller's own handle** — the route takes arbitrary `username` with no auth, but `src/api/recipes.ts:487` hardwires `AuthAPI.getUsername()`. The public-profile surface does not use this endpoint (no other call sites in `src/`), so the arbitrary-username capability is currently reachable only by direct request.
- **Raw ratings docs leak internal fields to anonymous callers** — `/getReviews` (reviews.js:248-251) and `/getSingleUserReviews` spread the stored doc verbatim, exposing each author's Firebase `userId`, Mongo `_id`, and (on moderated-then-restored docs) `moderatedBy`/`moderatedAt`. Nothing secret-critical, but there is no projection layer.
## Auth & Account

### GET /api/getUsername
- **Handler:** `server/routes/auth.js:98`
- **Middleware:** `verifyToken`
- **Request:** none (uid taken from token; scoped to self so usernames can't be enumerated by id)
- **Response:** `200` bare JSON string (the username) or JSON `null` when not set; `401` from `verifyToken`
- **Client:** `src/api/auth.ts` → `getUsername()` (returns `null` without a request when signed out) — used by `src/context/AuthContext.tsx:221,363` (post-login username check → redirect to `/create-username`), `src/Components/Navbar/menu/useNavMenu.ts:16`, `src/pages/Settings/sections/ProfileSection.tsx:38`, `src/pages/CreateUsername/CreateUsername.tsx:52`, `src/pages/Account/useAccountData.ts:44`, `src/pages/PublicProfile/PublicProfile.tsx:143` (own-profile detection), `src/pages/SingleRecipe/.../ReviewOptions.tsx:31`, and internally by `src/api/recipes.ts:257,475,487`

### GET /api/checkUsernameAvailability
- **Handler:** `server/routes/auth.js:107`
- **Middleware:** none (public)
- **Request:** query `username` (string, required) — missing/non-string → `400 {error: 'username is required'}`. Lookup is case-insensitive (`username_lower`)
- **Response:** `200` bare JSON boolean — `true` = available, `false` = taken
- **Client:** `src/api/auth.ts` → `checkUsernameAvailability(username)` — used by `src/Components/Form/UsernameInput.tsx:50`, `src/pages/Settings/sections/ProfileSection.tsx:100`

### GET /api/getMyStatus
- **Handler:** `server/routes/auth.js:123`
- **Middleware:** `verifyToken`
- **Request:** none
- **Response:** `200 {status: 'active'|'suspended'|'banned', statusReason: string|null}` — defaults to `{status:'active', statusReason:null}` when no `users` doc exists; `401`
- **Client:** `src/api/auth.ts` → `getAccountStatus()` (note the name differs from the route) — used by `src/Components/AccountStatusBanner/AccountStatusBanner.tsx:18`
- **Notes:** Deliberately NOT behind `requireActive` — a suspended/banned user must be able to read their own status to see the banner (auth.js:119–122).

### POST /api/setUsername
- **Handler:** `server/routes/auth.js:134`
- **Middleware:** `verifyToken`, `requireActive`, `profileWriteLimiter`
- **Request:** query `username` (string, required) — the payload rides the **query string of a POST**, not the body; the client matches (`src/api/auth.ts:43`). Validation (auth.js:75–92): required, no whitespace, 3–30 chars, charset `[a-zA-Z0-9._-]` → `400 {error: <message>}`
- **Response:** `200 {success:true}`; `400` validation; `422 {error, code:'CONTENT_BLOCKED'}` on text-moderation block (context `'username'`, identity spam rules — no URLs/domains); `409 {error:'Username already taken'}` on case-insensitive collision (pre-check plus the `username_lower` unique index catching the race, auth.js:180); `401`/`403`/`429` from middleware
- **Client:** `src/api/auth.ts` → `setUsername()` — used by `src/pages/CreateUsername/CreateUsername.tsx:84`, `src/context/AuthContext.tsx:252` (`updateProfileData`, only when changed)
- **Notes:** Upsert stamps `createdAt` once (`$setOnInsert`) for admin signup analytics. **Rename propagation** (auth.js:191–201): ratings and review reports denormalize the username, so a rename `updateMany`s `ratings.username` and `reports.reportedUsername` to the new handle; otherwise old reviews would detach from the profile and moderation queue.

### GET /api/getProfile
- **Handler:** `server/routes/auth.js:210`
- **Middleware:** `verifyToken`
- **Request:** none (self-scoped)
- **Response:** `200 {bio: string, location: string, isPublic: boolean, hideLocation: boolean}` — defaults `''`/`''`/`true`/`false` when unset, so pre-existing profiles read as public with location shown; `401`
- **Client:** `src/api/auth.ts` → `getProfile()` — used by `src/pages/Settings/sections/ProfileSection.tsx:43`, `src/pages/Settings/sections/PrivacySection.tsx:17`, `src/pages/Account/useAccountData.ts:50`

### POST /api/updateProfile
- **Handler:** `server/routes/auth.js:226`
- **Middleware:** `verifyToken`, `requireActive`, `profileWriteLimiter`
- **Request:** body `{bio?: string, location?: string}` — both optional; empty string clears the field; non-string → `400`; trimmed length caps bio 300 / location 80 → `400 {error: <message>}`
- **Response:** `200 {success:true}`; `400`; `422 {error, code:'CONTENT_BLOCKED'}` (bio+location moderated as one blob, context `'profile'`); `401`/`403`/`429`
- **Client:** `src/api/auth.ts` → `updateProfile(profile)` — used by `src/pages/Settings/sections/ProfileSection.tsx:208`, `src/pages/CreateUsername/CreateUsername.tsx:92` (both send only `{bio, location}`)
- **Notes:** Values trimmed before storage; upsert always writes both fields (an omitted field is stored as `''`, i.e. cleared — this is not a patch endpoint).

### POST /api/updatePhoto
- **Handler:** `server/routes/auth.js:266`
- **Middleware:** `verifyToken`, `requireActive`, `profileWriteLimiter`
- **Request:** body `{photoURL?: string}` — non-string (when present) → `400 {error:'photoURL must be a string'}`. Empty/omitted string **clears** the avatar (Admin SDK is passed `null`, auth.js:282)
- **Response:** `200 {success:true, photoURL: string}` (echoes the trimmed URL, `''` on clear); `400`; `422 {error, code:'CONTENT_BLOCKED'}` on image-moderation block — **fails closed**: a scan outage rejects rather than applying an unscanned photo (auth.js:262–265); `401`/`403`/`429`
- **Client:** `src/api/auth.ts` → `updatePhoto(photoURL)` — used by `src/context/AuthContext.tsx:247` (`updateProfileData`)
- **Notes:** This is the moderation hook for avatars: the client uploads the file itself to Firebase Storage at `profilePhotos/{uid}` (AuthContext.tsx:233) and POSTs only the download URL; the **server** writes `photoURL` onto the Firebase Auth user. Clearing needs no scan.

### POST /api/updateDisplayName
- **Handler:** `server/routes/auth.js:296`
- **Middleware:** `verifyToken`, `requireActive`, `profileWriteLimiter`
- **Request:** body `{displayName: string}` — required non-blank string → `400 {error:'displayName is required'}`; trimmed length > 50 → `400`
- **Response:** `200 {success:true, displayName: string}` (trimmed); `400`; `422 {error, code:'CONTENT_BLOCKED'}` (context `'displayName'`, identity spam rules); `401`/`403`/`429`
- **Client:** `src/api/auth.ts` → `updateDisplayName(name)` — used by `src/context/AuthContext.tsx:275`, `src/pages/CreateUsername/CreateUsername.tsx:88`
- **Notes:** Like updatePhoto, this is the server-side moderation hook — the client no longer writes `displayName` to Firebase Auth directly; the server applies it via the Admin SDK after moderation.

### POST /api/updatePrivacy
- **Handler:** `server/routes/auth.js:320`
- **Middleware:** `verifyToken`, `requireActive`, `profileWriteLimiter`
- **Request:** body `{isPublic: boolean, hideLocation: boolean}` — **both required booleans** (the client always sends the full current state of both switches); non-boolean → `400 {error:'<field> must be a boolean'}`
- **Response:** `200 {success:true}`; `400`; `401`/`403`/`429`
- **Client:** `src/api/auth.ts` → `updatePrivacy(isPublic, hideLocation)` — used by `src/pages/Settings/sections/PrivacySection.tsx:51`
- **Notes:** These flags gate the public `/u/:username` view: `isPublic:false` makes both publicProfile endpoints 404; `hideLocation` blanks location there.

### GET /api/exportMyData
- **Handler:** `server/routes/auth.js:340`
- **Middleware:** `verifyToken`
- **Request:** none
- **Response:** `200` — `Content-Type: application/json`, `Content-Disposition: attachment; filename="prepify-data.json"`, pretty-printed body `{exportedAt, username, profile: {bio, location, isPublic, hideLocation}|null, savedRecipes, recipes, drafts, ratings}`; `401`
- **Client:** `src/api/auth.ts` → `exportMyData()` (fetches as blob, triggers browser download with the same filename) — used by `src/pages/Settings/sections/DangerSection.tsx:32`
- **Notes:** GDPR export contents: the user's OWN recipes/drafts are full bodies minus the internal admin moderation stamps (`recipeInternalStampsExclusion`, so no admin uids leak, auth.js:353–363); saved recipes are hydrated to bodies through `publicRecipeProjection` + `RECIPE_VISIBLE` — they're other users' recipes, read as a non-owner would — and a deleted/hidden save is preserved as its reference with `recipe: null` (auth.js:380–395). NOT behind `requireActive`: export is one of the two writes/reads a moderated user is always allowed.

### POST /api/deleteAccount
- **Handler:** `server/routes/auth.js:449`
- **Middleware:** `verifyToken` only — intentionally no `requireActive` (a banned/suspended user may always self-delete, auth.js:446–448) and no rate limiter
- **Request:** none (uid from token)
- **Response:** `200 {success:true}`; `401`; `500` if the cascade throws (asyncHandler)
- **Client:** `src/api/auth.ts` → `deleteAccount()` — used by `src/context/AuthContext.tsx:314` (`deleteAccount`), which first forces Firebase reauthentication (password credential or Google popup), then calls the API, then `signOut` + navigate home
- **Notes:** **Deletion cascade**, ordered so a partial failure leaves the login intact to retry: (1) one Mongo transaction removes own recipes, all ratings on them, everyone's saved/made/user references to them, the user's own ratings, and their `usernames`/`userProfiles`/`users`/`userRecipeData`/`recipeDrafts` docs, and anonymizes reports they filed (`reporterUid: null`, keeping the moderation record) — batched into O(1) collection passes to stay under transaction limits (auth.js:477–512); (2) post-commit best-effort: rating recompute for surviving recipes the user reviewed (3 retries; failures go to Sentry and are stamped as `staleRatingRecipeIds` on the audit row for later reconciliation), Storage cleanup of recipe images + `profilePhotos/{uid}` (helpers never throw), and a `user.delete` audit entry capturing the handle (the usernames doc is already gone); (3) Firebase Auth account deleted **last** (auth.js:570).

## User Content Lists

### GET /api/getCreatedRecipes
- **Handler:** `server/routes/users.js:66`
- **Middleware:** `verifyToken`
- **Request:** query `page` (int, default 0), `recipesPerPage` (int, default 6, hard-capped at 50), `order` (`'old'` = oldest-first by `createdAt`; anything else = newest-first). No validation rejections; non-numeric params fall back to defaults. A negative `page` is not floored (unlike getPublicProfileRecipes) — it would reach Mongo `.skip()` as negative and 500
- **Response:** `200 {recipes: CreatedCard[], totalCount: number}` — recipes projected to `CREATED_CARD_PROJECTION` (`title, recipeImage, servingPrice, createdAt, views, numTimesSaved, numTimesMade, totalTime, rating` + `_id`); `401`
- **Client:** `src/api/recipes.ts` → `getCreatedRecipes(page, recipesPerPage, order)` (returns `null` when signed out) — used by `src/pages/Account/UserRecipes/UserRecipes.tsx:29` (always `order='new'`, per-page 6)
- **Notes:** Filter is `RECIPE_OWNER_VISIBLE`: excludes takedowns/de-publishes but includes the author's own `pending_review` recipes, so a held recipe doesn't silently vanish from their account (users.js:77–80). Whitelist projection structurally keeps admin-uid moderation stamps out of the response.

### GET /api/getSavedRecipes
- **Handler:** `server/routes/users.js:96`
- **Middleware:** `verifyToken`
- **Request:** query `page` (int, default 0), `recipesPerPage` (int, default 5, capped 50), `order` — save-time spellings `'newAdd'`/`'oldAdd'` plus legacy `'new'`/`'old'` (default newest-saved-first), or field sorts `'alpha'|'rating'|'timeShort'|'timeLong'`; `collectionId` (optional — filters to saved entries whose `collectionIds` include it; repeated param collapsed to first value), `q` (optional case-insensitive title substring; repeated param collapsed to first value). No 400s
- **Response:** `200 {recipes: SavedCard[], totalCount: number}` — projected to `SAVED_CARD_PROJECTION` (`title, recipeImage, servingPrice, totalTime, cuisine, rating` + `_id`); `401`
- **Client:** `src/api/recipes.ts` → `getSavedRecipes(page, recipesPerPage, order, collectionId?, q?)` (null when signed out) — used by `src/pages/Account/SavedRecipes/SavedRecipes.tsx:75` (per-page 6, sort values `newAdd/oldAdd/alpha/rating/timeShort/timeLong`, debounced search)
- **Notes:** Two paths: a search or field sort materializes the whole visible saved set, filters/sorts docs, then pages; otherwise a cheaper sort-entries-then-fetch-page path runs. Both apply `RECIPE_VISIBLE`, and `totalCount` counts only visible recipes (users.js:195–206) so soft-hidden saves can't leave the client's Load More button permanently live. Response preserves save-time order by re-keying find() results (string-compared ids to bridge legacy string `_id`s).

### GET /api/getAccountCounts
- **Handler:** `server/routes/users.js:214`
- **Middleware:** `verifyToken`
- **Request:** none
- **Response:** `200 {saved: number, ratings: number, recipes: number, drafts: number}` (via `getAccountCountsFor`, `server/util/accountCounts.js:8` — all keyed on uid; saved counted with `$size` server-side); `401`
- **Client:** `src/api/recipes.ts` → `getAccountCounts()` (null when signed out) — used by `src/pages/Account/useAccountData.ts:56`, `src/pages/Account/SavedRecipes/SavedRecipes.tsx:100`
- **Notes:** Counts are **unfiltered** by visibility (correct for the owner's own tabs); the public-profile endpoint deliberately does its own `RECIPE_VISIBLE` aggregate instead of reusing these (publicProfile.js:52–56).

## Public Profiles

### GET /api/getPublicProfile
- **Handler:** `server/routes/publicProfile.js:19`
- **Middleware:** none (public)
- **Request:** query `username` (required) → `400 {error:'username is required'}`; resolved case-insensitively via `usernames.username_lower`
- **Response:** `200 {username, displayName, photoURL, bio, location, level, rank, xp, xpNext, pct, achievements (earned only), recipes (first 12, publicRecipeCardProjection, sorted createdAt desc + _id tiebreaker), recipesTotalCount, recipesSavesTotal, recipesMadeTotal}`; `404 {error:'Profile not found'}` for BOTH an unknown username and a profile with `isPublic:false` — identical responses so a private account's existence isn't leaked (publicProfile.js:90–94)
- **Client:** `src/api/publicProfile.ts` → `getPublicProfile(username)` (resolves 404 to `null`; other errors propagate) — used by `src/pages/PublicProfile/PublicProfile.tsx:149`
- **Notes:** **Privacy gating:** private → 404; `hideLocation` blanks `location` but leaves the rest public. Header stats come from a `RECIPE_VISIBLE`-filtered aggregate (count + saves/made sums), not `getAccountCountsFor` (which is unfiltered and would leak held/hidden recipe counts). displayName/photoURL come from Firebase Auth via Admin SDK, falling back to `{displayName: username, photoURL: null}` on lookup failure so the profile still renders. Gamification is computed from unfiltered account counts (`computeGamification(counts, [])`).

### GET /api/getPublicProfileRecipes
- **Handler:** `server/routes/publicProfile.js:127`
- **Middleware:** none (public)
- **Request:** query `username` (required → `400`), `page` (int, floored at 0 so negative skip can't 500), `recipesPerPage` (int, default 12, clamped to max 12 = `PROFILE_RECIPE_LIMIT` so pages stay aligned with the profile payload's initial batch)
- **Response:** `200 {recipes: PublicCard[], totalCount: number}` (`publicRecipeCardProjection`, same `createdAt desc, _id asc` sort as getPublicProfile so paging never skips/duplicates at boundaries); `404 {error:'Profile not found'}` for unknown username or private profile (same gate mirrored, publicProfile.js:142–146)
- **Client:** `src/api/publicProfile.ts` → `getPublicProfileRecipes(username, page, recipesPerPage)` — used by `src/pages/PublicProfile/PublicProfile.tsx:172` (load-more)

#### DRIFT — auth/users/profile

- **`updateProfile` silently drops privacy flags (latent).** The client's `UserProfile` type (`src/api/auth.ts:5–12`) includes optional `isPublic`/`hideLocation` and `updateProfile(profile: UserProfile)` will happily send them, but `POST /updateProfile` destructures only `{bio, location}` (`server/routes/auth.js:227`) — privacy flags in that body are ignored (they have their own endpoint). Current call sites send only `{bio, location}`, so no live bug, but a caller round-tripping `getProfile()`'s result through `updateProfile()` would believe it saved privacy settings it didn't.
- **Response types overstate the payload.** `RecipeAPI.getSavedRecipes`/`getCreatedRecipes` (`src/api/recipes.ts:541,557`), `PublicProfileAPI.getPublicProfileRecipes` (`src/api/publicProfile.ts:29`), and `PublicProfile.recipes` (`src/types.ts:587`) all declare `RecipeType[]`, but the server returns narrow card projections (`SAVED_CARD_PROJECTION`/`CREATED_CARD_PROJECTION` in users.js:18–46, `publicRecipeCardProjection` in publicProfile.js) — `ingredients`, `instructions`, `nutritionData`, etc. are absent at runtime. Consumers only render card fields today, but the type would not catch a component reaching for a missing field.
- **Inconsistent negative-page hardening.** `getPublicProfileRecipes` floors `page` at 0 specifically because a negative `.skip()` makes Mongo 500 (publicProfile.js:148–150), but `getCreatedRecipes` (users.js:73) passes a client-sent negative `page` straight to `.skip()`. No client sends one; direct API callers can trigger a 500 on one endpoint but not its sibling.
- **`order='new'` is unrecognized-but-works.** `UserRecipes.tsx:13` always sends `order='new'` to `getCreatedRecipes`; the server only special-cases `'old'` (users.js:71), so `'new'` just falls through to the default newest-first. Same effect, but the value is not actually part of the server's vocabulary. (Conversely, the server's legacy `'new'/'old'` spellings on `getSavedRecipes` are no longer sent by any client — accepted for back-compat only, users.js:166–168.)
- No unused client methods and no dead endpoints: every method in `src/api/auth.ts`, `src/api/publicProfile.ts`, and the three users-route methods in `src/api/recipes.ts` has at least one live call site, and all 16 routes have a client caller.
## Collections

### GET /api/collections
- **Handler:** `server/routes/collections.js:66`
- **Middleware:** `verifyToken`
- **Request:** no params/query/body.
- **Response:** `200` — array of `{ id: string (uuid), name: string, createdAt: string (ms-epoch string), count: number, coverRecipeId: string|null, coverImage: string|null }`. `count`/cover reflect only *visible* members (recipes matching `RECIPE_VISIBLE`); cover = most-recently-saved visible member. Missing `userRecipeData` doc → `[]`. `401` via `verifyToken`.
- **Client:** `src/api/collections.ts` → `list()` — used by `src/Components/AddToCollection/SaveControl.tsx:68` and `src/pages/Account/SavedRecipes/SavedRecipes.tsx:92`. Client short-circuits to `[]` when signed out.
- **Notes:** Collections are folders over the master saved list; membership lives on each `savedRecipes` entry's `collectionIds`, so counts can never drift from what's actually saved.

### POST /api/collections
- **Handler:** `server/routes/collections.js:103`
- **Middleware:** `verifyToken`, `requireActive`, `collectionWriteLimiter` (a `makeUserLimiter` instance at the default 30 req/min per uid, **shared bucket with the rename route** → `429 { error, code: 'RATE_LIMITED' }`; skipped when `NODE_ENV=test`; added in [#299](https://github.com/jclind/prepify/pull/299))
- **Request:** body `{ name: string }`. Name is trimmed and hard-capped at 50 chars (`boundedName`, collections.js:23); non-string/empty-after-trim → `400 { error: 'name is required' }`.
- **Response:** `201` — the new collection in the list shape with `count: 0, coverRecipeId: null, coverImage: null`. `409 { error: 'You can have at most 50 collections' }` at the 50-collection cap; `409 { error: 'A collection with that name already exists' }` on case-insensitive duplicate (checked twice: friendly pre-read, then an atomic `$expr`-guarded push whose lost race also returns this 409, collections.js:139-160). `400`/`401`/`403`/`429` per above.
- **Client:** `src/api/collections.ts` → `create(name)` — used by `src/Components/AddToCollection/AddToCollectionPopover.tsx:76`, `src/pages/Account/SavedRecipes/SavedRecipes.tsx:148`.
- **Notes:** Collection names are *not* run through the content-moderation classifier — only trim + length cap (unlike recipe/review text). **By design (owner decision, 2026-07-11):** collections are owner-private (rendered only to their creator via the authed `GET /collections`), so the name has no exposure surface; if collections ever become shareable, the sharing feature must add the `moderateText` call.

### PATCH /api/collections/:id
- **Handler:** `server/routes/collections.js:165`
- **Middleware:** `verifyToken`, `requireActive`, `collectionWriteLimiter` (same instance/bucket as the create route — create + rename draw one 30/min budget; added in [#299](https://github.com/jclind/prepify/pull/299))
- **Request:** param `id` (collection uuid); body `{ name: string }`, same `boundedName` rules → `400 { error: 'name is required' }` when missing/blank.
- **Response:** `200 { id, name }`. `404 { error: 'Collection not found' }` if no owned collection has that id; `409 { error: 'A collection with that name already exists' }` on case-insensitive clash with a *different* collection (pre-check plus atomic guarded `$set`; a lost rename race also 409s, collections.js:189-216). `401`/`403`/`429` per middleware.
- **Client:** `src/api/collections.ts` → `rename(id, name)` — used by `src/pages/Account/SavedRecipes/SavedRecipes.tsx:164`.

### DELETE /api/collections/:id
- **Handler:** `server/routes/collections.js:222`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** param `id`. No body.
- **Response:** `200 { deleted: true }`. `404 { error: 'Collection not found' }` if not owned/existing. `401`/`403` per middleware.
- **Client:** `src/api/collections.ts` → `remove(id)` — used by `src/pages/Account/SavedRecipes/SavedRecipes.tsx:178`.
- **Notes:** Also `$pull`s the collection id out of every saved entry's `collectionIds`; the recipes themselves stay in the master saved list.

### PATCH /api/recipes/:recipeId/collections
- **Handler:** `server/routes/collections.js:247`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** param `recipeId`; body `{ collectionIds: string[] }`. Non-array → `400 { error: 'collectionIds must be an array' }`. Unknown/stale collection ids are silently dropped and the array is de-duplicated (collections.js:261); an empty array clears membership.
- **Response:** `200 { recipeId, collectionIds (the filtered set actually stored), saved: true }`. `401`/`403` per middleware.
- **Client:** `src/api/collections.ts` → `setRecipeCollections(recipeId, collectionIds)` — used by `src/Components/AddToCollection/AddToCollectionPopover.tsx:53,91`.
- **Notes:** Sets the recipe's *entire* membership in one call (drives the checkbox popover). Filing a not-yet-saved recipe auto-saves it first via an atomic `$ne`-guarded push (duplicate-key race swallowed as no-op), and only the request that actually pushed increments the recipe's `numTimesSaved` (collections.js:276-296). The route does not verify the recipe exists — an arbitrary `recipeId` string is pushed into `savedRecipes` and still answers `saved: true` (collections.js:263-298).

## Recipe Drafts

### POST /api/drafts
- **Handler:** `server/routes/drafts.js:28`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** body — any subset of `RECIPE_CONTENT_FIELDS` (`server/util/recipeFields.js:5`): `title, prepTime, cookTime, servings, fridgeLife, freezerLife, description, ingredients, instructions, cuisine, mealTypes, nutritionLabels`. Every field optional (no required-field presence check — drafts are intentionally incomplete); only bounds are validated via `validateRecipeBounds` (`server/util/recipeLimits.js:99`): title ≤ 50 chars, description ≤ 2000, ≤ 50 ingredients (each raw line ≤ 200 chars), ≤ 50 instructions (each ≤ 1000 chars), numeric type/range clamps (times 0–20160 min int, servings 1–1000 int, fridge/freezer life 0–365 int, servingPrice 0–1,000,000 non-int OK). Violation → `400 { error: <message> }`. Unlisted keys are silently dropped (whitelist via `pickFields`), so the client can't spoof `userId`/timestamps.
- **Response:** `201` — the full stored draft doc `{ _id, userId, ...content, createdAt, updatedAt }` (timestamps are ms-epoch strings). `409 { code: 'DRAFT_LIMIT', error: "You've reached the maximum of 25 saved drafts. ..." }` at the 25-drafts-per-user cap (creation only; drafts.js:14,39). `401`/`403` per middleware.
- **Client:** `src/api/drafts.ts` → `createDraft(content)` — used by `src/pages/AddRecipe/useDraftAutosave.ts:116`. Client exports `DRAFT_LIMIT_CODE = 'DRAFT_LIMIT'` so autosave can distinguish "at limit" and stop retrying.
- **Notes:** First autosave creates; the returned `_id` switches the client to PUT-on-autosave thereafter. The recipe image is not part of a draft. `useDraftAutosave.ts:123` deletes a just-created draft if the create raced a concurrent one.

### GET /api/drafts
- **Handler:** `server/routes/drafts.js:58`
- **Middleware:** `verifyToken`
- **Request:** none.
- **Response:** `200` — array of the caller's full draft docs, sorted `updatedAt` descending. `401` per middleware.
- **Client:** `src/api/drafts.ts` → `listDrafts()` — used by `src/pages/AddRecipe/DraftResumeBanner.tsx:19`, `src/pages/Account/Drafts/Drafts.tsx:17`.

### GET /api/drafts/:id
- **Handler:** `server/routes/drafts.js:69`
- **Middleware:** `verifyToken`
- **Request:** param `id` (Mongo ObjectId). Invalid ObjectId → `404` (not 400).
- **Response:** `200` — the draft doc. `404 { error: 'Draft not found' }` (invalid id or no doc); `403 { error: 'Forbidden' }` when the draft belongs to another user; `401` per middleware.
- **Client:** `src/api/drafts.ts` → `getDraft(id)` — used by `src/pages/AddRecipe/useRecipeForm.ts:229` (resume flow, `?draft=<id>`).

### PUT /api/drafts/:id
- **Handler:** `server/routes/drafts.js:88`
- **Middleware:** `verifyToken`, `requireActive`
- **Request:** param `id`; body — same whitelisted content fields and bounds as POST. Ownership/existence checked *before* bounds validation so callers can't probe bounds-validity of drafts they don't own (drafts.js:94-107).
- **Response:** `200` — the updated draft doc (`findOneAndUpdate` returnDocument: 'after'; mongodb driver v6, so the body is the doc itself). `404` invalid-ObjectId or missing; `403 { error: 'Forbidden' }` not-owner; `400 { error: <bounds message> }`; `401`/`403` per middleware.
- **Client:** `src/api/drafts.ts` → `updateDraft(id, content)` — used by `src/pages/AddRecipe/useDraftAutosave.ts:113`.
- **Notes:** Autosave overwrite. Only fields *present* in the body are `$set`; the client therefore sends explicit `null` (not omission) to clear a numeric field, or the stale value would resurrect on resume (`src/types.ts:126-131`). No per-user write limiter on draft POST/PUT (autosave cadence), only the global per-IP backstop. Edge case: if the draft is deleted between the ownership check and the update, the route returns `200` with body `null` (drafts.js:112-115).

### DELETE /api/drafts/:id
- **Handler:** `server/routes/drafts.js:120`
- **Middleware:** `verifyToken`
- **Request:** param `id`.
- **Response:** `200 { deleted: true }`. `404` invalid-ObjectId or missing; `403 { error: 'Forbidden' }` not-owner; `401` per middleware.
- **Client:** `src/api/drafts.ts` → `deleteDraft(id)` — used by `src/pages/Account/Drafts/Drafts.tsx:21` and `src/pages/AddRecipe/useDraftAutosave.ts:123,208` (post-publish cleanup and create-race rollback).
- **Notes:** No `requireActive` — suspended/banned users can still list, read, and delete their drafts; only creating/updating is gated.

## Gamification

### GET /api/getGamification
- **Handler:** `server/routes/gamification.js:18`
- **Middleware:** `verifyToken`
- **Request:** none — everything is derived from the token's uid.
- **Response:** `200` — `{ level: number, rank: string, xp: number (progress within current level), xpNext: number, pct: number (0–100), totalXp: number, achievements: {id, name, description, earned: boolean}[], earned: string[], newlyUnlocked: string[] }`, computed by `computeGamification` (`server/util/gamification.js:104`) from account counts (recipes ×100 XP, ratings ×15, saved ×5; drafts earn nothing) and the profile's `seenAchievements`. `401` per middleware.
- **Client:** `src/api/gamification.ts` → `getGamification()` — used by `src/pages/Account/useAccountData.ts:62`.
- **Notes:** Nothing is stored by this read. Achievement award triggers (`server/util/gamification.js:31`): `first_save` (1 saved), `collector` (25 saved), `first_recipe` (1 published), `prolific` (10 published), `first_review` (1 rating), `critic` (10 ratings). `newlyUnlocked` = earned − seen; acknowledging is a separate POST so the toast isn't consumed if never shown.

### POST /api/acknowledgeAchievements
- **Handler:** `server/routes/gamification.js:37`
- **Middleware:** `verifyToken`, `profileWriteLimiter` (a `makeUserLimiter` instance at the default 30 req/min per uid → `429 { error, code: 'RATE_LIMITED' }`; shared budget with the other `userProfiles` writes' pattern but its own bucket)
- **Request:** body `{ ids: string[] }`. Non-array → `400 { error: 'ids must be an array' }`. Ids not in the achievement catalog are silently dropped; nothing is written when none survive.
- **Response:** `200 { success: true }`. `400`/`401`/`429` per above.
- **Client:** `src/api/gamification.ts` → `acknowledgeAchievements(ids)` — used by `src/pages/Account/useAchievementsToast.ts:29` (fires with `newlyUnlocked` after showing the toast). Client no-ops on an empty array.
- **Notes:** Idempotent — `$addToSet` into `userProfiles.seenAchievements`, upserting the profile doc if absent.

#### DRIFT — collections/drafts/gamification
None found. Client paths, methods, request bodies, and typed response shapes (`RecipeCollection` at `src/types.ts:541`, `RecipeDraftContent`/`RecipeDraftType` at `src/types.ts:132/147`, `Gamification` at `src/types.ts:561`) all match the server handlers field-for-field, including the null-to-clear draft-field convention and the `DRAFT_LIMIT` 409 code. Two server-side edge behaviors worth knowing (not client mismatches): PUT /api/drafts/:id can return `200 null` on a delete race (drafts.js:112-115), and PATCH /api/recipes/:recipeId/collections never validates that the recipe exists (collections.js:263-298).
## Ingredient Enrichment

### POST /api/ingredients/parse
- **Handler:** `server/routes/ingredients.js:108`
- **Middleware:** `verifyToken` → `parseLimiter` (per-user `makeUserLimiter` instance, package defaults: **30 req / 60s per `req.uid`**, custom message `'Too many ingredient lookups — wait a minute and try again.'`, 429 body `{error, code: 'RATE_LIMITED'}`; in-memory per-process bucket, skipped when `NODE_ENV === 'test'`) → `asyncHandler`
- **Request:** JSON body `{ ingredientString: string }` — must be a non-empty string. Rejection: `400 {error: 'ingredientString must be a non-empty string'}` (falsy or non-string).
- **Response:**
  - `200 { ingredientData: IngredientData | null }` — `null` is a *clean lookup miss* (no Spoonacular match), returned deliberately as 200 so the client renders its soft-fail row state. When non-null: `{ name: string, imagePath?: string, totalPriceUSACents?: number (integer), possibleUnits?: string[], category?: string }` — price/image keys are **omitted** (not null) when absent.
  - `400 {error}` — validation, above.
  - `401` — `verifyToken` (missing/invalid Bearer).
  - `429 {error, code: 'RATE_LIMITED'}` — parseLimiter.
  - `500 {error: GENERIC_500_MESSAGE}` — enrichment threw (proxy/network `EnrichError`), distinct from a clean miss.
- **Client:** `src/api/ingredientParserApi.ts` → `fetchIngredientEnrichment(parsedIngredient)` (posts `parsedIngredient.originalIngredientString`) — used only via `RecipeAPI.getIngredientData` (`src/api/recipes.ts:496`), called from `src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer.tsx:59` (add row) and `src/pages/AddRecipe/Ingredients/IngredientItem.tsx:120` (edit row). `getIngredientData` first parses locally/synchronously with `parseIngredientString`, then enriches; it degrades any rejection (5xx, timeout, server down) to an `{error, parsedIngredient, ingredientData: null}` variant so the row shows a Retry affordance instead of hanging.
- **Notes:**
  - Shape-mapping boundary (`mapIngredientData`, ingredients.js:96): v2 `price.cents`/`image` are projected onto Prepify's persisted names `totalPriceUSACents`/`imagePath`; cents rounded to integers (v2 prices are gram-estimated floats). Saved recipe docs are thus decoupled from the package's type surface.
  - Image-host rewrite (ingredients.js:80): the parser still builds the dead `spoonacular.com/cdn/ingredients_` host; the server rewrites to `img.spoonacular.com/ingredients_` before responding.
  - No client-supplied options are forwarded to `ingredientParser` — only `imageSize: '100x100'` plus optional `serverUrl` from `INGREDIENT_PARSER_PROXY_URL` — so a caller cannot redirect the proxy target (ingredients.js:119).
  - Telemetry (ingredients.js:41): best-effort upserts into the `ingredientMisses` Mongo collection — `miss` on null enrichment, `price_outlier` when `totalPriceUSACents >= 1500` (`PRICE_OUTLIER_CENTS`, flag-only; the price is returned unchanged). Telemetry failures are swallowed and never affect the response.
- **Upstream:** `@jclind/ingredient-parser` v2 `ingredientParser` → hosted enrichment proxy (key-free; the proxy holds the Spoonacular key; base URL overridable via `INGREDIENT_PARSER_PROXY_URL`). No explicit timeout is set on this call (unlike the nutrition route).

## Nutrition (Edamam proxy)

### POST /api/nutrition/details
- **Handler:** `server/routes/nutrition.js:21`
- **Middleware:** `verifyToken` → `nutritionLimiter` (independent per-user `makeUserLimiter` instance, defaults: **30 req / 60s per `req.uid`**, message `'Too many nutrition lookups — wait a minute and try again.'`, 429 body `{error, code: 'RATE_LIMITED'}`; skipped under Jest) → `asyncHandler`
- **Request:** JSON body `{ ingr: string[], title?: string }` — `ingr` must be a non-empty array of strings. `title` optional; non-string/empty falls back to `'recipe 1'` (Edamam requires one). Rejection: `400 {error: 'ingr must be a non-empty array of strings'}`.
- **Response:**
  - `200 <Edamam nutrition-details JSON>` — passed through verbatim on Edamam 2xx.
  - `200 null` — **soft fail**: any Edamam non-2xx (e.g. 404/555 "can't compute nutrition") returns literal JSON `null`, so routine no-data outcomes don't trip the client's 5xx handling/Sentry reporter and the recipe save proceeds without nutrition.
  - `400 {error}` — validation, above.
  - `401` — `verifyToken`.
  - `429 {error, code: 'RATE_LIMITED'}` — nutritionLimiter.
  - `503 {error: 'Nutrition service unavailable'}` — `EDAMAM_APP_ID`/`EDAMAM_APP_KEY` unset (misconfiguration).
  - `500 {error: GENERIC_500_MESSAGE}` — network/parse failure or the 10s timeout (`AbortSignal.timeout(10000)`, nutrition.js:61) reaching Edamam.
- **Client:** `src/api/recipes.ts` → `RecipeAPI.getRecipeNutrition(ingrArr)` (recipes.ts:415) — used by `addRecipe` (recipes.ts:271) and `editRecipe` (recipes.ts:358), driven from `src/pages/AddRecipe/useRecipeForm.ts`. Sends `{title: 'recipe 1', ingr: buildNutritionIngredients(...)}` and catches all rejections → returns `null`, so a nutrition outage never blocks a recipe save. `editRecipe` only calls it when the ingredient strings actually changed (element-wise compare via the shared `buildNutritionIngredients`), and only overwrites stored nutrition when the fresh result is non-null — a transient failure can't erase existing nutrition facts.
- **Notes:**
  - Why soft-200: the server distinguishes "Edamam had no answer" (expected, 200+null) from "we couldn't reach Edamam" (fault, 500) — the client collapses both to `null`, but only the fault path logs as an error/Sentry 5xx.
  - `buildNutritionIngredients` (recipes.ts:397) only includes ingredients with a `quantity`; a recipe where none have one sends `ingr: []`, which the server rejects with 400 — the client catch soft-fails that to `null` too.
  - App id/key are query-string params on the upstream URL (server-side only; formerly shipped in the browser bundle as `VITE_EDAMAM_APP_ID/KEY`).
- **Upstream:** Edamam `POST https://api.edamam.com/api/nutrition-details?app_id=…&app_key=…`, 10s abort timeout.

#### DRIFT — ingredients/nutrition
- **Resolved:** the old hardcoded `source: 'spoonacular'` field is gone — `src/api/ingredientParserApi.ts` and `src/types.ts` `IngredientData` carry no `source` field, and no `spoonacular` string remains anywhere in `src/` outside tests.
- **429 copy/code unused by the client:** the server ships tailored 429 messages and a stable `code: 'RATE_LIMITED'` (server/middleware/writeLimiter.js:45 says the code exists "so the FE can branch on the 429"), but neither client path does: `getIngredientData` (src/api/recipes.ts:522) surfaces the generic axios `err.message` as the row error, and `getRecipeNutrition` (src/api/recipes.ts:428) swallows the 429 into `null`. Users never see the "wait a minute" copy. Minor UX drift, not a correctness bug.
- Cosmetic only: the nutrition client posts to `'api/nutrition/details'` (no leading slash) while the enrichment client uses `'/api/ingredients/parse'`; both resolve identically against the axios `baseURL`.
## Content Reports

### POST /api/reports
- **Handler:** `server/routes/reports.js:90`
- **Middleware:** `verifyToken` → `requireActive` → `reportLimiter` (`makeUserLimiter` instance, **10 requests/min per uid**, message "You're filing reports too quickly — wait a minute and try again.") → `asyncHandler`
- **Request:** body:
  - `targetType` (string, required): one of `'recipe' | 'review' | 'user'` — else `400 {error: "targetType must be 'recipe', 'review', or 'user'"}`
  - `recipeId` (string): required for `recipe`/`review` targets, must be absent-or-ignored for `user` — missing/non-string → `400 {error: 'recipeId is required'}`
  - `reportedUsername` (string): required for `review`/`user` targets — else `400 {error: 'reportedUsername is required for review and user reports'}`
  - `reason` (string, required): one of `'spam' | 'inappropriate' | 'offensive' | 'copyright' | 'dangerous' | 'incorrect_info' | 'other'` — else `400 {error: 'Invalid reason'}`; `incorrect_info` is recipe-only — on review/user targets `400 {error: 'That reason only applies to recipe reports'}`
  - `details` (string, optional): max 1000 chars — non-string or over limit → `400 {error: 'details must be a string under 1000 chars'}`; stored as `''` when omitted
- **Response:** `201` the inserted report doc **minus `reportedUid`** (`_id`, `targetType`, `recipeId` (recipe/review only), `reportedUsername` (review/user only), `reporterUid`, `reason`, `details`, `status: 'open'`, `createdAt`) — the uid is stripped so the endpoint can't be used as a username→uid oracle (reports.js:166-171). Other statuses:
  - `400` validation errors above; also `400 {error: "You can't report yourself." | "You can't report your own review."}` when the resolved `reportedUid === req.uid`
  - `404 {error: 'No user with that username exists.'}` — `user` target naming a nonexistent handle (a `review` target with a missing handle is allowed; `reportedUid` stays null)
  - `409 {code: 'ALREADY_REPORTED', error: 'You already have an open report for this content.'}` — reporter already has an OPEN report for the same target; handle matching is case-insensitive (anchored escaped regex, reports.js:74) so casing variants can't sidestep it
  - `401` (verifyToken), `403` (requireActive, `ACCOUNT_BANNED`/`ACCOUNT_SUSPENDED`), `429 {error, code: 'RATE_LIMITED'}` (reportLimiter)
- **Client:** `src/api/reports.ts` → `createReport()` — used by `src/Components/ReportControl/ReportControl.tsx:108` (the report modal on recipes/reviews/profiles); returns `null` without calling when no uid. The client exports `ALREADY_REPORTED_CODE` and ReportControl branches on it for a specific toast.
- **Notes:** For review/user targets the handle is resolved against `usernames` up front to snapshot the stable `reportedUid` (rename-proof, "D1") alongside the display handle. Dedup is per (reporter, target, status:open) via `targetMatch` (reports.js:78) — user reports match on handle only, review reports on recipeId+handle, recipe reports on recipeId.

### GET /api/reports
- **Handler:** `server/routes/reports.js:190`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** query: `status` (`'open' | 'resolved' | 'dismissed'`; invalid values silently ignored = unfiltered), `targetType` (`'recipe' | 'review' | 'user'`; invalid ignored), `page` (default `0`), `perPage` (default `20`). Coerced and clamped like the bug-reports twin (since [#289](https://github.com/jclind/prepify/pull/289), Wave 10 · V2): `perPage` → `parseInt || 20`, capped at `MAX_PER_PAGE` (50); `page` → `parseInt || 0`, floored at 0 so non-numeric/negative values yield a clean first page instead of a NaN/negative-skip 500 (reports.js:198-201).
- **Response:** `200 {reports, totalCount, openCount}` — `reports` sorted `createdAt` desc, each enriched with `target: {recipe, review}`: `recipe` = `{title, recipeImage, status, userId}` projection when the report has a `recipeId` (null for user reports), `review` = `{reviewText, rating, moderationHidden}` for review targets, matched by snapshotted `reportedUid` (fallback to stored handle for legacy reports, reports.js:214-216). `totalCount` counts the filtered set; `openCount` always counts `status:'open'` regardless of filter. Other statuses: `401`, `403`.
- **Client:** `src/api/reports.ts` → `listReports()` — used by `src/pages/Admin/Reports/Reports.tsx:40` (admin moderation queue; passes `status` + `perPage: 50`, never `targetType` or `page`).

### PATCH /api/reports/bulk
- **Handler:** `server/routes/reports.js:239` (declared before `/reports/:id` so `bulk` isn't captured as an id)
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** body: `status` (required, `'resolved' | 'dismissed'` — else `400 {error: "status must be 'resolved' or 'dismissed'"}`), `ids` (required non-empty string array — else `400 {error: 'ids must be a non-empty array'}`; > 100 → `400 {error: 'Cannot update more than 100 reports at once'}`; non-string/invalid ObjectIds filtered out, and if none survive → `400 {error: 'No valid report ids'}`)
- **Response:** `200 {updated: <modifiedCount>}`. Other statuses: `400` as above, `401`, `403`.
- **Client:** `src/api/reports.ts` → `bulkResolve()` — used by `src/pages/Admin/Reports/Reports.tsx:89` (bulk sweep over selected open reports).
- **Notes:** Only OPEN reports are updated (already-closed ids silently skipped). Closed docs are re-read by the route's own `(resolvedBy, resolvedAt)` stamp so a concurrently-closed report can't enter this actor's audit trail (reports.js:256-272); one `report.resolve`/`report.dismiss` audit entry per report actually closed (`recordAuditMany`, `metadata.bulk: true`). Strand guard: any closed report with `source:'automod'` + `targetType:'recipe'` runs `restoreHeldRecipe` (server/util/automod.js:197 — flips the recipe back to `active` only if still `pending_review`, writes a `recipe.approve` audit entry; separately-hidden recipes stay down). On `resolved` only, each affected reporter is emailed in the background (`notifyReportResolvedMany`); dismiss is silent. Resolve does NOT take content down — the admin UI's takedown-first ordering is the contract (reports.js:12-31).

### PATCH /api/reports/:id
- **Handler:** `server/routes/reports.js:305`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** params: `id` (Mongo ObjectId; invalid → `404 {error: 'Report not found'}`). Body: `status` (required, `'resolved' | 'dismissed'` — else `400 {error: "status must be 'resolved' or 'dismissed'"}`)
- **Response:** `200` the full updated report doc (returnDocument:'after' — **includes `reportedUid`**, admin-only audience) with `status`, `resolvedBy`, `resolvedAt` set. Other statuses: `404 {error: 'Report not found'}` (invalid or missing id), `400`, `401`, `403`.
- **Client:** `src/api/reports.ts` → `resolveReport()` — used by `src/pages/Admin/Reports/Reports.tsx:104` (single resolve/dismiss) and `:127` (auto-resolve after a takedown).
- **Notes:** Unlike the bug-reports twin, this update does NOT filter on `status:'open'` (reports.js:314-318) — re-closing an already-closed report overwrites `resolvedBy`/`resolvedAt` and writes another audit entry. Writes one `report.resolve`/`report.dismiss` audit entry; same automod strand guard (`restoreHeldRecipe`) and resolve-only background email (`notifyReportResolved`) as the bulk route.

## Bug Reports

### POST /api/bug-reports
- **Handler:** `server/routes/bugReports.js:44`
- **Middleware:** `submitLimiter` (raw `express-rate-limit`, **15 requests / 15 min per IP**, standard headers, skipped when `NODE_ENV === 'test'`; the 429 body is now the house `{error, code: 'RATE_LIMITED'}` JSON — set via an explicit `message` option, since this is a plain `rateLimit()` keyed by IP rather than a `makeUserLimiter` instance — matching every other write-limiter surface) → `optionalAuth` (sets `req.uid` when a valid Bearer token is present; anonymous otherwise) → `asyncHandler`
- **Request:** body:
  - `category` (required): `'bug' | 'confusing' | 'idea' | 'other'` — else `400 {error: 'Invalid category'}`
  - `description` (required): trimmed and hard-capped at 2000 chars via `boundedString` (non-strings collapse to `''`); empty after trim → `400 {error: 'description is required'}`
  - `email` (optional): trimmed/capped at 254 chars; when present must match a minimal address regex — else `400 {error: 'email must be a valid address'}`
  - `url`, `appVersion` (optional): trimmed/capped at 500 chars each; `userAgent` is taken from the request header server-side, not the body
- **Response:** `201` the inserted doc: `{_id, reporterUid (null when anonymous), reporterEmail (null when absent), category, description, url, userAgent, appVersion, status: 'open', createdAt}`. Other statuses: `400` as above, `429` (submitLimiter).
- **Client:** `src/api/bugReports.ts` → `createBugReport()` — used by `src/Components/BugReport/BugReportModal.tsx:63` (global feedback modal; sends `url` = current SPA path+search, `appVersion` = build version, and `email` only when logged out).
- **Notes:** Fires a background best-effort admin notification email (`notifyBugReportFiled`) with category/description/url and a reporter label (`uid …` | email | `'anonymous'`). No dedup — unlike content reports, repeat submissions are allowed (bounded only by the IP limiter).

### GET /api/admin/bug-reports
- **Handler:** `server/routes/bugReports.js:94`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** query: `status` (`'open' | 'resolved' | 'dismissed'`; invalid ignored), `category` (one of the four categories; invalid ignored), `perPage` (default 20, clamped to 1–100), `page` (default 0, clamped ≥ 0) — NaN-safe clamping at bugReports.js:104-105.
- **Response:** `200 {reports, totalCount, openCount}` — sorted `createdAt` desc; each report enriched with `reporterUsername` (batched lookup of `reporterUid`s against `usernames`; `null` for anonymous or unresolvable uids). `openCount` always counts `status:'open'` regardless of filter. Other statuses: `401`, `403`.
- **Client:** `src/api/bugReports.ts` → `listBugReports()` — used by `src/pages/Admin/BugReports/BugReports.tsx:54` (admin bug-report queue).

### PATCH /api/admin/bug-reports/bulk
- **Handler:** `server/routes/bugReports.js:139` (declared before `/:id`)
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** body: identical validation to reports/bulk — `status` in `'resolved' | 'dismissed'` (else `400`), `ids` non-empty array (else `400`), max 100 (else `400 {error: 'Cannot update more than 100 reports at once'}`), invalid ObjectIds filtered, none valid → `400 {error: 'No valid report ids'}`
- **Response:** `200 {updated: <modifiedCount>}`. Other statuses: `400`, `401`, `403`.
- **Client:** `src/api/bugReports.ts` → `bulkResolve()` — used by `src/pages/Admin/BugReports/BugReports.tsx:108`.
- **Notes:** Only OPEN reports updated; same single-timestamp stamp-then-re-read pattern as reports/bulk so concurrent closes by another admin never enter this actor's audit trail; one `bugReport.resolve`/`bugReport.dismiss` audit entry per closed report (`metadata: {category, bulk: true}`). No emails and no side effects beyond the audit log.

### PATCH /api/admin/bug-reports/:id
- **Handler:** `server/routes/bugReports.js:185`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** params: `id` (ObjectId; invalid → `404 {error: 'Bug report not found'}`). Body: `status` (required, `'resolved' | 'dismissed'` — else `400`)
- **Response:** `200` the full updated doc. Other statuses:
  - `409 {error: 'Bug report is already closed'}` — id exists but is not `status:'open'` (the update filters on open; a follow-up existence check distinguishes closed from missing, bugReports.js:204-211)
  - `404 {error: 'Bug report not found'}` — invalid or nonexistent id
  - `400`, `401`, `403`
- **Client:** `src/api/bugReports.ts` → `resolveBugReport()` — used by `src/pages/Admin/BugReports/BugReports.tsx:119`.
- **Notes:** Writes one `bugReport.resolve`/`bugReport.dismiss` audit entry. The open-only guard prevents overwriting another admin's `resolvedBy`/`resolvedAt` or double audit entries — a protection the content-reports `PATCH /reports/:id` does not have.

#### DRIFT — reports/bug-reports

- **`listReports` param type omits `'user'` targetType** — `src/api/reports.ts:30` types the filter as `targetType?: 'recipe' | 'review'`, but the server accepts `'user'` (reports.js:184 checks against `TARGET_TYPES` which includes it) and `ReportTargetType` in `src/types.ts:246` is the full three-value union. Cosmetic today (Reports.tsx never passes `targetType`), but an admin-side user-report filter can't be typed through the current client signature.
- **`createReport` return type overstates the 201 body** — the client returns `ReportType` (`src/api/reports.ts:21-25`), whose `reporterUid`/`details`/`status` fields are fine, but the server's 201 deliberately strips `reportedUid` (reports.js:171) while the single-PATCH 200 includes it; `ReportType` in `src/types.ts` doesn't declare `reportedUid` at all, so the admin queue and resolve responses carry an undeclared field. Harmless (extra field), noted for shape accuracy.
- **`resolveBugReport` 409 is not specially handled** — the server can return `409 'Bug report is already closed'` (bugReports.js:209) so the client can refresh, but `src/pages/Admin/BugReports/BugReports.tsx` treats it as a generic mutation error (no code-based branch); contrast with `ALREADY_REPORTED_CODE` handling in ReportControl. Also the 409 body has no `code` field, only `error` text, so there's nothing machine-readable to branch on.
- ~~**GET /api/reports pagination is unclamped while its bug-reports twin clamps**~~ **[fixed in [#289](https://github.com/jclind/prepify/pull/289), Wave 10 · V2]** — non-numeric `page`/`perPage` on `/api/reports` used to produce NaN skip/limit and a 500 from the Mongo cursor; the route now coerces, floors, and caps both the same way `/api/admin/bug-reports` does (reports.js:198-201).
- ~~**Rate-limit response shapes differ between the two submit endpoints**~~ **[fixed]** — `POST /api/reports` 429s with the `makeUserLimiter` JSON (`{error, code: 'RATE_LIMITED'}`); `POST /api/bug-reports` used to 429 with express-rate-limit's default plain-text body (no `message` set). `submitLimiter` now sets a matching `message: {error, code: 'RATE_LIMITED'}` (bugReports.js), so every 429 across the API carries the same JSON shape. Window/limit/skip behavior is unchanged.
## Admin

The six routes below (`server/routes/admin.js`) are the admin console's user-moderation, audit, analytics, and ingredient-telemetry surface. Admin identity is the `admin` custom claim on the Firebase ID token — `verifyToken` decodes it into `req.isAdmin` and `requireAdmin` gates on that flag; there is no database role lookup. There is also no central user record: the roster is derived from the `usernames` collection (`_id` = uid), left-joined against the `users` status collection and per-user activity counts (`enrichUsers`, server/routes/admin.js:88). The other `/admin/*` routes — recipes moderation (`/admin/recipes/*` incl. feature/publish/approve), reviews moderation (`/admin/reviews/*`), reports (`/admin/reports`), and bug reports (`/admin/bug-reports`) — are documented in their own resource sections, as are the `src/api/admin.ts` methods that call them (`setRecipeFeatured`, `setRecipePublished`, `approveRecipe`).

### GET /api/admin/users
- **Handler:** `server/routes/admin.js:166`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Query params, all optional:
  - `query` (string, trimmed, default `''`) — if it contains `@`, treated as an email and resolved via Firebase `getUserByEmail`; otherwise matched as a case-insensitive username **prefix** (regex-escaped, against `username_lower`) OR an exact uid (`_id`). Empty query lists all users.
  - `page` (int, default 1, floored to 1)
  - `perPage` (int, default 25, capped at 50; no lower bound is enforced)
- **Response:**
  - `200` `{ users: AdminUserType[], totalCount: number }`. Each user: `{ uid, username: string|null, status: 'active'|'suspended'|'banned' (default 'active'), statusReason: string|null, statusUpdatedAt: Date|null, statusUpdatedBy: string|null, counts: { recipes, reviews, openReports } }`. `reviews` counts only written reviews (non-empty `reviewText`), not bare star ratings (line 99–104). `openReports` tallies open reports targeting the user's reviews (by username) plus reports on recipes they authored (line 123–142). The email branch additionally returns `email` on the single user and hard-codes `totalCount: 1`, ignoring pagination (line 185).
  - Email branch: any Firebase lookup failure (including "no such email") returns `200 {users: [], totalCount: 0}` — never an error status (line 186–188).
  - `401` (verifyToken), `403 {error:'Admin access required'}` (requireAdmin).
- **Client:** `src/api/admin.ts` → `searchUsers(params?)` — used by `src/pages/Admin/Users/Users.tsx:104` (react-query, `perPage: PER_PAGE`).

### GET /api/admin/users/:uid
- **Handler:** `server/routes/admin.js:214`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Path param `uid` (string). No query/body. No validation of `uid` existence.
- **Response:**
  - `200` — enriched user (same shape as the list route) plus `email: string|null`, `recentRecipes` (up to 5, projection `{title, recipeImage, status}`), `recentReviews` (up to 5 full `ratings` docs, `[]` if the user has no username). A nonexistent uid still returns `200` with a synthesized profile (`username: null`, status `'active'`, zero counts, `email: null`) — there is no 404 path (line 217–221). Firebase email lookup failure is swallowed; detail renders with `email: null` (line 228–230).
  - `401` / `403` as above.
- **Client:** `src/api/admin.ts` → `getUser(uid)` — **No client caller** (no call sites found under `src/pages` or `src/Components`; only defined in the API class).
- **Notes:** `recentRecipes`/`recentReviews` apply `.limit(5)` with **no sort**, so "recent" is actually natural collection order, not newest-first (line 232–244).

### PATCH /api/admin/users/:uid/status
- **Handler:** `server/routes/admin.js:254`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Path param `uid`; JSON body `{ status, reason? }`.
  - `status` must be one of `'active' | 'suspended' | 'banned'` (`USER_STATUSES`, server/util/userStatus.js) — else `400 {error: 'status must be one of: active, suspended, banned'}`.
  - `reason` optional string, max 500 chars — else `400 {error: 'reason must be at most 500 characters'}`.
  - `uid === req.uid` → `400 {error: 'You cannot change your own status.'}` (self-moderation guard).
  - Target holds the `admin` custom claim → `403 {error: 'Cannot change the status of another admin.'}`.
  - Firebase `getUser(uid)` failure (nonexistent or lookup error) → `404 {error: 'User not found'}`.
- **Response:**
  - `200` `{ uid, status }`.
  - `400` / `403` / `404` as above; `401`/`403` from middleware.
- **Client:** `src/api/admin.ts` → `setUserStatus(uid, status, reason?)` — used by `src/pages/Admin/Users/Users.tsx:109` (mutation).
- **Notes:** Upserts the `users` doc (`status`, `statusReason` — nulled when status is `'active'`, `statusUpdatedBy: req.uid`, `statusUpdatedAt`); this doc is the single source of truth read by `requireActive` write-gating. Writes an audit-log row (`user.suspend` / `user.ban` / `user.activate`, target labeled `@username` when known). Fires a background email to the affected user on suspend/ban only — activation is silent, and per `server/util/email.js:315` the email is also skipped when email isn't configured. `banned` is a soft DB flag enforced identically to `suspended` (writes blocked, login/reads still work); it does not touch Firebase Auth's `disabled` flag (server/util/userStatus.js).

### GET /api/admin/audit
- **Handler:** `server/routes/admin.js:319`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Query params, all optional:
  - `action` — kept only if it's in `AUDIT_ACTIONS` (server/util/auditLog.js; 19 values, e.g. `recipe.hide`, `user.ban`, `recipe.autohold`, `content.blocked`); unknown values are silently ignored (no error), yielding an unfiltered list.
  - `targetType` — kept only if in `AUDIT_TARGET_TYPES` (`recipe|review|user|report|bugReport`); likewise silently ignored otherwise.
  - `actorUid` (any non-empty string, exact match)
  - `page` (default 1, floored to 1), `perPage` (default 25, capped 50)
- **Response:**
  - `200` `{ entries: AuditEntryType[], totalCount }`, sorted `createdAt` desc. Each entry is the raw `auditLog` doc plus `actorUsername`: batch-resolved from the live `usernames` collection, falling back to the username captured on the row at action time (survives self-service account deletion), else `null` (server/routes/admin.js:34–44).
  - `401` / `403` from middleware.
- **Client:** `src/api/admin.ts` → `listAudit(params?)` — used by `src/pages/Admin/Audit/Audit.tsx:52`.

### GET /api/admin/analytics
- **Handler:** `server/routes/admin.js:357`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Query param `days` (int, default 30, clamped to [7, 90] — out-of-range values are clamped, never rejected).
- **Response:**
  - `200`:
    ```
    {
      days,                      // the clamped value actually used
      totals: {
        users,                   // count of `usernames` docs
        recipes: { total, active, hidden, unpublished, featured },
        reviews,                 // written reviews only (non-empty reviewText)
        reports: { open, resolved, dismissed },
        moderation: { autoHeld, autoBlocked, autoFlagsDismissed }  // all-time automod tallies
      },
      reportsOverTime: [{ date: 'YYYY-MM-DD', count }],  // exactly `days` buckets,
      recipesOverTime: [...],                            // zero-filled, UTC days,
      usersOverTime: [...],                              // oldest first, incl. today
      recentActions: AuditEntryType[]                    // 10 newest, actor-enriched
    }
    ```
  - `401` / `403` from middleware.
- **Client:** `src/api/admin.ts` → `getAnalytics(params?)` — used by `src/pages/Admin/Analytics/Analytics.tsx:47` (refetches on day-range toggle).
- **Notes:** Recipes with no `status` field are counted as legacy `'active'` (line 384–389). `usersOverTime` is incomplete history: `usernames.createdAt` only exists for accounts created after the field was introduced, so older signups are absent from the series (comment at line 353–356); recipe/report series are fully historical. `autoFlagsDismissed` counts automod reports an admin dismissed — dismissal does not restore a held recipe (line 407–410).

### GET /api/admin/ingredients
- **Handler:** `server/routes/admin.js:468`
- **Middleware:** `verifyToken` → `requireAdmin` → `asyncHandler`
- **Request:** Query params, all optional:
  - `type` — kept only if `'miss'` or `'price_outlier'`; anything else silently ignored (lists both kinds).
  - `page` (default 1, floored to 1), `perPage` (default 25, capped 50)
- **Response:**
  - `200` `{ items, totalCount }` — raw `ingredientMisses` docs sorted `count` desc, then `lastSeen` desc. Read-only telemetry written best-effort by `POST /api/ingredients/parse`: `miss` = no Spoonacular match, `price_outlier` = implausible enriched per-row price.
  - `401` / `403` from middleware.
- **Client:** `src/api/admin.ts` → `listIngredientMisses(params?)` — used by `src/pages/Admin/Ingredients/Ingredients.tsx:37`.

#### DRIFT — admin

- **`AdminAPI.getUser` is dead client code.** `src/api/admin.ts:31` defines it, but no page, component, or test calls it — the Users page renders detail from the list payload instead. Not a contract break, but the method (and `GET /api/admin/users/:uid`) is currently unexercised by the client.
- **`AdminUserDetailType.recentReviews` is narrower than the server payload.** `src/types.ts:390` types entries as `{ recipeId, rating?, reviewText? }`, but the server returns full unprojected `ratings` docs (`server/routes/admin.js:239–243` has no projection) — extra fields (`_id`, `username`, dates, vote data) arrive untyped. Benign today since the endpoint has no caller.
- Otherwise none found: `AuditAction`/`AuditTargetType`/`UserStatus`/`IngredientMissType` unions in `src/types.ts` exactly mirror the server's `AUDIT_ACTIONS` (all 19), `AUDIT_TARGET_TYPES`, `USER_STATUSES`, and `INGREDIENT_MISS_TYPES`; client param names, paths, and response shapes for the five called routes match the handlers, and the client comment that `days` clamps to 7–90 matches the server constants.
## Firebase Storage (client-side, non-HTTP)

Two flows bypass the API and talk to Firebase Storage directly with the client SDK; the server only
ever sees the resulting download URL:

- **Recipe images** — uploaded by `useRecipeForm` before `POST /api/addRecipe` / `PUT /api/editRecipe`;
  the URL travels as `recipeImage`. The server image-moderates the URL (fails closed) and best-effort
  deletes the object on recipe/account deletion (`server/util/firebaseStorage.js` — skipped when
  `FIREBASE_STORAGE_BUCKET` is unset).
- **Profile photos** — uploaded to `profilePhotos/{uid}` by `AuthContext.updateProfileData`; the URL is
  then submitted to `POST /api/updatePhoto`, which moderates it and writes it onto the Firebase Auth
  user server-side.
