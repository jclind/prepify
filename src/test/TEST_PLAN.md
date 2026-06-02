# Frontend Test Plan

Tests are grouped by component. Each entry names what the test asserts and explains
why that assertion matters (the failure mode it catches, the edge case it guards).

Nothing below is implemented yet — this file is purely the plan.

---

## RecipeThumbnail

The thumbnail is the most-rendered component in the app and has two very different
modes (loading skeleton vs populated card). Getting those branches right matters.

- **Shows skeleton for image, price, time, and rating when `loading=true`**
  Guards against accidentally rendering real data during a loading state, which
  would either crash (no recipe) or flash incomplete data.

- **Renders recipe image, title, price, time, and rating when recipe data is present**
  Basic smoke test that the happy path renders the right content.

- **Shows image skeleton (not a broken <img>) when recipe has no `recipeImage`**
  `recipeImage` is optional; the condition `!recipe?.recipeImage` should fall back
  to Skeleton, not render an img with src=undefined.

- **Displays "0" (not NaN or blank) for rating when `rateCount` is 0**
  `rateCount: 0` short-circuits to a literal `0` string. Without this guard the
  formatRating helper would produce NaN.

- **Shows "1 min" (singular) when `totalTime` is exactly 1**
  The plural branch is `> 1`; totalTime=1 must land on the singular branch.

- **Clicking the card navigates to `/recipes/:id`**
  Core interaction — clicking a thumbnail must route to the single recipe page.
  If `loading=true` the click should be a no-op (navigation guard exists in code).

---

## Browse Page (Recipes)

This page owns the search-and-filter loop. Most test-worthy behaviors involve the
interplay between URL state, filter state, API calls, and the results list.

- **Shows 4 loading skeleton cards on initial render before the API resolves**
  The skeleton path (`!recipeList[0]`) must render while `filtersLoading` is true
  and no data has arrived yet.

- **Renders recipe thumbnails once the API resolves with results**
  Happy-path check: the recipeList maps to the correct number of RecipeThumbnail
  components.

- **Shows "No Results Found" when the API returns `total_results: 0`**
  The component only shows this message for the explicit zero case. An empty list
  with null totalResults (pre-fetch) should NOT show it.

- **"Load More" button is visible when `total_results > recipeList.length`**
  Guards the condition on line 120. All three conditions (totalResults truthy,
  greater than loaded count, currPage not null) must be satisfied simultaneously.

- **"Load More" button is absent when all results are already loaded**
  After loading the last page, `totalResults === recipeList.length` and the button
  must disappear.

- **"Load More" is disabled while a fetch is in flight**
  The button gets `disabled={fetchRecipesLoading}`. Prevents double-fetching.

- **Clicking "Load More" calls `getAllRecipes` with the next page number**
  Verifies `currPage + 1` is passed. The page counter must increment, not reset.

- **Clicking "Load More" appends results to the existing list rather than replacing it**
  The `page !== 0` branch concatenates — it must not clobber earlier results.

- **Changing the sort filter resets the list and fetches from page 0**
  Filter changes trigger `setRecipeList([])` and `setCurrPage(0)`. If the reset is
  missing, stale results from a previous filter contaminate the new set.

- **Search query `?q=taco-tuesday` in the URL is normalized to "taco tuesday" before the API call**
  The `.split('-').join(' ')` transform must be applied. Without it the server gets
  a hyphenated string that won't match title text.

- **No unhandled crash when `getAllRecipes` throws**
  `Recipes.tsx` has no `.catch` handler. The test documents that the component
  doesn't crash (no error boundary hit), but also confirms that no error message
  is shown — a known gap in the current UI.

---

## SingleRecipe Page

This page has the most complex loading/error state tree and the serving-size
persistence logic that touches localStorage.

- **Shows skeleton header and ingredients while the API call is pending**
  While `loading=true`, `RecipeHeaderContent` and `Ingredients` render skeletons.
  The page must not crash or render stale data before the fetch resolves.

- **Renders recipe title, image, and description after the API resolves**
  Core happy path. Key fields must appear in the document.

- **Shows `RecipeNotFound` when the API response has no `title` property**
  The guard is `!res || !res.title`. A response like `{}` or `{ _id: 'x' }`
  must trigger the 404 branch.

- **Shows `RecipeNotFound` when the API returns `null` or `undefined`**
  Same guard; the falsy short-circuit path.

- **`RatingsAndReviews` is not rendered while `loading=true`**
  Conditional: `{!loading && currRecipe && <RatingsAndReviews …/>}`. Prevents
  the rating section from making its own API calls before the recipe is confirmed.

- **`RatingsAndReviews` mounts after loading completes and recipe data exists**
  Confirms the section appears once both conditions are met.

- **Serving size is read from `localStorage` on mount and applied**
  The page stores `{ recipeId, numServings }` in `recipeServings`. On re-visit,
  the stored value should be used instead of `res.servings`.

