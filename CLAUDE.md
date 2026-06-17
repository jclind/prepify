# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prepify is a recipe website built with React/TypeScript frontend and an Express backend. Key features include recipe creation, search/filter, ingredient parsing with nutrition data, recipe ratings/reviews, and user authentication.

## Architecture

### Two-Service Architecture

1. **Frontend (React/TypeScript)**: `src/` - SPA served on port 3000
2. **Main API Server**: `server/` - Express server on port 4000, handles recipes, reviews, users, auth

### Frontend Structure

- `src/pages/` - Route components (Home, Recipes, AddRecipe, Account, etc.)
- `src/Components/` - Reusable UI components (Layout, Navbar, RecipeThumbnail, Form, etc.)
- `src/context/` - React Context providers (AuthContext is active; RecipeContext is commented out/migrated)
- `src/api/` - API client modules
- `src/util/` - Utility functions (calculateServingPrice, validateIngredientQuantityStr, etc.)
- `src/recipeData/` - Static data (cuisinesList, dietLabels, mealTypesList)
- `src/test/` - Vitest test suite with jsdom environment

### Backend Structure

**Main Server (`server/`)**:
- `routes/` - Express route handlers (recipes, reviews, users, auth, ingredients)
- `middleware/` - Firebase auth token verification
- `db.js` - MongoDB connection singleton
- Uses Firebase Admin SDK for auth verification

### API Communication

**Frontend → Main Server**:
- `src/api/http-common.ts` creates axios instance with `VITE_API_URL` (default: http://localhost:4000)
- Request interceptor automatically attaches Firebase ID token as Bearer header

## Common Commands

### Frontend
```bash
npm start              # Start dev server on port 3000
npm run build          # Production build
npm test               # Run Vitest test suite
npm run start-port     # Start on port 1337
```

### Main Server (`server/`)
```bash
cd server
npm install
npm run dev            # Start with nodemon
npm start              # Start with node
npm test               # Run Jest tests
```

### E2E Tests (Cypress)
```bash
npx cypress open       # Open Cypress test runner
```

## Environment Variables

### Frontend (.env)
- `VITE_API_URL` - Main API server URL (default: http://localhost:4000)
- `VITE_EDAMAM_APP_ID` - Edamam nutrition API app ID
- `VITE_EDAMAM_APP_KEY` - Edamam nutrition API app key
- `VITE_FIREBASE_API_KEY` - Firebase Web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase Storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Cloud Messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_FIREBASE_MEASUREMENT_ID` - Firebase Analytics measurement ID
- `VITE_CYPRESS` - Set to `"true"` when running under Cypress; toggles test-mode behavior in `src/client/db.ts`

### Main Server (.env)
- `MONGO_URI` - MongoDB connection string
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of Firebase service account
- `FRONTEND_URLS` - Comma-separated CORS origins
- `PORT` - Default 4000
- `SPOONACULAR_API_KEY` - Spoonacular API key used by `POST /api/ingredients/parse` (server/routes/ingredients.js)

## Key Patterns

### Authentication
- Frontend uses Firebase Client SDK (`src/context/AuthContext.tsx`)
- Backend services verify Firebase ID tokens via Firebase Admin SDK
- Auth middleware on the server extracts `req.uid` from verified tokens

### Recipe Data Flow
1. User creates recipe → image uploaded to Firebase Storage → data posted to main server
2. Nutrition data calculated via Edamam API (`src/api/recipes.ts`: `getRecipeNutrition`)
3. Ingredient parsing uses `@jclind/ingredient-parser` library locally
4. Serving price calculated via `src/util/calculateServingPrice.ts`

### Testing
- Vitest for frontend unit tests (configured in `vite.config.ts`)
- Jest for backend server tests (configured in `server/jest.config.js`)
- Cypress for E2E tests (configured in `cypress.config.ts`)
- Test files use `.test.tsx` extension in `src/test/`
- React-modal requires `#root` element (handled in `src/test/setup.ts`)

### Import Aliases
- `src/` is aliased to the src directory (configured in `vite.config.ts`)
- Imports like `'src/api/auth'` resolve to `'./src/api/auth'`

### Type Definitions
- Custom types defined in `src/types.ts` (RecipeType, IngredientsType, etc.), aliased to the `'types'` import specifier via `vite.config.ts` and `tsconfig.json` paths

## Important Notes

- RecipeContext in `src/context/RecipeContext.tsx` is commented out - recipe operations are called directly via `RecipeAPI` class
- Firebase Admin SDK initialization is guarded with `if (!admin.apps.length)` to prevent double initialization
- MongoDB connections use connection pooling with maxPoolSize: 10
- The main server exposes a `/health` endpoint for health checks
