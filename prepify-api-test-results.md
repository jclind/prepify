# Prepify API Test Results

## Test Results

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 1 | No getUsername 404s while logged out | ✅ | No network failures |
| 2 | Login redirects and nav updates for logged-in user | ✅ | URL: http://localhost:3000/ |
| 3 | Recipe cards loaded on /recipes | ❌ | Cards appear stuck in skeleton state. NOTE: API returns {recipes, totalCount} but Recipes.tsx reads res.recipeList / res.total_results — field name mismatch causes empty render |
| 4 | Search bar updates results | ❌ | Results did not update after search |
| 5 | Sort dropdown changes order | ✅ | Opened sort control, selected "New" |
| 6 | Cuisine filter | ❌ | Cuisine control not found |
| 7 | Diet Tags filter | ❌ | Tags control not found |
| 8 | Single recipe content loads | ❌ | title:true ingr:true instr:false rating:true failures: |
| 9 | Views increment with no 500 errors | ✅ | No errors on recipe load |
| 10 | Star rating submits successfully | ✅ | Rating sent, no 500 errors |
| 11 | Write a review | ✅ | Review submitted successfully |
| 12 | Edit the review | ⚠️ | Edit button not found — may require review to be displayed in current user context |
| 13 | Delete the review | ⚠️ | Delete button not found — edit/delete controls only visible to review author |
| 14 | Save recipe — button state changes | ✅ | "Save" → "Saved" |
| 15 | Saved recipe appears on /account/saved-recipes | ✅ | — |
| 16 | Unsave recipe | ⚠️ | Save button shows "Save" — recipe may not be in saved state. getSavedRecipe check may have failed. |
| 17 | Mark recipe as made | ✅ | Button: "Made It" → "Made It", errors: 0 |
| 18 | Add Recipe form loads without errors | ✅ | Errors: 0, Network failures: 0 |
| 19 | Fill add recipe fields (excluding image) | ✅ | Title, description, servings, prep time filled |
| 20 | Submit add recipe form | ❌ | Form is invalid — likely due to missing required fields (image, ingredients, instructions, meal type). Validation errors shown in UI. |
| 21 | Tag autocomplete | ⚠️ | Tag input not found by placeholder — tags may be integrated into MealTypeSelector or a custom component |
| 22 | Add new tag | ⚠️ | POST /addRecipeTag requires auth token — depends on tag input being found in test 21 and a "create" option being available |

---

## Console Errors & Network Failures

- **[/recipes search]** `console error`: The above error occurred in the <SearchRecipesInput> component:

    at SearchRecipesInput (http://localhost:3000/static/js/bundle.js:2626:5)
    at div
    at Recipes (http://localhost:3000/static/js/bundle.js:9658:86)
    at Layout (http://localhost:3000/static/js/bundle.js:958:5)
    at RenderedRoute (http://localhost:3000/static/js/bundle.js:296835:5)
    at Routes (http://localhost:3000/static/js/bundle.js:297300:5)
    at Provider (http://localhost:3000/static/js/bundle.js:76653:23)
    at AuthProvider (http://localhost:3000/static/js/bundle.js:3655:5)
    at r (http://localhost:3000/static/js/bundle.js:107355:21)
    at App
    at Router (http://localhost:3000/static/js/bundle.js:297238:15)
    at BrowserRouter (http://localhost:3000/static/js/bundle.js:295443:5)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
