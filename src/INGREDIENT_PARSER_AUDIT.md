# Ingredient Parser Frontend Integration Audit

## Dependency

**File:** `package.json`

```json
"@jclind/ingredient-parser": "^1.1.2"
```

The ingredient-parser package is versioned at `^1.1.2` in package.json, though package-lock.json shows `1.2.9` is installed.

---

## Files That Import or Configure the Package

### 1. `src/api/recipes.ts`

This is the main integration point where `ingredientParser` is called.

**Import:**
```typescript
import { IngredientResponse, ingredientParser } from '@jclind/ingredient-parser'
```

**Usage:**
```typescript
// Ingredients
async getIngredientData(val: string): Promise<IngredientsType> {
  const apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY

  if (!apiKey) {
    throw new Error('Spoonacular API key is not defined')
  }

  const result: IngredientResponse = await ingredientParser(val, apiKey)

  const data: IngredientsType = { ...result, id: uuidv4() }

  return data
}
```

The `getIngredientData` method is called by the frontend to parse ingredient strings and fetch ingredient data.

---

### 2. `src/util/updateIngredients.ts`

This file only imports types from the package for type annotations.

**Import:**
```typescript
import { IngredientData, ParsedIngredient } from '@jclind/ingredient-parser'
```

**Usage:**
```typescript
export const updateIngredients = (
  ingredients: IngredientsType[],
  originalServings: number,
  newServings: number
) => {
  // ...
  if ('parsedIngredient' in ingr) {
    let updatedIngredientData: IngredientData | null = structuredClone(
      ingr.ingredientData
    )
    let updatedParsedIngredient: ParsedIngredient = structuredClone(
      ingr.parsedIngredient
    )
    // ...
  }
  // ...
}
```

This file uses the imported types for type safety but does not make any API calls.

---

### 3. `types.d.ts`

Global type definitions file that re-exports types.

**Import:**
```typescript
import { IngredientData, ParsedIngredient } from '@jclind/ingredient-parser'
```

**Usage:**
```typescript
export type IngredientsType =
  | {
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData
      id: string
    }
  | {
      error?: {
        message: string
      }
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData | null
      id: string
    }
  | LabelType
```

---

## Current Endpoint URLs (Hardcoded in Package)

The `@jclind/ingredient-parser` package has **hardcoded base URLs** in its internal configuration:

**File:** `node_modules/@jclind/ingredient-parser/dist/src/api/http.js`

```javascript
exports.mongoHttp = _axios.create({
    baseURL: 'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint',
    headers: {
        'Content-type': 'application/json',
    },
});

exports.spoonacularHttp = _axios.create({
    baseURL: 'https://api.spoonacular.com/food/ingredients/',
    headers: {
        'Content-type': 'application/json',
    },
});
```

### Current Flow

1. `ingredientParser(val, apiKey)` is called from `src/api/recipes.ts`
2. It calls `getIngredientInfo(ingredientName, spoonacularAPIKey)` internally
3. `getIngredientInfo` first checks MongoDB cache via `checkIngredient(name)` → calls `https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/checkIngredient?name={name}`
4. If cache miss, it calls Spoonacular API directly → `https://api.spoonacular.com/food/ingredients/search?query={name}&number=1&apiKey={key}`
5. After fetching from Spoonacular, it persists to MongoDB → `https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/addIngredient`

**Note:** The package does NOT use Firebase authentication. It makes direct HTTP calls to MongoDB Data API and Spoonacular API.

---

## Wrapper/Service Files

There is **no dedicated wrapper** for the ingredient-parser. The `RecipeAPI` class in `src/api/recipes.ts` acts as the service layer, wrapping the `ingredientParser` function in the `getIngredientData` method.

### Related: `src/api/http-common.ts`

This file configures the main axios instance for the Prepify backend, with Firebase token injection:

```typescript
export const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  headers: {
    'Content-type': 'application/json',
  },
})

http.interceptors.request.use(async (config) => {
  const auth = getAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})
```

**However**, the `ingredientParser` function does NOT use this axios instance. It uses its own internal axios instances with hardcoded URLs.

---

## What Needs to Change

To point at `https://<new-railway-url>/parse` with a Firebase Bearer token in the Authorization header, the following changes are required:

### Option 1: Replace `ingredientParser` with Direct API Call (Recommended)

Replace the `ingredientParser` call in `src/api/recipes.ts` with a direct call to the new service:

```typescript
async getIngredientData(val: string): Promise<IngredientsType> {
  const apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY
  const token = await getAuth().currentUser?.getIdToken()

  if (!apiKey) {
    throw new Error('Spoonacular API key is not defined')
  }

  const response = await axios.post(
    `${process.env.REACT_APP_INGREDIENT_PARSER_URL || 'https://<railway-url>'}/parse`,
    {
      ingredientString: val,
      spoonacularApiKey: apiKey
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  )

  // The new service returns { source: 'cache'|'spoonacular', data: {...} }
  const result = response.data.data

  const data: IngredientsType = { ...result, id: uuidv4() }
  return data
}
```

**Changes required:**
1. Update `src/api/recipes.ts` to make a direct `POST` request instead of calling `ingredientParser`
2. Add environment variable `REACT_APP_INGREDIENT_PARSER_URL` for the Railway service URL
3. Remove dependency on `@jclind/ingredient-parser` (optional, can keep for types)

### Option 2: Create a Wrapper Service

Create a new file `src/api/ingredientParser.ts` that wraps the new API:

```typescript
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { IngredientResponse } from '@jclind/ingredient-parser' // Keep for types
import { v4 as uuidv4 } from 'uuid'

export async function ingredientParser(
  val: string,
  spoonacularApiKey: string
): Promise<IngredientResponse> {
  const auth = getAuth()
  const user = auth.currentUser
  const token = await user?.getIdToken()

  const response = await axios.post(
    `${process.env.REACT_APP_INGREDIENT_PARSER_URL || 'https://<railway-url>'}/parse`,
    {
      ingredientString: val,
      spoonacularApiKey
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  )

  return response.data.data
}
```

Then update `src/api/recipes.ts` to import from this new wrapper instead.

---

## Summary

| Aspect | Current State |
|--------|---------------|
| **Package** | `@jclind/ingredient-parser` v1.1.2 (1.2.9 installed) |
| **Main Integration** | `src/api/recipes.ts` → `getIngredientData()` → `ingredientParser()` |
| **Type Imports** | `src/util/updateIngredients.ts`, `types.d.ts` |
| **Current Endpoints** | Hardcoded in package: `https://us-east-1.aws.data.mongodb-api.com/...` and `https://api.spoonacular.com/...` |
| **Authentication** | None (no Firebase token, no Bearer header) |
| **Wrapper Service** | No dedicated wrapper; uses `RecipeAPI.getIngredientData()` |

### Required Changes for New Service

1. Add `REACT_APP_INGREDIENT_PARSER_URL` environment variable
2. Replace `ingredientParser()` call with direct `POST` to `/parse` endpoint
3. Include Firebase Bearer token in `Authorization` header
4. Request body: `{ ingredientString: string, spoonacularApiKey: string }`
5. Response handling: new service returns `{ source, data }` structure
