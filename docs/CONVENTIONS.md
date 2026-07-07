# CONVENTIONS.md — Prepify code & architecture standard

The house style for Prepify. It codifies the conventions already latent in the tree so new
work — and especially the upcoming create-recipe (**R1**) and account-page (**R2**) refactors —
follows one standard instead of re-deriving it.

**Scope.** This is the *code & architecture* standard. It complements, and does not duplicate:

- [`CLAUDE.md`](../CLAUDE.md) — the project overview, architecture map, env vars, and "important notes."
- [`REFACTOR.md`](./REFACTOR.md) — the 6-phase refactor's Decision Log and the API-contract decisions
  it locked in (server-generated `_id`, trust-the-token, `/api` prefix, REST verbs). Those decisions are
  restated here as standing rules.
- [`scss-conventions.md`](./scss-conventions.md) + [`design/`](./design/) — the design-system canon
  (tokens, focus signals, hover dialects, icons, elevation, type scale). This doc points at them; it does
  not re-explain them.
- [`BACKLOG_ROADMAP.md`](./BACKLOG_ROADMAP.md) — the parallel-worktree delivery protocol (how to claim,
  branch, and land a track).

> **How to read a rule.** Each convention states the rule, then anchors it to a real example in the tree
> (`file:line`). When you extend the codebase, match the anchored example. When a rule and the code
> disagree, the code has drifted — fix the code (or, if the rule is wrong, change it here in the same PR).

---

## 1. Repository shape

Two services, one repo (see [`CLAUDE.md`](../CLAUDE.md) for the full map):

- **Frontend** — React + TypeScript SPA in `src/`, Vite, port 3000.
- **Main API** — Express + MongoDB (native driver) in `server/`, port 4000, Firebase Admin for token
  verification.

**Server and frontend changes ship in separate PRs** ([`REFACTOR.md:21`](./REFACTOR.md)). A single task
that spans both is two PRs, not one.

---

## 2. Frontend conventions (`src/`)

### 2.1 Directory layering — one-way dependency

| Dir | Holds |
|---|---|
| `src/pages/` | Route-level screens, one dir per page, co-locating `.tsx` + `.scss` + page-local sub-components (nested sub-feature dirs allowed, e.g. `pages/SingleRecipe/DataSections/RatingsAndReviews/`). |
| `src/Components/` | Shared/reusable UI (`RecipeCard`, `Layout`, `Navbar`, `icons`), plus route guards (`PrivateRoute.tsx`, `AdminRoute.tsx`). |
| `src/context/` | Global React context — **only `AuthContext.tsx`** (there is no `RecipeContext`; recipe ops go through `RecipeAPI` directly). |
| `src/api/` | One class-based client module per domain + `http-common.ts`. |
| `src/hooks/` | Shared hooks (`useDebounce`, `useSaveRecipe`, `useSlashFocusSearch`). |
| `src/util/` | Pure helpers, **one function per file** (`formatPrice.ts`, `calculateServingPrice.ts`). |
| `src/recipeData/` | Static domain lists (`cuisinesList.ts`, `dietLabels.ts`, `mealTypesList.ts`). |
| `src/client/` | Firebase app init (`db.ts`). |
| `src/test/` | **All** Vitest tests, flat (not co-located by feature); mocks in `src/test/mocks/`. |

**The dependency graph is one-way: `pages → Components → hooks/util/api`.** `Components/` must never import
from `pages/` (grep confirms zero such imports today). A page may import its own sub-components via the
`src/pages/...` alias; same-dir children use a relative `'./Child'` import.

### 2.2 Import style — `src/`-absolute

Absolute `src/`-rooted imports across all frontend files ([`REFACTOR.md:35`](./REFACTOR.md), enforced in
Phase 2-C). Aliases are defined once in [`vite.config.ts`](../vite.config.ts) (`src` → `./src`, `types` →
`./src/types`) and mirrored in [`tsconfig.json`](../tsconfig.json) `paths`.

