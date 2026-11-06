# Abuse and cost review: attacker with a free account

**Date:** 2026-11-05. **Base:** `development` at `f715151`. **Method:** static read only. Three read-only
reviewers split the server into cost/load, content integrity, and access/identity. I then re-read the code
behind every finding and marked it confirmed, plausible, or rejected. Nothing was run, no `.env` exists in
this checkout, and no dev or production service was contacted. Line numbers are as of `f715151`.

**Threat model.** One person with a script and free Firebase accounts. Accounts cost nothing: Firebase
email/password sign-up through the public Web API key, no email verification required anywhere on the
server (known M6). The only brake on account creation is Firebase's own per-IP sign-up quota.

**Already known, not re-filed.** The 2026-07-11 audit's M5 (view, self-save, `totalTime` ranking games),
M6 (reserved handles, look-alikes, `email_verified` gating), the bug-report half of M7, and L5 (create
idempotency) are still open and unchanged. Where a finding below builds on one of them, it says so.

## Summary

| # | Severity | Finding |
|---|---|---|
| 1 | Critical | Deleting a recipe deletes whatever Storage object its `recipeImage` URL names, in any bucket |
| 2 | High | Recipe-image moderation is skipped with an array value or an attacker-hosted URL |
| 3 | High | Display name and avatar moderation is skipped by writing to Firebase Auth directly |
| 4 | High | Cloud Vision spend on `/updatePhoto` and `/editRecipe` has no daily cap |
| 5 | High | The global daily quotas are a free off-switch, and they count requests before validation |
| 6 | Medium | Autocomplete runs Levenshtein on an uncapped query, blocking the event loop |
| 7 | Medium | Saved/made lists grow without limit, and every recipe delete scans all user docs |
| 8 | Medium | Several displayed recipe fields are never moderated or length-capped |
| 9 | Medium | A taken-down review can be deleted and posted again |
| 10 | Medium | A released handle can be squatted, and the old owner's recipes then credit the squatter |
| 11 | Medium | A private profile does not hide the user's review history |
| 12 | Medium | Sybil saves and "made" marks survive account deletion |
| 13 | Medium | Recipe-image uploads are unlimited and never reaped |
| 14 | Low-medium | Every anonymous bug report sends an unthrottled email |
| 15 | Low | `deleteAccount` has no server-side recent-login or revocation check |
| 16 | Low | Admin moderator uids reach review authors through two endpoints |
| 17 | Low | The moderation blocklist misses words split by a separator |
| 18 | Low | One 5-star rating gives a recipe the top average |
| 19 | Low | Reports can be filed against recipe ids that don't exist |

Fix order I'd suggest: 1 first (permanent data loss for other users, one free account), then 2 and 3
(explicit images and names on the home page), then 4 and 5 (money and availability). Findings 1, 2 and 4
share one fix: accept `recipeImage` and `photoURL` only as strings pointing at this project's bucket under
the caller's own uid prefix.

---

## Confirmed

### 1. Critical: any object in any bucket can be deleted through `deleteRecipe`

- **Where:** `server/util/firebaseStorage.js:8-13` (`parseStorageUrl` takes bucket and path from any
  `/b/<bucket>/o/<path>` match) and `:18-23` (`deleteRecipeImage` deletes it with the Admin SDK, which
  ignores `storage.rules`). Called from `server/routes/recipes.js:774` (`DELETE /deleteRecipe`) and
  `server/routes/auth.js:554` (`POST /deleteAccount`). `recipeImage` is client-supplied
  (`server/util/recipeFields.js:27`) and `validateRecipeBounds` never looks at it.
- **Request sequence:**
  1. Read a victim's image URL from `GET /api/recipes` (cards include `recipeImage`). Avatars are at the
     predictable path `profilePhotos/<uid>`, so a hand-built
     `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/profilePhotos%2F<uid>` works too.
  2. `POST /api/addRecipe` (Bearer token, minimal valid body) with `"recipeImage": "<victim URL>"`. Vision
     scans the victim's real food photo and returns clean, so the recipe saves. A scan failure only holds
     it as `pending_review`; it still saves.
  3. `DELETE /api/deleteRecipe?recipeId=<new id>`. The owner check passes and the server deletes the
     victim's object.
