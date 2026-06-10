# Add Recipe — Code Audit

Generated: 2026-05-13
Auditor: Claude Code
Files examined: 28

---

## Summary

The Add Recipe flow has been substantially de-risked by Phases 5-C, 5-D, and 5-F (server-generated `_id`, token-only identity, ingredient parser auth). The single most damaging remaining issue is post-submit UX: the server now returns the new `_id` but the client throws it away — the user lands back on an empty form with no navigation, no toast, and no confirmation of success. Secondary concerns cluster around (a) submit-button hardening (no disabled state during pending or when invalid → duplicate-submission risk), (b) silent error swallowing (catch returns `null` with no log and no specific user message), and (c) several orphan-resource paths in the multi-step submission (image uploaded → nutrition or POST fails → no cleanup).

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 5 |
| Medium | 9 |
| Low | 8 |

---

## Known Issues Cross-Referenced

- **Client-generated `_id` on recipe creation** (REFACTOR.md Decision Log, Phase 5-D) — **No longer applicable.** `src/api/recipes.ts:127` types the body as `Omit<RecipeType, '_id'>`; `:156-157` reads `result.data._id` from the 201 response. `bson-objectid` is gone. The contract is now correct. (See Cat 1 for the *navigation* gap, which is a separate, still-open issue.)
- **`POST /api/ingredients/parse` unauthenticated** (REFACTOR_NOTES.md Phase 2-E-2) — **Confirmed resolved.** `server/routes/ingredients.js:7` now applies `verifyToken`. Phase 5-F resolution is in place.
- **Redundant `userId` in query params alongside Bearer token** (REFACTOR.md Decision Log, Phase 5-C) — **Confirmed resolved for `POST /addRecipe`.** Body is the recipe object only; server stamps `userId: req.uid` (`server/routes/recipes.js:148`).
- **`server-ingredients/` directory still referenced** (REFACTOR.md Decision Log) — **No longer applicable.** No references found anywhere in the AddRecipe path; ingredient parsing flows through `/api/ingredients/parse` only.
- **`uploadRecipeImage` non-unique filenames** (REFACTOR.md Phase 6 — Deferred) — **Confirmed still applicable.** `src/api/recipes.ts:92` writes `recipeImages/${imageFile.name}` with no UUID/hash prefix. Re-flagged in Cat 4 as the deferred follow-up is still outstanding.
- **Phase 2-C DnD barrel re-exports** (REFACTOR_NOTES.md Phase 2-C) — **Confirmed wired correctly.** `src/pages/AddRecipe/Dnd/index.ts` re-exports `DndContext`, `Drop`, `Drag`; reorder reaches submission via shared parent state (see Cat 7).
- **Phase 2-D — `addRecipe` typing** (REFACTOR.md Phase 2-D Deferred) — **Resolved.** `http.post<{ _id: string }>` is now generic-typed; return is `Promise<string | null>`. No `any` in this method.
- **EnrichmentResult `source` hardcoded `'spoonacular'`** (API_CONTRACT.md Flags — Low) — **Confirmed.** `src/api/ingredientParserApi.ts:18-20` always sets `'spoonacular'`. Field is unused in the frontend; cosmetic.

---

## Findings

### Category 1: Creation Contract — _id ownership & navigation

