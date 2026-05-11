# Pattern Audit — 2026-05-10

## Summary

The codebase is in good structural shape but has accumulated three tiers of inconsistency.
The highest-priority problem to standardize first is **import style**: the codebase has two fully
competing conventions — `src/`-prefixed absolute imports and relative `../../` imports — and the
split is roughly 50/50 with no clear boundary. That inconsistency propagates through nearly every
file and will create confusing diffs during the Phase 3 refactor. Behind it are the component
signature pattern (three variations of how to declare a typed functional component) and error
handling uniformity across data-fetching components. Server-side patterns are almost entirely
consistent and require little attention.

---

## File Extensions

| File | Current | Should Be | Notes |
|---|---|---|---|
| `src/index.jsx` | `.jsx` | `.tsx` | App entry point. Renders JSX with TypeScript types already present in the project. The only `.jsx` file in all of `src/`. |
| `src/pages/SingleRecipe/RecipeNotFound.js/` | directory with `.js` suffix | `RecipeNotFound/` | Directory (not a file) named with a `.js` extension. Contains `RecipeNotFound.tsx` and `RecipeNotFound.scss`. Already flagged in `PROJECT_AUDIT.md`. The import in `SingleRecipe.tsx` reads `import RecipeNotFound from './RecipeNotFound.js/RecipeNotFound'` — the `.js` in the path is part of the directory name, not a file extension. Confuses editors and shell globbing. |

All other files in `src/` are correctly `.ts` or `.tsx`. No `.js` or `.jsx` component files remain. No
files contain JSX without the `.tsx` extension, and no purely-logic files use `.tsx` when `.ts`
would suffice (all `.ts` files in `src/api/` and `src/util/` are extension-correct).

---

## Import Styles

### TypeScript/TSX imports — split convention

Two patterns coexist with no enforced boundary:

**Pattern A — `src/`-prefixed absolute imports**
```ts
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'
import TrendingRecipes from 'src/Components/TrendingRecipes/TrendingRecipes'
```

**Pattern B — relative imports**
```ts
import RecipeAPI from '../../api/recipes'
import { useAuth } from '../../context/AuthContext'
import TrendingRecipes from '../TrendingRecipes/TrendingRecipes'
```

Files using **absolute `src/` imports** (Pattern A):
- All 8 test files in `src/test/` — uniform absolute imports
- `src/context/AuthContext.tsx`
- `src/Components/Navbar/Navbar.tsx`
- `src/Components/SearchRecipesInput/SearchRecipesInput.tsx`
- `src/Components/RecipeFilters/RecipeFilters.tsx`
- `src/Components/Form/UsernameInput.tsx`
- `src/Components/IngredientItemText/IngredientItemText.tsx`
- `src/pages/Home/Home.tsx` (mixed: uses `src/` for `TrendingRecipes`, relative for `HomeHero`)
- `src/pages/SingleRecipe/SingleRecipe.tsx` (mixed: uses `src/` for api, relative for utils)
- `src/pages/Settings/SubSettings/Profile.tsx`, `Password.tsx`
- `src/pages/CreateUsername/CreateUsername.tsx`
- `src/pages/SingleRecipe/RecipeNotFound.js/RecipeNotFound.tsx`
- `src/api/recipes.ts`

Files using **relative imports** (Pattern B):
- `src/App.tsx` — all page and component imports are relative (`'./pages/...'`, `'./Components/...'`)
- `src/Components/Footer/Footer.tsx`
- `src/Components/TrendingRecipes/TrendingRecipes.tsx`
- `src/pages/Account/Account.tsx`
- `src/pages/Login/Login.tsx`, `Signup/Signup.tsx`, `ForgotPassword/ForgotPassword.tsx`

**Mixed files** (both patterns in the same file): `Home.tsx`, `SingleRecipe.tsx`.

The `src/` alias is configured in `vite.config.ts` and works correctly — this is purely a convention
gap, not a functional one.

### SCSS imports — all relative

Despite `SASS_PATH=src` being set in `.env`, every SCSS import in the codebase uses a relative
path — none use the absolute pattern that `SASS_PATH` enables.

Same-directory imports (most common):
```ts
import './Navbar.scss'          // Navbar.tsx
import './AddRecipe.scss'       // AddRecipe.tsx
```

Cross-directory relative imports:
```ts
// CreateUsername.tsx
import '../../Components/Form/FormStyles.scss'

// Login.tsx, Signup.tsx, ForgotPassword.tsx
import '../../Components/Form/FormStyles.scss'

// InstructionItem.tsx
import '../../ListComponents/Item.scss'

// IngredientItem.tsx
import '../ListComponents/Item.scss'
```