- **Scale:** 50 creates per account per day (`recipes.js:532`), or reuse one recipe: `PUT /editRecipe`
  to point it at the next victim, then delete. One `POST /deleteAccount` deletes the images of every
  recipe the account owns in a loop (`auth.js:553-555`). A script can walk the whole browse catalog.
- **Impact:** other users' recipe photos and avatars are gone for good unless the bucket has soft-delete or
  versioning on. The service account can reach every bucket in the project, and
  `server/scripts/migrateRecipeImagesToUid.js:15-17` says the catalog already spans more than one.
- **Fix (not applied):** in `deleteRecipeImage`, refuse unless the bucket equals the configured bucket and
  the path matches `^recipeImages/<recipe.userId>/[^/]+$`. Validate the same shape at write time on create
  and edit (see the shared fix above). Confirm soft-delete is on for the prod bucket.

### 2. High: recipe-image moderation skipped two ways

- **Where:** `server/util/imageModeration.js:147` returns a clean `'empty'` verdict for any non-string.
  `recipes.js:586` (create) and `:687-692` (edit) pass `body.recipeImage` straight in. Nothing checks its
  type or host. It renders as `<img src>` in `RecipeCard.tsx:122`, `HomeRecipeCard.tsx:20`,
  `SingleRecipe.tsx:346`, `PublicProfile.tsx:380` and `SearchRecipesInput.tsx:310`.
- **(a) Array value:** `POST /api/addRecipe` with clean text and `"recipeImage": ["https://attacker.example/x.jpg"]`.
  Vision is never called, the verdict is clean, the recipe is `active`. React stringifies a one-element
  array to its URL in `src`. I'm confident about the server half; the render half follows from how React
  sets attributes but I didn't run it. Side effect: when `VITE_IMAGE_VARIANTS_ENABLED` is turned on,
  `recipeImageVariantUrl` calls `url.match` on the array and throws during render.
- **(b) External URL:** `recipeImage` can be any https URL. The attacker's server returns a clean image to
  Vision's single fetch, then serves something else. No later read re-scans, and text-only edits skip the
  image (`recipes.js:687`).
- **Impact:** explicit images on Home, Trending and Browse from one account and one request, with nothing
  in the admin queue. An external host also logs the IP and user agent of every visitor who loads a card.
- **Fix:** 400 unless `typeof recipeImage === 'string'` and it matches this bucket's
  `recipeImages%2F<uid>%2F` download URL. Make `moderateImage` treat a non-string as a scan failure, not as
  empty.

### 3. High: display name and avatar moderation bypassed through Firebase Auth

- **Where:** `server/routes/auth.js:272` (`/updatePhoto`) and `:302` (`/updateDisplayName`) are the
  moderation hooks. The public values come from the Auth record: `server/util/authorIdentity.js:34-69`,
  `server/routes/publicProfile.js:41-42,104-105`, `server/routes/reviews.js:359-360`.
- **Problem:** Firebase lets any signed-in user change their own `displayName` and `photoUrl` without our
  server. `docs/CONTENT_MODERATION.md:590` records the display-name gap as fixed, but the fix only changed
  our client. Firebase has no project setting that turns this off.
- **Request sequence:** one call,
  `POST https://identitytoolkit.googleapis.com/v1/accounts:update?key=<public VITE_FIREBASE_API_KEY>` with
  `{ "idToken": "<token>", "displayName": "<slur or Prepify Support>", "photoUrl": "https://attacker.example/x.jpg" }`.
- **Impact:** unscanned name and picture on every review the account writes, on its recipe pages
  (`withAuthorPhoto`, `recipes.js:452-458`), and on `/u/:username`. No audit row. Staff impersonation is
  easy. Separately, `/updatePhoto` itself accepts any host (Vision judges content, not origin), so the
  IP-logging point from finding 2 applies to avatars too.
