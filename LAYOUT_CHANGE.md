# Feature-First Architecture Refactor

This document summarizes the structural changes being made to the Prepify codebase, migrating from a mixed layer/feature structure to a clean feature-first (domain-driven) folder layout.

---

## Motivation

The original structure co-located files by technical role (all components together, all pages together, all API calls together). As the app grew this made it hard to reason about which code belonged to which domain. The new structure groups files by feature so that everything related to authentication, recipes, or account management lives together and can be understood in isolation.

---

## New Structure

```
src/
├── shared/                        # Global, feature-agnostic code
│   ├── api/
│   │   └── http.ts                # Axios clients (was src/api/http-common.ts)
│   ├── lib/
│   │   └── firebase.ts            # Firebase initialization (was src/client/db.ts)
│   ├── utils/                     # Pure utility functions (was src/util/)
│   │   ├── calculateServingPrice.ts
│   │   ├── capitalize.ts
│   │   ├── ErrorWithData.ts
│   │   ├── formatDate.ts
│   │   ├── formatRating.ts
│   │   ├── getIndexById.ts
│   │   ├── getWindowWidth.ts
│   │   ├── hrMinToMin.ts
│   │   ├── reorder.ts
│   │   ├── timeElapsedSince.ts
│   │   ├── updateIngredients.ts
│   │   ├── validateIngredientQuantityStr.ts
│   │   └── index.ts               # Barrel re-export
│   └── components/
│       ├── Navbar/                # Navbar, PrepifyLogo, ReleaseNotes
│       ├── Footer/
│       ├── Layout/
│       └── Form/                  # FormInput, FormStyles
│
├── features/
│   ├── auth/                      # Everything authentication-related
│   │   ├── api/
│   │   │   └── auth.ts            # Auth HTTP calls (was src/api/auth.ts)
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Auth state + Firebase auth methods
│   │   ├── components/
│   │   │   ├── PrivateRoute.tsx   # Route guard (was src/Components/PrivateRoute.tsx)
│   │   │   └── UsernameInput.tsx  # Username availability checker
│   │   └── pages/
│   │       ├── Login/
│   │       ├── Signup/
│   │       ├── ForgotPassword/
│   │       └── CreateUsername/
│   │
│   ├── recipes/                   # Everything recipe-related
│   │   ├── api/
│   │   │   └── recipes.ts         # Recipe HTTP calls (was src/api/recipes.ts)
│   │   ├── context/
│   │   │   └── RecipeContext.tsx  # Placeholder context for future shared recipe state
│   │   ├── hooks/
│   │   │   └── useRecipes.ts      # Hook wrapper around RecipeAPI
│   │   ├── types/
│   │   │   └── index.ts           # All recipe types (was root types.d.ts)
│   │   ├── data/                  # Static reference data (was src/recipeData/)
│   │   │   ├── cuisines.ts
│   │   │   ├── mealTypes.ts
│   │   │   └── dietLabels.ts
│   │   ├── components/
│   │   │   ├── RecipeThumbnail/
│   │   │   ├── TrendingRecipes/
│   │   │   ├── RecipeFilters/
│   │   │   ├── SearchRecipesInput/
│   │   │   └── IngredientItemText/
│   │   └── pages/
│   │       ├── Home/
│   │       │   └── HomeHero/
│   │       ├── Recipes/
│   │       ├── SingleRecipe/
│   │       │   ├── Buttons/       # Save, Print, Rate, MadeIt
│   │       │   ├── RecipeHeaderContent/
│   │       │   ├── DataSections/
│   │       │   │   ├── Ingredients/
│   │       │   │   ├── Instructions/
│   │       │   │   ├── NutritionData/
│   │       │   │   ├── RecipeControls/
│   │       │   │   └── RatingsAndReviews/
│   │       │   │       ├── Ratings/
│   │       │   │       └── Reviews/
│   │       │   └── RecipeNotFound/
│   │       └── AddRecipe/
│   │           ├── Ingredients/
│   │           ├── Instructions/
│   │           ├── Dnd/
│   │           ├── ListComponents/
│   │           └── ... (selectors, pickers, inputs)
│   │
│   └── account/                   # User account pages
│       └── pages/
│           ├── Account/
│           │   ├── SavedRecipes/
│           │   ├── UserRatings/
│           │   └── UserRecipes/
│           └── Settings/
│               └── SubSettings/
│
└── app/                           # App shell — routing, global providers
    ├── App.tsx                    # Root component with all routes
    └── pages/
        ├── Help/
        └── NotFound/              # 404 page (was src/pages/404/)
```