Module SCSS with relative paths to shared file:
```ts
// AddRecipe.tsx (2 levels up)
import styles from '../../_exports.module.scss'

// CuisineSelector.tsx, MealTypeSelector.tsx, IngredientsInput.tsx, IngredientItem.tsx (3 levels up)
import styles from '../../../_exports.module.scss'
```

`SASS_PATH=src` is unused. All SCSS import paths are relative and self-consistent within their
pattern (same-directory for own styles, relative paths for shared). The multi-level `../../..` paths
to `_exports.module.scss` are the most fragile — they would break if any of those components move.

### Barrel files

Only one barrel file exists across all of `src/`:

- `src/pages/AddRecipe/Dnd/index.ts` — exports `DndContext`, `Drop`, and `Drag` from sibling files.
  Used by `IngredientsContainer.tsx` and `InstructionsContainer.tsx`.

No other feature folder uses barrel files. Component directories, API modules, and utility files
are all imported by their full path. Barrel files are not a pattern in this codebase — the single
existing one is an outlier.

---

## TypeScript Coverage

| File | Issue | Severity |
|---|---|---|
| `src/Components/RecipeFilters/RecipeFilters.tsx:27,33,38,43,48,56,180` | 8× `any` in react-select style config object | Low |
| `src/pages/Help/Help.tsx:14,27,34,40,47,51,67,75` | 8× `any` in react-select style config object | Low |
| `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewFilters.tsx:11,19,26,32,36,39,66` | 7× `any` in react-select style config object | Low |
| `src/Components/Navbar/PrepifyLogo.tsx:7` | `e: any` on click handler — should be `React.MouseEvent` | Medium |
| `src/Components/SearchRecipesInput/SearchRecipesInput.tsx:22` | `event: any` in `handleClickOutside` — should be `MouseEvent` | Medium |
| `src/Components/SearchRecipesInput/SearchRecipesInput.tsx:62` | `e: any` in `handleSubmit` — should be `React.FormEvent` | Medium |
| `src/pages/Login/Login.tsx:20` | `e: any` in form submit handler | Medium |
| `src/pages/Help/Help.tsx:75` | `e: any` in `handleSubmit` | Medium |
| `src/pages/CreateUsername/CreateUsername.tsx:38` | `(error: any)` in `.catch()` — should be `unknown` | Medium |
| `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx:34,60` | `(error: any)` in two `.catch()` blocks | Medium |
| `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx:51` | `(error: any)` in `.catch()` | Medium |
| `src/pages/AddRecipe/Dnd/Drag.tsx:7` | `React.ReactElement<any>` for children prop — should be `React.ReactNode` | Low |
| `src/api/recipes.ts` — `getReviews` | No return type annotation — function signature ends without `Promise<...>` | High |
| `types.d.ts` — `NutritionDataType` | Multiple fields typed `any` (`yield`, `calories`, `totalWeight`, etc.) — Edamam response not fully typed | Medium |

**react-select style `any`s**: These are concentrated in files that configure `react-select`
custom styles using the library's `StylesConfig` type, which itself requires type params.
The `any` usages are a shortcut around specifying `StylesConfig<OptionType, false>`. All 23 of
these instances share the same root cause and can be fixed in a single pass.

**Event handler `any`s**: Five files use `e: any` or `event: any` on form/click handlers instead
of the appropriate `React.FormEvent<HTMLFormElement>`, `React.MouseEvent`, or `MouseEvent`.

**Catch handler `any`s**: Three files use `(error: any)` in `.catch()` blocks. TypeScript 4+ allows
`unknown` here; narrowing with `instanceof Error` is the typed pattern.

**Return type annotations in `src/api/`**: `src/api/recipes.ts` has good coverage —
`getAllRecipes`, `searchAutoCompleteRecipes`, `getTrendingRecipes`, `getRecipe`, `getSavedRecipe`,
`getIngredientData`, `getSavedRecipes`, `newReview` all have explicit `Promise<T>` return types.
Missing: `getReviews`, `getSingleUserReviews`, several mutation methods (`addRating`, `saveRecipe`,
`unsaveRecipe`, `deleteRecipe`, `deleteReview`, `editReview`, `madeRecipe`, `checkMadeRecipe`).
`src/api/auth.ts` — not fully surveyed for return type annotations.

---

## Component Patterns

### Props declaration — `type` vs `interface`

**Dominant pattern (~94% of components):** `type Props = { ... }` or `type XProps = { ... }`

**Minority pattern (~6% of components):** `interface XProps { ... }`

