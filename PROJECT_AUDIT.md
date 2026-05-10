# Project Audit — 2026-05-09

## Summary

Audited ~264 files across the frontend (`src/`), main server (`server/`), ingredient-parser service (`server-ingredients/`), Cypress suite, and project root. Approximately 30 files or groups are flagged across five categories. The most notable finding is an accumulation of session-generated diagnostic and one-time audit documents in the project root, alongside a fully-commented-out `RecipeContext.tsx`, an empty `src/shared/types/` directory, and dead exports in `src/client/db.ts` — all safe to remove. A more structural question is whether the `server-ingredients/` service is still intentional: no frontend code or main-server code calls its endpoints.

> **Note:** A previous draft of this file existed and contained stale findings. This version is based on a fresh, ground-up investigation of the current codebase state.

> **Important:** `server-ingredients/` is an **essential service** and must not be removed or modified as part of any audit action in this file, regardless of the analysis below.

---

## Dead Code

> **Completed 2026-05-09** — All High/Medium dead-code items below have been removed.

| File | Reason | Confidence | Status |
|------|--------|------------|--------|
| `src/context/RecipeContext.tsx` | Entire file is 100% commented out. No exports, no active code, and nothing in the codebase imports from it. Contains an old `bson-objectid` `ObjectID` pattern from the pre-Express architecture. | High | **Deleted** |
| `src/assets/data/recipes.js` | Static hardcoded recipe seed data (4 objects with Unsplash URLs). Zero imports anywhere in `src/`. Was mock data from early development. | High | **Deleted** |
| `src/shared/types/` | Empty directory — no files inside. Canonical types live in the root `types.d.ts`. This directory appears to be an unused placeholder. | High | **Deleted** |
| `src/pages/Account/Selection.scss` | Zero-byte file. Not imported by any component. | High | **Deleted** |
| `src/client/db.ts` — `app`, `storage`, `db`, `analytics` exports | The file exports five values. Only `auth` is ever imported (by `src/api/auth.ts`). `db` (Firestore) and `analytics` are never referenced anywhere in `src/`. `storage` is bypassed — `recipes.ts` calls `getStorage()` directly from `firebase/storage`. `app` is unused outside this file. The file itself is needed; the four dead exports are not. | Medium | **Removed dead exports; `app` made local, unused imports dropped** |

---

## Legacy Artifacts

| File | Reason | Confidence |
|------|--------|------------|
| `prepify-precheck.js` | One-off diagnostic script designed to preflight environment setup before a development session. Not referenced in `package.json` scripts or CI. A one-time utility that has no ongoing value. | High |
| `prepify-db-diagnostic.txt` / `prepify-db-diagnostic-2.txt` | Raw output from a MongoDB connection debugging session (node version, TLS logs). Session artifacts, not living documents. | High |
| `prepify-api-test-results.md` | One-time manual API test results table. Static snapshot; not maintained. | High |
| `server-ingredients/` (entire service) | The frontend's ingredient enrichment call (`ingredientParserApi.ts` → `http.post('/api/ingredients/parse')`) targets the **main server** (port 4000), which is handled by `server/routes/ingredients.js`. Nothing in the frontend or main server calls the server-ingredients service endpoints (`GET /ingredient/:name`, `POST /ingredient` on port 4001). The service has its own `railway.json` for independent deployment, but it is not wired into any current call path. | Medium |
| `src/INGREDIENT_PARSER_AUDIT.md` | Audits an older integration pattern (`ingredientParser` with `REACT_APP_SPOONACULAR_API_KEY` via webpack/CRA). Current code uses `parseIngredientString` + `fetchIngredientEnrichment` via Vite. The import paths, env var names, and API calls described no longer exist in the codebase. | High |
| `INGREDIENT_PARSER.md` | Bug report for `axios.create is not a function` in `@jclind/ingredient-parser` under webpack 5. Project migrated to Vite; this class of CJS/ESM interop bug no longer applies. | Medium |
| `src/INGREDIENT_PARSER_INTEGRATION_NOTES.md` | Documents the Railway ingredient-parser migration. References `REACT_APP_INGREDIENT_PARSER_URL` (renamed to `VITE_INGREDIENT_PARSER_URL` in the current `.env`) and describes a transitional state. The migration is now complete, making this a historical artifact. | Medium |

---

## Stale Docs & Config

