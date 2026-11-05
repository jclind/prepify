# Docs vs code review, 2026-11-05

Scope: every checkable claim in `docs/RELEASE_PLAN.md`, `docs/API_CONTRACT.md`, `docs/BACKLOG.md`, and the
audit files (`SECURITY_AUDIT_2026-06-11.md`, `SECURITY_AUDIT_2026-07-11.md`, `DATA_INTEGRITY_AUDIT.md`,
`ADD_RECIPE_AUDIT.md`, `ADD_RECIPE_UX_AUDIT.md`) was compared against the code at `development` `f715151`
(package version 1.2.0).

Method: three read-only agents split the docs with no overlap:

- API_CONTRACT plus both security audits.
- RELEASE_PLAN, BACKLOG lines 1-1107, and DATA_INTEGRITY.
- BACKLOG lines 1108-2213 plus both add-recipe audits.

I then read the code behind every finding and marked it confirmed, plausible, or rejected. No code, config,
or tests were changed. Nothing contacted a real service, and there is no `.env`.

The docs already carry many inline `[Reconciled …]` notes from the 2026-08-27, 09-23 and 09-27 passes.
Findings below are either new, or cases where a later commit has made one of those notes wrong. The clone is
shallow (history starts 2026-07-11), so commits older than that are cited by code, not hash.

Severity scale:

- **High**: an open security problem documented as safe or fixed.
- **Medium**: a status marker or contract that is wrong in a way someone would act on.
- **Low**: stale wording, counts, or line numbers.

## Summary

| Severity | Confirmed | Plausible |
|---|---|---|
| High | 2 | 0 |
| Medium | 21 | 2 |
| Low | 11 | 1 |

The two highs are real security gaps the docs describe as closed. Everything else is doc drift.

Fix first: F1. Any signed-in user can make the server delete any object in a Storage bucket the service
account can reach.

---

## Confirmed findings

### High

#### F1. Recipe image deletion trusts a client-supplied URL: any user can delete any Storage object

- **Doc:** `docs/SECURITY_AUDIT_2026-06-11.md:101-102` lists "Storage deletion: URL parsed with a strict
  pattern; non-Firebase URLs are ignored" under *Verified sound*. `docs/API_CONTRACT.md:990-992` describes
  the delete as best-effort cleanup.
- **Code:**
  - `server/util/firebaseStorage.js:10` matches `/\/b\/([^/]+)\/o\/([^?]+)/` anywhere in any string. There
    is no host check and no anchor.
  - `deleteRecipeImage` at `firebaseStorage.js:18-22` deletes `bucket(parsed.bucket).file(parsed.path)`
    with the Admin SDK. It never compares the bucket to `FIREBASE_STORAGE_BUCKET` and never checks that the
    path is under `recipeImages/{recipe.userId}/`.
  - `recipeImage` is client-writable on create and edit (`server/util/recipeFields.js:27`, copied into
    `CREATABLE_RECIPE_FIELDS` at `:48`). `recipeLimits.js` has no URL validation.
  - The deletes run at `server/routes/recipes.js:774` (deleteRecipe) and `server/routes/auth.js:554`
    (deleteAccount). The Admin SDK bypasses `storage.rules`, so the owner-only delete rule doesn't help.
- **Example:**
  1. Account A calls `POST /api/addRecipe` with `recipeImage` set to
     `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/profilePhotos%2F<victimUid>?alt=media`.
  2. Vision scans the victim's ordinary avatar and finds it clean. Even a medium verdict only holds the
     recipe as `pending_review`, and it is still saved.
  3. A calls `DELETE /api/deleteRecipe?recipeId=<that id>`. The server deletes the victim's avatar.

  The same works for any recipe image, and through `PUT /api/editRecipe` by swapping the URL.
- **Impact:** Unauthorized deletion of other users' content, or of any object in any bucket the service
  account can write. The only data source is a field the attacker controls. It isn't filed anywhere.
  July's L2 (no URL scheme check) touches the same field but not deletion.
- **Suggested fix:**
  - In `deleteRecipeImage`, require the parsed bucket to equal the configured bucket, and the path to start
    with `recipeImages/<owner uid>/`. Pass the recipe's `userId` in. Skip and log anything else.
  - Validate `recipeImage` at write time: https, host `firebasestorage.googleapis.com`, the configured
    bucket, and a path under the caller's uid. That also closes July L2 for this field.
  - Add a regression test that a foreign-path URL is not deleted.
  - Then move the 06-11 audit line out of *Verified sound*.

