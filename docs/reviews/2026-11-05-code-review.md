# Whole-repo correctness review, 2026-11-05

Review only. No code, config or tests changed. Base: `development` at `f715151` (merge of #354).

Five read-only subagents each took one area: server auth and permissions, server data integrity, frontend data layer, recipe create/edit/view plus `src/util`, and the remaining pages and components. Each got the list of issues already filed in `SECURITY_AUDIT_2026-06-11.md`, `SECURITY_AUDIT_2026-07-11.md`, `DATA_INTEGRITY_AUDIT.md` and `BACKLOG.md`, and was told not to repeat them. I then read the code behind every finding and sorted it into confirmed, plausible or rejected. Where two agents found the same bug, it appears once below.

"Confirmed" means I traced the code path and the trigger holds. Two findings were also proven by running code: the recipe-page ingredient bug (a throwaway Vitest test with a control case, deleted afterwards) and the string-ingredient crash (a one-line `node -e` call against the server util). The server Jest suite could not run in this container (see "Test results"), so no server finding was proven by a live request.

Counts: 37 confirmed, 8 plausible, 2 rejected.

---

## Confirmed findings

### High

#### 1. Recipe page shows the previous recipe's ingredients when both recipes have the same serving count

- Where: `src/pages/SingleRecipe/SingleRecipe.tsx:127-144` (`modIngredients` state and the `[servingSize]` effect), route at `src/App.tsx:166`.
- Trigger: open a 4-serving recipe, then open another 4-serving recipe without a full reload (navbar autocomplete, or any in-app link to `/recipes/:id`). The route has no `key`, so `SingleRecipe` is reused. The fetch effect calls `setServingSize(4)`, which matches the current state, so React skips the update. The `[servingSize]` effect never runs, and `ingredients = modIngredients` still holds recipe A's list.
- Impact: recipe B renders with its own title, image and instructions next to recipe A's ingredient list. The print view gets the same wrong list. 4 servings is the most common value, so this is easy to hit.
- Proof: throwaway Vitest test. A → B with equal servings rendered A's ingredient and not B's. The control (B with 6 servings) rendered B's ingredient. Test file deleted.
- Fix: derive the scaled list with `useMemo` from `currRecipe` and `servingSize` instead of holding it in state, or key the route element on `recipeId` so the page remounts.

### Medium

#### 2. Creating a collection from the save popover can remove the recipe from its other collections

- Where: `src/Components/AddToCollection/AddToCollectionPopover.tsx:78-109` (`handleCreate`); server `collections.js` PATCH `/recipes/:recipeId/collections` replaces `collectionIds`.
- Trigger: a saved recipe is in collections A and B. Open the popover while `getSavedRecipe` is still loading or has failed. The checkboxes are blocked, but the "New collection" form is not. Type a name and press Enter.
- Impact: `next` is built from the empty `selected` set, so the PATCH sends only the new id and silently drops A and B. This is the same data loss the load-error guard was added to stop; the guard only covers the toggles.
- Fix: disable the create form (or skip the filing step and only create the collection) while `loading || loadError`.

#### 3. "Load more" on the Account tabs can skip a page for good

- Where: `src/pages/Account/usePaginatedLoadMore.ts:85-116`; buttons in `SavedRecipes.tsx:386`, `UserRecipes.tsx`, `UserRatings.tsx:161`.
- Trigger: double-click "Load more" on a slow connection. `page` goes 0 → 2 and page 1 is never fetched. Separately, if page N fails after retries, the list is non-empty so no error shows, `isMore` stays true, and the next click requests N+1.
- Impact: saved recipes, ratings or created recipes silently never appear. The same click also swaps the whole loaded grid for skeleton cards while the next page loads, because `isLoading` is true for the new page's key.
- Fix: disable the button while the current page is loading, expose `isError` for pages after 0 with a retry that stays on the same page, and keep showing loaded items during a next-page load (`placeholderData: keepPreviousData` or a separate loading flag).

#### 4. Instruction step numbers are wrong once a section label exists

- Where: `src/pages/AddRecipe/Instructions/InstructionsContainer.tsx:47-50`.
- Trigger: add a label ("For the sauce"), then add two steps. The filter meant to count only content steps returns `instr` in both branches, so labels are counted and the steps get index 2 and 3. Steps are renumbered only on remove or drag.
- Impact: the published page (`SingleRecipe.tsx:252`) and the print view show `instr.index`, so readers see steps numbered 2, 3, 5 and so on.
- Fix: make the filter `'content' in instr`, and renumber all content steps on submit so already-saved recipes heal on their next edit.

#### 5. Recipe search filters don't follow the URL

- Where: `src/pages/Recipes/Recipes.tsx:56-65` (filters read from the URL once on mount), `:68-84` (every change pushes a history entry); search submit in `SearchRecipesInput.tsx` navigates to `/recipes?q=…`.
- Trigger: on `/recipes`, select Vegan, then press Back. The URL loses `dietTags`, but the chip stays active and results stay filtered. Or, with Italian active, search "pasta": the URL becomes `?q=pasta` while results stay Italian-only, so a refresh or shared link silently drops the filter.
- Impact: Back and Forward don't work for filters, and shared or bookmarked links don't match the screen.
- Fix: derive sort and filters from `useSearchParams` on every render instead of mirroring them into state, and have the search submit keep the existing filter params.

#### 6. Two paid Cloud Vision paths have no daily quota

- Where: `server/routes/auth.js:272-288` (`POST /updatePhoto` scans any non-empty `photoURL`) and `server/routes/recipes.js:690-693` (`PUT /editRecipe` scans every changed `recipeImage`). Only `/addRecipe` has `recipeCreateQuota` (`recipes.js:532`).
- Trigger: a script alternates `photoURL` (30/min under `profileWriteLimiter`) or `recipeImage` on an owned recipe (12/min under `recipeWriteLimiter`) between two public image URLs, from several accounts. The URL isn't required to be in the caller's Storage path.
- Impact: roughly 43k and 17k Vision calls per account per day respectively, with no global ceiling. This reopens the Sybil cost drain that audit H1 closed for creates. The comment at `recipes.js:530` treats edit image changes as rare; it doesn't cover `updatePhoto` at all.
- Fix: put both behind `makePaidQuotaLimiter` (a `photo` surface, and the `recipe` surface or a new one for edits), charged only when a scan will actually run.

#### 7. Editing an ingredient skips the 200-character cap, which breaks autosave and publish

- Where: `src/pages/AddRecipe/Ingredients/IngredientItem.tsx:244-274` (`handleEditSubmit`) and the edit `FormInput` at `:561`, which has no `characterLimit`. The add input does enforce `INGREDIENT_MAX_LENGTH`.
- Trigger: click an existing ingredient row, paste a line longer than 200 characters, press Enter.
- Impact: the server's `validateRecipeBounds` rejects the over-long `originalIngredientString`. Every draft autosave then 400s and the badge stays on "error". Publish passes client validation, uploads the image, then fails with a toast. A whitespace-only edit also gets through and leaves a blank row.
- Fix: apply the same length cap and a `trim()` empty check in the edit path, and have `validateRecipeForm` check per-ingredient length so a bad row blocks publish before the image upload.

#### 8. Account "Ratings" tab shows 0.0 stars and "invalid date" for review-only entries

- Where: `src/pages/Account/UserRatings/UserRatings.tsx:69,80,85`.
- Trigger: write a review without picking a star (the composer allows it), or remove the rating but keep the review, then open Account → Ratings.
- Impact: `Number(null)` renders as empty stars and "0.0", and `timeElapsedSince('')` renders "invalid date". It reads as a 0-star rating. The public review card already guards `rating !== null`.
- Fix: hide the stars and number when `rating` is null, and fall back to `reviewLastUpdated`/`reviewCreatedAt` for the date.

### Low-medium

#### 9. `getTrendingRecipes` accepts a negative limit

- Where: `server/routes/recipes.js:318`, `Math.min(parseInt(req.query.limit) || 4, 20)` with no lower bound.
- Trigger: `GET /api/getTrendingRecipes?limit=-100000`. The MongoDB driver turns a negative limit into `limit: |n|, singleBatch: true` (`mongodb/lib/operations/find.js:72-74`).
- Impact: an unauthenticated caller gets up to the whole visible catalog in one response, past the cap of 20. A gap in the #306 pagination sweep; the sibling at `:342` has the floor.
- Fix: `Math.max(1, …)`, plus a regression test with a negative limit.

#### 10. A recipe's rating summary can be overwritten by an older snapshot

- Where: `server/util/recipeRating.js:48-55`, called from `reviews.js:120,300,528`.
- Trigger: two users rate the same recipe at the same moment. Recompute A reads only A's rating, recompute B reads both and writes, then A's blind `$set` lands last.
- Impact: the stored average, count and histogram stay wrong until the next rating on that recipe or a run of `reconcileRatingAggregates.js`.
- Fix: compute and write in one step with an aggregation-pipeline update on the recipe (`$lookup` is not allowed there, so either a `$merge` pipeline from `ratings`, or a version field and conditional write with retry).

#### 11. An owner's edit can weaken a concurrent admin takedown

- Where: `server/routes/recipes.js:717` decides `shouldHold` from the recipe read at the start of the request; `server/util/automod.js:279` then sets `status: 'pending_review'` unconditionally.
- Trigger: the owner saves an edit whose text scores medium. While the moderation calls run (seconds), an admin hides the recipe. The hold then overwrites `hidden` with `pending_review`.
- Impact: breaks the "never downgrade an admin takedown" rule stated at `recipes.js:712`. The recipe becomes owner-visible and an admin approve in the queue can republish it.
- Fix: make the hold write conditional, `{ status: { $nin: ['hidden', 'unpublished'] } }`.

#### 12. Deleting an account leaves save and made counts too high on other users' recipes

- Where: `server/routes/auth.js:510`, `userRecipeData.deleteOne` inside the cascade.
- Trigger: user X saves and marks as made recipe R (owned by Y), then deletes their account.
- Impact: R keeps +1 `numTimesSaved` and +1 `numTimesMade` forever, which feeds the popular sort, For-You scoring and public-profile totals. Throwaway accounts can inflate a recipe and then delete themselves. This is a separate hole from M5 (live inflation).
- Fix: before the delete, read the departing user's saved and made ids and `$inc: -1` each recipe inside the transaction, with the same `$max 0` floor unsave uses.

#### 13. A stored serving size pins the recipe page to the old value after an author edit

- Where: `src/pages/SingleRecipe/SingleRecipe.tsx:127-144`.
- Trigger: the `[servingSize]` effect writes to localStorage on first view, not only when the reader changes servings. The author views a 4-serving recipe, edits it to 6 servings with new quantities, and is sent back to the page.
- Impact: the page shows "4 servings" and scales the new quantities by 4/6, so the edit looks like it didn't take. Every earlier viewer sees the same.
- Fix: write to localStorage only on a user-initiated change, or store the recipe's `servings` alongside and ignore the stored value when the recipe's base servings changed.

#### 14. Public profile shows "Profile not found" when the request actually failed

- Where: `src/pages/PublicProfile/PublicProfile.tsx:222`, `if (isError || !data)`.
- Trigger: open `/u/alice` while the API returns 5xx or times out. `getPublicProfile` maps 404 to null and rethrows other errors, but the page renders both the same way, with `retry: false` and no retry button.
- Impact: a real profile is reported as nonexistent.
- Fix: render an error state with "Try again" for `isError`, and keep "not found" for `!data`.

#### 15. Browser Back loops at `/account` and the auth redirects

- Where: `src/pages/Account/Account.tsx:29-36` (`navigate(accountTabs[0].to)` without `replace`); `<Navigate>` without `replace` in `PrivateRoute.tsx:7`, `AdminRoute.tsx:14`, `Login.tsx:29`, `Signup.tsx:39`.
- Trigger: open Account from the navbar (bare `/account`), then press Back. You land on `/account`, which pushes `/account/saved-recipes` again.
- Impact: the user can't go back past that page.
- Fix: pass `{ replace: true }` / `<Navigate replace>`. Related: `PrivateRoute` passes no `from`, so a logged-out deep link lands on Home after login.

#### 16. Admin bug-report bulk actions include reports from other pages

- Where: `src/pages/Admin/BugReports/BugReports.tsx:108` sends `Array.from(selected)`; Next/Previous (`:298-309`) don't clear `selected`.
- Trigger: tick 3 reports on page 1, go to page 2, tick 1, click "Dismiss selected" ("4 selected").
- Impact: reports the admin can no longer see get closed, and closed reports can't be reopened. `Reports.tsx` re-derives ids from the visible list; this page doesn't.
- Fix: clear the selection on page change, or intersect `selected` with the visible open reports before sending.

### Low

#### 17. A review's author can see the admin uid that moderated it

- Where: `server/routes/auth.js:370` (`exportMyData` exports `ratings` with no projection), `server/routes/reviews.js:176-177` (`newReview` returns the whole doc) and `:189-191` (`checkIfReviewed` spreads the whole doc).
- Trigger: an admin hides and restores user U's review (`reviews.js:519` writes `moderatedBy`/`moderatedAt`). U calls any of the three.
- Impact: reveals which admin acted. Same class as audit M1 and #226/#227; the export code comment says it "never carries admin Firebase uids", which holds for recipes and drafts only.
- Fix: project ratings through `REVIEW_PUBLIC_FIELDS` (or `$unset` the moderation stamps) on all three paths.

#### 18. A rename rewrites reports by handle, so another account's reports can move to an innocent user

- Where: `server/routes/auth.js:201-206`, `reports.updateMany({ reportedUsername: prevUsername }, …)`.
- Trigger: user A ("alice") is reported, then deletes their account, freeing the handle. User B claims "alice", then renames to "bob". A's reports now read "@bob" in the admin queue.
- Impact: moderation history attributed to the wrong person. Pinned behaviour in `auth.test.js` covers only same-user propagation.
- Fix: filter on `reportedUid: uid`, with a handle fallback only where `reportedUid` is null; consider clearing or tombstoning `reportedUsername` on account delete.

#### 19. `deleteReview` and `removeRating` decide from a stale read

- Where: `server/routes/reviews.js:246-260` and `:282-297`.
- Trigger: a review-only doc. Tab 1 sends `DELETE /deleteReview` and reads `rating: null`. Tab 2's `addRating` lands. Tab 1's unconditional `deleteOne` then removes the new rating, and `deleteReview` doesn't recompute, so the recipe still counts it. The mirror case loses a just-posted review via `removeRating`.
- Impact: lost user content and a stale aggregate. Breaks CONVENTIONS §3.6.
- Fix: make each branch conditional on what was read (`deleteOne({ userId, recipeId, rating: null })`, and fall back to the `$set` branch if it matches nothing), and recompute after `deleteReview` when a delete happened.

#### 20. Filing a recipe into collections can return 200 without applying the change

- Where: `server/routes/collections.js:341-355`.
- Trigger: double-tap save and the collection popover so the PATCH sees "not saved" but a concurrent save wins. The upsert hits E11000, which is swallowed.
- Impact: the response says `{ collectionIds, saved: true }` but `collectionIds` was never written.
- Fix: on E11000 (or `matchedCount === 0`), fall through to the `isSaved` branch's `$set` of `savedRecipes.$.collectionIds`.

#### 21. A plain-string ingredient makes add and edit return 500

- Where: `server/util/calculateServingPrice.js:23`, `'parsedIngredient' in ingr`, which runs before `validateRecipeBounds`.
- Trigger: `POST /api/addRecipe` with `ingredients: ["eggs"]` (or the same on `PUT /editRecipe`).
- Impact: TypeError → 500 and a Sentry event, after the daily recipe quota was charged. Proven with `node -e`: "Cannot use 'in' operator to search for 'parsedIngredient' in eggs".
- Fix: guard with `typeof ingr === 'object'` in the util, and reject non-object ingredient elements in `validateRecipeBounds`.

#### 22. Empty review text is accepted

- Where: `server/routes/reviews.js:130` (`newReview`) and `:206` (`editReview`) accept `''`.
- Trigger: `POST /api/newReview { recipeId, reviewText: "" }` on a recipe the caller hasn't rated.
- Impact: inserts `{ rating: null, reviewText: '' }`, the empty doc `deleteReview`/`removeRating` work to avoid. `checkIfReviewed` then reports `reviewed: true` and the doc counts in the Ratings badge. Only direct API calls hit it; the UI enforces a minimum.
- Fix: reject a trimmed-empty `reviewText`; in `editReview`, route an empty text to the `deleteReview` logic.

#### 23. `userRecipes` entries are never removed

- Where: `server/routes/recipes.js:632` pushes `{ recipeId: newId }` as an ObjectId; `server/util/teardownRecipe.js:26` pulls `{ recipeId: String(recipe._id) }`.
- Trigger: create a recipe, delete it, read `userRecipeData.userRecipes`.
- Impact: the ObjectId entry stays forever. Nothing reads `userRecipes` today, so it's invisible, but it contradicts the "string id everywhere" assumption in `migrateLegacyRecipeIds.js:18`. The teardown test seeds a string id, so it doesn't catch this.
- Fix: push `String(newId)`, and have the pull match both shapes until a cleanup script runs.

#### 24. Settings can't do a case-only username change and doesn't check the charset

- Where: `src/pages/Settings/sections/ProfileSection.tsx:84-112`, against `server/routes/auth.js:107-117`.
- Trigger: change "JaneDoe" to "janedoe". The public availability check matches the user's own doc by `username_lower` and returns "taken"; Save then refuses. The server's `setUsername` would allow it. Separately, "bob!x" shows "available" and only fails on Save with a 400.
- Fix: treat a case-insensitive match with the current username as available, and apply `^[a-zA-Z0-9._-]+$` client-side before the availability call.

#### 25. "Saved" toast shows even when the save fails

- Where: `src/Components/AddToCollection/SaveControl.tsx:126-127`; `useSaveRecipe.toggle` returns false on error with no toast.
- Trigger: the save returns 5xx, 429 or 409. Also: clicking an already-saved card before `['savedRecipeIds', uid]` loads sends a save that 409s.
- Impact: the user sees "Saved" while the bookmark quietly reverts.
- Fix: await `toggle()` and show the toast only when it returns true, with an error toast otherwise.

#### 26. Deleting a draft fails silently and leaves the Drafts badge stale

- Where: `src/pages/Account/Drafts/DraftCard.tsx:67-74` (`try/finally`, no `catch`) and `Drafts.tsx:21-24` (invalidates only `['drafts']`).
- Trigger: delete a draft while offline or after another tab deleted it. Or delete one normally and look at the tab badge.
- Impact: failure is an unhandled rejection with no toast. On success, the "Drafts N" badge (from `['account-counts', uid]`) keeps the old number until refocus.
- Fix: catch and toast; also invalidate `['account-counts', uid]`.

#### 27. Public profile skips a recipe page after a failed "Load more"

- Where: `src/pages/PublicProfile/PublicProfile.tsx:169-185` and `:429`.
- Trigger: page 1 fails after retries; nothing is shown and the button re-enables; the next click requests page 2.
- Impact: page 1's recipes never appear and "Showing X of Y" stays short.
- Fix: show the error and retry the same `extraPage` instead of incrementing.

#### 28. A recipe saved with 0h 0m prep time can't be re-edited

- Where: `src/pages/AddRecipe/TimeInput/TimeInput.tsx:78-81` emits `{0,0}` for "0"/"0"; `recipeFormValidation.ts:91` accepts it; `src/util/minToHrMin.ts:7` turns a stored 0 back into null.
- Trigger: create with Hours 0, Minutes 0, then open Edit (or resume a draft).
- Impact: the edit form says "Prep time is required" for a value the form accepted; draft resume drops the time.
- Fix: decide whether 0 is valid. If yes, `minToHrMin` should return `{0,0}` for 0 and null only for null; if no, reject `{0,0}` at validation.

#### 29. `closestFraction` rounds small remainders up to 1/8

- Where: `src/util/formatQuantity.ts:20-40`.
- Trigger: `1.05` → "1 1/8", `2.04` → "2 1/8" (1 cup scaled from 20 to 21 servings is 1.05).
- Impact: scaled quantities show an extra 1/8 that isn't there. Remainders between 0 and 1/16 should round down to the whole number.
- Fix: add a round-down check mirroring the existing round-up (`decimal <= closestDistance` → whole number), with tests for 1.03 and 1.05.

#### 30. The servings stepper is dead above 99

- Where: `src/pages/SingleRecipe/SingleRecipe.tsx:158-160` accepts only 1-99; the server allows up to 1000.
- Trigger: a 120-serving recipe (only possible through the API, the form caps at 99). Plus and minus both do nothing.
- Fix: use the server's max, or clamp to the recipe's own servings.

#### 31. Suspended users get the same achievement toast on every Account visit

- Where: `src/pages/Account/useAchievementsToast.ts:18-35`; `server/routes/gamification.js:39` requires `requireActive`.
- Trigger: a suspended or banned user with an unacknowledged achievement opens Account.
- Impact: the acknowledgement always 403s, the interceptor toasts "Your account is suspended", and the achievement toast fires again on every mount.
- Fix: skip the toast and acknowledgement for non-active accounts, or let the acknowledgement through `requireActive` the way deletes are.

#### 32. Admin Reports queue silently shows at most 50 reports

- Where: `src/pages/Admin/Reports/Reports.tsx:42`, `perPage: 50` with no paging or count.
- Impact: older open reports never appear in the queue.
- Fix: add paging (the server already paginates) or a "showing 50 of N" notice.

#### 33. `GET /admin/users` returns 500 on a repeated `query` param

- Where: `server/routes/admin.js:175`, `(req.query.query || '').trim()`.
- Trigger: `?query=a&query=b` makes an array under the 'simple' parser.
- Fix: `typeof === 'string'` check, as #117 did for the public routes.

#### 34. `POST /updatePhoto` returns 500 for a non-URL string when Vision is off

- Where: `server/routes/auth.js:288`. With `GOOGLE_VISION_API_KEY` unset or `MODERATION_ENABLED=false`, the scan passes and the Admin SDK `updateUser` throws `auth/invalid-photo-url` (`firebase-admin/lib/auth/auth-api-request.js:388`).
- Fix: validate `https:` URLs before the scan and return 400.

#### 35. Account delete keeps the user's bug reports and email address

- Where: `server/routes/auth.js:515-517` anonymizes `reports` only; `bugReports` keeps `reporterUid` and `reporterEmail` (`bugReports.js:69-70`).
- Impact: personal data survives an account delete, inconsistent with D6.
- Fix: `$set: { reporterUid: null, reporterEmail: null }` on the user's bug reports inside the transaction.

#### 36. Data export leaves out collections

- Where: `server/routes/auth.js:403-418`.
- Impact: `userRecipeData.collections` (names and ids) isn't exported, so the `collectionIds` on saved entries resolve to nothing.
- Fix: add `collections` to the export.

#### 37. Review "Top" sort has no tiebreaker, so pages can repeat or skip reviews

- Where: `server/routes/reviews.js:327` and `:392`, `sort = { rating: -1 }` with skip/limit paging.
- Trigger: a recipe with more than one page of reviews where many share a rating (ratings are 1-5, so ties are the norm). MongoDB doesn't guarantee a stable order among ties across separate skip/limit queries.
- Impact: "Load more" can show a review twice and never show another. I found this while verifying; no subagent reported it. Confirmed from the code and MongoDB's documented sort behaviour, not from a run.
- Fix: add `_id: -1` as a secondary sort key to "top". "New" sorts on a millisecond timestamp, so ties there need two reviews in the same millisecond; adding the same tiebreaker costs nothing.

---

## Plausible findings

These follow from the code but depend on runtime facts I couldn't check here.

1. **Large recipes may fail with 413.** `src/api/recipes.ts:491-503` sends the raw Edamam `nutrition/details` response as `nutritionData`, and `server/app.js:88` uses `express.json()` with the default 100kb limit. If Edamam's per-ingredient `parsed[].nutrients` maps are included (about 2-3KB each), 40-50 ingredients plus long instructions could exceed 100kb; the user would see "Bad request" and the uploaded image is deleted. Needs a real payload size from dev. Fix if real: store only the fields the nutrition card reads.
2. **Draft keepalive flush can fail silently for large drafts.** `src/api/drafts.ts:100-145`. Browsers cap `keepalive` bodies at 64KiB; the `.catch(() => {})` swallows the rejection and the function returns true. A draft near the limits (50 long instructions, 50 enriched ingredients) could lose its last edits on tab close.
3. **A late add-lookup can overwrite an ingredient edit.** `IngredientsContainer.tsx:51-55` with `IngredientItem.tsx:227-274`. A row is editable while its add-path lookup is pending; when that lookup returns after the edit's lookup, it replaces the row by id with the original string. #304's guard covers only re-entry into the edit submit.
4. **Hydration retry can drop draft fields.** `src/pages/AddRecipe/useRecipeForm.ts:341-349,384-387`. After a transient `getDraft` failure the user is told to keep editing; when the retry succeeds, the pristine-field merge skips every field the user touched, then the next autosave writes the live values over the server draft. The merge was designed for sub-second keystrokes and #315's retry stretches the window to whole fields.
5. **Recipe edit response lacks `authorPhotoURL`.** `useRecipeForm.ts:603` writes the `PUT /editRecipe` response into `['recipe', id]`, but that response is the raw doc without the author enrichment `getRecipe` adds, so the avatar may show the default until the refetch the comment says it avoids.
6. **Navbar avatar is stale after a photo change.** `src/context/AuthContext.tsx:253-256,281-284`. `user.reload()` mutates the same object without `setUser`, so context consumers may not re-render until navigation.
7. **A username-less user can get past CreateUsername with Back.** `AuthContext.tsx:367-402`: the redirect runs once per user change. After signup, Back to `/signup` redirects to `/`, and the user stays without a username until reload, so publish and review return 400.
8. **Profile save can half-apply.** `AuthContext.tsx:253-260` applies a new avatar before `setUsername` runs; if the username then fails (for example the charset case in #24), the photo changed but the UI shows an error.

---

## Rejected

1. **Paid quota is charged before body validation** (`recipes.js:540`, `nutrition.js:41`, `ingredients.js:160`). True as described, but counting attempts is the conservative choice for a spend ceiling, and only a client repeatedly sending invalid bodies can burn the 50/day allowance, which is four times the per-minute limiter. Judgment call; not a bug.
2. **Admin status `reason` isn't type-checked** (`admin.js:273,299`). Only an admin can send it and the admin UI always sends a string. Not a correctness issue for real users.

---

## Open questions for Jesse

1. The Vision exemption on `editRecipe` is documented in a comment at `recipes.js:530`. Was leaving `updatePhoto` out of the paid quota also intentional? (Finding #6.)
2. Should the recipe page remember a reader's serving size across visits at all? If yes, finding #13 only needs to stop storing the default; if no, the localStorage feature can go.
3. Is 0 minutes a valid prep time (finding #28)?
4. Should review-only entries appear in the Account Ratings tab? `reviews.test.js:1349` pins that they do; finding #8 is about how they render, not whether.
5. Plausible #1 needs one real Edamam `nutrition/details` response size from dev before it's worth fixing.

---

## Test results

Run in this cloud container on Node 22.23.4 (the repo pins Node 24 in `.nvmrc` and `engines`). No `.env`, no Firebase or MongoDB access.

- **Frontend (`npm test`, Vitest 4.1.5): 108 files passed, 876 tests passed, 2 skipped.** Install note: `npm ci` with npm 10.9.9 rejected the lockfile (`uuid@11.1.1` vs `uuid@9.0.1`, the Admin SDK override); npm 11 installed it cleanly, with `CYPRESS_INSTALL_BINARY=0` because the Cypress binary download was cut off. Both are container issues, not repo issues.
- **Server (`cd server && npm test`, Jest): did not run.** `mongodb-memory-server` downloads MongoDB 8.2.6 from `fastdl.mongodb.org`, which this environment's network policy blocks (403 from the egress proxy), so the global `MongoMemoryReplSet` setup failed before any test ran. I didn't substitute another binary. No server result is claimed here.
- Not run: typecheck, build, Cypress.
