# Feature Ideas — Prepify

Generated: 2026-05-14
Audit scope: `src/pages/`, `src/Components/`, `src/api/`, `src/context/`, plus a sweep for `TODO` / placeholder / commented-out UI. Refactor-only items already planned in `REFACTOR.md` are excluded.

---

## 🔴 Clearly Missing (Expected in any recipe app)

- **Edit recipe** — The author can `Delete` their recipe (`src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls.tsx:83`), but the `<button className='edit-btn'>Edit</button>` next to it is commented out, and `AddRecipe.tsx` has no edit mode. Today a typo means delete-and-re-create — and the new doc gets a new `_id`, breaking saves/reviews/links. `[needs API]` (PATCH/PUT for recipe) `[reuses AddRecipe.tsx form]`
- **Public nutrition panel on the recipe page** — `src/pages/SingleRecipe/DataSections/NutritionData/NutritionData.tsx` is a fully-built collapsible nutrition-label component, but `grep` finds zero importers. Nutrition is fetched from Edamam at create time, stored on the recipe, and then never shown. `[reuses NutritionData]` — just wire it into `SingleRecipe.tsx` near the empty `<div className='recipe-stats'></div>` placeholder on line 148.
- **Author byline + clickable author profile** — `RecipeType.authorUsername` is in the contract and stored on every recipe, but the recipe page never displays it (`DesktopTitleContent.tsx` / `MobileTitleContent.tsx` show only title/price/description). There's no "by @username" line and no `/users/:username` route. Discovery of other recipes by the same author is impossible. `[needs API]` (`GET /users/:username/recipes`)
- **Meal-type filter on `/recipes`** — `RecipeType.mealTypes` is collected in `MealTypeSelector` (breakfast/lunch/dinner/etc.) and stored on every recipe, but `RecipeFilters.tsx` only exposes Sort, Diet Tags, and Cuisine. "Show me breakfast recipes" is currently impossible from the search page. `[reuses RecipeFilters + recipeData/mealTypesList]`
- **Share recipe button** — `RecipeHeaderContent.tsx` has Save / Rate / Print actions but no Share. Sharing a recipe to a friend requires manually copying the URL bar. A `navigator.share` (mobile) + `navigator.clipboard.writeText` fallback would slot directly into the existing `.actions` row.
- **Shopping list / grocery export** — Ingredients have local-state checkboxes (`Ingredients.tsx:16`) that don't persist or aggregate. There's no way to send selected ingredients to a list, copy them to clipboard, or combine ingredients across saved recipes for a weekly shop. Common across every comparable site (AllRecipes, NYT Cooking).

---

## 🟡 Sparse or Half-Built

- **"Your Recipes" tab** — `src/pages/Account/UserRecipes/UserRecipes.tsx` returns a literal `<div>Functionality not yet set up!</div>`, with 80+ lines of commented-out implementation below. The Account page still links to `/account/your-recipes` (`Account.tsx:97`), so users click it and hit a dead-end string. This is the most visible "half-built" hole in the app. `[needs API]` (`GET /users/me/recipes`) `[reuses SavedRecipes.tsx layout almost verbatim]`
- **Review like / dislike buttons** — `ReviewInteractionOptions.tsx` renders fully-styled thumb-up/thumb-down icons with hover states; both `onClick` handlers fire a toast "Sorry, liking and disliking reviews isn't available yet in beta." The UI is shipped, the backend isn't. `[needs API]` (`POST /reviews/:id/reactions`)
- **Step-by-step cook mode (interactive instructions)** — `Instructions.tsx:15–21` has commented-out per-step `checked` state and `handleOnClick`. Each step renders as static text. Marking off steps while cooking is a classic recipe-app feature — currently scaffolded but disabled.
- **`fridgeLife` / `freezerLife` are collected then dropped** — `AddRecipe.tsx:42–43` and the API payload include both fields, but a grep across `src/pages/SingleRecipe/` finds zero readers. Users enter "lasts 5 days in fridge / 30 days in freezer" and it's invisible to viewers. Trivial to add to the recipe header data row.
- **Hardcoded release notes** — `ReleaseNotes.tsx` opens when users click the navbar beta tag, but `RELEASE_DATE = '3/31/2023'`, `description`, `additions`, `bugFixes`, and `improvements` are all hardcoded literals in the component. It hasn't been updated in two-plus years and links to `github.com/jclind/prepify/releases`. Either drive it from a static JSON / CMS, or remove the modal.
- **Empty `recipe-stats` placeholder** — `SingleRecipe.tsx:148` renders `<div className='recipe-stats'></div>` with no children. `RecipeType.views`, `numTimesSaved`, and `numTimesMade` are all stored on every recipe (and the test fixtures populate them), but nothing reads them in the UI. Filling that div with "👀 1.2k views · 🔖 89 saves · 🍳 142 made" is mostly a styling + a single map over existing data.

