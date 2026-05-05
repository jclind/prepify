# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prepify is a recipe website built with React/TypeScript frontend and two Express backend services. Key features include recipe creation, search/filter, ingredient parsing with nutrition data, recipe ratings/reviews, and user authentication.

## Architecture

### Three-Service Architecture

1. **Frontend (React/TypeScript)**: `src/` - SPA served on port 3000
2. **Main API Server**: `server/` - Express server on port 4000, handles recipes, reviews, users, auth
3. **Ingredient Parser Service**: `server-ingredients/` - Express server on port 4001, parses ingredient strings with Spoonacular API integration and MongoDB caching

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
- `routes/` - Express route handlers (recipes, reviews, tags, users, auth)
- `middleware/` - Firebase auth token verification
- `db.js` - MongoDB connection singleton
- Uses Firebase Admin SDK for auth verification

**Ingredient Parser Service (`server-ingredients/`)**:
- `routes/parse.js` - POST /parse endpoint for ingredient parsing
- `services/ingredientCache.js` - MongoDB cache operations
- `services/spoonacular.js` - Spoonacular API calls
- Uses Firebase Admin SDK for auth verification
- Caches results in MongoDB to reduce API calls

### API Communication

**Frontend → Main Server**:
- `src/api/http-common.ts` creates axios instance with `REACT_APP_API_URL` (default: http://localhost:4000)
- Request interceptor automatically attaches Firebase ID token as Bearer header

**Frontend → Ingredient Parser Service**:
- Called via `src/api/recipes.ts` (getIngredientData) - uses local `@jclind/ingredient-parser` for parsing
- Note: The INGREDIENT_PARSER_INTEGRATION_NOTES.md documents a Railway enrichment flow, but current code uses the library directly

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

### Ingredient Parser Service (`server-ingredients/`)
```bash
cd server-ingredients
npm install
npm run dev            # Start with nodemon
npm start              # Start with node
```

### E2E Tests (Cypress)
```bash
npx cypress open       # Open Cypress test runner
```

## Environment Variables

### Frontend (.env)
- `REACT_APP_API_URL` - Main API server URL
- `REACT_APP_EDAMAM_APP_ID` - Edamam nutrition API
- `REACT_APP_EDAMAM_APP_KEY` - Edamam nutrition API
- `REACT_APP_FIREBASE_*` - Firebase configuration
- `SASS_PATH=src`

### Main Server (.env)
- `MONGO_URI` - MongoDB connection string
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of Firebase service account
- `FRONTEND_URLS` - Comma-separated CORS origins
- `PORT` - Default 4000

### Ingredient Parser Service (.env)
- `MONGO_URI` - MongoDB connection string (same DB)
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of Firebase service account
- `SPOONACULAR_API_KEY` - Spoonacular API key
- `PORT` - Default 4001

## Key Patterns

### Authentication
- Frontend uses Firebase Client SDK (`src/context/AuthContext.tsx`)
- Backend services verify Firebase ID tokens via Firebase Admin SDK
- Auth middleware in both servers extracts `req.uid` from verified tokens

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
- Custom types defined in `types.d.ts` (RecipeType, IngredientsType, etc.)
- Note: There's also a `src/shared/types/` directory - check which is in use

## Important Notes

- RecipeContext in `src/context/RecipeContext.tsx` is commented out - recipe operations are called directly via `RecipeAPI` class
- The ingredient parser integration notes (`src/INGREDIENT_PARSER_INTEGRATION_NOTES.md`) describe a Railway flow that may not match current implementation
- Firebase Admin SDK initialization is guarded with `if (!admin.apps.length)` to prevent double initialization
- MongoDB connections use connection pooling with maxPoolSize: 10
- Both backend services expose `/health` endpoints for health checks
