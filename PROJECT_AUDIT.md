# Project Audit — 2026-05-10

## Summary

Audited ~278 files across the frontend (`src/`), main server (`server/`), ingredient-parser service (`server-ingredients/`), Cypress suite, and project root. Approximately 30 items are flagged across five categories. The most notable finding is that the previous audit's High-confidence dead-code items have all been resolved; what remains is a cluster of session-generated one-time documents at the project root (10+), `bson-objectid` still imported into the frontend to generate MongoDB IDs client-side, and `server-ingredients/` having no active callers from any part of the system.

---

## Dead Code

All High/Medium dead-code items from the 2026-05-09 audit have been resolved (`RecipeContext.tsx`, `src/assets/data/recipes.js`, `src/pages/Account/Selection.scss`, dead Firestore/analytics exports in `src/client/db.ts`).

| File | Reason | Confidence |
|------|--------|------------|
| `src/shared/types/` | Empty directory, no files. Present on the local filesystem but not tracked by git (git cannot track empty directories). The canonical types live in `types.d.ts`. | High |

---

## Legacy Artifacts

| File | Reason | Confidence |
|------|--------|------------|
| `src/api/recipes.ts:3,152` | Imports `bson-objectid` and calls `ObjectID()` to generate MongoDB document IDs client-side (`const recipeId = '' + ObjectID()`). Database ID generation is a server-side concern. This is a holdover from a pre-Express architecture where the client constructed full documents before insertion. | High |
| `server-ingredients/` (entire service) | Exposes `GET /ingredient/:name` and `POST /ingredient` on port 4001. Nothing in the frontend or main server calls these endpoints. The frontend calls `http.post('/api/ingredients/parse')` which hits `server/routes/ingredients.js` on the main server (using the `@jclind/ingredient-parser` library inline). The `server-ingredients` service is architecturally coherent as a caching layer but is not wired into any current data path. | Medium |
| `src/INGREDIENT_PARSER_AUDIT.md` | Audits the old Spoonacular-direct pattern (`ingredientParser` called with `REACT_APP_SPOONACULAR_API_KEY` via CRA/webpack). The current code uses `parseIngredientString` + `fetchIngredientEnrichment` under Vite. All import paths, env var names, and API calls described are gone. | High |
| `INGREDIENT_PARSER.md` | Bug report for `axios.create is not a function` in `@jclind/ingredient-parser` under webpack 5. The project migrated to Vite; this class of CJS/ESM interop issue no longer applies and the bug surface area has changed significantly. | Medium |
| `src/INGREDIENT_PARSER_INTEGRATION_NOTES.md` | Documents the Railway ingredient-parser migration and references `REACT_APP_INGREDIENT_PARSER_URL` (now `VITE_INGREDIENT_PARSER_URL`). The migration is complete; `ingredientParserApi.ts` targets the main server, not a Railway URL. This is a historical record, not living documentation. | Medium |
| `prepify-precheck.js` | One-off environment preflight script for starting a development session. Not in `package.json` scripts or CI. Has no ongoing value. | High |
| `prepify-db-diagnostic.txt` / `prepify-db-diagnostic-2.txt` | Raw output from a MongoDB connection debugging session (TLS logs, node version checks). Session artifacts; not maintained. | High |
| `prepify-api-test-results.md` | One-time manual API test results table with pass/fail rows. Static snapshot never updated. | High |

---

## Stale Docs & Config

| File | Reason | Confidence |
|------|--------|------------|
| `README.old.md` | Contains exactly one line: `"# perpify"` (misspelled project name). Superseded by `README.md`. | High |
| `browser-audit.md` | One-time runtime observation report generated during a debugging session (page loads, console errors, network failures). Not a living document. | High |
| `CYPRESS_AUDIT.md` | References spec files that no longer exist: `home.cy.ts`, `login.cy.ts`, `signup.cy.ts`, `searchRecipes.cy.ts`, `singleRecipe.cy.ts`. Actual suite is `auth.cy.ts`, `browse.cy.ts`, `recipe.cy.ts`. Structurally inaccurate. | High |
| `server-audit.md` | One-time auth/error-handling security audit listing specific route vulnerabilities. Snapshot; not maintained. Belongs in an issue tracker if the issues are unresolved. | Medium |
| `TEST_BASELINE.md` | Session-generated snapshot of test suite results on 2026-05-10. Not a living document. | High |
| `server/TESTING_IMPLEMENTATION_PLAN.md` | Pre-implementation test coverage plan. Server tests now exist; the plan's checklist is not updated to reflect what was implemented. | Medium |
| `src/test/TEST_PLAN.md` | Explicitly states "Nothing below is implemented yet" at the top, but the tests described have since been written and live in `src/test/`. A planning artifact that was not removed when the plan was executed. | Medium |
| `server-ingredients/SCAFFOLD_NOTES.md` | Documents scaffold decisions and references `routes/parse.js`, which does not exist. The actual route file is `ingredient.js` with different endpoints (`GET /:name`, `POST /`). Also tied to `server-ingredients/` which may itself be removed. | High |
| `CLAUDE.md` — Frontend `.env` section | Documents `REACT_APP_API_URL`, `REACT_APP_EDAMAM_*`, `REACT_APP_FIREBASE_*` — all CRA-era `REACT_APP_` variable names. The project migrated to Vite; actual vars are `VITE_API_URL`, `VITE_EDAMAM_*`, `VITE_FIREBASE_*`. Also omits `VITE_OPEN_AI_API_KEY`, `VITE_INGREDIENT_PARSER_URL`, and `VITE_CYPRESS`. | Medium |
| `.env` / `.env.example` — `VITE_OPEN_AI_API_KEY` | Defined in both files but not referenced via `import.meta.env` anywhere in `src/`. No OpenAI integration code exists in the codebase. | High |
| `.env` / `.env.example` — `VITE_INGREDIENT_PARSER_URL` | Defined in both files but `ingredientParserApi.ts` uses the `http` instance (baseURL: `VITE_API_URL`), targeting the main server. The Railway URL env var is set but unreachable. | Medium |