| File | Reason | Confidence |
|------|--------|------------|
| `README.old.md` | Contains exactly one line: `"# perpify"` (13 bytes, typo in project name). Entirely superseded by the current `README.md`. | High |
| `browser-audit.md` | One-time runtime observation report generated during a debugging session. Snapshot of app behavior at a point in time. Not a living document. | High |
| `CYPRESS_AUDIT.md` | One-time Cypress test suite audit from a prior session. Static snapshot. | High |
| `server-audit.md` | One-time auth/error-handling security audit listing specific route bugs. Valuable if unresolved issues haven't been fixed, but belongs in an issue tracker rather than committed as a permanent root-level file. | Medium |
| `server/TESTING_IMPLEMENTATION_PLAN.md` | Test coverage plan. Some tests described in it now exist; the checklist status is not updated. | Medium |
| `src/test/TEST_PLAN.md` | Explicitly states "Nothing below is implemented yet" — a planning doc committed to the test directory rather than converted to issues or deleted. | Medium |
| `server-ingredients/SCAFFOLD_NOTES.md` | Notes from when the service was first scaffolded. Documents one-time decisions already encoded in the code. More relevant to delete if `server-ingredients/` is determined to be dead (see Legacy Artifacts). | Medium |
| `UPGRADE_PLAN.md` | Dependency upgrade plan dated 2026-05-06. If upgrade work is actively in progress, keep it. If upgrades are complete or stalled, it becomes stale. Not flagged High because it is recent. | Low |
| `.env` / `.env.example` — `VITE_INGREDIENT_PARSER_URL` | Defined in both files but never referenced via `import.meta.env` anywhere in `src/`. Was for a Railway-hosted parser that no longer receives frontend traffic. | Medium |
| `.env` / `.env.example` — `VITE_OPEN_AI_API_KEY` | Defined in both files but not referenced anywhere in `src/`. No OpenAI integration code exists in the codebase. | High |

---

## Orphaned Assets

| File | Reason | Confidence |
|------|--------|------------|
| `public/logo192.png` / `public/logo512.png` | Default React/CRA app logo icons. Referenced only by `public/manifest.json` (boilerplate, see Redundant Config) and `index.html`'s `apple-touch-icon`. Not Prepify-branded. If `manifest.json` is updated with correct app metadata, these should be replaced with actual app icons; they are currently placeholder assets. | Medium |

All other `public/images/` files (`hero.jpg`, `404-plate.svg`, `form-submitted.svg`) are actively referenced in source components and are not orphaned.

---

## Redundant Config

| File | Reason | Confidence |
|------|--------|------------|
| `public/manifest.json` | Unmodified CRA boilerplate: `"short_name": "React App"`, `"name": "Create React App Sample"`. Has never been customized for Prepify. Not a deletion candidate but needs to be updated before the app is meaningfully a PWA. | High |
| `decs.d.ts` — stale entries | Declares `react-alert`, `react-helmet`, and `react-star-ratings` — none of which are imported anywhere in `src/` and none are in `package.json`. The project uses `react-helmet-async` (not `react-helmet`). The `uuid` declaration is also redundant since `@types/uuid` is in `package.json`. These four entries can be removed. | High |
| `decs.d.ts` vs `src/declarations.d.ts` — `*.scss` overlap | Both files declare `*.scss` as a module. Only one declaration is needed. `decs.d.ts` handles runtime package shims; `src/declarations.d.ts` handles asset file types. The duplication is harmless but worth cleaning up during the `decs.d.ts` pruning pass. | Medium |

---

## Notes

**`src/pages/SingleRecipe/RecipeNotFound.js/`** — This is a *directory* whose name ends in `.js`. It contains `RecipeNotFound.tsx` and `RecipeNotFound.scss`, which are actively imported by `SingleRecipe.tsx`. Not dead code, but the `.js` suffix on a directory name is a structural anomaly that can confuse editors, search tools, and developers. Worth renaming to `RecipeNotFound/`.

**`server-ingredients/` vs `server/routes/ingredients.js`** — These serve architecturally different purposes: the main server's `ingredients.js` runs the `@jclind/ingredient-parser` library inline for a single parse call, while `server-ingredients/` is a MongoDB-backed caching service (GET/POST `/ingredient/`). The caching service makes architectural sense as a lookup-before-parse layer, but nothing currently calls it. Before removing it, confirm whether wiring it up as a cache is planned, or whether the caching responsibility was dropped.

**`decs.d.ts` active entries** — `react-loading-skeleton`, `react-collapse`, and `react-modal` are actively imported in source files and legitimately need ambient declarations. Only the three stale package entries (`react-alert`, `react-helmet`, `react-star-ratings`) and the redundant `uuid` declaration should be removed.

**`src/client/db.ts` — Firestore vs MongoDB** — The file initializes and exports a Firestore `db` instance (`getFirestore(app)`) and Firebase `analytics`. The app stores all recipe and user data in MongoDB via the Express backend. There is no Firestore read/write anywhere in `src/`. The `analytics` export is similarly unused. These exports can be removed and the `getFirestore`/`getAnalytics` imports dropped, shrinking the Firebase bundle.

**`cypress.env.json`** — Contains `FIREBASE_SERVICE_ACCOUNT` (a live credential). Correctly gitignored. No action needed beyond confirming it stays out of version control.

**`UPGRADE_PLAN.md`** — Not flagged High because it is dated 2026-05-06 and may be actively referenced. If the upgrade work described is complete or abandoned, it should be deleted or archived.

---

*Confidence levels: **High** = safe to delete, no ambiguity. **Medium** = needs a second look before acting. **Low** = possibly still needed; flag for discussion.*
