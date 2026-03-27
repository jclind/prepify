# Refactor Notes

Items noticed during the `refactor/feature-first-architecture-v2` migration.
None of these were touched — moves and import fixes only.

---

## Orphaned file

- `src/assets/data/recipes.js` — not imported anywhere in the codebase.
  Candidate for deletion or move to `features/recipes/data/`.

## Old-path imports that were never updated in prior partial migration

The following files existed only in `src/pages/SingleRecipe/` (not yet copied
to `features/recipes/`) and still contained pre-migration import paths when
this branch was created. Their imports were fixed as part of the move:

- `DataSections/NutritionData/NutritionData.tsx`
- `DataSections/RatingsAndReviews/RatingsAndReviews.tsx`
- `DataSections/RatingsAndReviews/Ratings/Ratings.tsx`
- `DataSections/RatingsAndReviews/Reviews/AddReview.tsx`
- `DataSections/RatingsAndReviews/Reviews/RecipeReview.tsx`
- `DataSections/RatingsAndReviews/Reviews/ReviewOptions.tsx`
- `DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx`
- `DataSections/RatingsAndReviews/Reviews/ReviewsList.tsx`
- `DataSections/RecipeControls/RecipeControls.tsx`
- `RecipeNotFound/RecipeNotFound.tsx`

Imports fixed: `types` → `features/recipes/types`, `src/api/auth` →
`features/auth/api/auth`, `src/api/recipes` → `features/recipes/api/recipes`,
`src/util/formatDate` / `formatRating` → `shared/utils/…`,
`src/Components/SearchRecipesInput/…` → `features/recipes/components/…`

## index.js not moved

`src/index.js` was not moved to `src/app/` — Create React App hardcodes
`src/index.js` as the webpack entry point. Moving it would require ejecting
or adopting CRACO/Vite.

## scss globals not moved

`src/_exports.scss` and `src/helpers.scss` were not moved because they are
imported throughout the codebase via `baseUrl: "src"` absolute paths
(e.g. `import styles from '_exports.scss'`). Moving them would cascade
import breakage across many files.

## implicit `any` parameters

Several restored files have `(res) implicitly has an 'any' type` TypeScript
errors suppressed by the existing `strict: true` + `skipLibCheck: true`
config. These are pre-existing issues not introduced by this migration:
- `RatingsAndReviews.tsx` line 31
- `AddReview.tsx` line 40
- `ReviewsContainer.tsx` line 33
- `RecipeControls.tsx` line 69