```ts
import RecipeAPI from 'src/api/recipes'   // cross-tree → absolute 'src/…'
import { RecipeType } from 'types'        // types → the bare 'types' specifier
import CollectionCard from './CollectionCard'  // same-dir child → relative
```

Rule: **`src/`-absolute for anything cross-tree, bare `types` for type imports, relative only for
same-directory children.** No `../../..` climbing.

### 2.3 Type ownership — `src/types.ts` owns the persisted shape

All domain types live in the single app-owned module [`src/types.ts`](../src/types.ts) (`RecipeType`,
`RecipeFormType`, `IngredientsType`, `ParsedIngredient`, `IngredientData`, response envelopes, moderation
types, …).

**The app owns its persisted contract; third-party package shapes are adapted at the API boundary, never
imported into the domain types** ([`src/types.ts:1-8`](../src/types.ts)). The canonical example: the
ingredient types deliberately do *not* import from `@jclind/ingredient-parser` v2 — the server projects the
v2 result back onto Prepify's stable shape at the `/api/ingredients/parse` boundary, so persisted recipe
docs and downstream consumers are decoupled from the package's type surface. `IngredientData` even carries a
"tolerated extras" block so historical recipe documents keep type-checking.

### 2.4 API client — class + singleton, one shared axios instance

Every API domain is a class exported as a singleton:

```ts
class RecipeAPIClass { /* methods call the shared http instance */ }
const RecipeAPI = new RecipeAPIClass()
export default RecipeAPI            // src/api/recipes.ts (same shape in auth.ts, admin.ts, …)
```

- All requests go through the shared axios instance in [`src/api/http-common.ts`](../src/api/http-common.ts)
  (`baseURL` = `VITE_API_URL || http://localhost:4000`). A **request interceptor attaches the Firebase ID
  token** (`Bearer …`) automatically — never wire auth per-call. A response interceptor toasts on
  `ACCOUNT_SUSPENDED`/`ACCOUNT_BANNED` and reports 5xx/network errors to Sentry, then re-rejects so callers
  still handle the failure.
- Methods return `result.data`. For *expected* outcomes, return a **result-type union** (`AddRecipeResult`,
  `EditRecipeResult`) or `null` rather than throwing; guard with `axios.isAxiosError`. Auth-gated reads
  short-circuit (`if (!AuthAPI.getUID()) return null`).
- Consumers call the singleton directly, typically inside a React Query `queryFn`.

### 2.5 Data fetching — TanStack Query v5

Server state is fetched with `@tanstack/react-query` v5 (all 10 legacy `useEffect`+`useState` fetchers were
migrated in [`REFACTOR.md` Phase 3](./REFACTOR.md)). New data reads use `useQuery`/`useMutation` with a
`queryFn` that calls the relevant API singleton — not ad-hoc effects.

### 2.6 Auth — Firebase client SDK + `useAuth`