---

## 🟢 Nice-to-Have / Engagement Features

- **Quick-time filter ("Under 15 / 30 / 60 min")** — Today's sort options include "Time: Shortest" but no filter. A `totalTime <=` filter would be far more useful for "I have 20 min, feed me." `[reuses RecipeFilters + `getAllRecipes` query (needs a new `maxTime` param)]`
- **Recipe collections / folders for saved recipes** — `SavedRecipes.tsx` is a flat list sortable only by save-date. Letting users group saves into "Weeknight dinners," "Thanksgiving," "Tried & loved" turns the saved page from a chronological dump into a usable cookbook. `[needs API]` (collection CRUD; saves get `collectionIds: string[]`)
- **Recipe-search history dropdown** — `SearchRecipesInput.tsx` debounces autocomplete from server results, but the dropdown is empty on focus until you type. Showing the user's last 5 searches on focus (localStorage) is one component change away.
- **Personalized "For You" row on Home** — Below `TrendingRecipes`, recommend recipes from cuisines or meal-types the user has saved/made. The data to build a simple "more like your saves" already exists in `getSavedRecipes` + `madeRecipe` history. `[needs API]` (recommendation endpoint, or just a client-side similarity pass over `/recipes`)
- **Inline error/empty states** — Per `PATTERN_AUDIT.md` and `REFACTOR_NOTES.md` Phase 2-E-1, `TrendingRecipes`, `SavedRecipes`, and `UserRatings` all silently render skeletons on fetch failure with no message and no retry. Empty arrays (e.g., a successful fetch returning no trending recipes) also render skeletons indefinitely. A small `<EmptyState>` + "Try again" component reused across these three would close the loop.

---

## 💡 Fun / Social / Delight

- **"Made it!" photo upload + visual reviews** — `MadeRecipeBtn.tsx` already records every time a user marks a recipe as cooked; attaching an optional photo on that action would turn cold reviews into a gallery of real attempts. `[reuses RecipeAPI.uploadRecipeImage Firebase Storage flow]` `[needs API]` (extend `madeRecipe` body to accept `photoURL`; new `GET /recipes/:id/made-photos`)
- **Cooking streaks & badges on Account** — "You've cooked 4 recipes this week" / "Tried 3 new cuisines this month." Pull straight from `datesMade` data the server already stores per user. Cheap to compute, visible on Account, sticky. `[reuses checkMadeRecipe / madeRecipe data]`
- **"What should I cook?" mood button on Home** — One big button on `HomeHero` that picks a random recipe matching the user's saved diet tags / cuisine preferences. Decision-fatigue killer. `[reuses getAllRecipes with random sort, or new GET /recipes/random]`
- **Substitute-ingredient suggestions** — On hover of an ingredient in `Ingredients.tsx`, show 1-3 common substitutes ("no buttermilk → milk + lemon"). Could call out to Spoonacular's substitutes endpoint via the existing `/api/ingredients/parse` infrastructure.
- **Follow other cooks** — Once author profiles exist (see 🔴 above), letting users follow other authors unlocks a feed of new recipes from people whose food they like. Classic social-stickiness lever. `[needs API]` (follows, plus a "from people you follow" feed query)

---

## Quick wins, ranked by effort

For implementation order, the lowest-friction items in this list are:

1. **Wire `NutritionData` into `SingleRecipe`** — component exists, data exists, just import and render.
2. **Display `fridgeLife` / `freezerLife` in the recipe header** — one `RecipeDataElement` per field.
3. **Display author byline** (display name only, no profile route yet) — already in `RecipeType.authorUsername`.
4. **Meal-type filter** — `mealTypesList` and the server-side filter mechanic are already in place; just add a new `<Select>` to `RecipeFilters`.
5. **Fill the `recipe-stats` div** with the three counter fields that already exist on `RecipeType`.

The biggest user-impact gap is `Edit recipe` — the absence is jarring and the workaround (delete + re-add) silently breaks every saved/reviewed reference to the old recipe `_id`.