#### [CRITICAL] No navigation or success feedback after successful create
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:122-128`
- **Description:** `RecipeAPI.addRecipe` now returns the server-generated `_id` (string) on success, or `null` on failure. The handler treats `result` as a boolean — on truthy it calls `clearForm()`; on falsy it sets a generic error. The returned ID is discarded. After a successful submission the user is left on `/add-recipe` with a blank form, no toast, no inline success message, and no navigation to the new `/recipes/<id>` page. With the form cleared identically to a load state, the user has no way to tell whether the submit succeeded, failed silently, or never fired.
- **Suggested fix direction:** Capture `const newId = await RecipeAPI.addRecipe(...)`; on truthy, navigate via `useNavigate()` to the single-recipe route (or fire a toast and redirect). On falsy keep the existing error path. This is the load-bearing reason the server contract was changed in Phase 5-D — the navigation half of that change wasn't wired up.

#### [LOW] `errors.cookTime` is dead UI
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:202-205`
- **Description:** `validate()` never assigns `newErrors.cookTime`, so the conditional render is unreachable. Either cookTime should be required (it currently isn't) or this branch should be removed.
- **Suggested fix direction:** Remove the cookTime error JSX since cook time is intentionally optional, or add cookTime to the validation set if business rules require it.

---

### Category 2: Form Validation

#### [HIGH] Submit button has no `disabled` attribute and no in-flight guard
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:249-263`, `:104-133`
- **Description:** The submit button only toggles a `valid`/`invalid` className — it remains clickable during `addRecipeLoading`. The `handleAddRecipe` body has no early return on `addRecipeLoading`. A user double-clicking, or clicking while the multi-second upload+nutrition+POST chain runs, will fire the entire pipeline twice. Each retry uploads the image again (image filename collision applies — see Cat 4), calls Edamam again, and POSTs another recipe. The result is duplicate recipes plus orphaned images.
- **Suggested fix direction:** Add `disabled={addRecipeLoading || !isFormValid}` and a guard `if (addRecipeLoading) return` at the top of the handler.

#### [MEDIUM] No max-length validation on description, ingredients, or instructions
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:53-74`
- **Description:** Title is capped at 50 chars (input cap + validation). No analogous cap on description, ingredient count, instruction count, or instruction `content` length. A pasted novel-length description or 200-instruction recipe will submit, hit MongoDB, and render badly downstream. Server has no max bounds either (`server/routes/recipes.js:138-149`).
- **Suggested fix direction:** Add reasonable bounds in `validate()` (e.g., description ≤ 500, ingredients/instructions ≤ ~50 entries each, instruction content ≤ 500). Mirror the bounds server-side as a defence-in-depth check.

#### [MEDIUM] Errors only surface on submit, not as the user fills the form
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:90-103, 105-132`
- **Description:** The `useEffect` runs `validate()` without `assignErrors`, so it computes `isFormValid` for the button class but never displays errors. Inline errors only appear after the user clicks submit (`validate(true)` on `:105`). A user filling out a long form gets no progressive feedback about what's missing.
- **Suggested fix direction:** Either run `validate(true)` in the effect (after the user has interacted at least once — track with a `hasInteracted` flag to avoid first-paint errors), or surface a per-field "this is required" badge on blur.

#### [LOW] `RecipeFormInput`'s generic `T` is bypassed at runtime
- **File:** `src/pages/AddRecipe/RecipeFormInput.tsx:29-36`, used by `ServingsInput.tsx:30`, `TimeInput.tsx:71-78`
- **Description:** `RecipeFormInput<T extends string | number | undefined>` casts `e.target.value` (always a string from the DOM) with `as T`. Numeric callers like `ServingsInput.handleChange` then do `inputVal === ''`, `!isNaN(inputVal)`, `inputVal % 1 === 0` — all of which work only because of JS coercion. Type safety is illusory here. Switching to a string-typed setter and parsing once at the boundary would make the contract honest.
- **Suggested fix direction:** Drop the generic and have callers parse the string explicitly (`Number(val)`), or split into `RecipeTextInput` / `RecipeNumberInput`.

---

### Category 3: Ingredient Parser Integration

#### Auth status — confirmed fixed
- **File:** `server/routes/ingredients.js:7`
- **Description:** `router.post('/parse', verifyToken, ...)` is in place. The Phase 5-F resolution holds. No new finding.

#### [LOW] `EnrichmentResult.source` always `'spoonacular'`
- **File:** `src/api/ingredientParserApi.ts:18-20`
- **Description:** Type advertises `'cache' | 'spoonacular'`; both branches return `'spoonacular'`. Field is unused by callers, so the only impact is a stale contract — already noted in API_CONTRACT.md Low. Re-flagged here because the parser route is in scope.
- **Suggested fix direction:** Either teach the server to report cache hits (a header or response field) and propagate, or drop the union to `'spoonacular'` until cache reporting exists.

#### [LOW] Ingredient parse failure UX is per-row-implicit
- **File:** `src/pages/AddRecipe/Ingredients/IngredientsInput.tsx:43-47`
- **Description:** Soft-fail policy is implemented correctly — the ingredient is added, a small inline warning appears: `Added "X", but couldn't fetch nutrition/image data.` This is good. The minor issue: the warning replaces itself on the next add and there's no way for the user to retroactively review which earlier ingredients ended up enrichment-less. The error state is carried on the ingredient itself (`IngredientsType` error variant) but not visually surfaced in `IngredientItem.tsx` beyond the missing image (replaced by `CiShoppingBasket`).
- **Suggested fix direction:** Add a small visual marker on enrichment-failed `IngredientItem` rows (e.g., a warning icon with tooltip "nutrition data unavailable").

---

### Category 4: Image Upload

#### [HIGH] Orphaned images on partial failure
- **File:** `src/api/recipes.ts:104-161`
- **Description:** `uploadRecipeImage` runs first (`:112-115`), then `getRecipeNutrition` (`:122-124`), then `http.post('api/addRecipe', ...)` (`:156`). If nutrition fetching throws (Edamam down/401, network error), or the POST fails (server 500, expired token), the catch block on `:158` returns `null` and the image stays in Firebase Storage forever. There is no compensating delete in the catch.
- **Suggested fix direction:** Either (a) defer image upload to *after* the recipe POST succeeds (the server stores the URL but doesn't need it to validate), or (b) keep current order but track the upload's storage ref and call `deleteObject(ref)` from the catch. Option (a) is simpler and avoids the cleanup race.

#### [HIGH] Non-unique image filenames cause silent overwrite (still open)
- **File:** `src/api/recipes.ts:92`
- **Description:** `recipeImages/${imageFile.name}` — two users uploading `IMG_1234.jpg` (a common iOS filename) overwrite each other's image. The first recipe's `recipeImage` URL keeps working but now points to the second user's photo. Already deferred in REFACTOR.md Phase 6 close-out; re-noting here because Add Recipe is the only writer.
- **Suggested fix direction:** Prefix with `${uuidv4()}-` or `${userUid}/${uuidv4()}-`. UUID is already imported at `src/api/recipes.ts:20`.

#### [MEDIUM] No pre-upload file validation
- **File:** `src/pages/AddRecipe/ImagePicker/ImagePicker.tsx:14-52`
- **Description:** `accept='image/*'` is the only filter. No size cap, no MIME re-check, no dimension floor/ceiling. A 50MB photo from a phone uploads to Firebase Storage as-is, blocks the submit pipeline for a long time, and bloats the bucket.
- **Suggested fix direction:** Add a size guard (~5MB) and a brief MIME whitelist check in `handleFileSelect`. Surface "image too large" inline.

#### [LOW] `uploadRecipeImage` returns `''` on falsy input but is unreachable
- **File:** `src/api/recipes.ts:85-102`
- **Description:** `addRecipe` only calls `uploadRecipeImage` after `validate()` confirms `recipeImage` is set, so the `else { return '' }` branch is dead. Not harmful, but the empty-string sentinel would silently store a recipe with `recipeImage: ''` if ever reached.
- **Suggested fix direction:** Remove the else branch and tighten the type signature to `imageFile: File`.

---

### Category 5: Error Handling & User Feedback

#### [HIGH] Submit failures swallowed with a generic message and no log
- **File:** `src/api/recipes.ts:158-160`, `src/pages/AddRecipe/AddRecipe.tsx:122-127`
- **Description:** The catch in `addRecipe` does `return null` with no `console.error`, no telemetry, no error propagation. The page surfaces a generic `'Failed to create recipe. Please try again.'` regardless of whether the failure was a 401 (token expired), an Edamam outage, a Firebase Storage rejection, or a network blip. The user can't act on the message and you can't diagnose it from production logs.
- **Suggested fix direction:** Log the error in the catch (at minimum `console.error('addRecipe failed', error)` — or push to a real telemetry sink). Map common failure shapes (401, network, Firebase, Edamam) to user-actionable messages.

#### [MEDIUM] Edamam call has no try/catch — bubbles into outer catch as the same generic failure
- **File:** `src/api/recipes.ts:178-181, 162-201`
- **Description:** `getRecipeNutrition` posts to Edamam without local error handling. A network error or 401 from Edamam throws, the outer `addRecipe` catch on `:158` returns `null`, and the user sees the same "Failed to create recipe." message — even though the *recipe data* was valid and the only thing that broke was a third-party API call that arguably shouldn't block creation in the first place.
- **Suggested fix direction:** Wrap the nutrition call in try/catch in `getRecipeNutrition` itself; on failure return `{ nutritionData: null, dietLabels: null }` so the recipe still gets created (matches the soft-fail pattern already used for ingredient enrichment).

#### [MEDIUM] Form retains state on failure (correct), but no retry-aware behavior
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:104-128`
- **Description:** State retention on failure is correct UX — but a retry will re-upload the image (Firebase Storage), re-call Edamam (API quota), and re-POST. There's no memoization of "image already uploaded as URL X" to short-circuit a partial-failure retry.
- **Suggested fix direction:** After a successful image upload, hold the resulting URL in state; on retry skip `uploadRecipeImage` if the same `File` reference and a URL already exist. Same idea for nutrition data.

#### [LOW] Error banner styling is a single `<p className='submit-error'>` with no role
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:246-248`
- **Description:** No `role='alert'` or `aria-live`, so screen readers won't announce the failure when it appears. `AddRecipeFormError.tsx` has the same issue.
- **Suggested fix direction:** Add `role='alert'` to the submit-error paragraph and `role='status'` (or `role='alert'`) to `AddRecipeFormError`.

---

### Category 6: Auth & Token Handling

#### Bearer token attachment — confirmed correct
- **File:** `src/api/http-common.ts:11-19`
- **Description:** Interceptor calls `user.getIdToken()` per request, so tokens auto-refresh on each call. Header is correctly omitted when no user is signed in (won't send `Bearer null`). No new finding.

#### `userId` no longer in query params for `POST /addRecipe` — confirmed
- **File:** `server/routes/recipes.js:133-159`, `src/api/recipes.ts:127-156`
- **Description:** Body is the `Omit<RecipeType, '_id'>` shape — no userId field. Server stamps `userId: req.uid` after spreading body (`:148`), so any client-side userId would be overridden. Phase 5-C resolution holds. No new finding.

#### [MEDIUM] Expired token mid-submit produces a confusing generic failure
- **File:** `src/api/recipes.ts:158-160`, `src/api/http-common.ts:13-18`
- **Description:** If `getIdToken()` succeeds (because the token was still good at request time) but the token expires during the multi-step pipeline, only the *latest* request gets a fresh token. A 401 from any leg falls into the generic catch and the user sees "Failed to create recipe" with no prompt to re-authenticate. The token-refresh interceptor pulls a fresh token per call, so this is rare in practice — but if a user lets an Add Recipe form sit overnight and clicks submit, every step will get a fresh token automatically *unless* the refresh itself fails (revoked, network down).
- **Suggested fix direction:** On a 401 status from `addRecipe`, show "Your session expired — please sign in again" and redirect to the auth flow. Distinguish 401 from other failures in the error mapping.

#### [LOW] `AuthAPI.getUsername()` is called inside `addRecipe`, throws if missing, treated as generic failure
- **File:** `src/api/recipes.ts:110-111`
- **Description:** `await AuthAPI.getUsername()` returns `string | null`. On null the function throws `'User does not exist'`. Caught by the outer catch → returns `null` → user sees the generic error. There's no path for "you're signed in but have no username, go set one up." A user mid-onboarding (post-signup, pre-username) who somehow lands on AddRecipe would hit this.
- **Suggested fix direction:** Pre-check username in `AddRecipe.tsx` before allowing submit, or differentiate this failure mode and route the user to `/create-username`.

---

### Category 7: Payload Shape & Data Integrity

#### [HIGH] Removing an instruction does not re-index the survivors
- **File:** `src/pages/AddRecipe/Instructions/InstructionsContainer.tsx:26-28`, `src/pages/AddRecipe/Instructions/InstructionList/InstructionList.tsx:19-30`
- **Description:** `removeInstruction` filters by id but doesn't recompute `index`. After removing instruction #2 from `[1, 2, 3, 4]`, the displayed list reads `1, 3, 4` (and that bad sequence is what gets POSTed). Reorder paths *do* re-index (`InstructionList.handleListChange`), but remove paths don't. The submitted payload has gaps in `instruction.index`.
- **Suggested fix direction:** Mirror the `handleListChange` re-index logic in `removeInstruction` — after `filter`, walk the survivors and rewrite `index` for content entries (skip labels).

#### [MEDIUM] Counters and rating sent in client payload despite server overrides (or absence of override)
- **File:** `src/api/recipes.ts:141-153`, `server/routes/recipes.js:148`
- **Description:** Client sends `views: 0`, `numTimesSaved: 0`, `numTimesMade: 0`, `rating: { rateCount: 0, rateValue: 0 }`. The server explicitly stamps `numTimesSaved: 0, numTimesMade: 0, views: 0` *after* spreading body (`:148`) — so those are wasted bytes but harmless. `rating`, however, is not overridden. A modified client could submit `rating: { rateCount: 999, rateValue: 5 }` and the server would store it. Combined with `formatRating` already being a known sensitive code path (recent commit `0b83ec8`), this is a subtle trust issue.
- **Suggested fix direction:** Server should also stamp `rating: { rateCount: 0, rateValue: 0 }` and `createdAt` server-side, and ignore client-supplied values for those fields. Drop the corresponding client-side payload keys.

#### [MEDIUM] `createdAt` computed client-side as epoch-ms-as-string
- **File:** `src/api/recipes.ts:145`
- **Description:** `new Date().getTime().toString()` — client clock is the source of truth for recipe creation time. A user with a wrong clock backdates their own recipe. Inconsistent with normal practice (server timestamps).
- **Suggested fix direction:** Drop from client payload; have `server/routes/recipes.js:148` stamp `createdAt: Date.now().toString()` (or a proper ISO string) at insert time.

#### [MEDIUM] `nutritionData` shape mismatch between TypeScript and runtime tolerance
- **File:** `src/types.ts:73-85`, `src/api/recipes.ts:178-201`
- **Description:** `NutritionDataType` requires every field to be present. If Edamam returns a partial response (some fields missing), the `nutritionResult: NutritionDataType = nutritionResultRes.data` cast on `:183` is a lie; downstream `nutritionResult.dietLabels` and `.healthLabels` access (`:190-191`) will throw if those fields are missing. Falsy-result guard on `:185` handles only the empty case.
- **Suggested fix direction:** Validate the Edamam response shape before casting. At minimum, defensive default the two arrays before spreading: `[...(nutritionResult.dietLabels ?? []), ...(nutritionResult.healthLabels ?? [])]`.

#### [LOW] `servings` re-coerced via `Number()` despite already being typed as number
- **File:** `src/pages/AddRecipe/AddRecipe.tsx:112`
- **Description:** `servings: Number(servings)` — `servings` state is `number | ''`, and the validation on `:64` (`if (!servings)`) prevents the empty-string case from reaching submit. The `Number()` cast is defensive but unneeded; the empty string case was already filtered out.
- **Suggested fix direction:** Drop the cast. Either trust the validator or refactor `servings` state to `number | null` to make the type contract clearer.

#### DnD reorder reaches submission — confirmed
- **File:** `src/pages/AddRecipe/Ingredients/IngredientList/IngredientList.tsx:28-30`, `src/pages/AddRecipe/Instructions/InstructionList/InstructionList.tsx:19-30`, `src/pages/AddRecipe/Dnd/DndContext.tsx:17-26`
- **Description:** `DndContext.onDragEnd` calls `handleListChange(reorderedList)` which calls `setIngredients`/`setInstructions` on the parent state. Same state used by `handleAddRecipe`. Reorder definitely reaches the payload. No new finding.

---

### Category 8: Project Convention Alignment

#### [LOW] Two components use `interface` instead of `type Props`
- **File:** `src/pages/AddRecipe/RecipeFormInput.tsx:4-15`, `src/pages/AddRecipe/ImagePicker/ImagePicker.tsx:5-8`
- **Description:** Phase 2-D standardized component signatures on `type Props =` + `FC<Props>`. These two still use `interface`. Cosmetic but inconsistent.
- **Suggested fix direction:** Mechanical conversion to `type ...Props = { ... }`.

#### [LOW] `ImagePicker` uses `React.FC` while siblings use `FC`
- **File:** `src/pages/AddRecipe/ImagePicker/ImagePicker.tsx:10`
- **Description:** All other AddRecipe components import `FC` and use it bare. `ImagePicker.tsx:10` uses `React.FC<ImagePickerProps>`. Same drift as above.
- **Suggested fix direction:** Switch to `import React, { FC } from 'react'` and use `FC<ImagePickerProps>`.

#### [LOW] `Dnd/{DndContext,Drag,Drop}.tsx` end with `export {}`
- **File:** `src/pages/AddRecipe/Dnd/DndContext.tsx:36`, `Drag.tsx:21`, `Drop.tsx:27`
- **Description:** The trailing `export {}` lines are a holdover from Phase 2-C's barrel work to force module-mode interpretation. Each file already has a real export, so the trailing line is dead.
- **Suggested fix direction:** Delete the trailing `export {}` lines.

#### [LOW] `react-select` `customStyles` use `any` for `provided`/`state`
- **File:** `src/pages/AddRecipe/CuisineSelector/CuisineSelector.tsx:21-43`, `src/pages/AddRecipe/MealTypeSelector/MealTypeSelector.tsx:16-38`
- **Description:** `(provided: any, state: any) =>` in `StylesConfig` callbacks. `react-select` exports proper types (`ControlProps`, `OptionProps`) — these `any` casts were likely flagged by Phase 2-D and left for later.
- **Suggested fix direction:** Type the callback args properly (`react-select` v5 has these typings) or add a project-level eslint exception with a TODO.

#### [LOW] `MealTypeSelector` placeholder says "Select a cuisine..."
- **File:** `src/pages/AddRecipe/MealTypeSelector/MealTypeSelector.tsx:76`
- **Description:** Copy-paste from `CuisineSelector`. Cosmetic but visible to users.
- **Suggested fix direction:** Change to `'Select meal types...'`.

---

## Recommended Fix Order

Critical → High items only, ranked by blast radius / ease of fix:

1. **[Critical]** AddRecipe.tsx navigation after success — wire `useNavigate` to the returned `_id`. Smallest diff, biggest UX win, restores the intent of the Phase 5-D contract change. (`src/pages/AddRecipe/AddRecipe.tsx:122-128`)
2. **[High]** Disable submit button while loading or invalid — one-line `disabled` prop + early-return guard. Prevents duplicate recipes and orphaned images outright. (`AddRecipe.tsx:249-263`)
3. **[High]** Re-index instructions on remove — mirror the `handleListChange` re-index logic. Prevents corrupt index sequences in stored recipes. (`InstructionsContainer.tsx:26-28`)
4. **[High]** Surface the underlying error from `addRecipe` — at minimum log to console in the catch, ideally map common HTTP codes to actionable messages. Unblocks any future production debugging. (`src/api/recipes.ts:158-160`)
5. **[High]** Image filename uniqueness — UUID prefix in `uploadRecipeImage`. Already imported. Stops silent cross-recipe image overwrites. (`src/api/recipes.ts:92`)
6. **[High]** Image cleanup or upload-after-POST reordering — pick one of the two suggested fix directions. Stops the orphaned-image accumulation. (`src/api/recipes.ts:104-161`)

---

## Files Examined

Source files (read in full):
1. `src/pages/AddRecipe/AddRecipe.tsx`
2. `src/pages/AddRecipe/AddRecipeFormError.tsx`
3. `src/pages/AddRecipe/RecipeFormInput.tsx`
4. `src/pages/AddRecipe/RecipeFormTextArea.tsx`
5. `src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer.tsx`
6. `src/pages/AddRecipe/Ingredients/IngredientList/IngredientList.tsx`
7. `src/pages/AddRecipe/Ingredients/IngredientsInput.tsx`
8. `src/pages/AddRecipe/Ingredients/IngredientItem.tsx`
9. `src/pages/AddRecipe/Instructions/InstructionsContainer.tsx`
10. `src/pages/AddRecipe/Instructions/InstructionList/InstructionList.tsx`
11. `src/pages/AddRecipe/Instructions/InstructionItem/InstructionItem.tsx`
12. `src/pages/AddRecipe/ImagePicker/ImagePicker.tsx`
13. `src/pages/AddRecipe/Dnd/DndContext.tsx`
14. `src/pages/AddRecipe/Dnd/Drag.tsx`
15. `src/pages/AddRecipe/Dnd/Drop.tsx`
16. `src/pages/AddRecipe/Dnd/index.ts`
17. `src/pages/AddRecipe/ServingsInput/ServingsInput.tsx`
18. `src/pages/AddRecipe/TimeInput/TimeInput.tsx`
19. `src/pages/AddRecipe/CuisineSelector/CuisineSelector.tsx`
20. `src/pages/AddRecipe/MealTypeSelector/MealTypeSelector.tsx`
21. `src/pages/AddRecipe/AddLabel/AddLabel.tsx`
22. `src/api/recipes.ts`
23. `src/api/http-common.ts`
24. `src/api/ingredientParserApi.ts`
25. `src/types.ts`
26. `src/util/hrMinToMin.ts`
27. `src/util/calculateServingPrice.ts`
28. `src/util/validateIngredientQuantityStr.ts`
29. `src/util/reorder.ts`
30. `server/routes/recipes.js`
31. `server/routes/ingredients.js`
32. `server/middleware/auth.js`

Cross-reference docs:
- `REFACTOR.md` (full)
- `REFACTOR_NOTES.md` (targeted excerpts: Phase 2-C, 2-E-2, 5-A through 5-G — via grep)
- `API_CONTRACT.md` (full — note: pre-Phase-5 baseline; many items now superseded)

Note on the reading list: the planned `RecipeTagsInput` component does not exist. Only an unused `.recipe-tags-input` SCSS class in `RecipeFormInput.scss` and a display-only `Tags.tsx` in `SingleRecipe`. No tag editor component is wired into AddRecipe, and per Phase 5-B all tag-related API methods were deleted as unused. No additional reading was needed.