#### F2. July audit H1 (paid-API cost ceiling) is marked fixed, but recipe edits and profile photos are uncapped

- **Doc:** `docs/SECURITY_AUDIT_2026-07-11.md:16` marks H1 "✅ Fixed". The finding's scope (`:57`) includes
  "recipe writes (Cloud Vision + OpenAI moderation)".
- **Code:**
  - The daily quota `recipeCreateQuota` is mounted only on `POST /addRecipe` (`server/routes/recipes.js:532-540`).
  - `PUT /editRecipe` runs OpenAI text moderation on every call, and a Vision scan whenever the image URL
    changes (`recipes.js:687-692`). Its only limit is `recipeWriteLimiter` at 12/min.
  - `POST /updatePhoto` runs a Vision scan on every non-empty URL (`server/routes/auth.js:272-281`), behind
    the 30/min `profileWriteLimiter`.
  - The comment at `recipes.js:530-531` says edits were left unmetered on purpose. The audit status doesn't
    say that.
- **Example:** N throwaway accounts each loop `PUT /api/editRecipe` with a new image URL. That is 12 Vision
  plus 12 OpenAI calls per minute per account, with no per-account or global daily ceiling. This is the
  Sybil drain H1 describes.
- **Impact:** A high-severity finding reads as closed while part of its scope is still open.
- **Suggested fix:**
  - Mark H1 "partially fixed" and name the two routes.
  - Then either meter them with the same `makePaidQuotaLimiter` (a `recipe-edit` and a `profile-photo`
    surface, or charge the existing `recipe` surface only when a scan actually runs), or record an explicit
    risk acceptance.

### Medium

#### F3. A username rename leaves `recipes.authorUsername` stale, so a reclaimed handle shows on someone else's recipes

- **Doc:** `docs/API_CONTRACT.md:508` says a rename propagates to `ratings.username` and
  `reports.reportedUsername` only. `SECURITY_AUDIT_2026-07-11.md:19` marks M3 (author impersonation) fixed.
- **Code:**
  - `server/routes/auth.js:196-206` updates `ratings` and `reports`, not `recipes`.
  - `authorUsername` is stamped once at create (`recipes.js:607`).
  - The byline links to `/u/${authorUsername}` (`src/pages/SingleRecipe/SingleRecipe.tsx:419-430`).
- **Example:** A publishes as `chef`, renames to `chef2`, and B claims `chef`. A's recipes now read "by
  @chef" and link to B's profile.
- **Impact:** The misattribution M3 was meant to stop comes back through renames. Neither BACKLOG nor the
  contract mentions it, though the client already knows the snapshot goes stale (`EditRecipe.tsx:36-38`).
- **Suggested fix:** Add `recipes.updateMany({ userId: uid }, { $set: { authorUsername: username } })` to
  the rename cascade, or resolve the byline from `userId` at read time the way `authorPhotoURL` already is.
  Document it in the setUsername entry, and note it under M3.

#### F4. BACKLOG marks the nav-logo contrast fix done, but the token it relies on is back to vivid orange

- **Doc:** `docs/BACKLOG.md:1185-1188`, `[x]` "Nav-logo wordmark (#184): darkened to `$primary-accessible`".
- **Code:** `src/helpers.scss:26` has `$primary-accessible: #ff5722`. `src/Components/Navbar/Navbar.scss:76-86`
  applies it, and its own comment says that orange is 2.72:1 on the light nav.
- **Example:** On the desktop solid bar, or the mobile bar on any non-hero page, the wordmark renders
  `#ff5722` on near-white. That is below even the 3:1 large-text bar.
- **Impact:** An accessibility item reads as done but has no effect. The parent `[~]` item (`:1154-1160`)
  mentions the orange revert, which is why this isn't rated high.
- **Suggested fix:** Flip the sub-item to `[~]` with a pointer to the revert, or set a darker on-light
  orange for the nav rule only.

#### F5. RELEASE_PLAN lists three post-1.0 API issues as open; all three are fixed

