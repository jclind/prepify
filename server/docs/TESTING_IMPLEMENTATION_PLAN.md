# Server Testing Implementation Plan

This document outlines proposed testing coverage and changes for the `/server` API.

---

## Current Test Coverage

| File | Tests | Status |
|------|-------|--------|
| `__tests__/health.test.js` | GET /recipes (200) | Misnamed file, minimal |
| `__tests__/recipes.test.js` | GET /recipes, POST /addRecipe, PUT /saveRecipe, PUT /unsaveRecipe | Good coverage |
| `__tests__/reviews.test.js` | PUT /addRating, PUT /editReview, PUT /deleteReview | Good coverage |

---

## Test Coverage Gaps

### High Priority (Core User Flows)

#### `routes/recipes.js`

| Endpoint | Test Cases | Notes |
|----------|------------|-------|
| `GET /health` | - Returns 200 with `{ status: 'ok' }` | Not tested |
| `GET /getRecipe` | - Returns recipe with incremented views<br>- Returns 404 if not found<br>- Fire-and-forget stats update doesn't block | Not tested |
| `DELETE /deleteRecipe` | - Requires auth (401)<br>- Validates userId matches token uid (403)<br>- Deletes recipe from recipes collection<br>- Removes recipeId from user's userRecipes array<br>- Returns 404 if recipe not found | Not tested |
| `GET /getSavedRecipe` | - Returns saved entry with dateSaved<br>- Returns 404 if not saved<br>- Validates userId matches token uid (403) | Not tested |
| `POST /madeRecipe` | - Increments recipe's numTimesMade<br>- Adds recipeId to user's madeRecipes set<br>- Upserts userRecipeData document | Not tested |
| `GET /checkMadeRecipe` | - Returns `{ made: true }` if made<br>- Returns `{ made: false }` if not made<br>- Validates userId matches token uid (403) | Not tested |
| `GET /searchAutoCompleteRecipes` | - Returns array with _id, title, recipeImage<br>- Limits to 8 results<br>- Case-insensitive search | Not tested |
| `GET /getTrendingRecipes` | - Returns recipes sorted by views desc<br>- Respects limit param (max 20)<br>- Default limit is 4 | Not tested |

#### `routes/users.js`

| Endpoint | Test Cases | Notes |
|----------|------------|-------|
| `GET /getUsername` | - Returns username for valid userId<br>- Returns 404 if userId not found<br>- Returns 400 if userId missing/null | Not tested |
| `GET /checkUsernameAvailability` | - Returns true if available<br>- Returns false if taken<br>- Returns 400 if username missing | Not tested |
| `POST /setUsername` | - Requires auth (401)<br>- Validates userId matches token uid (403)<br>- Creates new username entry<br>- Updates existing username entry<br>- Returns 409 if username taken by another user | Not tested |
| `GET /getSavedRecipes` | - Requires auth (401)<br>- Validates userId matches token uid (403)<br>- Returns paginated results<br>- Supports order=new/old for dateSaved sorting<br>- Returns totalCount | Not tested |

#### `routes/tags.js`

| Endpoint | Test Cases | Notes |
|----------|------------|-------|
| `POST /addRecipeTag` | - Requires auth (401)<br>- Inserts tag document<br>- Returns inserted document with _id | Not tested |
| `GET /searchRecipeTags` | - Searches by text (case-insensitive)<br>- Excludes selectedTags from results<br>- Returns up to 10 results | Not tested |
| `GET /getRecipeTags` | - Returns array of tags<br>- Respects limit param (default 5) | Not tested |

#### `routes/reviews.js`

| Endpoint | Test Cases | Notes |
|----------|------------|-------|
| `PUT /newReview` | - Requires auth (401)<br>- Validates username exists (400)<br>- Upserts review with timestamps<br>- Returns updated document | Not tested |
| `GET /checkIfReviewed` | - Returns reviewed=true with reviewText/rating if reviewed<br>- Returns reviewed=false if not reviewed<br>- Returns 400 if params missing | Not tested |
| `GET /getReviews` | - Returns paginated results<br>- Supports filter=new/top for sorting<br>- Filters for non-empty reviewText<br>- Adds isCurrentUser boolean to each review | Not tested |
| `GET /getSingleUserReviews` | - Returns paginated results for username<br>- Supports filter=new/top for sorting<br>- Optionally includes recipeData with returnRecipeData=true | Not tested |

---

### Medium Priority (Edge Cases & Error Handling)

#### General Test Patterns to Add