[`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx) is the single auth surface.

- Consume it via the `useAuth()` hook; never `useContext(AuthContext)` directly.
- `getAuth()` is resolved lazily *inside* the provider (`const auth = useMemo(() => getAuth(), [])`), so
  merely importing the module never triggers Firebase init (which would throw in tests with no Firebase
  app).
- Admin status rides the `admin` **custom claim** read off the ID token (`tokenResult.claims.admin`) — no
  DB lookup client-side. The Firebase app is initialized once in `src/client/db.ts`.

### 2.7 Render stability — memoize what crosses a memo boundary

Three-part rule, all evidenced by the F2/F3 fixes:

1. **`useMemo` the context value** so consumers don't re-render on every provider render
   ([`AuthContext.tsx:392`](../src/context/AuthContext.tsx)).
2. **`useCallback` every handler** with exhaustive deps — a memoized value over unstable handlers never
   hits, so the handlers must be stable *first*.
3. **`React.memo` list/card components** (`export default React.memo(RecipeCard)`) and pass them **only
   stable callbacks**. A fresh `onMutated={() => …}` each render defeats the memo — `useCallback` it
   ([`SavedRecipes.tsx:136`](../src/pages/Account/SavedRecipes/SavedRecipes.tsx)).

### 2.8 Route strings — single-source, don't hardcode

Repeated route strings should live in one place so a rename can't drift copies apart.

- **Today** this holds for the **account sub-routes**: [`accountTabs.tsx`](../src/pages/Account/components/accountTabs.tsx)
  is the single source of truth (each tab's `.to`, plus the `activeAccountTabIndex(pathname)` helper);
  `SegmentedNav` and `Account` both derive from it.
- **Top-level route strings (`/recipes`, `/login`, …) are still hardcoded inline** across `App.tsx`, the
  navbar, footer, cards, and pages — a *not-yet-complete* migration. The **C2** lane (PR
  [#242](https://github.com/jclind/prepify/pull/242), in flight at this doc's writing) introduces
  `src/routes.ts` (`RECIPES_PATH`, `ACCOUNT_*_PATH`, `activeAccountTab`) to extend the pattern to top-level
  paths.

**Convention for new work: reference the route constant, don't retype the literal.** Once `src/routes.ts`
lands, adopt it for any new route reference; the R1/R2 refactors should migrate the pages they touch.

---

## 3. Backend conventions (`server/`)

### 3.1 Route handler shape — every handler is `asyncHandler`-wrapped

```js
router.post('/addRecipe', verifyToken, requireActive, recipeWriteLimiter,
  asyncHandler(async (req, res) => { /* may throw freely */ }))
```

[`asyncHandler`](../server/util/asyncHandler.js) is `fn => (req,res,next) => Promise.resolve(fn(...)).catch(next)`.
It forwards any rejection to the central error backstop, so **handlers `throw` instead of calling
`respondServerError` themselves**. The invariant is: *no unwrapped async route handler exists* (the S5 lane
closed the last two). A handler may keep an **inner try/catch only for a soft-fail** where the upstream call
is *expected* to fail routinely and the client degrades to `null` — e.g. the Edamam proxy
([`nutrition.js`](../server/routes/nutrition.js)) and the Spoonacular parse
([`ingredients.js`](../server/routes/ingredients.js)). The `asyncHandler` wrapper is still the
outside-the-try safety net.

### 3.2 Middleware ordering

Fixed order: **`verifyToken` → `requireActive`/`requireAdmin` → rate limiter → handler.**
([`server/middleware/auth.js`](../server/middleware/auth.js).)

- `verifyToken` — requires `Bearer`, verifies via `getAuth().verifyIdToken`, sets `req.uid` and
  `req.isAdmin` (from the `admin` custom claim).
- `requireActive` — blocks suspended/banned accounts, 403 with a machine `code`. Applied to **mutations**.
- `requireAdmin` — 403 unless `req.isAdmin`; must run after `verifyToken`.
- `optionalAuth` — soft auth for public routes (sets `req.uid` when a token is present, never rejects).

The rate limiter is keyed by `req.uid`, so it always comes *after* `verifyToken`.

### 3.3 Identity — trust the token only

**`req.uid` (from the verified token) is the sole source of identity.** Never trust a client-supplied
`userId`/`username` for identity or ownership ([`REFACTOR.md:34`](./REFACTOR.md), Phase 5-C). Creation routes
stamp `userId: req.uid` server-side; ownership-mutating routes (delete/edit) check ownership against
`req.uid`.

### 3.4 Rate limiting — per-uid, per-surface

Mutating or expensive endpoints get a limiter built from the
[`makeUserLimiter`](../server/middleware/writeLimiter.js) factory (`keyGenerator: req => req.uid`, skipped
under `NODE_ENV=test`, error body `{ error, code: 'RATE_LIMITED' }`). Each call is an **independent
per-surface bucket**: `recipeWriteLimiter` (tighter — 12, paid Vision scan), `reviewWriteLimiter` (30),
`profileWriteLimiter` (30), plus per-route buckets (`reportLimiter`, `nutritionLimiter`, `parseLimiter`).
A coarse global per-IP backstop lives in `app.js`; these per-uid limiters are the fine-grained layer.

### 3.5 Input validation — server-authoritative, defense-in-depth

Never trust the client for bounds. [`server/util/recipeLimits.js`](../server/util/recipeLimits.js) is the
authoritative validator: `validateRequiredRecipeFields` + `validateRecipeBounds` check string lengths, array
counts, **per-element caps**, and numeric type+range (`{ min, max, integer }` per field). Shared between
create and edit so requirements can't drift. String/count limits mirror the client
(`src/util/recipeLimits.ts`); numeric ranges are server-only. A failed check returns the error string as
`{ error }` with a 4xx.

### 3.6 Atomic writes — conditional filter, no read-then-write

Mutate with a **conditional filter** so MongoDB re-checks under the document write lock and only one racing
write matches — never read-check-then-write (the TOCTOU the S1 lane killed). Canonical example, save/unsave
in [`recipes.js`](../server/routes/recipes.js):

```js
// save: only pushes if the recipe isn't already in the array
updateOne({ _id: uid, 'savedRecipes.recipeId': { $ne: recipeId } }, { $push: { … } })
// the numTimesSaved counter is $inc'd only when the conditional write actually landed;
// unsave decrements with a pipeline $max floor at 0.
```

### 3.7 DB access — `getDB()` singleton

[`server/db.js`](../server/db.js) holds a module-level connection singleton (`maxPoolSize: 10`, TLS forced
for remote URIs, indexes built on connect). Routes get the handle via `const db = getDB()` at the top of the
handler (`getDB()` throws if uninitialized; `getClient()` for transactions).

> **Gotcha:** the runtime **hardcodes** the `'prepify'` database (`db.js` `client.db('prepify')`) — it does
> *not* read `DB_NAME`. Only the `server/scripts/` ops tooling honors `DB_NAME` (default `'prepify'`), so a
> reconciliation script and its sibling can be pointed at the same DB before a cutover.

### 3.8 Error handling & response shapes

- Handlers `throw`; `asyncHandler` forwards to the **central Express error backstop** in `app.js`, which
  preserves a 4xx status the thrower set, collapses everything else to a 500 with the single shared
  `GENERIC_500_MESSAGE`, and `Sentry.captureException`s only for `status >= 500`.
- Success bodies are plain JSON. Client errors are `res.status(4xx).json({ error, code?, reason? })`.
- **Branchable errors carry a machine-readable `code`** (`RATE_LIMITED`, `ACCOUNT_BANNED`,
  `ACCOUNT_SUSPENDED`, `CONTENT_BLOCKED`, `ALREADY_REPORTED`) so the client can switch on `code`, not on
  message text.

### 3.9 API-contract standards (locked in Phase 5)

From [`REFACTOR.md`](./REFACTOR.md) / [`API_CONTRACT.md`](./API_CONTRACT.md):

- **Every route is under the `/api` prefix.**
- **The server generates the recipe `_id`** (`new ObjectId()`) and returns `{ _id }` with 201; the client
  never sends an `_id` on creation.
- **REST verbs:** mutations are `POST`/`DELETE` (not `PUT`); e.g. save = `POST /api/recipes/:id/save`,
  unsave = `DELETE /api/recipes/:id/save`.
- Mutations that change a document check **ownership** against `req.uid`.

### 3.10 Firebase Admin — v14 modular API

`firebase-admin` is on **v14** (modular API only — the legacy `admin.*` namespace is gone). Import from
`firebase-admin/app` (`initializeApp`, `getApps`, `cert`), `firebase-admin/auth` (`getAuth`), and
`firebase-admin/storage` (`getStorage`). Init is guarded with `if (!getApps().length)`. See
[`CLAUDE.md`](../CLAUDE.md) for the `uuid` override that rides along with this (and its removal condition).

---

## 4. Design system & SCSS

The design-system canon is documented separately — **read those docs; don't duplicate them here:**

- [`scss-conventions.md`](./scss-conventions.md) — hover/motion dialects, outline-button lanes, focus rings,
  the field-focus glow, radii.
- [`design/`](./design/) — [`elevation.md`](./design/elevation.md),
  [`type-scale.md`](./design/type-scale.md), [`button-system.md`](./design/button-system.md),
  [`icon-system.md`](./design/icon-system.md), [`admin-palette.md`](./design/admin-palette.md),
  [`loading-states.md`](./design/loading-states.md).

The load-bearing rules a code change must honor:

### 4.1 One `.scss` per component, tokens from `helpers.scss`

Each component folder holds `Component.tsx` + `Component.scss`; the component imports its own sheet, and the
sheet pulls tokens via `@use '../../helpers.scss' as s;` (referenced as `s.$primary`, `@include
s.focus-glow;`). The only cross-component style layer is the shared `.btn` system in
[`src/index.scss`](../src/index.scss).

### 4.2 Use tokens & mixins, never literals

[`src/helpers.scss`](../src/helpers.scss) is the single source for colors, the 10-step type scale, the
radius scale, the 6-step elevation ramp, hover-motion tokens, and breakpoints (reached via
`@include s.below()/above()`). **Don't hand-roll a value that a token already names.** Known drift to *not*
imitate: `controls.scss` `.has-success` uses a bare `#29a155` where `$success-green` exists — a follow-up,
not the pattern.

### 4.3 Two distinct focus signals

- `@include s.outline()` — the a11y **keyboard** focus ring (blue `#4d90fe`, `:focus-visible`), one ring on
  every control. Never `outline: none` without a `:focus-visible` restore.
- `@include s.focus-glow($color, $opacity)` — the **field-active glow** (`0 0 0 3px` colored halo on
  `:focus`/`:focus-within`), tint follows the field's accent.

These coexist and are not interchangeable. Don't hand-roll `box-shadow: 0 0 0 3px …` on a focused field —
use the mixin.

### 4.4 Hover: content lifts, chrome doesn't

Two hover languages on purpose ([`scss-conventions.md`](./scss-conventions.md)): content (`.btn`, cards)
lifts and its orange fill *lightens*; navbar/footer chrome gives colour/opacity feedback only and never
lifts. Match the surface's dialect.

### 4.5 Icons: one family behind one boundary

Lucide (`react-icons/lu`) is the single house icon family. **App code imports icons only from
[`src/Components/icons`](../src/Components/icons/index.ts)** — never from `react-icons/*` directly. A Vitest
guard ([`src/test/icons-single-source.test.ts`](../src/test/icons-single-source.test.ts)) fails the test
suite (a required CI gate) on any direct import. The only sanctioned exceptions are the two Google brand marks (`FcGoogle`, `SiGoogle`),
which Lucide can't provide; see [`design/icon-system.md`](./design/icon-system.md).

---

## 5. Testing & gates

### 5.1 Frameworks & locations

| Layer | Tool | Location | Config |
|---|---|---|---|
| Frontend unit/component | **Vitest** (jsdom) | `src/test/*.test.{ts,tsx}` (flat) | `vite.config.ts` `test:` block; setup `src/test/setup.ts` |
| Backend | **Jest** (node, `--runInBand`) | `server/__tests__/*.test.js` | `server/jest.config.js`; setup spins a `MongoMemoryReplSet` |
| E2E | **Cypress** | `cypress/` | `cypress.config.ts` (mints tokens via Admin v14) |

`src/test/setup.ts` creates the `#root` element react-modal needs, stubs `matchMedia`, and shims Web Storage
for Node ≥24. Vitest's `include` is scoped to `src/**` so it never picks up the server's Jest suite.

### 5.2 The gates — green before every PR

```bash
npm run typecheck      # tsc --noEmit  (enforces tsconfig `strict`, which `vite build` does NOT)
npm test               # vitest run
npm run build          # vite build
npm run test:server    # jest --runInBand   — required for ANY server/ change
```

CI ([`.github/workflows/test.yml`](../.github/workflows/test.yml)) runs the same as separate jobs, **all on
Node 24**: Backend (Supertest), Frontend (Vitest), Static (typecheck + build), E2e (Cypress against a
`mongo:7` service), Fallow (dead-code, **advisory — never blocks**), and GitGuardian (secret scan). The Node
floor is pinned in `package.json` engines (`>=24`) and `.nvmrc`.

### 5.3 Mocking

- **Backend firebase-admin** — auto-mocked via `server/__mocks__/firebase-admin.js` (shared-state root with
  `__`-prefixed handles/setters) plus submodule mocks `server/__mocks__/firebase-admin/{app,auth,storage}.js`
  (the v14 modular entry points; `getApps` returns non-empty so the init guard is skipped). Tests tune
  behavior through the `__` handles — no `jest.mock()` call needed.
- **Frontend Firebase/auth** — inline `vi.mock('firebase/auth', …)` / `vi.mock('firebase/storage', …)` per
  test; test-mode Firebase config comes from the committed `.env.test` (dummy `VITE_FIREBASE_*`) so tests
  never make real Firebase calls.

### 5.4 Regression + runtime verification

When fixing a bug, **add a regression test that fails on the pre-fix code** (F1/F2/F3 all did — e.g. F2's
`referential stability` test), and **verify the fix at runtime**, not just via gates (F3: "0 vs 54
re-renders"). Gates green + a failing-then-passing test + a runtime observation is the bar for a bug-fix PR.

---

## 6. Environment & config

- `.env` / `server/.env` are **gitignored**; the committed templates are `.env.example` /
  `server/.env.example`, and `.env.test` (committed) is what CI actually loads.
- **Client vars are `VITE_`-prefixed** (browser-exposed): `VITE_API_URL`, `VITE_FIREBASE_*`, `VITE_CYPRESS`,
  `VITE_SENTRY_DSN`. **Server vars are un-prefixed** (`MONGO_URI`, `PORT`, `FIREBASE_SERVICE_ACCOUNT`,
  `FRONTEND_URLS`, feature keys). **Secrets stay server-side** — Edamam/Spoonacular keys were deliberately
  moved off the client bundle.
- **Env target:** the local `.env` files point at **dev** infra (Firebase `prepify-dev-58579`, `prepify-dev`
  Mongo), not prod. Confirm `VITE_FIREBASE_PROJECT_ID` / the `MONGO_URI` host before assuming an environment
  (see the [`CLAUDE.md`](../CLAUDE.md) callout).
- The `uuid ^11.1.1` override in both `package.json` trees is a temporary CVE workaround under the
  `firebase-admin` subtree — **remove it once `@google-cloud/storage` ships a patched-uuid release**
  (tracked in `CLAUDE.md`).

---

## 7. Process conventions

- **Refactors are behavior-preserving** — behavior identical before/after each commit; no feature work mixed
  into a refactor ([`REFACTOR.md:20`](./REFACTOR.md)).
- **One focused PR per task; server and frontend in separate PRs** ([`REFACTOR.md:21`](./REFACTOR.md)).
- **Parallel work follows the worktree protocol** in [`BACKLOG_ROADMAP.md`](./BACKLOG_ROADMAP.md): one
  worktree per track on a free port (never 3000/4000), claim the lane on `development` *before* starting so
  concurrent sessions see it taken, keep the gates green, and flip the board `[~]`→`[P]`→`[x]` as the PR
  moves.
- **Flag-don't-act:** when a refactor surfaces an out-of-scope issue, record it (a follow-up in
  [`BACKLOG.md`](./BACKLOG.md) / a status-log note) rather than fixing it inline — keep the PR scoped.

---

*Living document — when the code and a rule here disagree, reconcile them in the same PR. Anchors
(`file:line`) are correct as of this doc's authoring; verify against disk before relying on an exact line.*