Files using `interface` for props:
- `src/Components/Form/FormInput.tsx` — `interface LoginInputProps`
- `src/pages/AddRecipe/ImagePicker/ImagePicker.tsx` — `interface ImagePickerProps`
- `src/pages/AddRecipe/RecipeFormInput.tsx` — `interface RecipeFormInputProps`
- `src/pages/AddRecipe/TimeInput/TimeInput.tsx` — `interface TimeInputProps`
- `src/pages/AddRecipe/ServingsInput/ServingsInput.tsx` — `interface ServingsInputProps`

These five files are all in the `AddRecipe` flow — likely authored in a single session with
a different convention than the rest of the codebase.

### Function signature — three patterns in use

**Pattern 1 — `const X: FC<Props>` (majority)**
```ts
// Navbar.tsx:20
import React, { useState, useEffect, FC } from 'react'
const Navbar: FC<NavbarProps> = ({ darkNavLinks, navBackgroundColor, loading }) => { ... }

// RecipeThumbnail.tsx
const RecipeThumbnail: FC<RecipeThumbnailProps> = ({ recipe, loading }) => { ... }
```

**Pattern 2 — `const X: React.FC<Props>` (minority)**
```ts
// ImagePicker.tsx:10
const ImagePicker: React.FC<ImagePickerProps> = ({ image, setImage }) => { ... }

// TimeInput.tsx:19
const TimeInput: React.FC<TimeInputProps> = ({ label, val, setVal }) => { ... }
```

**Pattern 3 — destructured props without FC annotation (no-annotation)**
```ts
// Footer.tsx
const Footer = () => { ... }

// TrendingRecipes.tsx
const TrendingRecipes = () => { ... }

// SearchRecipesInput.tsx
const SearchRecipesInput = ({ autoComplete, defaultVal }: SearchRecipesInputProps) => { ... }
```

Pattern 3 (no `FC` wrapper) is used for components with no props or where the props are
destructured inline. Pattern 1 is the dominant choice when props exist. Pattern 2 (`React.FC`)
appears only in the AddRecipe flow — same cluster as the `interface` outliers above.

### Exports — consistent

All components use `export default ComponentName` at the file's end or inline. No component
uses both a named and a default export of the same value. No component uses only named exports.
This is fully consistent across `src/Components/` and `src/pages/`.

### Class components — none

No class components found anywhere in `src/`. The codebase is fully functional.

---

## Data Fetching — useEffect+useState Inventory

This is the React Query migration hit list. Components are ordered by phase-3 migration priority.

| Component | File | What it fetches | Loading state | Error state | Notes |
|---|---|---|---|---|---|
| `Recipes` | `src/pages/Recipes/Recipes.tsx` | `getAllRecipes()` (paginated, filtered) | ✓ | ✓ | Two `useEffect` hooks — one for filter changes, one for page load. Full three-state handling. |
| `SingleRecipe` | `src/pages/SingleRecipe/SingleRecipe.tsx` | `getRecipe(id)` | ✓ | ✓ (`recipe404` + `recipeError`) | Two `useEffect` hooks — serving size from localStorage and recipe fetch. Full handling. |
| `TrendingRecipes` | `src/Components/TrendingRecipes/TrendingRecipes.tsx` | `getTrendingRecipes(4)` | ✓ (skeleton) | ✗ | `.then()` only, no `.catch()`. Silently drops fetch errors. |
| `SearchRecipesInput` | `src/Components/SearchRecipesInput/SearchRecipesInput.tsx` | `searchAutoCompleteRecipes(query)` | ✗ | ✗ | Debounced query inside `useEffect`. No loading indicator, no error display. |
| `Account` | `src/pages/Account/Account.tsx` | `AuthAPI.getUsername(uid)` | ✗ | ✗ | `.then()` only. Two `useEffect` hooks — one for username, one for path tracking. No loading state shown. |
| `Navbar` | `src/Components/Navbar/Navbar.tsx` | `AuthAPI.getUsername(uid)` | ✗ | ✗ | `.then()` only inside `useEffect`. Username shown after resolution with no intermediate state. |
| `SavedRecipes` | `src/pages/Account/SavedRecipes/SavedRecipes.tsx` | `getSavedRecipes()` (paginated) | ✓ | ✗ | Loading state present, no error handling. |
| `UserRatings` | `src/pages/Account/UserRatings/UserRatings.tsx` | `getSingleUserReviews()` (paginated, with recipe data) | ✓ | ✗ | Loading state present, no error handling. |
| `RatingsAndReviews` | `src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews.tsx` | `checkIfReviewed(recipeId)` | ✗ | ✗ | Fetches on mount to seed `rating` state. No loading or error display. |
| `ReviewsContainer` | `src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer.tsx` | `getReviews()` (paginated) | ✓ | ✗ (console.log) | `.catch((error: any) => console.log(error))` — error silently dropped. |

