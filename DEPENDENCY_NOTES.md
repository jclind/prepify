# Dependency Notes

Changes made during the `refactor/feature-first-architecture-v2` dependency
cleanup and update session.

---

## Phase 1 — Removed packages

| Package | Reason |
|---|---|
| `openai` | Zero imports in codebase |
| `contentful` | Zero imports in codebase |
| `firestore-export-import` | Zero imports in codebase |
| `ejson` | Zero imports in codebase |
| `bson` | Zero imports in codebase (distinct from `bson-objectid` which IS used) |
| `latest-version` | Zero imports in codebase |
| `react-collapsed` | Zero imports; `react-collapse` is the one in use |
| `react-ratings-declarative` | Zero imports; `react-star-ratings` is the one in use |
| `react-helmet` | Duplicate of `react-helmet-async`; migrated 5 files to async variant then removed |

**Kept:** `bson-objectid` (used in `features/recipes/api/recipes.ts`),
`@formspree/react` (used in `app/pages/Help/Help.tsx`),
`react-collapse` (used in `SingleRecipe/DataSections/NutritionData`),
`react-star-ratings` (used in Ratings, RecipeReview, UserRatings).

---

## Phase 2 — Updated packages

### Tier 1 — Low-risk updates

| Package | Before | After | Notes |
|---|---|---|---|
| `@types/react` | 17.x | 17.0.91 | Pinned to 17.x; bumped to 18.x in Tier 5 |
| `@types/react-dom` | 17.x | 17.0.26 | Same; bumped to 18.x in Tier 5 |
| `@types/node` | — | 25.5.0 | |
| `@types/jest` | — | 30.0.0 | |
| `@types/react-beautiful-dnd` | — | 13.1.8 | |
| `react-icons` | 4.x | 4.12.0 | Pinned to 4.x; v5 requires React 18 types. Bumped in Tier 5 |
| `normalize.css` | — | 8.0.1 | |
| `sass` | — | 1.98.0 | |
| `web-vitals` | — | 5.2.0 | |
| `slugify` | — | 1.6.8 | |
| `react-router-dom` | — | 6.30.3 | Pinned to v6; v7 requires React 18 (peer dep). **See below.** |
| `react-select` | — | 5.10.2 | |
| `react-to-print` | — | 2.15.1 | Pinned to v2; v3 dropped the default export (breaking) |
| `react-top-loading-bar` | — | 3.0.2 | |
| `react-loader-spinner` | — | 6.1.6 | Pinned to 6.1.6; v7+ are ESM-only, incompatible with CRA webpack config |
| `react-loading-skeleton` | — | 3.5.0 | |
| `react-modal` | — | 3.16.3 | |
| `react-tag-input` | — | 5.2.3 | Pinned to 5.x; v6 requires React 18. Bumped in Tier 5 |
| `react-dropzone` | — | 15.0.0 | |
| `hamburger-react` | — | 2.5.2 | |
| `react-helmet-async` | — | 3.0.0 | |

### Tier 2 — axios
`0.25.0` → `1.14.0`. No breaking changes hit: only `axios.create()` configs
and `.catch()` chains in use. No `CancelToken`, interceptors, or `AxiosError`
type checks.

### Tier 3 — firebase
`9.17.1` → `12.11.0`. App uses `firebase/compat` for auth (compat layer still
present in v12) and modular API for storage/firestore/analytics. No API
changes required.

### Tier 4 — TypeScript
`4.9.5` → `6.0.2`. No new type errors.

### Tier 5 — React 17 → 18
`17.0.2` → `18.3.1`. Changes made:
- `src/index.js`: `ReactDOM.render()` → `createRoot().render()`
- `@types/react` bumped to `^18.3.28`
- `@types/react-dom` bumped to `^18.3.7`
- `react-icons` bumped `4.12.0` → `5.6.0`
- `react-tag-input` bumped `5.2.3` → `6.10.6`

`react-beautiful-dnd@13.1.1` already declares `react@^18.0.0` as a peer dep —
no issues at build time. Known runtime issue: `react-beautiful-dnd` is
unmaintained and may log a warning in React 18 strict mode about
`findDOMNode`. Flagged for a future replacement (e.g. `@hello-pangea/dnd`,
a maintained fork).

Installed with `--legacy-peer-deps` to bypass `react-scripts@5.0.0`'s stale
peer range which excludes React 18. This is expected and safe.

---

## Skipped / deferred

| Item | Reason |
|---|---|
| `react-scripts` | Explicitly frozen at `5.0.0` per task instructions |
| `react-router-dom` v7 | Requires React 18 (done) but is a separate migration — v7 introduced a new data router API with breaking route changes |
| `react-to-print` v3 | Dropped default export; would require component change in `PrintRecipeBtn.tsx` — deferred |
| `react-loader-spinner` v7+ | ESM-only; incompatible with CRA 5 webpack config without ejecting — deferred |

## Flagged for future sessions

- **`react-beautiful-dnd`** — unmaintained; known React 18 strict-mode
  `findDOMNode` warning. Replace with `@hello-pangea/dnd` (drop-in fork).
- **`react-router-dom` v7 migration** — API changes needed in route definitions.
- **`react-to-print` v3 migration** — update `PrintRecipeBtn.tsx` to named export.
- **`react-loader-spinner` v7+ migration** — requires CRA eject or migration to Vite.