1. **Invalid request body tests** - Malformed JSON, wrong content types
2. **Database error handling** - Connection failures, duplicate key errors
3. **Rate limiting tests** - If implemented
4. **Concurrent request tests** - Race conditions in save/unsave
5. **Input sanitization** - XSS, SQL injection (via MongoDB NoSQL injection)

#### Specific Edge Cases

| Endpoint | Edge Cases |
|----------|------------|
| All routes | Missing required query params, empty arrays, null values |
| POST /addRecipe | Counter manipulation attempts (client sending non-zero values) |
| PUT /saveRecipe | Double save prevention (409 on duplicate) |
| PUT /unsaveRecipe | Unsave recipe that was never saved, counter goes below zero |
| PUT /addRating | Float values, boundary values (1.0, 5.0), NaN |
| All review routes | Empty review strings, extremely long review text |

---

### Low Priority (Optional Enhancements)

- Performance/benchmark tests for heavy queries
- Load testing for pagination with large datasets
- Integration tests with frontend client
- Contract tests for API stability

---

## Proposed Code Changes

### 1. Fix `__tests__/health.test.js` Filename

**Current**: Tests `/recipes` endpoint but file is named `health.test.js`

**Proposed**: Rename to `recipes-list.test.js` or move tests to `recipes.test.js`

### 2. Add Consistent Error Response Format

**Current**: Some endpoints return `{ error: "message" }`, others may differ

**Proposed**: Standardize all error responses to:
```js
{
  error: {
    code: "VALIDATION_ERROR" | "AUTH_ERROR" | "NOT_FOUND" | "FORBIDDEN",
    message: "Human-readable message",
    details: {} // optional field-specific details
  }
}
```

### 3. Add Request ID Logging

**Proposed**: Add a middleware that generates a unique `requestId` for each request and logs it. Include requestId in error responses for debugging.

### 4. Add Input Validation Library

**Proposed**: Consider using `joi` or `zod` for centralized input validation instead of inline checks.

```js
// Example with zod
const recipeSchema = z.object({
  _id: z.string().min(1),
  title: z.string().min(1),
  ingredients: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).min(1),
  // ...
})
```

### 5. Add Unit Tests for Non-HTTP Code

**Proposed**: Extract business logic from routes into service modules for easier unit testing.

```
server/
  services/
    recipeService.js  # Business logic for recipes
    ratingService.js   # Business logic for ratings
  routes/
    recipes.js        # HTTP layer, delegates to services
```

### 6. Add Database Seeding Helper

**Proposed**: Create `__tests__/helpers/seed.js` with reusable fixtures:

```js
// __tests__/helpers/seed.js
const seedRecipes = async (db, recipes) => {
  await db.collection('recipes').insertMany(recipes)
}

const seedUser = async (db, uid, username) => {
  await db.collection('usernames').insertOne({ _id: uid, username })
}

module.exports = { seedRecipes, seedUser }
```

---

## Test Implementation Checklist

Use this checklist to track progress:

- [ ] Rename `health.test.js` to `recipes-list.test.js` or merge
- [ ] Add tests for `GET /health`
- [ ] Add tests for `GET /getRecipe`
- [ ] Add tests for `DELETE /deleteRecipe`
- [ ] Add tests for `GET /getSavedRecipe`
- [ ] Add tests for `POST /madeRecipe`
- [ ] Add tests for `GET /checkMadeRecipe`
- [ ] Add tests for `GET /searchAutoCompleteRecipes`
- [ ] Add tests for `GET /getTrendingRecipes`
- [ ] Add tests for all `routes/users.js` endpoints
- [ ] Add tests for all `routes/tags.js` endpoints
- [ ] Add tests for `PUT /newReview`
- [ ] Add tests for `GET /checkIfReviewed`
- [ ] Add tests for `GET /getReviews`
- [ ] Add tests for `GET /getSingleUserReviews`
- [ ] Add edge case tests for existing covered routes
- [ ] Add error handling tests
- [ ] Fix dependency issues and run full test suite
- [ ] Add coverage reporting (`jest --coverage`)
- [ ] Consider extracting services for unit testing

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- health.test.js

# Run tests matching pattern
npm test -- --testNamePattern="saveRecipe"
```

---

## Notes

- Current tests use MongoDB Memory Server for isolated testing
- Firebase Admin SDK is mocked via `__mocks__/firebase-admin.js`
- Auth tests use `TEST_UID = 'test-uid'` as default
- Tests run in band (`--runInBand`) to avoid connection conflicts
