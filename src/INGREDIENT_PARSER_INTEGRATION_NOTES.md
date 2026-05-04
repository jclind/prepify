# Ingredient Parser Integration Notes

## Changes Made

### Server-Side Changes (`server-ingredients/`)

1. **`routes/parse.js`**: Modified to read `SPOONACULAR_API_KEY` from environment variables instead of request body. Added startup guard that returns 500 if the key is not configured.

2. **`.env.example`**: Added `SPOONACULAR_API_KEY` template variable.

### Frontend Changes

1. **`src/api/ingredientParserApi.ts`** (NEW): Created API client for the Railway ingredient parser service with Firebase token authentication.

2. **`src/api/recipes.ts`**: Updated `getIngredientData` method to:
   - Use `parseIngredientString(val)` for local parsing
   - Call `fetchIngredientEnrichment(parsedIngredient)` for server-side enrichment
   - Removed `REACT_APP_SPOONACULAR_API_KEY` dependency

3. **`package.json`**: Updated `@jclind/ingredient-parser` from `^1.1.2` to `^1.2.10`.

4. **`.env`**: Added `REACT_APP_INGREDIENT_PARSER_URL=http://localhost:4001`. Note: The existing `REACT_APP_SPOONACULAR_API_KE` had a typo and was not actually used by the code (code referenced `REACT_APP_SPOONACULAR_API_KEY` which didn't exist).

5. **`.env.example`** (NEW): Created environment variable template for the project.

6. **Dependencies**: Added `uuid` and `@types/uuid` as dependencies (were missing).

## Verification Results

- ✅ Build passes without TypeScript errors or warnings
- ✅ `REACT_APP_SPOONACULAR_API_KEY` no longer appears in `src/`
- ✅ `ingredientParser` (full function) is no longer imported in `src/`
- ✅ `parseIngredientString` is imported in `recipes.ts`
- ✅ `fetchIngredientEnrichment` is imported from `./ingredientParserApi`

## Post-Deploy Manual Steps

These steps must be done manually after deploying the code:

1. **Railway**: Add `SPOONACULAR_API_KEY` to the `server-ingredients` service environment variables, then redeploy the service.

2. **Netlify**: Add `REACT_APP_INGREDIENT_PARSER_URL` pointing at the Railway service URL, then trigger a Netlify redeploy.

3. **Netlify**: Remove `REACT_APP_SPOONACULAR_API_KEY` from environment variables (if it exists).

## Current Flow

1. Frontend calls `RecipeAPI.getIngredientData(ingredientString)`
2. `parseIngredientString(ingredientString)` parses locally (no network)
3. `fetchIngredientEnrichment(parsedIngredient)` calls `POST /parse` on Railway service with Firebase Bearer token
4. Railway service checks MongoDB cache, or calls Spoonacular API with server-side key
5. Result returned to frontend

## Request/Response Shape

**Request:**
```json
{
  "ingredientString": "1 cup rice"
}
```

**Response:**
```json
{
  "source": "cache" | "spoonacular",
  "data": {
    "id": 20081,
    "name": "rice",
    "image": "rice.jpg",
    "nutrition": {...},
    "possibleUnits": ["cup", "g", "oz"],
    "estimatedCost": {...},
    "aisle": "Pasta and Rice"
  }
}
```

**Error Response:**
```json
{
  "error": "Error message here"
}
```