`src/pages/Account/UserRecipes/UserRecipes.tsx` — the data-fetching logic is entirely commented
out (`// useEffect(() => { ... })`). The component renders a placeholder string. Not in the
migration hit list because there is nothing to migrate.

---

## Error Handling Patterns

Three distinct approaches to API error handling exist across data-fetching components:

**Pattern A — Full three-state handling** (loading + error + content)

`Recipes.tsx`: dedicated `fetchRecipesError` state string; rendered as an error message paragraph
when set. `SingleRecipe.tsx`: separate `recipeError` boolean and `recipe404` boolean; each renders
a different UI. These two components are the template.

**Pattern B — Loading only, no error state**

`TrendingRecipes.tsx`, `SavedRecipes.tsx`, `UserRatings.tsx`: show a skeleton/spinner while
loading; on fetch failure, the component renders silently empty (no message, no retry). Users
see a blank section with no explanation.

**Pattern C — No states at all**

`Account.tsx`, `Navbar.tsx`: fire `AuthAPI.getUsername()` in `useEffect` with `.then()` only.
No loading state, no error state. On failure the component simply never populates the username.

**Pattern D — Error logged, not displayed**

`ReviewsContainer.tsx:51`: `.catch((error: any) => console.log(error))`. The error is swallowed
after logging; the component continues to show the loading skeletons or an empty list.

---

## Naming Conventions

**Component files**: 100% PascalCase across `src/Components/` and `src/pages/`. No outliers.

**SCSS files**: 100% match their paired component name (PascalCase). Shared stylesheets
(`FormStyles.scss`, `Item.scss`, `_exports.module.scss`) follow their own consistent naming.

**Utility files** (`src/util/`): 100% camelCase — `calculateServingPrice.ts`, `capitalize.ts`,
`formatDate.ts`, `hrMinToMin.ts`, `timeElapsedSince.ts`, `updateIngredients.ts`,
`validateIngredientQuantityStr.ts`. No outliers.

**API files** (`src/api/`): 100% camelCase — `auth.ts`, `http-common.ts`, `ingredientParserApi.ts`,
`recipes.ts`. Consistent.

**Directory names**: PascalCase for component directories, camelCase-ish for feature groupings.
Two structural anomalies:
- `src/pages/SingleRecipe/RecipeNotFound.js/` — `.js` suffix on a directory name (already flagged above)
- `src/pages/404/` — numeric directory name. The file inside is `404.tsx`. Unusual but functional.

**Test file naming** (from `TEST_BASELINE.md`): The frontend test suite uses `.test.tsx`
exclusively. The server uses `.test.js` exclusively. No `.spec` files exist. Naming is consistent
within each layer.

---

## Server Patterns

### Error response shapes — fully consistent

Every error response across all six route files uses `{ error: '...' }`:

```js
res.status(400).json({ error: 'userId is required' })
res.status(401).json({ error: 'Missing or invalid Authorization header' })
res.status(403).json({ error: 'Forbidden' })
res.status(404).json({ error: 'Not found' })
res.status(409).json({ error: 'Recipe already saved' })
res.status(500).json({ error: err.message })
```

Files verified: `server/routes/auth.js`, `recipes.js`, `reviews.js`, `tags.js`, `users.js`,
`ingredients.js`, `server-ingredients/routes/ingredient.js`, `server/middleware/auth.js`.
No outliers. The `{ error: '' }` shape is the one contract the API layer already has locked down.

### Module system — fully consistent

All files in `server/` and `server-ingredients/` use CommonJS (`require` / `module.exports`).
No ESM (`import`/`export`) was found in either service. The frontend (Vite) uses ESM; the servers
use CJS; there is no mixing within a layer.

### Auth middleware coverage

`verifyToken` is applied exactly where expected — all write operations are protected, all public
read operations are unprotected. The one notable question is `POST /api/ingredients/parse` in
`server/routes/ingredients.js` which has no `verifyToken` — the ingredient enrichment endpoint
is publicly accessible. Whether this is intentional (or an omission) is undocumented.

**Stale TODO comments**: `server/routes/reviews.js` contains four `// TODO: protect with verifyToken`
comments on handlers that are already protected (lines approximate 8, 61, 109, 134). These were
likely added before the middleware was applied and never removed. They are misleading — a reader
would think the routes are unprotected.
