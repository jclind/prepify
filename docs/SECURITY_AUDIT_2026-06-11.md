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

## 4. Open findings — status checklist

Initial fixes from §2 merged via PR #117. The low-conflict hardening batch
(items 1, 5, 6) was implemented 2026-06-11 in a follow-up PR. Items 2–4 are
**deliberately deferred** until the three feature worktrees
(recipes-page-refresh, account-page-redesign, admin-service) are merged — they
touch the same files those branches change (see §5).

1. [x] **No rate limiting anywhere** (*Medium*) — **DONE.**
   `express-rate-limit` added: a generous global per-IP backstop on `/api`
   (1000 req / 15 min, mounted after `/health` so health checks are never
   throttled) and a tight per-uid limit on `POST /api/ingredients/parse`
   (30/min — one parse per added ingredient, recipes cap at 50 ingredients).
   `trust proxy = 1` only in production (one platform proxy); never in dev,
   where `X-Forwarded-For` would be spoofable. Both limiters are skipped when
   `NODE_ENV=test` because supertest fires hundreds of requests from one IP in
   seconds — so the 429 path itself is intentionally untested by Jest. Cypress
   CI runs with limiters active and stays well under the global cap.
2. [ ] **500 handlers echo `err.message` to clients** (*Low–Medium*, info
   disclosure) — **DEFERRED, see §5.** Every route's catch block returns the
   raw message, which for infrastructure failures can include internal
   hostnames (e.g. Mongo `connect ECONNREFUSED <host>`). Needs a shared error
   responder that logs the real error and returns a generic message. Touches
   every route file and some test expectations — maximal conflict with the
   worktree backlog, so it must go last.
3. [ ] **`GET /getReviews` `isCurrentUser` derived from a query param**
   (*Low*, carried over from old audit) — **DEFERRED, see §5.** Anyone can
   pass `?username=victim` and get `isCurrentUser: true` flags. UI-hint spoof
   only (server-side edits remain protected); should derive from the token
   when an `Authorization` header is present. Lives in `reviews.js`, which the
   admin worktree's soft-hide moderation also changes.
4. [ ] **`reviewText` has no length bound** (*Low*) — **DEFERRED, see §5.**
   Recipe fields are bounded; reviews are not. Add a max length in
   `newReview`/`editReview` mirroring `DESCRIPTION_MAX_LENGTH` (2000). Same
   `reviews.js` conflict as item 3.
5. [x] **Unbounded `recipesPerPage`/`reviewsPerPage`** (*Low*) — **DONE.**
   All five paginated handlers (`GET /recipes`, `getReviews`,
   `getSingleUserReviews`, `getCreatedRecipes`, `getSavedRecipes`) clamp the
   page size to `MAX_PER_PAGE = 50` and coerce NaN page/size to defaults.
   Regression tests in `security.test.js` ("pagination caps").
6. [x] **No security headers** (*Low*) — **DONE.** `helmet()` with defaults on
   every response.
7. [x] **`verifyToken` doesn't pass `checkRevoked`** (*Info*) — **ACCEPTED
   AS-IS.** Revoked/disabled users keep access until their ID token expires
   (≤1 h). Standard tradeoff: `checkRevoked` costs a network round-trip per
   request. Revisit only if account-ban semantics demand instant lockout.
8. [ ] **`newReview` upsert can create a doc without `rating` fields**
   (*Info*, data integrity, carried over) — **DEFERRED, see §5.** A review
   posted before any rating yields a ratings doc lacking
   `rating`/`ratingLastUpdated`. Normalize during the same `reviews.js` pass
   as items 3–4.

---

## 5. Deferred follow-up — runbook for after the worktree merges

**Preconditions:** the three worktree branches (recipes-page-refresh,
account-page-redesign incl. its P6 teardown, admin-service) are merged into
`development`, and CI is green. Do **not** start this while any of them is
still open — items below edit `reviews.js` and every route's catch blocks,
which those branches also touch.

Ready-to-run prompt for a fresh session:

> Work through §5 of docs/SECURITY_AUDIT_2026-06-11.md on a new branch off
> development. Check items off in §4 as you complete them, run the server
> suite after each step, and open a PR.

Steps, in order:

1. **`reviews.js` pass** (items 3, 4, 8 — one commit):
   - `getReviews`: when an `Authorization` header is present, verify it and
     derive `isCurrentUser` by resolving `req.uid → usernames` collection;
     ignore the `username` query param for that flag (it can stay for other
     uses). Keep the route anonymous-friendly: a missing/invalid header just
     means `isCurrentUser: false` everywhere.
   - `newReview`/`editReview`: reject `reviewText`/`text` longer than 2000
     chars (mirror `DESCRIPTION_MAX_LENGTH` from `util/recipeLimits.js` —
     import it, don't duplicate the constant).
   - `newReview` upsert: on insert (`$setOnInsert`), default `rating: null`
     and `ratingLastUpdated: ''` so no ratings doc ever lacks those keys; make
     sure `addRating`'s averaging skips `rating: null` docs instead of
     `parseFloat(null) → NaN`.
   - Mind the merged admin soft-hide changes in this file: hidden-review
     filtering must keep working; extend the existing tests rather than
     replacing them.
2. **Generic 500 responder** (item 2 — separate commit, largest diff):
   - Add `server/util/respondServerError.js` (or similar): logs the real
     error with route context via `console.error`, responds
     `500 { error: 'Internal server error' }`.
   - Replace every `res.status(500).json({ error: err.message })` across
     `server/routes/*.js` (including any new admin/profile routes from the
     merged worktrees — they were written before this rule).
   - Keep 4xx validation messages as-is; only 500s change. Update any Jest
     assertions that matched specific 500 messages.
   - Exception: `ingredients.js` already logs rich context on purpose
     (Phase A debugging) — keep its logging, change only the response body.
3. **Re-audit the merged admin surface** (new since this audit): every
   `/admin` route must chain `verifyToken` + the admin-claims check
   (`requireAdmin`); verify report/moderation endpoints validate ids as
   strings (the injection patterns from §2 — new code may not have inherited
   them), and add those routes to the regression suite in
   `security.test.js`.
4. Update §4 checkboxes + this section, run `npm test` in `server/` (and the
   frontend suite if `src/` was touched), open the PR.
