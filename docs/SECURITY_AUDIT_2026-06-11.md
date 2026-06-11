# Security & Auth Audit — 2026-06-11

Full-codebase pass over the Express server (`server/`): per-route auth middleware
coverage, ownership checks, CORS, rate limiting, input validation on the
recipe/review endpoints, and Firebase token handling on both sides. Cross-checked
against the older `docs/server-audit.md` for regressions. Branch: `development`.

Regression tests for everything fixed here live in
`server/__tests__/security.test.js`.

---

## 1. Cross-check vs. docs/server-audit.md — no regressions

Every **high** item in the old audit is resolved in the current code:

| Old finding | Status today |
|---|---|
| `addRecipe` trusts client `userId` | Fixed — server stamps `_id`, `userId`, and counters; client values discarded (`recipes.js`) |
| `deleteRecipe` no ownership check | Fixed — fetch + `recipe.userId !== uid → 403`, deletion runs in a transaction |
| `editReview` / `addRating` take `username` from query | Fixed — username is always looked up from `req.uid` via the `usernames` collection |
| Unprotected `addRecipeTag` | Route no longer exists |
| Dead `getSavedRecipes` shadowed route | Fixed — single implementation in `users.js`, mounted once |
| Raw `$regex` from `q`/`cuisine`/`title` | Fixed — `escapeRegex()` applied everywhere |
| Duplicate save / negative `numTimesSaved` | Fixed — already-saved 409 check; decrement clamped with `$max … 0` pipeline |
| No axios auth interceptor | Fixed — `src/api/http-common.ts` attaches a fresh Firebase ID token per request |

Still present from the old audit (carried forward below): `getReviews`
`isCurrentUser` spoofing (§4.3) and the `newReview` upsert creating a
rating-less doc (§4.8).

`docs/server-audit.md` should now be treated as historical.

---

## 2. Findings fixed in this audit

### 2.1 NoSQL operator injection via query strings — **High** — FIXED

Express 4's default `extended` query parser turns `?recipeId[$ne]=x` into the
object `{ $ne: 'x' }`, which several routes passed straight into MongoDB
filters. Worst concrete case: `POST /api/addRating?recipeId[$gt]=&rating=1` —
the ratings aggregation and the final `recipes.updateOne(recipeIdQuery(recipeId))`
both ran with an operator filter, letting **any authenticated user overwrite an
arbitrary recipe's stored rating** (integrity corruption). Lesser variants hit
`getRecipe` (view-count pollution on an attacker-chosen doc) and `madeRecipe`.

Fixes applied:
- `app.set('query parser', 'simple')` in `server/app.js` — query values are now
  always strings (or string arrays for repeated keys); bracket notation can no
  longer produce operator objects anywhere.
- `recipeIdQuery()` / `recipeIdInQuery()` (`server/util/recipeIdQuery.js`) now
  return a match-nothing filter for any non-string id — a single choke point
  covering every recipes-collection lookup, including repeated-key arrays.
- `addRating` requires `recipeId` and `rating` to be strings.

### 2.2 NoSQL operator injection via JSON body — **Medium** — FIXED

`POST /newReview` read `recipeId`/`reviewText` from the JSON body, where the
client fully controls types: `{ "recipeId": { "$ne": "" }, … }` reached the
`ratings` upsert filter. Scope was limited to the caller's own username but
could create malformed rating docs. Now both fields must be strings; same check
added to `editReview`'s `text`.

### 2.3 Non-string query params throwing unhandled 500s — **Low** — FIXED

Repeated keys (`?q=a&q=b`) produced arrays that crashed `escapeRegex`,
`username.toLowerCase()`, etc., returning 500s with internal error messages.
`GET /recipes`, `searchAutoCompleteRecipes`, and `checkUsernameAvailability`
now type-check before use.

---

## 3. Verified sound (no action)

- **Auth coverage**: every write route and every user-scoped read carries
  `verifyToken`. Public routes are read-only, intentionally anonymous browse/
  review-display endpoints (`GET /recipes`, `searchAutoCompleteRecipes`,
  `getTrendingRecipes`, `getRecipe`, `getReviews`, `getSingleUserReviews`,
  `checkUsernameAvailability`, `/health`).