- **Fix:** store the moderated `displayName`/`photoURL` in Mongo (`userProfiles`) and serve those, never the
  Auth record values. Limit `photoURL` to `profilePhotos/<uid>` in this bucket.

### 4. High: Cloud Vision spend on photo updates and recipe edits is uncapped

- **Where:** `server/routes/auth.js:272-281` and `server/routes/recipes.js:646,687-693`. Neither route
  mounts a paid-quota limiter; only `addRecipe` does (`recipes.js:532-540`). The comment there assumes
  edits rarely re-scan, but the image changes whenever the client says it does.
- **Request sequence:**
  - `POST /api/updatePhoto {"photoURL": "https://any-public-image.example/a.jpg?n=<i>"}` in a loop. Only
    `profileWriteLimiter` applies (30/min/uid). No username needed.
  - Create one recipe, then `PUT /api/editRecipe?recipeId=<id>` alternating `recipeImage` between two URLs
    at the 12/min `recipeWriteLimiter` cap.
- **Cost:** 43,200 + 17,280 = 60,480 SafeSearch calls per account per day, per server replica (the minute
  limiters are in-process memory, `writeLimiter.js:27-32`). At Google's list price of about $1.50 per 1,000
  that is about $90 per free account per day, linear in accounts. Once the project's Vision quota runs out,
  image moderation fails closed for everyone: every real recipe goes to `pending_review` and every real
  avatar change is rejected.
- **Fix:** add a `vision` paid-quota surface to both routes. The host restriction from findings 1-3 also
  stops the `?n=<i>` trick. Consider caching the verdict per object path.

### 5. High: the global daily ceilings are a free off-switch

- **Where:** `server/util/paidQuota.js:274-291` bumps the per-user then global counter. It runs as
  middleware before the handler: `recipes.js:540`, `ingredients.js:160`, `nutrition.js:41`. A request that
  then fails validation, or (on `addRecipe`) has no username, has already used global quota.
- **Request sequence** (empty bodies are enough, no paid call happens):
  - `POST /api/addRecipe {}` × 50 from each of 40 accounts (2,000 global).
  - `POST /api/ingredients/parse {}` × 600 from each of 34 accounts (20,000 global).
  - `POST /api/nutrition/details {}` × 150 from each of 40 accounts (6,000 global).
- **Impact:** for the rest of the UTC day every user gets 429 `DAILY_QUOTA_EXCEEDED` on recipe creation,
  ingredient enrichment and nutrition. About 40 throwaway accounts, minutes of runtime, $0, repeatable
  daily. This is the H1 design working as built: the test that proves a fresh account is stopped once the
  ceiling trips is the same behavior an attacker uses.
- **Fix:** move the quota check after validation and the username check. Count only accounts past an
  age or verification threshold toward the shared pool, or give new accounts a separate, smaller pool so
  they can't exhaust it for established users. Alert on the global trip rather than relying on it alone.

### 6. Medium: autocomplete can block the event loop

- **Where:** `server/routes/recipes.js:226-305`, `server/util/recipeTitleMatch.js:60-103` and its
  `levenshtein` (O(len(q) × len(word))). `title` has no length cap. When tiers 1 and 2 find nothing, tier 3
  loads up to `FUZZY_CANDIDATE_CAP = 1000` titles (`recipes.js:224,292`) and compares the whole query to
  every word of every title.
- **Request sequence:** unauthenticated `GET /api/searchAutoCompleteRecipes?title=<~8 KB of "zq", no spaces>`
  in a loop.
- **Cost:** about 8,000 × 7 × 6 × 1,000 ≈ 340M inner-loop steps per request with a 1,000-recipe catalog,
  plus an 8 KB case-insensitive regex in tier 1. The code path is certain; the timing (around a second of
  blocked thread per request) is an estimate and shrinks with a smaller catalog. The global limiter allows
  about 1.1 requests/s per IP, so a couple of IPs can stall a replica, `/health` included.
- **Fix:** reject or truncate `title` above about 100 characters (the title max is 50).

### 7. Medium: saved and made lists grow without limit