---

## Key Changes

### `tsconfig.json`
- Changed `baseUrl` from `"."` (project root) to `"src"` so all absolute imports resolve cleanly from `src/`. This is the foundation that enables import paths like `'features/auth/context/AuthContext'` instead of `'../../context/AuthContext'`.

### Import path migration
All old import patterns have been replaced:

| Old | New |
|-----|-----|
| `from 'types'` | `from 'features/recipes/types'` |
| `from 'src/api/recipes'` | `from 'features/recipes/api/recipes'` |
| `from 'src/api/auth'` or `'./auth'` | `from 'features/auth/api/auth'` |
| `from '../../context/AuthContext'` | `from 'features/auth/context/AuthContext'` |
| `from 'src/util/...'` | `from 'shared/utils/...'` |
| `from 'src/recipeData/...'` | `from 'features/recipes/data/...'` |
| `from '../../Components/...'` | `from 'shared/components/...'` or `'features/recipes/components/...'` |
| `from '../../_exports.scss'` | `from '_exports.scss'` (absolute via baseUrl) |
| `from './http-common'` | `from 'shared/api/http'` |

### `src/shared/`
- `api/http.ts` — moved from `src/api/http-common.ts`
- `lib/firebase.ts` — moved from `src/client/db.ts`
- `utils/` — all 12 utility files moved from `src/util/`, barrel-exported via `index.ts`
- `components/Navbar/` — Navbar, PrepifyLogo, and ReleaseNotes (co-located since PrepifyLogo imports ReleaseNotes)
- `components/Footer/`, `Layout/`, `Form/` — moved from `src/Components/`

### `src/features/auth/`
- `PrivateRoute` placed in `features/auth/components/` rather than `shared/` — it directly imports `useAuth()` making it an auth concern, not a generic layout primitive
- All auth pages (Login, Signup, ForgotPassword, CreateUsername) have SCSS co-located

### `src/features/recipes/types/index.ts`
- All types from the root `types.d.ts` file moved here (`RecipeType`, `IngredientsType`, `InstructionsType`, `NutritionDataType`, etc.)
- Fixed a duplicate property bug in `OptionalReviewType`

### `src/features/recipes/context/RecipeContext.tsx`
- The original `RecipeContext` was entirely commented out and unused — all pages call `RecipeAPI` directly
- A minimal stub is provided as the canonical home for any future shared recipe state
- `useRecipes.ts` hook provides a hook-style accessor to `RecipeAPI` for components that prefer it

### `src/app/pages/`
- `Help/` — moved from `src/pages/Help/`
- `NotFound/` — moved from `src/pages/404/` (renamed from `404.tsx` to `NotFound.tsx` for clarity)

---

## In Progress / Remaining

The following have not yet been migrated:

- `features/recipes/pages/SingleRecipe/DataSections/NutritionData/`
- `features/recipes/pages/SingleRecipe/DataSections/RecipeControls/`
- `features/recipes/pages/SingleRecipe/DataSections/RatingsAndReviews/` (Ratings, Reviews sub-components)
- `features/recipes/pages/SingleRecipe/RecipeNotFound/`
- `features/recipes/pages/AddRecipe/` (and all sub-components)
- `features/account/pages/` (Account, SavedRecipes, UserRatings, UserRecipes, Settings)
- `src/app/App.tsx` (routing root)
- `src/index.js` (entry point update)
- Deleting the old directories (`src/api/`, `src/client/`, `src/context/`, `src/Components/`, `src/pages/`, `src/util/`, `src/recipeData/`)

---

## What Was NOT Changed

- SCSS files — copied as-is to co-locate with their components; no style logic altered
- `src/_exports.scss` — stays at `src/_exports.scss`; imported as `'_exports.scss'` (resolved by the new `baseUrl`)
- `src/decs.d.ts` — module declarations remain at project root; TypeScript auto-includes them
- Component logic, props, and behavior — this refactor is structural only