- **Doc:** `docs/RELEASE_PLAN.md:216-221`, `[ ]` "Residual low-severity API issues", items (a), (b), (c).
- **Code:**
  - (a) `getReviews` uses `optionalAuth` and sets `isCurrentUser` from `req.uid` (`server/routes/reviews.js:304-310,358`).
  - (b) `newReview` sets `$setOnInsert: { username, rating: null, ratingLastUpdated: '' }` (`reviews.js:172`).
  - (c) `getSingleUserReviews` drops reviews whose recipe is gone or hidden (`reviews.js:441`).
- **Impact:** Anyone picking up post-1.0 work would re-investigate shipped fixes. The cited lines
  (`reviews.js:165,183,75,216`) point at unrelated code now.
- **Suggested fix:** Mark `[x]` and cite the current lines.

#### F6. RELEASE_PLAN's storage-rules row describes the June ruleset

- **Doc:** `docs/RELEASE_PLAN.md:178-186`, `[x]`. It says `recipeImages/{filename}` is auth-gated, "path
  isn't uid-keyed — backlog follow-up", and cites a 7/7 smoke test.
- **Code:** `storage.rules:22-56` now has:
  - uid-scoped `recipeImages/{uid}/{imageId}` with owner-only writes (I2);
  - an owner `allow delete` (X3);
  - the legacy flat path set to `allow write: if false`.

  Uploads go to `recipeImages/${uid}/${uuidv4()}` (`src/api/recipes.ts:236`).
  `docs/evidence/CUTOVER_RUN_2026-07-11.md:64,94-98` records that these rules were not deployed at cutover,
  which caused five weeks of 403s on prod uploads.
- **Impact:** A security reader would conclude any signed-in user can overwrite any recipe image, and that
  the uid re-key is pending. Both are false. The plan also never mentions the outage.
- **Suggested fix:** Update the row to the I2/X3 ruleset, link the cutover evidence entry, and add a line
  for the rules deploy date.

#### F7. "Search autocomplete redesign" is `[ ]` but half done, and BACKLOG already marks the dropdown redesign shipped

- **Doc:** `docs/RELEASE_PLAN.md:343-354`, `[ ]`. Its goal includes "add proper empty / loading /
  no-results states".
