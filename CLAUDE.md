# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prepify is a recipe website built with React/TypeScript frontend and an Express backend. Key features include recipe creation, search/filter, ingredient parsing with nutrition data, recipe ratings/reviews, and user authentication.

> **Coding standard:** [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) is the house code & architecture standard
> — frontend layering, the API-client and render-stability patterns, the server route/auth/validation
> conventions, the design-system rules, testing gates, and process conventions. Read it before non-trivial
> work; the R1/R2 refactors follow it.

## Architecture

### Two-Service Architecture

1. **Frontend (React/TypeScript)**: `src/` - SPA served on port 3000
2. **Main API Server**: `server/` - Express server on port 4000, handles recipes, reviews, users, auth

### Frontend Structure

- `src/pages/` - Route components (Home, Recipes, AddRecipe, Account, etc.)
- `src/Components/` - Reusable UI components (Layout, Navbar, RecipeThumbnail, Form, etc.)
- `src/context/` - React Context providers (AuthContext is active; RecipeContext has been removed/migrated)
- `src/api/` - API client modules
- `src/util/` - Utility functions (calculateServingPrice, formatQuantity, etc.)
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

> **Environment target:** the local `.env` / `server/.env` in this checkout point at
> **dedicated dev infrastructure** — Firebase project `prepify-dev-58579` (auth +
> storage) and the `prepify-dev` MongoDB cluster — not production. So local writes,
> seeded/admin accounts, and destructive testing hit dev, not live user data. (This
> is the dev side of the pre-1.0 env separation; earlier notes that "Mongo is prod"
> are stale.) Always confirm `VITE_FIREBASE_PROJECT_ID` / the `MONGO_URI` host before
> assuming an environment, since prod credentials may be swapped in elsewhere.

### Frontend (.env)
- `VITE_API_URL` - Main API server URL (default: http://localhost:4000)
- `VITE_FIREBASE_API_KEY` - Firebase Web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase Storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Cloud Messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_CYPRESS` - Set to `"true"` when running under Cypress; toggles test-mode behavior in `src/client/db.ts`
- `VITE_SENTRY_DSN` - Client error monitoring. Unset (local/CI) makes every export in `src/util/sentry.ts` a
  no-op. Events are tagged `release: VITE_APP_VERSION`, the same string the server sends, so a frontend
  regression can be lined up against the backend deploy that caused it.

### Main Server (.env)
- `MONGO_URI` - MongoDB connection string
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of Firebase service account
- `FRONTEND_URLS` - Comma-separated CORS origins
- `PORT` - Default 4000
- `INGREDIENT_PARSER_PROXY_URL` - Optional. Overrides the base URL of the hosted ingredient-enrichment proxy used by `@jclind/ingredient-parser` v2 (server/routes/ingredients.js). Unset = the package's default hosted proxy. NOTE: as of `@jclind/ingredient-parser` v2 the parser is key-free on the client — the proxy holds the Spoonacular key — so `SPOONACULAR_API_KEY` is **no longer used by this server** (it was needed only by the v1 in-process library call).
- `SENTRY_DSN` - Server error monitoring (`server/instrument.js`, required first in `index.js` so
  auto-instrumentation hooks in). Unset = init skipped and every `Sentry.*` call is a safe no-op. Events
  carry `release` = `server/package.json` version (matching the client's tag on purpose) and `dist` = the
  short `RAILWAY_GIT_COMMIT_SHA`, the same build `GET /version` reports. NOTE: only the *client* DSN was
  ever confirmed during the 1.0 cutover; if this one is unset the server reports nothing, silently.
- `EDAMAM_APP_ID` / `EDAMAM_APP_KEY` - Edamam nutrition API credentials, used server-side only by the `POST /api/nutrition/details` proxy (server/routes/nutrition.js). Moved off the client (formerly `VITE_EDAMAM_APP_ID/KEY`) so the keys aren't shipped in the browser bundle.
- `PAID_QUOTA_<SURFACE>_USER_DAILY` / `PAID_QUOTA_<SURFACE>_GLOBAL_DAILY` - Optional. Per-account and global DAILY spend ceilings on the paid third-party surfaces (audit H1), on top of the per-minute rate limiters. `<SURFACE>` is one of `NUTRITION` (Edamam), `INGREDIENTS` (Spoonacular parse), `RECIPE` (Cloud Vision + OpenAI moderation on recipe creates). Unset = the code defaults in `server/util/paidQuota.js` (nutrition 150/6000, ingredients 600/20000, recipe 50/2000). The global ceiling is what bounds a Sybil swarm's total spend regardless of account count; tune below your billing comfort line. Counters live in the `paidQuota` Mongo collection and self-reap via a TTL index. The limiter is skipped under `NODE_ENV=test`.

## Key Patterns

### Authentication
- Frontend uses Firebase Client SDK (`src/context/AuthContext.tsx`)
- Backend services verify Firebase ID tokens via Firebase Admin SDK
- Auth middleware on the server extracts `req.uid` from verified tokens

### Recipe Data Flow
1. User creates recipe → image uploaded to Firebase Storage → data posted to main server
2. Nutrition data calculated via Edamam API, proxied through the server (`src/api/recipes.ts`: `getRecipeNutrition` → `POST /api/nutrition/details` in server/routes/nutrition.js)
3. Ingredient parsing/enrichment uses `@jclind/ingredient-parser` **v2**: the client parses locally and synchronously via `parseIngredientString` (legacy flat shape), while enrichment (image + estimated price) goes through `POST /api/ingredients/parse` (server/routes/ingredients.js), which calls the package's `ingredientParser` → hosted proxy (key-free; the proxy holds the Spoonacular key). The server maps the v2 result (`price.cents`/`image`) back onto Prepify's stable persisted shape (`totalPriceUSACents`/`imagePath`), so saved recipe documents and downstream consumers are decoupled from the package's type surface (the app owns `ParsedIngredient`/`IngredientData` in `src/types.ts`)
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

- RecipeContext has been removed (the former `src/context/RecipeContext.tsx` no longer exists) - recipe operations are called directly via `RecipeAPI` class
- Firebase Admin SDK is on **v14** and uses the **modular API** (`firebase-admin/app`, `firebase-admin/auth`, `firebase-admin/storage`) — v14 removed the legacy `admin.*` namespace. Init is guarded with `if (!getApps().length)` (from `firebase-admin/app`) to prevent double initialization (`server/middleware/auth.js`). The frontend's Cypress config (`cypress.config.ts`) also runs Admin v14 for E2E token minting. Both `package.json`s carry an `overrides` pinning `uuid` to `^11.1.1` in the Admin dependency subtree — the `@google-cloud/storage` chain otherwise pulls a `uuid@9` with a moderate CVE and there's no fixed storage release yet; drop the override once one ships.
- MongoDB connections use connection pooling with maxPoolSize: 10
- The main server exposes two unauthenticated ops endpoints, both above the global rate limiter:
  `/health` (liveness) runs a **real query** (`recipes.findOne`), not a `ping` — a ping was answered
  for five weeks in Aug 2026 while every data route failed, so the platform held a dead instance
  green ([#319](https://github.com/jclind/prepify/pull/319)). `/version` (build identity) returns
  `{ version, commit, commitFull, branch, env }` from Railway's auto-injected
  `RAILWAY_GIT_COMMIT_SHA`/`RAILWAY_GIT_BRANCH` and **never touches the DB**, so it still answers
  during an outage ([#320](https://github.com/jclind/prepify/pull/320)). Confirm any deploy with
  `curl <api>/version` rather than opening the Railway dashboard.
