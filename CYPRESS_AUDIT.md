# Cypress Test Suite Audit

## 1. Architecture Overview

```
cypress/
├── e2e/
│   ├── home.cy.ts            # Home page smoke tests (2 tests)
│   ├── login.cy.ts           # Login/logout flow (1 test)
│   ├── signup.cy.ts          # Signup validation + full signup flow (6 tests)
│   ├── searchRecipes.cy.ts   # Search autocomplete → single recipe nav (1 test)
│   └── singleRecipe.cy.ts    # Single recipe page, logged out + logged in (2 tests)
├── fixtures/
│   ├── recipes.json                    # Browse list response (5 recipes, ~2000 lines)
│   ├── single-recipe.json              # Single recipe response
│   ├── trending-recipes.json           # Array of 4 recipes for home page
│   ├── recipe-reviews.json             # { reviews, totalCount }
│   ├── search-auto-complete-recipes.json
│   ├── save-recipe.json                # Old Atlas mutation response shape
│   └── username.json                   # Empty file, never referenced
└── support/
    ├── commands.ts    # cy.login() custom command
    ├── e2e.ts         # Global setup, exports test credentials
    └── index.d.ts     # TypeScript declarations for custom commands
```

**12 tests total** across 5 spec files. All are E2E tests — there are no unit or component tests anywhere in the project.

---

## 2. Configuration Review

```ts
// cypress.config.ts
export default defineConfig({
  projectId: 'k156x8',
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // empty — no plugins registered
    },
  },
})
```

- **baseUrl** — correctly points at the React dev server on `localhost:3000`.
- **No env vars configured** — no `CYPRESS_API_URL` or similar. All API mocking is done via hardcoded `cy.intercept()` URL strings in the spec files (see §4).
- **No plugins** — `setupNodeEvents` is an empty stub. No code coverage, no visual diff, no custom tasks.
- **No `specPattern` override** — uses Cypress default (`cypress/e2e/**/*.cy.{ts,tsx}`), which is correct.
- **No viewport defaults** — tests that care about viewport set it inline with `cy.viewport(...)`. Tests that don't will run at the Cypress default (1280×720), which may cause layout differences vs. what was tested.

The config itself is valid and compatible with the current frontend setup.

---

## 3. Custom Commands & Fixtures

### Custom commands

**`cy.login()`** (defined in `commands.ts`):
- Sets viewport to 726×977
- Intercepts two URLs (see §4 — both are broken)
- Checks for hero text, conditionally logs out if already logged in
- Fills in credentials from `e2e.ts` (`testinguser@gmail.com` / `testinguser`)
- Asserts the nav shows "Create Recipe" after login

**`cy.fillSignupInputs()`** and **`cy.signupProcess()`** (defined in `signup.cy.ts`, not `commands.ts`):
- These are registered with `Cypress.Commands.add()` inside a spec file. This is an anti-pattern — commands defined in a spec file are only registered when that spec runs, so they can't be reused in other specs. They should live in `commands.ts`.

**`e2e.ts`** exports `username`, `email`, and `password` as plain-text constants:
```ts
export const username = 'testinguser'
export const email = 'testinguser@gmail.com'
export const password = 'testinguser'
```
These reference a real account in the live Firebase/MongoDB instance. There are no Cypress env var abstractions (`Cypress.env('PASSWORD')`) — credentials are hardcoded in source.

**`index.d.ts`** correctly declares all three custom commands for TypeScript.

### Fixtures

| File | Shape | Status |
|---|---|---|
| `recipes.json` | `{ recipeList, total_results, page, filters, entries_per_page }` | ✅ `recipeList` and `total_results` match the new Express server. Extra fields (`page`, `filters`, `entries_per_page`) are ignored by the frontend. |
| `single-recipe.json` | Full `RecipeType` object | ✅ Shape is valid. Note: `rating.rateCount` and `rating.rateValue` are strings (`"3"`, `"13"`) — the backend now stores them as numbers, but the frontend calls `Number()` on them so it's handled. |
| `trending-recipes.json` | Array of `RecipeType` | ✅ Correct shape for `GET /getTrendingRecipes`. |
| `recipe-reviews.json` | `{ reviews: [...], totalCount: 3 }` | ⚠️ Shape matches the server. However, one of the three review objects has `reviewText: ""` and `reviewCreatedAt: ""` — entries like this are filtered out by the backend (`reviewText: { $ne: '' }`), so this entry would never appear in a real response. Also, `rating` is stored as a string (`"4"`) — backend now stores as a float. Frontend handles both. |
| `search-auto-complete-recipes.json` | Array of partial recipe objects | ✅ Shape matches `GET /searchAutoCompleteRecipes`. |
| `save-recipe.json` | `{ "matchedCount": 1, "modifiedCount": 1 }` | ❌ **Stale.** The new `PUT /saveRecipe` returns `{ saved: true }`. The old shape was the raw MongoDB driver response from Atlas Functions. |
| `username.json` | *(empty file)* | ❌ Empty and never referenced by any spec. Dead file. |

