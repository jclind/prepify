# Prepify — Browser Audit Report

---

### Page 1 — Home (`http://localhost:3000`)

**Loads:** Yes  
**Final URL:** `http://localhost:3000/`

**Console errors:**
- `Warning: Using UNSAFE_componentWillMount in strict mode` — originates from `SideEffect(NullComponent)` (a third-party library, likely `react-helmet`)

**Network failures:** None

**Visual observations:**  
Page renders correctly. Hero section, search bar, and Trending section all display with populated recipe cards and data.

---

### Page 2 — Browse / Search (`http://localhost:3000/recipes`)

**Loads:** Yes  
**Final URL:** `http://localhost:3000/recipes`

**Console errors:** None  
**Network failures:** None

**Visual observations:**  
Recipe cards are frozen in skeleton/loading state (gray placeholder blocks) — the page rendered but the cards never populated with data within the capture window. Layout and filter controls (sort, Diet Tags, Cuisine dropdowns) are visible and correctly positioned.

---

### Page 3 — Single Recipe (`http://localhost:3000/recipes/65302e782ea38768dea80749`)

**Loads:** Yes  
**Final URL:** unchanged

**Console errors:**
- `Failed to load resource: the server responded with a status of 404 (Not Found)`

**Network failures:**
- `GET http://localhost:4000/getUsername?userId=null → 404`

**Visual observations:**  
Recipe content (title, description, price, time, servings, rating, ingredients, instructions) all render correctly. Two broken images: the hero recipe photo renders as its alt text string ("Homemade Granola") instead of an image, and all ingredient thumbnails are blank gray circles. The `getUsername?userId=null` call fires on every unauthenticated recipe view — the `null` uid is being passed to the API instead of short-circuiting.

---

### Page 4 — Login (`http://localhost:3000/login`)

**Loads:** Yes  
**Final URL:** unchanged

**Console errors:**
- `UNSAFE_componentWillMount` warning (same third-party library as home)

**Network failures:** None

**Visual observations:**  
Form renders cleanly. Email field, password field, "Forgot Password" link, "Login" button, and "Log In With Google" button all present and correctly styled.

---

### Page 5 — Sign Up (`http://localhost:3000/signup`)

**Loads:** Yes  
**Final URL:** unchanged

**Console errors:**
- `UNSAFE_componentWillMount` warning

**Network failures:** None

**Visual observations:**  
Form renders correctly with Name, Username, Email, and Password fields. Minor copy issue: the primary submit button reads **"Create Username"** instead of "Sign Up" or "Create Account".

---

### Page 6 — Post-login / Home (redirect after login)

**Loads:** Yes  
**Final URL:** `http://localhost:3000/` (correctly redirected after login)

**Network failures during login:**
- `GET http://localhost:4000/getUsername?userId=Auce8NCqi5UzfmJOa0LML75sq9J2 → 404` (fires twice immediately on auth state change)

**Observation:** The `GET /getUsername` endpoint does not exist on the Express server — it was part of the old MongoDB Atlas Functions backend and was never implemented in the new server. This fires on every page load for a logged-in user.

---

### Page 7 — Account / Profile (`http://localhost:3000/account`)

**Loads:** Yes  
**Final URL:** `http://localhost:3000/account/saved-recipes` (immediately redirected)

**Console errors:**
- `UNSAFE_componentWillMount` warning
- `Failed to load resource: 404` × 2

**Network failures:**
- `GET http://localhost:4000/getUsername?userId=Auce8NCqi5UzfmJOa0LML75sq9J2 → 404` × 2

**Visual observations:**  
`/account` redirects straight to `/account/saved-recipes` with no profile overview landing. Avatar shows the letter "T" with no username displayed alongside it — username is missing because `getUsername` is returning 404. "Edit Profile" button is present. Tabs (Saved Recipe / Ratings / Your Recipes) render correctly.

---

### Page 8 — Saved Recipes (`http://localhost:3000/account/saved-recipes`)

**Loads:** Yes  
**Final URL:** unchanged

**Console errors:**
- `UNSAFE_componentWillMount` warning
- `Failed to load resource: 404` × 2

**Network failures:**
- `GET http://localhost:4000/getUsername?userId=Auce8NCqi5UzfmJOa0LML75sq9J2 → 404` × 2

**Visual observations:**  
Empty state renders correctly ("No Recipes Saved Yet"). This is expected for a new test account. No crash. Same missing username in header as above.

---

### Page 9 — Add Recipe (`http://localhost:3000/add-recipe`)

**Loads:** Yes  
**Final URL:** unchanged

**Console errors:**
- `Failed to load resource: 404` × 2

**Network failures:**
- `GET http://localhost:4000/getUsername?userId=Auce8NCqi5UzfmJOa0LML75sq9J2 → 404` × 2

**Visual observations:**  
Form loads and renders correctly: Title, Select Image, Description, Servings fields all visible. One UI oddity: the image picker shows an **"×" clear button** when no image has been selected yet — the button should only appear after an image is chosen.

---

### Summary

| Page | Loads | Console errors | Network errors | Notes |
|------|-------|----------------|----------------|-------|
| Home | ✅ | 1 (3rd-party warning) | None | Renders correctly |
| Browse / Search | ✅ | None | None | Recipe cards stuck in skeleton state |
| Single Recipe | ✅ | 1 (404) | `getUsername?userId=null → 404` | Recipe image broken; ingredient images missing |
| Login | ✅ | 1 (3rd-party warning) | None | Renders correctly |
| Sign Up | ✅ | 1 (3rd-party warning) | None | Submit button says "Create Username" |
| Account / Profile | ✅ | 3 | `getUsername → 404` × 2 | Redirects to saved-recipes; no username shown |
| Saved Recipes | ✅ | 3 | `getUsername → 404` × 2 | Empty state correct; no username shown |
| Add Recipe | ✅ | 2 | `getUsername → 404` × 2 | Image picker shows × before image selected |

**Dominant issue across all authenticated pages:** `GET /getUsername` is called on every render but the endpoint does not exist on the Express server — it was never ported from the old Atlas Functions backend. This causes the username to be missing everywhere it should appear.