- **Changing the serving size writes the new value back to `localStorage`**
  The `updateRecipeLocalStorage` call in the serving-size `useEffect` must persist
  the change so the next visit restores it.

- **Decrement button does not reduce serving size below 1**
  Guard is `if (num > 1)` — clicking minus at 1 should have no effect.

- **Serving size input rejects values ≤ 0 or ≥ 100 on blur and reverts to previous value**
  `handleServingsBlur` validates `0 < modServingSize < 100`. Out-of-range input
  must reset to the last valid `servingSize`.

- **Document title includes the recipe name after load**
  `<title>Prepify | {capitalize(currRecipe.title)}</title>` updates dynamically.
  Tests via `document.title`.

- **Page does not crash when `getRecipe` throws**
  The catch block only `console.log`s, so `loading` stays true forever with no
  error UI — the test documents this gap and confirms no exception propagates.

---

## AddRecipe Form

Validation is the core concern. The form has two separate validation moments
(real-time for button state, on-submit for error display) which need to be tested
independently.

- **Submit button has the `invalid` CSS class on initial empty render**
  `isFormValid` starts false; the button must reflect that immediately so the
  user gets visual feedback before attempting submission.

- **Clicking "Create Recipe" on an empty form shows error messages for all required fields**
  `validate(true)` is called on submit — all seven required-field errors
  (title, image, description, servings, prepTime, ingredients, mealType) must
  appear simultaneously.

- **Title error is shown when the title field is empty**
  Narrow test for the most common missing field.

- **Title error is shown when the title exceeds 50 characters**
  The 50-character limit is a defined constraint that must be enforced.

- **Title of exactly 50 characters is accepted (no error)**
  Off-by-one check — the limit is `> 50`, so exactly 50 must pass.

- **Submit button gains the `valid` CSS class only after all required fields are filled**
  The `useEffect`-driven `isFormValid` must become true once every required
  field is satisfied. Confirms the real-time validation loop works correctly.

- **Clicking "Create Recipe" when the form is valid calls `RecipeAPI.addRecipe`**
  The API must be called with the assembled recipe data. Mocking `addRecipe`
  lets the test confirm the call without network I/O.

- **On a successful submission, navigates to the new recipe and confirms with a toast**
  `navigate('/recipes/<newId>')` must run after a successful API call, and a
  `toast.success('Recipe published!')` must fire (it persists across the route change).

- **On API failure (`addRecipe` returns `null`), fires `toast.error('Failed to create recipe. Please try again.')`**
  Flow-level outcomes route through `react-hot-toast`, not inline state. This is the
  only user-visible feedback for a server-side failure. (Session-expiry returns the
  `AUTH_ERROR` sentinel → a distinct `toast.error` about signing in again.)

- **A loading spinner replaces the "Create Recipe" button text during submission**
  `addRecipeLoading=true` swaps the label for `<TailSpin>`. Users need to know the
  form is processing, especially since the API call uploads an image.

- **Error messages disappear for a field after it is corrected following a failed submission**
  Errors are set on submit then cleared by re-validation as fields change. If this
  feedback loop is broken, stale errors stay visible after the user fixes their input.

- **Servings value of `0` is treated as invalid**
  `if (!servings)` is falsy for `0`. A recipe with 0 servings is nonsensical and
  must be blocked, not silently submitted.

- **`cookTime` being absent does not block submission**
  `cookTime` has no validation rule — it is genuinely optional. The test confirms
  a recipe can be created with only `prepTime` supplied.

---

## AddRecipe — IngredientsContainer

Tested in isolation from the full form since the list logic is independent.

- **Adding an ingredient via the input appends it to the displayed list**
  The `addIngredientToList` callback must update state and the new item must
  appear in the DOM.

- **Removing an ingredient filters it out by `id`**
  The `removeIngredient` callback calls `filter(ingr => ingr.id !== removeId)`.
  The removed item must disappear; other items must remain.

- **Each ingredient row exposes an always-available drag-to-reorder handle**
  Reordering has no mode toggle — every row renders a "Drag to reorder" handle
  at all times (no "Reorder"/"Done" button).

---

## AddRecipe — InstructionsContainer

- **Entering text and pressing Enter appends a new instruction step**
  `handleEnter` adds the instruction and clears the input. Tests the keyboard
  submission path.

- **Submitting an empty input does not add a step**
  `if (!inputVal) return` guard must hold.

- **Removing an instruction step removes it from the list**
  Like ingredients, removal is by `id` filter.

---

## Ratings (inside RatingsAndReviews)

- **"Sign In To Rate" link is rendered when no `uid` is available**
  Logged-out users get a link to `/login` instead of the star widget. This is
  a hard auth gate that must be visible.