- **Code:** `src/Components/SearchRecipesInput/SearchRecipesInput.tsx:262-293` already has skeleton rows
  (`.ac-skeleton`), a no-results state (`.ac-empty`, "Press Enter to search anyway"), and a
  corrected-query banner (`.ac-corrected`). `BACKLOG.md:933-960` marks the redesigned dropdown done (#167,
  #171).
- **Impact:** Only the in-menu card treatment is left. `.auto-complete-results` is still a plain white panel
  (`SearchRecipesInput.scss:59-68`). The two docs disagree.
- **Suggested fix:** Set `[~]` and narrow the remaining scope to the mobile-menu treatment.

#### F8. Two Reconciled notes now misstate the version and deploy state

- **Doc:**
  - `docs/BACKLOG.md:3` says both `package.json`s are at 1.0.2, the parser is pinned to 2.2.0, and deploy
    PR #334 is open.
  - `BACKLOG.md:588` says "2.2.0 pricing is not on prod… #334 is still open".
  - `BACKLOG.md:479,635` say the parser is pinned to 2.2.0.
- **Code:**
  - `package.json:3` and `server/package.json:3` are at `1.2.0` (`a972b04`).
  - The parser is `2.3.0` in both trees (`package.json:11`, `server/package.json:12`; #339).
  - `docs/BACKLOG_ROADMAP.md:2679` records #334 merged and 1.0.2 promoted on 2026-11-01.
- **Impact:** The notes meant to stop readers misjudging release state now misstate it.
- **Suggested fix:** Rewrite the `BACKLOG.md:3` snapshot to 1.2.0 and parser 2.3.0, with #334 merged.
  Update `:588` to say the fixes are live.

#### F9. Five of the seven "untested utils" have tests now

- **Doc:** `docs/BACKLOG.md:2159-2170`, `[ ]`. The 2026-09-23 note lists `capitalize`, `formatPrice`,
  `formatCompactCount`, `timeElapsedSince`, `recipeLimits`, `invalidateSavedCaches` and `defaultAvatar` as
  untested.
- **Code:** `src/test/glm-capitalize.test.ts`, `glm-formatPrice`, `glm-formatCompactCount`,
  `glm-timeElapsedSince` and `glm-defaultAvatar` exist (added 2026-09-28).
- **Impact:** Someone could write tests that already exist.
- **Suggested fix:** Shrink the item to `recipeLimits` and `invalidateSavedCaches`.

#### F10. The near-duplicate brand shades the `[~]` item waits on are gone

- **Doc:** `docs/BACKLOG.md:1898-1905`, `[~]`. It says `#f4501e`, `#a52f0a` and `#006065` remain.
  `:1213-1220` says the Save button uses a literal `#a52f0a`.
- **Code:** A case-insensitive grep of `src/` finds none of the three. `docs/BACKLOG_ROADMAP.md:543`
  already says "STALE in source … reconcile the sub-item".
- **Impact:** An open item has no work left in it.
- **Suggested fix:** Close it. Point the `:1213` note at the `$hover-brighten` collapse
  (`docs/design/button-hover-audit.md:86-90`).

#### F11. "Three copies of the has-a-price check" is now at least six, and the server joined in

- **Doc:** `docs/BACKLOG.md:1501-1505`, `[ ]`. It counts three copies and says the fix is one shared
  predicate.
- **Code:**
  - `src/util/unpricedIngredients.ts:10-12` uses `typeof`.
  - `IngredientsContainer.tsx:155-161` (the subtotal) uses `Number()` + `isNaN`.
  - `:170` (`hasUnpricedRow`) uses `typeof`.
  - `IngredientItem.tsx` has `priceDisplay`.
  - The client and server `calculateServingPrice` files.
  - `server/util/recipeLimits.js:141-147` (#338) now rejects any present non-number price.
- **Example:** A legacy row with `totalPriceUSACents: "150"` adds to the subtotal and also shows the
  unpriced chip, and saving the edit returns 400 "An ingredient price must be a number of $0 or more".
- **Impact:** A fix that follows the item's count would miss half the copies.
- **Suggested fix:** Update the count and list, and note that the server copy rejects strings, so the
  shared predicate should match it.

#### F12. Two items still act on data that the August Atlas wipe destroyed

- **Doc:**
  - `docs/BACKLOG.md:1834-1840`, `[ ]` "Post-6-phase-refactor DB check", including the `imagePath`
    migration question.
  - `:1681-1693`, `[ ]` "parser data is co-mingled in the Prepify app DB", which says to preserve it in
    `Cluster0`.
  - `:1795-1798`, `[x]`, which says `Cluster0` "still holds the parser data and serves as the restore
    fallback".
- **Code/docs:** Commit `b5dabc5` records both app clusters and `Cluster0` terminated on 2026-08-20, with
  new clusters born empty. `docs/RELEASE_RUNBOOK.md:393-396` already says `Cluster0` is gone and the
  parser cache was re-homed.
- **Impact:** These items point at legacy data and a restore fallback that no longer exist. BACKLOG
  contradicts the runbook.
- **Suggested fix:** Close the DB check and the `imagePath` question as moot. Rewrite `:1681` once the
  parser's new data home is confirmed (see open questions). Strike the restore-fallback clause at `:1796`.

#### F13. UX audit still lists the add-recipe a11y follow-ups as open; BACKLOG marks them fixed in #269

- **Doc:** `docs/ADD_RECIPE_UX_AUDIT.md:48` (`◑`), `:55-59`. The Reconciled note at `:61` says the
  react-select pickers and list containers "could not be confirmed".
- **Code:**
  - `src/pages/AddRecipe/FormField.tsx` wires `role='group'`, `aria-labelledby` and `aria-describedby`.
  - `MealTypeSelector` sets `aria-invalid` and `aria-errormessage` when invalid.
  - `ImagePicker.tsx:122` has `aria-describedby`.
  - `BACKLOG.md:1224-1234` marks both items `[x]` (#269).
- **Impact:** The two docs disagree. The open question in the note can now be closed.
- **Suggested fix:** Set the row to ✅ (#269) and replace the follow-ups paragraph with a pointer.

#### F14. UX audit says enrichment failures show an amber warning; timeouts and rate limits now show red error toasts

- **Doc:** `docs/ADD_RECIPE_UX_AUDIT.md:155-161`, ✅ "the enrichment notice now uses `.warning`". Also
  `:87-88`.
- **Code:** `IngredientsContainer.tsx:66-69,81-85` and `IngredientItem.tsx:282-293` call `toast.error`
  for a timeout or 429. An ordinary miss shows only the row icon and Retry. `.warning` is now used only for
  the empty-input hint.
- **Example:** A lookup takes more than 12 s. The user gets a red toast saying the row was "added without
  nutrition data".
- **Impact:** The "amber for non-blocking" principle the audit records has partly regressed, and the doc
  hides it.
- **Suggested fix:** Either switch those toasts to the warning style or a neutral one, or update the
  audit's resolution row to describe current behavior and file the style question to BACKLOG.

#### F15. ADD_RECIPE_AUDIT recommends dropping a `Number()` cast that is now required

- **Doc:** `docs/ADD_RECIPE_AUDIT.md:214-217`, unmarked LOW: "Drop the cast".
- **Code:** Since #298, `servings` is a `string` (`src/pages/AddRecipe/useRecipeForm.ts:72-76`), and
  `Number(servings)` at `:578` is the one place it is converted.
- **Impact:** Following the advice would send a string, which the server rejects against its integer
  `servings` bound.
- **Suggested fix:** Mark it 🗑 OBSOLETE with the reason.

#### F16. ADD_RECIPE_AUDIT says leftover items are tracked in BACKLOG; several aren't tracked anywhere

- **Doc:** `docs/ADD_RECIPE_AUDIT.md:7` and the Category 8 markers at `:228,234,246` ("R1/C1 scope").
- **Code:** R1 shipped (#248) without these, and they are still in code:
  - `interface ImagePickerProps` and `React.FC` (`ImagePicker.tsx:10,24`).
  - Trailing `export {}` in `Dnd/DndContext.tsx:36`, `Drag.tsx:21` and `Drop.tsx:27`.

  BACKLOG has no entry for any of them.
- **Impact:** Nobody owns these items.
- **Suggested fix:** File one small BACKLOG tech-debt item and point the audit at it, or mark them
  won't-fix.

#### F17. API_CONTRACT server plumbing omits the edge-proxy middleware

- **Doc:** `docs/API_CONTRACT.md:94-97` says per-IP limiting sees real client IPs behind one reverse proxy.
  The section has no `noStore`.
- **Code:** `server/app.js:176` mounts `edgeClientIp()` and `noStore` on `/api` before every limiter.
  `server/middleware/edgeProxy.js` trusts `X-Prepify-Client-Ip` only with a matching `EDGE_PROXY_SECRET`
  and sets `Cache-Control: private, no-store`.
- **Example:** If `EDGE_PROXY_SECRET` is unset in prod, every visitor routed through the Netlify edge
  shares one per-IP bucket: 1000 per 15 min globally, 15 per 15 min for bug reports.
- **Impact:** The contract misdescribes how per-IP limits work on the production path.
- **Suggested fix:** Add both middlewares to the plumbing list, with the unset-secret behavior.

#### F18. API_CONTRACT client setup predates `same-origin` and the newer interceptor branches

- **Doc:** `docs/API_CONTRACT.md:73-79` gives the base URL as `VITE_API_URL || 'http://localhost:4000'`.
- **Code:** `src/api/http-common.ts:13-24` resolves `'same-origin'` to `window.location.origin`, which is
  what prod uses. The response interceptor also has offline/unreachable toasts, cancellation filtering, and
  `kind: request-setup` reporting (`:76-136`).
- **Impact:** A client dev reading the contract would get prod's base URL wrong.
- **Suggested fix:** Document `resolveApiBaseUrl` and the interceptor branches.

#### F19. API_CONTRACT says the ingredient-parse upstream has no timeout; it has a 15 s one

- **Doc:** `docs/API_CONTRACT.md:745`.
- **Code:** `server/routes/ingredients.js:28` (`PARSE_TIMEOUT_MS = 15000`), applied at `:171-179`.
- **Impact:** A slow lookup returns 500 after 15 s. The doc says it waits forever.
- **Suggested fix:** Replace the sentence with the 15 s timeout and its 500 outcome.

#### F20. No client code handles `DAILY_QUOTA_EXCEEDED`; the DRIFT note says only nutrition has 429 drift

- **Doc:** `docs/API_CONTRACT.md:772`: "Remaining UX drift is scoped to `getRecipeNutrition` only."
- **Code:** `server/util/paidQuota.js:110` returns 429 with `code: 'DAILY_QUOTA_EXCEEDED'`.
  `src/api/recipes.ts:643-647` branches only on `RATE_LIMITED`. The string `DAILY_QUOTA_EXCEEDED` appears
  nowhere in `src/`.
- **Example:** An author past 600 parses that day sees the raw axios message "Request failed with status
  code 429" on the row.
- **Impact:** The doc understates the drift, and a user-facing message is broken.
- **Suggested fix:** Extend the DRIFT entry, and file a BACKLOG item to branch on `DAILY_QUOTA_EXCEEDED` in
  `getIngredientData`, `getRecipeNutrition` and `addRecipe`.

#### F21. Recipe and draft bounds lists miss the per-row price checks

- **Doc:** `docs/API_CONTRACT.md:251` (addRecipe bounds), `:261` (editRecipe, "same bounds"), `:665`
  (drafts).
- **Code:** `server/util/recipeLimits.js:139-158` (#338):
  - A present `ingredientData.totalPriceUSACents` must be a finite number ≥ 0.
  - A row with `priceBasis: 'author'` is capped at 50,000 cents.
- **Example:** `PUT /api/drafts/:id` with a row priced at -1 returns 400. Draft autosave fails on that row.
- **Impact:** These 400s aren't in the contract.
- **Suggested fix:** Add both rules and their error strings to the three entries.

#### F22. DATA_INTEGRITY D6 says the account cascade calls `teardownRecipeDocs`; it inlines its own copy

- **Doc:** `docs/DATA_INTEGRITY_AUDIT.md:231-232` (D6, `[x]`) says the helper is "called by both" paths.
  `:104-106` (D2) says the same.
- **Code:** `server/routes/auth.js:483-503` runs batched `deleteMany`/`$pull` calls. `teardownRecipeDocs`
  is called only from `server/routes/recipes.js:762`. The comments at `auth.js:476-478` and
  `teardownRecipe.js:6-8` still claim the helper is shared.
- **Impact:** The behavior is equivalent today, but the "can't drift" guarantee the doc promises is gone. A
  step added to the helper would silently skip account deletes.
- **Suggested fix:** Say so in D6. Either extract a batched helper both paths call, or add a test asserting
  the two leave the same collections clean.

#### F23. DATA_INTEGRITY says only the reports dedupe still keys ratings by username; three reads do

- **Doc:** `docs/DATA_INTEGRITY_AUDIT.md:3-5` (header plus the 09-23 note) and `:79`.
- **Code:** `server/routes/admin.js:103` (the user-list review tally), `admin.js:247-252` (user-detail
  `recentReviews`), and `server/routes/reports.js:233-235` (the legacy fallback).
- **Impact:** This contradicts `BACKLOG.md:246-265`, which tracks exactly these three as `[~]`.
- **Suggested fix:** Point the DATA_INTEGRITY note at the BACKLOG item.

### Low

#### F24. CI still wires the `VITE_FIREBASE_MEASUREMENT_ID` that RELEASE_PLAN says was removed

- **Doc:** `docs/RELEASE_PLAN.md:240-242`, `[x]`.
- **Code:** `.github/workflows/test.yml:8,145,168` still lists and passes it. Nothing in `src/` reads it.
- **Suggested fix:** Drop it from the workflow and the repo secrets.

#### F25. A BACKLOG note says the `/recipes` literal is hardcoded; it now uses `RECIPES_PATH`

- **Doc:** `docs/BACKLOG.md:998-1003`.
- **Code:** `src/Components/Navbar/desktop/DesktopBar.tsx:9,46`.
- **Suggested fix:** Drop the parenthetical and update `:47` to `:46`.

#### F26. The M7 Reconciled note overstates: per-account report volume is unchanged

- **Doc:** `docs/SECURITY_AUDIT_2026-07-11.md:138` says "the report-flooding half has landed".
- **Code:** The dedupe exists (`server/routes/reports.js:152-162`). `reportLimiter` is still 10/min
  (`:48-51`), and there is no per-target ceiling. Both are in M7's fix list.
- **Suggested fix:** Reword to "dedupe landed; lower cap and per-target ceiling still open".

#### F27. API_CONTRACT says the client still sends no dead fields to addRecipe; it sends `authorUsername`

- **Doc:** `docs/API_CONTRACT.md:366`.
- **Code:** `src/api/recipes.ts:314-315,353` still fetches `getUsername` and posts `authorUsername`, which
  the server ignores. The comment at `:331` is also stale.
- **Suggested fix:** Note it in DRIFT, and file a client cleanup that drops the extra round trip.

#### F28. API_CONTRACT contradicts itself on CORS rejection

- **Doc:** `docs/API_CONTRACT.md:92` says "500-class". `:102-105` correctly says 403.
- **Code:** `server/app.js:80-83` sets `err.status = 403`.
- **Suggested fix:** Fix line 92.

#### F29. API_CONTRACT says handlers respond via `respondServerError`; none do

- **Doc:** `docs/API_CONTRACT.md:100-101`.
- **Code:** Every route uses `asyncHandler` plus the backstop. The only `respondServerError` call is
  `server/middleware/auth.js:83`.
- **Suggested fix:** Describe the asyncHandler-plus-backstop flow (see `CONVENTIONS.md` 3.1).

#### F30. Gamification counts written reviews, not ratings

- **Doc:** `docs/API_CONTRACT.md:706,708` ("ratings ×15", "first_review (1 rating)").
- **Code:** `server/util/accountCounts.js:86-93` counts only ratings with non-empty `reviewText` that
  aren't moderation-hidden.
- **Example:** A star-only rating earns no XP and no achievement.
- **Suggested fix:** Say "written reviews".

#### F31. Wrong report path and wrong limiter origin in API_CONTRACT

- **Doc:** `docs/API_CONTRACT.md:865` gives content reports as `/admin/reports`. `:177` says the
  bug-report limiter is built from the same factory.
- **Code:** The routes are `/api/reports`, `/api/reports/bulk` and `/api/reports/:id`
  (`server/routes/reports.js:93,190,257,323`). The bug-report limiter is a plain IP-keyed `rateLimit()`
  (`server/routes/bugReports.js:36-40`).
- **Suggested fix:** Correct both.

#### F32. The X3 edit image-swap leak is noted inline but never filed

- **Doc:** `docs/BACKLOG.md:1788-1789`, inside a `[x]` item: "a successful editRecipe image-swap still
  orphans the old object".
- **Code:** Server `editRecipe` (`recipes.js:687-737`) never deletes the replaced image. The client deletes
  only on failure.
- **Suggested fix:** File it as its own `[ ]` item. Fix it together with F1, so the new delete call gets
  the same bucket and path check.

#### F33. Reconciled notes and copy in the add-recipe audits have drifted

- **Version and lines:** `ADD_RECIPE_AUDIT.md:9` and `ADD_RECIPE_UX_AUDIT.md:92` say parser 2.2.0. It is
  now 2.3.0. `ingredients.js:149` is now `:160`.
- **Missing behavior:** UX `:82` doesn't mention the pre-submit unpriced-ingredients modal (#338). UX
  `:92` doesn't mention the author add-price button.
- **Copy:** UX `:150-153` quotes `'Recipe published!'`. The code says `'Recipe published.'`
  (`useRecipeForm.ts:634`).
- **Deleted component:** UX `:119-121,191-193` name `RecipeFormInput`, which was deleted in #204.
- **Image types:** UX `:202` says "non-image types". Only JPEG, PNG and WebP are accepted now.
- **Suggested fix:** One editing pass on both files.

#### F34. Line-number drift (batched)

Pure anchor drift, nothing misleading beyond the number:

- **API_CONTRACT:** the `:17` Reconciled note's offsets are wrong again. Current handler lines are
  addRating 73, newReview 126, getReviews 310, admin review moderation 491, getRecipe 463, addRecipe 540,
  editRecipe 646, deleteRecipe 740, ingredients parse 160.
- **RELEASE_PLAN:** helmet `app.js:55`→`:89`; `/privacy` `App.tsx:122`→`:200`; `/terms` `:130`→`:210`;
  `ReleaseNotes.tsx` was deleted.
- **BACKLOG:** `:887` `App.tsx:405-406`→`:416-417`; `:1907` `helpers.scss:43-44`→`:51-52`;
  `:1362` `recipes.js:856`→`:937`; `:2195` `types.ts:13-14`→`:88-89`;
  `:2181` `reviews.test.js:820`→`:1080`; `:2070-2073` "~23 `any`" is now about 14.
- **ADD_RECIPE_AUDIT:** `:195,203` `recipes.js:~546-554,595`→`:602-612,610`.
- **Dead SCSS:** `.beta-tag` rules remain (`Navbar.scss:104,170,253,265`, `DesktopNav.scss:124`) with no
  markup.

Suggested fix: re-anchor in the same pass as the content fixes. Prefer route paths over line numbers in
API_CONTRACT, as its own `:17` note already advises.

---

## Plausible

#### P1. RELEASE_PLAN says the backend `SENTRY_DSN` is set; nothing since the cutover confirms it (medium)

`docs/RELEASE_PLAN.md:269` says it was "✅ set" on 2026-06-26. CLAUDE.md says only the client DSN was
confirmed at the 1.0 cutover, and that an unset server DSN reports nothing.
`docs/evidence/CUTOVER_RUN_2026-07-11.md:102` lists the Sentry check as still open. Only the Railway
dashboard can settle it. If it's unset, server 5xx errors in prod go unreported.

Suggested fix: check the dashboard, then either re-confirm with a date or downgrade the row to `[~]`.

#### P2. Cluster0's replacement for parser data is unverified (medium)

This is the half of F12 that lives in another repo. The runbook says the parser cache was re-homed, but
this repo can't show where. BACKLOG `:1681` should close as moot once that's confirmed.

#### P3. The missing-username audit item is mostly handled by a global redirect (low)

`ADD_RECIPE_AUDIT.md:179-182` says nothing routes a user without a username to `/create-username`.
`src/context/AuthContext.tsx:376-381` now does that on auth load. `addRecipe` still throws a generic error
if it is reached anyway. The shallow clone hides when the redirect landed.

Suggested fix: mark the item partly addressed.

---

## Rejected

- **RELEASE_PLAN `:297-307` still calls route code-splitting "the biggest filed lever".** Rejected. The
  text sits inside a dated 2026-07-02 re-measure note that was true then. Code-splitting has since shipped
  (`src/App.tsx` `lazyRoute`), and BACKLOG `:1941` records it. This is history, not a current claim.
- **RELEASE_PLAN `:79-80` error-state copy differs from today's `LoadError`.** Rejected. It is a dated
  2026-07-09 runtime observation. Today's shared `LoadError` (#350) is an improvement, not a status error.
- **RELEASE_PLAN `:321` and `:335` footer column names and `.nav-content` wording.** Rejected. They describe
  what shipped at the time. The footer is now Discover / Account / Company, and the nav was rebuilt. This is
  history, not a wrong status.
- **RELEASE_PLAN `:258-260` names the Railway host as the production API origin.** Rejected. It was true
  on 2026-06-26, and the Railway host still serves `/health`. The edge-proxy topology is covered by
  CLAUDE.md and F17.
- **API_CONTRACT `:471` says `editReview` uses axios `params`.** Rejected. That bullet is struck-through
  history, and the next bullet (`:472`) correctly says both review routes now take a JSON body.
- **SECURITY_AUDIT_2026-06-11 `:134-136` ("respondServerError wired into 52 sites").** Rejected as a
  finding. It is an accurate record of what that audit did. The current-tense claim is in API_CONTRACT and
  is covered by F29.

---

## Open questions for Jesse

1. Does the prod Firebase service account have object-delete rights on the app bucket and on any other
   bucket in the project? If it does, F1 can be exploited today and should be fixed before any other doc
   work.
2. Were recipe edits and profile-photo changes left out of the daily paid quota on purpose (F2)? If yes,
   H1 should read "partially fixed, risk accepted for edits". If not, they need metering.
3. Should a rename rewrite `recipes.authorUsername`, or should the byline resolve from `userId` at read
   time (F3)?
4. Is `SENTRY_DSN` set on the prod Railway service today (P1)?
5. Is the current `storage.rules` (I2 + X3) the version deployed on the prod Firebase project?
6. Do you accept vivid `#ff5722` on the light nav, or should the nav-logo item reopen (F4)?
7. Where does the parser's `ingredients` / `ingredient_names` data live now (P2)?
8. Do GitHub tags and releases exist for 1.0.2, 1.1.0 and 1.2.0? The shallow clone has no tags, so F8's
   suggested snapshot can't say.