- **Ownership**: `editRecipe`/`deleteRecipe` and all four owner-scoped draft
  routes check `doc.userId !== req.uid → 403` after fetch (404 before 403, no
  existence oracle for drafts). Reviews/ratings are keyed off the
  server-resolved username, never a client-supplied one.
- **Mass assignment**: recipe edits and drafts whitelist fields via
  `EDITABLE_RECIPE_FIELDS` / `RECIPE_CONTENT_FIELDS` (`util/recipeFields.js`);
  `addRecipe` stamps `_id`/`userId`/counters server-side. Counters, ratings,
  and ownership are not client-writable.
- **CORS** (`app.js`): exact-match allowlist from `FRONTEND_URLS`, a pinned
  Netlify deploy-preview regex, and a localhost:3000–3010 pattern that is
  disabled when `NODE_ENV=production`. No wildcard, no origin reflection.
- **Firebase token handling**: server verifies ID tokens with the Admin SDK and
  trusts only `decoded.uid`; service account comes from env. Client interceptor
  calls `user.getIdToken()` per request (SDK handles refresh). The Cypress
  `__cy_signIn__` hook is compiled in only when `VITE_CYPRESS=true` at build
  time and still requires a valid Firebase custom token.
- **Input bounds on recipes/drafts**: title/description/instruction lengths and
  ingredient/instruction counts enforced server-side (`util/recipeLimits.js`);
  rating clamped to 1–5 with NaN check; username validated server-side with a
  unique index closing the set-username race.
- **Storage deletion** (`util/firebaseStorage.js`): URL parsed with a strict
  pattern; non-Firebase URLs are ignored, errors never fail the request.
- **Admin claims**: not applicable on `development` — no admin routes exist on
  this branch. The admin/reports system lives on the unmerged
  `worktree-feat+admin-service` branch; its `requireAdmin` claims middleware
  must be audited when that branch is merged.

---

## 4. Open findings — recommendations (not applied)

Ordered by priority. None applied because each needs a product/design decision
or has broad test impact.

1. **No rate limiting anywhere** (*Medium*). Highest-value targets:
   `POST /api/ingredients/parse` (each call spends paid Spoonacular quota with
   attacker-chosen input; auth required but any signed-up user qualifies), and
   the write endpoints (`addRecipe`, `newReview`, `setUsername`). Recommend
   `express-rate-limit` with a tight per-uid limit on `/api/ingredients/parse`
   and a generous global default. Decide thresholds first; Cypress E2E and the
   autosaving drafts client must stay under them.
2. **500 handlers echo `err.message` to clients** (*Low–Medium*, info
   disclosure). Every route's catch block returns the raw message, which for
   infrastructure failures can include internal hostnames (e.g. Mongo
   `connect ECONNREFUSED <host>`). Recommend a shared error responder that logs
   the real error and returns a generic message. Touches every route and some
   test expectations, so left for a focused PR.
3. **`GET /getReviews` `isCurrentUser` derived from a query param** (*Low*,
   carried over from old audit). Anyone can pass `?username=victim` and get
   `isCurrentUser: true` flags. Server-side edits remain protected, so this is
   a UI-hint spoof only — but it should derive from the token when an
   `Authorization` header is present.
4. **`reviewText` has no length bound** (*Low*). Recipe fields are bounded;
   reviews are not. Add a max length in `newReview`/`editReview` mirroring
   `DESCRIPTION_MAX_LENGTH`.
5. **Unbounded `recipesPerPage`/`reviewsPerPage`** (*Low*). A single request
   can dump an entire collection. Cap like `getTrendingRecipes` does
   (`Math.min(parsed, N)`).
6. **No security headers** (*Low*). API-only server, so impact is limited, but
   `helmet` is a one-liner worth adding alongside the rate-limit PR.
7. **`verifyToken` doesn't pass `checkRevoked`** (*Info*). Revoked/disabled
   users keep access until their ID token expires (≤1 h). Standard tradeoff
   (checkRevoked costs a network call per request); acceptable as-is.
8. **`newReview` upsert can create a doc without `rating` fields** (*Info*,
   data integrity, carried over). A review posted before any rating yields a
   ratings doc lacking `rating`/`ratingLastUpdated`; `addRating`'s averaging
   then `parseFloat(undefined) → NaN`-guards only via the insert path. Worth
   normalizing when reviews get their next pass.