- **Star rating widget is rendered when a `uid` is present**
  Confirms the authenticated path renders the interactive widget.

- **Clicking a star calls `RecipeAPI.addRating` with the recipe ID and rating value**
  `changeRating` calls `addRating(recipeId, e)`. The test mocks the API and
  confirms both arguments are correct.

- **Average rating shows "0" when `rateCount` is 0**
  `Number(ratingVal) === 0` renders the literal string "0". No `formatRating` call
  is made, so NaN is impossible — the test locks in this branch.

- **Average rating is formatted correctly for a non-zero count**
  `formatRating(ratingVal, ratingCount)` is called; its output must appear in the
  DOM alongside the count in parentheses.

---

## ReviewsContainer

- **"No Reviews" is shown when `reviewList` is empty and no `currUserReview` exists**
  The ReviewsList empty-state branch. Logged-out or users who haven't reviewed
  and when no community reviews exist must see this message.

- **"No Reviews" is NOT shown when a `currUserReview` exists (even if `reviewList` is empty)**
  ReviewsList renders `null` (not the empty message) when `currUserReview` is set.
  The user's own review is shown in the container above, so the "No Reviews" copy
  would be inaccurate.

- **"More Reviews" button is visible when `isMoreReviews=true`**
  ReviewsList renders the button only when there are additional pages.

- **Clicking "More Reviews" calls `getReviews` with the next page and appends results**
  Same append-vs-replace concern as the browse page. `recipesPage !== 0` must
  concatenate, not overwrite.

- **Reviews with no `reviewText` are filtered out of the displayed list**
  The filter `review.reviewText` removes rating-only entries. A mix of reviews and
  rating-only entries must render only the reviews.

---

## AddReview

- **"Add Review" button is visible when the user is not authenticated**
  The button renders regardless of auth state — it's clicking it that branches.

- **Clicking "Add Review" without a `uid` triggers the alert with a login link, not a textarea**
  The `if (uid) / else alert.show(...)` branch. The textarea must NOT open.

- **Clicking "Add Review" with a `uid` opens the review textarea**
  `setIsReviewOpen(true)` must fire. The textarea area gains the `visible` class.

- **Submitting with `rating === 0` shows an error message**
  "Please add a rating before submitting your review." — the user must rate before
  writing. Otherwise reviews exist without a star value.

- **Submitting with review text shorter than 5 characters shows an error message**
  Note: the error message says "4 or more characters" but the guard is `length < 5`,
  so 5 is the real minimum. The test should assert the error appears for a 4-char
  input — and simultaneously documents the copy/code mismatch.

- **Submitting with a valid rating and text ≥ 5 characters calls `RecipeAPI.newReview`**
  The happy path. Confirms both validation gates pass before the API is called.

- **After a successful `newReview` call, `setCurrUserReview` is called with the response**
  The parent component uses this to swap `AddReview` out for `RecipeReview`. If the
  setter isn't called the UI never updates.

- **Clicking "close" hides the textarea without calling `RecipeAPI.newReview`**
  `setIsReviewOpen(false)` fires; `newReview` must not be called.

---

## RecipeReview

- **Displays the reviewer's username, star rating, formatted date, and review text**
  Core rendering check for the review card.

- **Edit and Delete controls are NOT shown when `currUsername !== reviewAuthorUsername`**
  ReviewOptions compares the async-fetched current username to the review author.
  Other users must not see edit/delete buttons.

- **Edit and Delete controls ARE shown when `currUsername === reviewAuthorUsername`**
  The author must see them. This and the previous test together cover the
  identity-check guard.

- **Clicking "Edit" enters editing mode and renders a textarea pre-filled with current text**
  `setEditing(true)` swaps the text div for an editable textarea. The starting
  value must be the existing review, not empty.

- **Clicking "Cancel" in editing mode reverts the textarea and returns to display mode**
  `setEditing(false)` must fire. The displayed text should revert to the unedited
  `reviewText` state (not the in-progress `editingText`).

- **Submitting an edit with text identical to the original text makes no API call**
  `editingText !== reviewText` guard — silently a no-op. The test documents this
  (a UX gap: users get no feedback that nothing was saved).

- **Submitting an edit with text shorter than 5 characters makes no API call**
  Same silent no-op. Also a UX gap — no error message is shown.

- **Submitting a valid edit (changed text, ≥ 5 chars) calls `RecipeAPI.editReview` and updates the displayed text**
  The happy path. After `editReview` resolves, the component must exit editing
  mode and render the new text.

- **Clicking "Delete" opens the confirmation modal**
  `setDeleteModalIsOpen(true)` fires. The modal must be visible before any delete
  API call is made.

- **Confirming deletion calls `RecipeAPI.deleteReview` and calls `setCurrUserReview(null)`**
  The parent's state must be cleared so AddReview re-appears. Without this, the
  deleted review ghost-renders until page refresh.