- **Where:** `POST /api/recipes/:id/save` (`recipes.js:916`), `POST /api/madeRecipe` (`recipes.js:1008`) and
  `PATCH /api/recipes/:recipeId/collections` (`collections.js:311`) have no per-user limiter, don't check
  the recipe exists, and don't bound the id length. Each call pushes into the caller's single
  `userRecipeData` document. `teardownRecipeDocs` runs `updateMany({}, { $pull … })` over every user
  document on every recipe delete (`server/util/teardownRecipe.js:20-30`), as does the account-delete
  cascade (`auth.js:493-503`).
- **Request sequence:** `POST /api/recipes/<random 4 KB string>/save` repeated a few thousand times per
  account until the document nears Mongo's 16 MB cap. Repeat with more accounts.
- **Impact:** storage growth of up to 16 MB per free account, and every delete in the app (any user's
  recipe or account) has to walk and rewrite bloated documents inside a transaction. The attacker can
  trigger those scans on demand: `deleteRecipe` has no limiter. A bloated account also turns its own
  public profile into an amplifier: `GET /getPublicProfile` runs `countVisibleSaved` with an `$in` over
  every saved id (`server/util/accountCounts.js:40-49`).
- **Fix:** validate the id shape and that the recipe exists, cap the arrays, add the existing
  `collectionWriteLimiter` to all three routes, and filter the teardown `$pull` on
  `{ 'savedRecipes.recipeId': id }` (and the made/user arrays) with matching indexes.

### 8. Medium: displayed recipe fields that skip moderation

- **Where:** `gatherRecipeText` (`server/util/automod.js:129-165`) scans title, description, ingredient
  label/original string/ingredient/comment and instruction text. It skips `cuisine`, `mealTypes`,
  `nutritionLabels`, `parsedIngredient.unit` and `ingredientData.imagePath`. `recipeLimits.js` caps only
  `originalIngredientString` and instruction `content`; `cuisine`, `unit`, `ingredient` and `comment` are
  uncapped, and `cuisine`/`mealTypes`/`nutritionLabels` aren't checked against the static lists.
- **Where they render:** `cuisine` on recipe and home cards and the SingleRecipe hero. `nutritionLabels` as
  tags. `unit` and `<img src={imagePath}>` per ingredient (`SingleRecipe.tsx:199-230`).
- **Request sequence:** `POST /api/addRecipe` with a clean title, `"cuisine": "<slur>"`, and up to 50
  ingredients each carrying `"ingredientData": { "imagePath": "https://attacker.example/x.jpg" }`.
- **Impact:** text on cards and up to 50 unscanned images per recipe page.
- **Fix:** validate `cuisine`/`mealTypes`/`nutritionLabels` against `src/recipeData` lists server-side,
  add `unit` to the scanned text and cap it, and drop client `imagePath` or allow only the Spoonacular
  image host the server itself writes (`ingredients.js:120`).

### 9. Medium: a taken-down review can come straight back

- **Where:** admin takedown sets `moderationHidden` on the rating doc (`reviews.js:510-520`).
  `deleteReview` (`:234`) and `removeRating` (`:273`) `deleteOne` the doc when nothing else is left on it,
  which drops the flag. `newReview` (`:126`) then creates a fresh visible doc.