---

## Orphaned Assets

| File | Reason | Confidence |
|------|--------|------------|
| `public/logo192.png` / `public/logo512.png` | Default React/CRA logo icons. Referenced only by `public/manifest.json` (see Redundant Config), which has CRA boilerplate text. Not Prepify-branded. Placeholder assets. | Medium |
| `public/sitemap.txt` | Lists URLs under two different domains: `prepifymeals.app` (lines 1–8) and `prepifymeals.com` (lines 9–11). Mixed-domain content suggests a rough draft. Superseded by `public/sitemap.xml`, which uses `prepifymeals.com` consistently. | High |

All other `public/images/` files (`hero.jpg`, `404-plate.svg`, `form-submitted.svg`) are actively referenced in source components and are not orphaned.

---

## Redundant Config

| File | Reason | Confidence |
|------|--------|------------|
| `public/manifest.json` | Unmodified CRA boilerplate: `"short_name": "React App"`, `"name": "Create React App Sample"`. Never customized for Prepify. Not a deletion candidate but must be updated before the app is a meaningful PWA. | High |
| `decs.d.ts` — stale entries | Four of the eight declarations are dead: `react-alert` (not in `package.json`, not imported anywhere); `react-helmet` (project uses `react-helmet-async` which ships its own types); `react-star-ratings` (`StarRating.tsx` is a custom SVG component — the package is not installed or imported); `uuid` (`@types/uuid` is in `package.json`, making the ambient declaration redundant). Active entries — `react-loading-skeleton`, `react-collapse`, `react-modal` — are correctly needed. | High |
| `decs.d.ts` vs `src/declarations.d.ts` — `*.scss` | Both files declare `declare module '*.scss'`. One is sufficient. `decs.d.ts` handles third-party package shims; `src/declarations.d.ts` handles asset imports. The duplication is harmless but worth resolving when pruning `decs.d.ts`. | Medium |

---

## Notes

**`src/pages/SingleRecipe/RecipeNotFound.js/`** — A directory whose name ends in `.js`. It contains `.tsx` and `.scss` files and is actively imported by `SingleRecipe.tsx` (via `import RecipeNotFound from './RecipeNotFound.js/RecipeNotFound'`). Not dead code — a structural anomaly. The `.js` suffix on a directory name confuses editors, shell glob tools, and developers. Should be renamed to `RecipeNotFound/`.

**`server-ingredients/` — architectural question** — The service is a MongoDB-backed ingredient store: `GET /ingredient/:name` retrieves a cached entry; `POST /ingredient` writes one. This is architecturally coherent as a lookup-before-parse caching layer sitting between the main server and Spoonacular. Currently, nothing calls it. Before removing the service, confirm: (a) was caching dropped intentionally in favor of calling Spoonacular on every request, or (b) the wiring was deferred? The `SCAFFOLD_NOTES.md` and `INGREDIENT_PARSER_INTEGRATION_NOTES.md` do not clearly resolve this.

**`src/api/http-common.ts:19–22` — CORS headers on client axios instance** — The `nutrition` axios instance sets `Access-Control-Allow-Headers`, `Access-Control-Allow-Origin`, and `Access-Control-Allow-Methods` as *request* headers. These are server-side CORS *response* headers; browsers silently ignore them when sent as request headers. Not harmful but misleading — they should be on Edamam's server response, not the client request.

**`decs.d.ts` active entries to keep** — `react-loading-skeleton`, `react-collapse`, and `react-modal` are all actively imported in source files and lack bundled TypeScript types. Their declarations must remain.

**`cypress.env.json`** — Contains `FIREBASE_SERVICE_ACCOUNT` (a live credential). Correctly gitignored. No action needed beyond confirming it stays out of version control.

---

*Confidence levels: **High** = safe to delete, no ambiguity. **Medium** = needs a second look before acting. **Low** = possibly still needed; flag for discussion.*
