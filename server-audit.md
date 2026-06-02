# Prepify Error Handling & Auth Audit

---

### Backend Issues

| Route | Issue | Severity |
|-------|-------|----------|
| `POST /addRecipe` | `verifyToken` is present but `body.userId` is never checked against `req.uid` — any authenticated user can insert a recipe attributed to a different user | high |
| `DELETE /deleteRecipe` | `verifyToken` present but `userId` query param is never checked against `req.uid` — any authenticated user can delete anyone's recipe | high |
| `PUT /editReview` | Takes `username` from query param and edits that user's review with no ownership check — any authenticated user can edit any review | high |
| `PUT /addRating` | Takes `username` from query param with no check against token — any authenticated user can submit a rating under any username | high |
| `POST /addRecipeTag` | `verifyToken` TODO was never wired in — the route is completely unprotected despite the comment | high |
| `GET /getSavedRecipes` (users.js) | **Dead route.** `recipes.js` is mounted first in `index.js`; the users.js version with `dateSaved` sorting is never reached. The `order` param is silently ignored | high |
| `PUT /addRating` | `rating` is accepted as any string; `parseFloat` of a non-numeric value returns `NaN`, which would corrupt `rateValue` on the recipe document | medium |
| `PUT /saveRecipe` | No duplicate check — the same `recipeId` can be pushed into `savedRecipes` multiple times, causing double-counting on `numTimesSaved` | medium |
| `PUT /unsaveRecipe` | `numTimesSaved` can go negative if called more times than save, or if the recipe was saved before this counter was introduced | medium |
| `GET /getReviews` | `isCurrentUser` is derived from the `username` query param, not from the auth token — any unauthenticated caller can pass any username and get `isCurrentUser: true` on someone else's reviews | medium |
| `PUT /newReview` | Upsert uses `$set` only; if the document is newly created by `newReview` without a prior `addRating`, the inserted doc has no `rating` or `ratingLastUpdated` field | medium |
| `GET /recipes` | `q` and `cuisine` query params are passed directly into MongoDB `$regex` without escaping — malformed regex strings (e.g. `[`) will throw and return a 500 | medium |
| `GET /searchAutoCompleteRecipes` | Same raw-regex issue as above on the `title` param | medium |
| `DELETE /deleteRecipe` | Returns `{ deleted: true }` even when `recipeId` doesn't match any document (`deleteOne` result is not checked) | low |
| `PUT /deleteReview` | Clears review text even if no matching rating document exists — silent no-op with no indication to caller | low |
| `GET /getSingleUserReviews` | When `returnRecipeData=true`, a deleted recipe returns `recipeData: null` with no signal to the caller | low |

---

### Frontend Issues

| Method | Issue | Severity |
|--------|-------|----------|
| `http-common.ts` (all methods) | No axios interceptor attaches an `Authorization: Bearer <token>` header — every `verifyToken`-protected route will receive a 401 at runtime | high |
| `deleteRecipe` | No try/catch; a 401 (or any error) propagates as an unhandled rejection to the call site | high |
| `addRating` | No try/catch; returns raw axios response, not `.data`. A 401 would crash the caller | high |
| `newReview` | No try/catch; a 401 or network error propagates uncaught | high |
| `saveRecipe` | Returns raw axios response object, not `.data`. No try/catch | medium |
| `unsaveRecipe` | Returns raw axios response, not `.data`. No try/catch | medium |
| `madeRecipe` | Guards with `if (!userId) return` but returns `undefined` silently — caller cannot distinguish "not logged in" from a successful call | medium |
| `checkMadeRecipe` | Same silent-undefined pattern as `madeRecipe` | medium |
| `getReviews` | `getUsername()` can resolve to `null` (unauthenticated); sends `username=null` as a string to the server. No try/catch | medium |
| `search` | Returns the raw axios response object, not `.data`. Return type annotation `Promise<RecipeDBResponseType[]>` is wrong | medium |
| `getAllRecipes` | Tags build logic double-appends the last tag: `tagsArrParam += tag + ","` then `+= tag` again in the final-index branch — last tag is always sent twice | medium |
| `addRecipe` | Catch block returns `null` with a `// !CATCH ERROR` comment and `console.log` — caller gets `null` with no way to show the user what went wrong. Multiple debug `console.log` calls left in production path | medium |
| `searchRecipeTags` | Builds `selectedTags` with a trailing comma on every tag (no trim at end) — backend splits correctly but it's fragile | low |
| `getUsername` (auth.ts) | If user is not logged in, `uid` is `null`; calls `GET getUsername?userId=null` rather than returning early | low |
| `addRecipeTag` | No try/catch; returns raw axios response | low |
| `getSavedRecipes` | No try/catch; returns `null` silently when `uid` is absent | low |

---

### Quick Wins

Ordered by impact:

1. **Add an axios auth interceptor in `src/api/http-common.ts`** — without this, every `verifyToken` route returns 401 and the whole auth system is inert. Add a request interceptor that calls `auth.currentUser?.getIdToken()` and sets `Authorization: Bearer <token>` before each request. This one change unblocks all the auth-protected routes.

2. **Wire `verifyToken` onto `POST /addRecipeTag` in `server/routes/tags.js`** — change `router.post('/addRecipeTag', async` to `router.post('/addRecipeTag', verifyToken, async`. One-line fix; currently any anonymous caller can pollute the tags collection.

3. **Fix the IDOR holes on write routes** — in `POST /addRecipe` add `if (body.userId !== req.uid) return res.status(403).json(...)`, and in `DELETE /deleteRecipe` add `if (userId !== req.uid) return res.status(403).json(...)`. Same pattern for `PUT /saveRecipe` / `unsaveRecipe` / `madeRecipe`. Without this, `verifyToken` only proves someone is *a* valid user, not that they're the *right* user.

4. **Fix ownership on `PUT /addRating` and `PUT /editReview`** — instead of accepting `username` from the query string, look it up from `req.uid` via the `usernames` collection (same pattern already used in `PUT /newReview` and `PUT /deleteReview`). This prevents any authenticated user from rating or editing as someone else.

5. **Fix the dead `GET /getSavedRecipes` route** — remove the `getSavedRecipes` handler from `recipes.js` (it has no sorting logic anyway) so that the users.js version with `dateSaved` sorting is actually reachable. Currently the `order` param is silently accepted and ignored by the wrong handler.