- **Request sequence:** after the takedown, `DELETE /api/deleteReview?recipeId=X`, then
  `DELETE /api/removeRating?recipeId=X`, then `POST /api/newReview {"recipeId":"X","reviewText":"<same text>"}`.
  The text already passed the classifier once (that's why a human had to remove it), and the rating can be
  re-added with `addRating`.
- **Impact:** takedowns undone in seconds; a removed star returns to the average.
- **Fix:** keep a tombstone for moderated `(userId, recipeId)` pairs instead of hard-deleting, and refuse
  `newReview`/`addRating` against one. Count takedowns per author for escalation.

### 10. Medium: handle squatting after a rename

- **Where:** a rename cascades to `ratings.username` and `reports.reportedUsername` (`auth.js:197-207`) but
  not to `recipes.authorUsername`, which is set once at create (`recipes.js:607`). `SingleRecipe.tsx:419-430`
  renders "by @{authorUsername}" and links to `/u/{authorUsername}`. The old handle is free at once.
- **Request sequence:** victim renames `alice` to `alice2`. Attacker sends `POST /api/setUsername?username=alice`.
- **Impact:** every recipe the victim published before the rename now says "by @alice" and links to the
  attacker's profile, next to the victim's real avatar (looked up by `userId`), which makes the
  impersonation more convincing. The report relabel at `auth.js:202-206` matches on handle too, so reports
  against an earlier holder of a reused handle follow the squatter.
- **Fix:** resolve `authorUsername` from `userId` at read time (or cascade it by `userId` on rename), match
  the report relabel on `reportedUid`, and hold released handles for a cooldown.

### 11. Medium: private profiles leak review history

- **Where:** `GET /api/getSingleUserReviews` (`reviews.js:368`) is unauthenticated and never reads
  `userProfiles.isPublic`, while `getPublicProfile` and `getPublicProfileRecipes` 404 for private users
  (`publicProfile.js:94,146`). `getReviews` withholds name and avatar for private users but still returns
  `username` (`reviews.js:32-41`).
- **Request sequence:** read the handle from any `GET /api/getReviews?recipeId=X`, then
  `GET /api/getSingleUserReviews?username=<handle>&returnRecipeData=true&reviewsPerPage=50` and page through.
- **Impact:** the private-profile setting doesn't cover what the user rated and wrote.
- **Fix:** switch the route to `optionalAuth` and return empty unless the profile is public or the viewer
  is the owner or an admin. Whether `getReviews` should hide the handle is a product call (open question 6).

### 12. Medium: Sybil saves and makes outlive the accounts

- **Where:** the `deleteAccount` cascade deletes the user's `userRecipeData` (`auth.js:510`) but never
  decrements `numTimesSaved`/`numTimesMade` on recipes the user saved or made. Ratings are recomputed;
  counters aren't. Save and made have no limiter and don't require a username (`recipes.js:916,1008`).
- **Request sequence:** per throwaway account: sign up, `POST /api/recipes/<target>/save`,
  `POST /api/madeRecipe?recipeId=<target>`, `POST /api/deleteAccount`.
- **Impact:** `numTimesSaved` is the first key of the default Popular sort (`recipes.js:126`) and feeds the
  For You score. The boost is permanent and can't be traced to any account. This extends known M5.
- **Fix:** in the cascade, `$inc: -1` each saved and made recipe (with the existing `$max` floor), and add a
  limiter to both routes.

### 13. Medium: unlimited, never-reaped image uploads

- **Where:** `storage.rules:29-43` lets the owner write any number of objects under `recipeImages/{uid}/`,
  each under 5 MB, with no server involvement. Every upload triggers the resize extension at 1 GB memory and
  three WebP variants (`extensions/storage-resize-images.env`). Nothing reaps unreferenced objects;
  `editRecipe` doesn't delete the image it replaces; deletes skip the variants
  (`docs/IMAGE_PIPELINE.md:218`).
- **Request sequence:** Firebase client SDK loop:
  `uploadBytes(ref(storage, 'recipeImages/<uid>/<uuid>'), <4.9 MB jpeg>)`.
- **Impact:** storage that compounds month over month, function time per upload, and a public-read bucket
  that works as free file hosting for unscanned images (the orphan-scan gap was accepted in
  `CONTENT_MODERATION.md:250`; the hosting and cost side wasn't). The upload rate is bounded only by the
  attacker's bandwidth and account count.
- **Fix:** a lifecycle rule or sweeper that deletes objects not referenced by a recipe after a day, delete
  variants alongside originals, and consider a per-uid object budget (server-issued upload slot or App Check).

### 14. Low-medium: bug reports send unthrottled admin email

- **Where:** `bugReports.js:50,86-93` and `email.js:345-353`. Each report, anonymous included, emails the
  admin through Resend. Only the per-IP limiter applies (15 per 15 minutes); unlike
  `notifyAdultContentFlag` there is no send throttle.
- **Request sequence:** `POST /api/bug-reports {"category":"bug","description":"x"}` from rotating IPs (or
  IPv6 /56 blocks) through the site's edge path.
- **Impact:** inbox flood, and on Resend's free tier (100 per day) about seven IPs exhaust the day's
  sends, which also silences account-status and report-resolved emails to users. Extends known M7.
- **Fix:** batch these into a digest or throttle them like the adult-content alert.

### 15. Low: account deletion and token revocation

- **Where:** `POST /deleteAccount` (`auth.js:455`) accepts any valid ID token. Recent-login is enforced only
  in the client. `verifyToken` calls `verifyIdToken(token)` without `checkRevoked` (`middleware/auth.js:23`).
  `server/scripts/setAdmin.js --revoke` removes the claim but doesn't call `revokeRefreshTokens`.
- **Request sequence:** anyone holding a stolen bearer token sends `POST /api/deleteAccount` and
  permanently deletes the account and its content. A demoted admin keeps admin rights until their current
  token expires (up to an hour).
- **Fix:** in `deleteAccount`, verify with `checkRevoked: true` and require `auth_time` within about five
  minutes. Call `revokeRefreshTokens` in `setAdmin.js --revoke` and when banning.

### 16. Low: admin uids still reach review authors

- **Where:** `GET /checkIfReviewed` returns `{ reviewed: true, ...doc }` (`reviews.js:181-193`) and
  `GET /exportMyData` returns raw rating docs (`auth.js:370`). Both include `moderatedBy`, `moderatedAt` and
  `moderationHidden` once an admin has acted on the review.
- **Request sequence:** `GET /api/checkIfReviewed?recipeId=X` after a takedown or restore.
- **Impact:** the moderating admin's Firebase uid, the same leak class as M1 on two paths the M1 fix
  didn't cover.
- **Fix:** project those three fields out on both reads.

### 17. Low: blocklist split by a separator

- **Where:** `tokenize` splits on any non-ASCII-alphanumeric character (`moderationBlocklist.js:73-74`), and
  `spacedRuns` (`:167`) re-joins only runs of single characters. `fu.ck`, `nig_ger`, or a zero-width space
  inside a word becomes two harmless tokens. `.`, `_` and `-` are legal in usernames (`auth.js:30`).
- **Impact:** usernames are public and permanent, so they rely on the OpenAI layer alone for these. That
  layer is off whenever `OPENAI_API_KEY` is unset (known L4). I didn't check what OpenAI returns for them.
- **Fix:** strip zero-width and format characters, then also match on the text with separators removed.

### 18. Low: one 5-star rating tops the average

- **Where:** the `top` sort and the For You score use raw `rating.rateValue` with no minimum count
  (`recipes.js:139`, `server/util/forYou.js:123-127`).
- **Request sequence:** author plus one alt account, one `POST /api/addRating?recipeId=X&rating=5`.
- **Impact:** a 5.0 badge on the card and a For You boost. `top` isn't in the browse UI today.
- **Fix:** a Bayesian average or a minimum `rateCount` before the average is shown or ranked.

### 19. Low: reports against recipes that don't exist

- **Where:** `POST /reports` (`reports.js:93`) dedupes per reporter and target but doesn't check that a
  recipe target exists.
- **Request sequence:** `POST /api/reports` with random `recipeId`s at the 10/min `reportLimiter`.
- **Impact:** about 14,000 junk queue items per account per day. Extends known M7.
- **Fix:** 404 when the target recipe isn't found.

---

## Plausible (code supports it, impact not proven)

- **P1. Swap an approved image in Storage.** `storage.rules:29-34` lets the owner overwrite
  `recipeImages/{uid}/{imageId}` at any time, and that wildcard also matches the resize variants
  (`{uuid}_400x400.webp`). `src/util/recipeImageVariants.ts:60-91` builds variant URLs the server never
  scans. Once `VITE_IMAGE_VARIANTS_ENABLED` is on, overwriting a variant swaps what every card shows. For
  the original, it depends on whether the stored download token survives an overwrite, which I didn't
  verify. Fix: write-once rules (`allow create` only when `resource == null`) and deny client writes to
  `*_NxN.webp`.
- **P2. Storage egress.** Every object is public-read with no CDN or App Check in front, and originals
  carry no `Cache-Control`. A loop of `GET`s on a 5 MB object bills egress at roughly $0.12/GB. Real cost
  depends on bucket type and any budget cap; this is mostly an argument for a billing alert.
- **P3. Ingredient lookups store or log up to 100 KB per call.** `ingredientString` has no length cap
  (`ingredients.js:160-165`). A miss writes the full string to `ingredientMisses.raw` and `console.warn`s
  it (`:55-77`); a throw logs it and sends a Sentry event (`:208-214`). At 20,000 global calls a day that is
  up to about 2 GB of Mongo or logs, or a burned Sentry quota, depending on how the hosted proxy treats huge
  input. Fix: cap at `INGREDIENT_MAX_LENGTH` (200).
- **P4. Text moderation fails open on oversized input.** `textModeration.js` treats any classifier error
  or timeout as clean. The uncapped fields in finding 8 let one recipe carry close to 100 KB of text. If
  OpenAI rejects or times out on that, the recipe publishes with only the blocklist checked. Capping the
  fields in finding 8 closes it either way.
- **P5. Large arbitrary nested data.** `pickFields` copies nested `ingredients[]` and `nutritionData` up to
  the 100 KB body limit: 25 drafts and 50 recipes a day per account, with no cross-account cap. On a small
  Atlas tier, findings 7 and P5 together could reach the storage limit, which blocks writes site-wide.

## Rejected

- **Spoofing the client IP to dodge per-IP limits.** The edge function overwrites `x-prepify-edge` and
  `x-prepify-client-ip` with `set()` (`netlify/edge-functions/api-proxy.ts`), and the server compares the
  secret in constant time (`edgeProxy.js`). Direct callers get the platform IP with `trust proxy` 1.
- **IDOR on drafts, collections, recipe edit/delete.** Every route loads the doc and checks
  `userId === req.uid`, or scopes the query to `_id: req.uid`.
- **Reading hidden or pending recipes.** `getRecipe` only shows a pending recipe to its owner; hidden and
  unpublished return 404 for non-admins.
- **Farming XP by create/delete or save/unsave.** Gamification counts only currently visible recipes,
  visible saves and non-hidden written reviews (`server/util/accountCounts.js:85-98`). Save/unsave is atomic
  and nets to zero; `madeRecipe` increments once per user.
- **Self-rating.** The M2 fix holds: `checkRatableRecipe` (`reviews.js:61`) loads through `RECIPE_VISIBLE`
  and compares `userId`.
- **Banned users escaping via `deleteAccount`.** The missing `requireActive` there is documented and gives
  no more than a new account would.
- **Forcing facets-cache rebuilds via edits.** Real but negligible; the cache coalesces refreshes.
- **Bearer token sent to an attacker URL.** All client calls use relative paths on a build-time base URL.
- **Client-side script injection.** No `dangerouslySetInnerHTML`, no user-controlled `href`, no
  redirect-after-login parameter. User URLs only reach `<img src>`.

## Open questions for Jesse

1. Is soft-delete (or object versioning) on for the production Storage bucket? It decides whether
   finding 1 is recoverable if someone has already used it.
2. Is there a GCP budget alert, ideally with a cap, covering Cloud Vision and Storage egress, and which
   Resend plan is prod on? Findings 4, 13, 14 and P2 are sized against list prices and the free tier.
3. How many Railway replicas does prod run? The per-minute limiters multiply by that number.
4. When the global quota trips, do you want everyone blocked (today's behavior) or an alert while
   established accounts keep working? Finding 5's fix depends on the answer.
5. Is `VITE_IMAGE_VARIANTS_ENABLED` going on soon? P1 and the array crash in finding 2 become live then.
6. Should a private profile also hide the reviewer's handle on recipe pages, or only their review history?
7. Are `OPENAI_API_KEY` and `GOOGLE_VISION_API_KEY` both set in production? Without them, findings 8 and
   17 are much wider and image moderation is off entirely.