---

## 4. Test-by-Test Relevance Review

### The core problem: every intercept targets a dead URL

Every `cy.intercept()` call across all spec files and the `cy.login()` command targets the old MongoDB Atlas Functions base URL:

```
https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint/...
```

The frontend's axios client (`src/api/http-common.ts`) now calls:

```
http://localhost:4000/...   (dev, via REACT_APP_API_URL)
```

**None of the intercepts will fire.** Cypress intercepts work by matching outgoing request URLs. When no match is found, the real request goes through — meaning tests either hit the live backend (if running) or fail with network errors.

---

### `home.cy.ts`

**Test 1: "Should show all elements"**
- Visits `/`, checks for the hero image and tagline text.
- No API mocking — makes real calls.
- ✅ Will likely pass as long as the home page renders (hero text and image don't depend on the API).

**Test 2: "Should display trending recipes with mock"**
- Intercepts `us-east-1.aws.data.mongodb-api.com/.../getTrendingRecipes*` — **will not fire**.
- The test then checks `.recipes` for "Tuscan Chicken Skillet" from the fixture.
- ❌ **Broken.** The intercept URL is wrong. The real `GET /getTrendingRecipes` call goes through unarrested; if the live server isn't running or the DB has different data, the assertion fails. Even if the server is running, the fixture data isn't what gets returned.

---

### `login.cy.ts`

**Test: "Should complete email and password login process"**
- Calls `cy.login()`, which intercepts two dead URLs, then attempts real Firebase login.
- The `getUsername` endpoint (`/app/prepify-ixumn/endpoint/getUsername*`) **no longer exists** anywhere in the new backend. The new server derives username from Firebase tokens — there is no `/getUsername` route.
- `Cypress.on('uncaught:exception', () => false)` is set, masking any JS errors the broken intercept causes.
- ❌ **Broken.** The intercepts don't fire, and the mocked `getUsername` response (`'testinguser'`) is never injected. Whether the login flow itself works depends entirely on the live Firebase instance and whether `testinguser@gmail.com` exists there.

---

### `signup.cy.ts`

**Test 1: "All links should work"**
- Navigates between `/signup`, home, and `/login` checking for nav links.
- No API calls mocked or expected.
- ✅ Likely still valid.

**Test 2: "Should not allow signup if no inputs are filled"**
- Clicks submit with empty form, asserts "Create Recipe" doesn't appear.
- No API calls expected.
- ✅ Still valid.

**Test 3: "Should not allow signup if username is taken"**
- Submits with `testinguser` username (known to exist), checks for `.error` message.
- Makes a real Firebase Auth / username-check API call.
- ⚠️ Depends on the live Firebase instance having `testinguser` registered. Fragile, but probably still works.

**Test 4: "Should not allow signup if email is taken"**
- Same as above but for email collision.
- ⚠️ Same dependency on live data.

**Test 5: "Should not allow signup if password is too short"**
- Purely client-side validation, no API call.
- ✅ Still valid.

**Test 6: "Should complete signup process on desktop"**
- Intercepts `us-east-1.aws.data.mongodb-api.com/.../getTrendingRecipes*` — **will not fire**.
- Calls `cy.signupProcess()` which creates a real user in Firebase with a timestamped email/username.
- ❌ **Partially broken.** The trending recipe intercept doesn't fire (home page makes real calls). The signup itself may still work against the live Firebase — but it creates a real test user every time it runs, and those accumulate in the DB.

**Test 7: "Should complete signup process on mobile"**
- No intercept, uses `cy.signupProcess()`.
- ⚠️ Same real-user-creation concern as above.

**Structural issue:** `fillSignupInputs` and `signupProcess` are registered in the spec file itself. If any other spec tried to call `cy.signupProcess()`, it would fail with "command not found" because `signup.cy.ts` hadn't run yet.

---

### `searchRecipes.cy.ts`

**Test: "Should render single recipe, logged in"** *(describe label is wrong — says "Login/Logout Process")*
- Intercepts `us-east-1.aws.data.mongodb-api.com/.../recipes*` — **will not fire**.
- Intercepts `us-east-1.aws.data.mongodb-api.com/.../searchAutoCompleteRecipes*` — **will not fire**.
- Types "chicken" into the search input, clicks "Tuscan Chicken Skillet" from autocomplete, and asserts the recipe title renders.
- ❌ **Broken.** Neither intercept fires. The autocomplete calls the real server; if it's not running or returns different data, the test fails. The button `cy.contains('button.recipe', 'Tuscan Chicken Skillet')` relies on fixture data being returned.

---

### `singleRecipe.cy.ts`

**`beforeEach` intercepts:** All three (`getTrendingRecipes`, `getRecipe`, `getReviews`) target the old Atlas URL — **none will fire**.

**Test 1: "Should render single recipe, logged out"**
- Clicks a recipe thumbnail on the home page, checks recipe title, ingredients, instructions, and reviews.
- All API calls go to the real server unarrested.
- ❌ **Broken** as a mocked test. May accidentally pass if the live server is running and Tuscan Chicken Skillet is in the DB — but it's not testing what it thinks it's testing. The ingredient serving-size interaction test (`cy.contains('.ingredient', '15 ounce fettuccine')` after incrementing) depends on the fixture's exact quantity, which won't be in the real response unless the DB matches.

**Test 2: "Should render single recipe, logged in"**
- Intercepts `saveRecipe` and `unsaveRecipe` at the old Atlas URL — **will not fire**.
- Calls `cy.login()` — intercepts in login also broken.
- Tests save/unsave button toggle and the "add rating before review" validation.
- ❌ **Broken.** The save/unsave intercepts won't fire; real `PUT /saveRecipe` calls hit the server and actually mutate data. The review validation check (asserting a `.error` message) may still pass since it's a client-side guard.

---

## 5. Gaps — Flows With No Test Coverage

| Flow | Coverage |
|---|---|
| Recipe creation (form validation, submit, API call) | ❌ None |
| Browse/filter page (Recipes page — pagination, tag filter, cuisine filter, sort) | ❌ None |
| Rating a recipe (star click → `PUT /addRating`) | ❌ None |
| Writing a new review (`PUT /newReview`) | ❌ None |
| Editing a review (`PUT /editReview`) | ❌ None |
| Deleting a review (`PUT /deleteReview`) | ❌ None |
| Saved recipes (account page — save, unsave, list) | ❌ None |
| User ratings/reviews account page | ❌ None |
| "Mark as made" flow (`POST /madeRecipe`) | ❌ None |
| 404 / not-found page | ❌ None |
| Unauthenticated access to protected routes | ❌ None |
| Autocomplete search with real Express server | ❌ None (only mocked against dead URL) |
| Auth token being sent with API requests | ❌ None |

The covered flows are: home page render (partially), login/logout (partially), signup validation (partially), navigating to a single recipe, and recipe page UI interactions (ingredient scaling, review prompt). Even those are only reliably tested for the signup validation cases.

---

## 6. Overall Assessment

**The test suite is effectively non-functional as-is.** The migration from MongoDB Atlas Functions to the Express server broke every single `cy.intercept()` in the project because they all hardcode the old Atlas endpoint URL. None of the mocks fire, so every test that relies on controlled API data either:

1. Makes uncontrolled calls to the live server (making tests non-deterministic and environmentally dependent), or
2. Fails outright because the data it's asserting on (Tuscan Chicken Skillet titles, specific ingredient quantities) won't be present.

The two or three tests that might still pass (`home.cy.ts` test 1, signup validation tests 1–2 and 5) do so only because they test purely static UI or client-side form logic with no API dependency.

### Priority fix order

1. **Update all `cy.intercept()` URLs** to match the new Express server pattern. The base URL should come from a Cypress env var (`Cypress.env('API_URL')` → `http://localhost:4000`) rather than being hardcoded, so it can be overridden in CI/production test runs.

2. **Update `cy.login()`** — remove the `getUsername` intercept entirely (that endpoint is gone), and rethink how login works with the new Firebase-token-based auth. The simplest approach is a `cy.session()` call that performs login once and reuses the Firebase session cookie.

3. **Fix `save-recipe.json`** — change to `{ "saved": true }` to match the Express server response.

4. **Delete `username.json`** — empty and unused.

5. **Move `fillSignupInputs` and `signupProcess`** from `signup.cy.ts` into `commands.ts` and update `index.d.ts`.

6. **Fix the `describe` block labels** in `searchRecipes.cy.ts` and `singleRecipe.cy.ts` (both say "Login/Logout Process").

7. **Add intercepts for the new endpoints** that currently have no coverage at all — recipe creation, reviews write flow, browse/filter, account pages.

8. **Remove or scope `uncaught:exception` suppression** — currently it's a blanket `return false` that hides real application errors.
