# Prepify — Admin & Moderation Functionality

This is the **single living document** for designing and building Prepify's admin/moderation
functionality. It is both the **reference/spec** (top half) and the **build tracker** (bottom half).
Claude Code comes back to *this file* during the build — there is no separate planning doc. When
scope changes or a phase ships, update the **Progress** section at the bottom.

Scoped **2026-06-10**. Single-developer estimate: **~3 weeks** for the full P0–P3 build; **P0 + P1
(~1 week) is independently shippable**.

## Status legend

- `[ ]` — todo (not started)
- `[~]` — in progress / partial
- `[x]` — done
- `[?]` — needs a decision before it can be done

---

## Confirmed decisions (2026-06-10)

| Decision | Choice | Why |
|----------|--------|-----|
| **Admin identity** | Firebase **custom claims** `{ admin: true }` | Rides the existing ID-token flow; no per-request DB lookup. |
| **Content takedown** | **Soft-hide** via a `status`/`hidden` field | Reversible + auditable. Cost: must filter every public read path. |
| **Who can report** | **Logged-in users only** | Carries `reporterUid`; enables rate-limiting + abuse tracking. |
| **Scope target** | **Full P0–P3** (~3 weeks) | Sequenced so P0+P1 ships independently first. |

---

## How the system works today (the ground truth)

- **Auth**: Firebase ID token → `server/middleware/auth.js` `verifyToken` sets `req.uid`.
  **No roles, no claims today.** Every write route is owner-only via `recipe.userId !== uid`
  checks (`server/routes/recipes.js:181`, `:227`).
- **Frontend gating**: `src/Components/PrivateRoute.tsx` checks **only** that a user is logged in —
  no role concept. Roles are not surfaced in `src/context/AuthContext.tsx`.
- **Collections**: `recipes`, `ratings` (ratings **and** reviews), `usernames`, `userRecipeData`,
  `stats`, `drafts`.
- **No `reports` collection** and **no moderation state** (`hidden`/`status`/`flagged`) on any
  document today.

### ⚠️ Highest-risk structural gotchas (read before building)

1. **Reviews are not their own documents.** They live *inside* the `ratings` collection, keyed by
   `{ username, recipeId }`, with text in `reviewText` (`server/routes/reviews.js`). **There is no
   stable review id** — identity is the `(username, recipeId)` pair. "Deleting" a review today just
   blanks `reviewText` (`reviews.js:148`). **Every report/moderation path for reviews must key off
   `(username, recipeId)`, not an id.**
2. **Soft-hide ripples through every read path.** Adding a `status`/`hidden` field means these must
   all filter hidden content: `GET /recipes`, `getRecipe`, `getTrendingRecipes`,
   `searchAutoCompleteRecipes`, `getReviews`, and the account list endpoints
   (`getCreatedRecipes`, `getSavedRecipes`). This is the riskiest slice — budget tests.
3. **No central user record.** Identity is split across Firebase Auth + `usernames` +
   `userRecipeData`. "Ban a user" (P2) has no clean home today → plan to introduce a `users` status
   record when we reach P2.
4. **No email provider exists yet.** P3 notifications require choosing one first.

---

## Effort at a glance

| Tier | Scope | Rough effort |
|------|-------|--------------|
| **P0 — Foundation** | Admin identity + middleware + protected routing | ~1–2 days |
| **P1 — Core moderation** | Reporting system + report queue dashboard + review/recipe takedown | ~4–6 days |
| **P2 — Extended moderation** | User suspension/ban, recipe feature/unpublish, admin user search | ~3–4 days |
| **P3 — Polish** | Audit log, analytics, notifications, bulk actions | ~3–5 days |

---

## P0 — Admin identity foundation *(prerequisite, blocks everything)*

Recommended: **Firebase custom claims** (`{ admin: true }`) set via a one-off script, verified
server-side. Rides the existing token flow with zero new per-request lookups.

| File | Change | Severity |
|------|--------|----------|
| `server/middleware/auth.js` | Add `requireAdmin` middleware (reads `decoded.admin`); expose claim on `req` | **LOW** (additive) |
| `server/scripts/setAdmin.js` *(new)* | One-off script to grant the claim by uid/email | **NEW, small** |
| `src/context/AuthContext.tsx` | Surface `isAdmin` (from `getIdTokenResult().claims`) in context value + type | **MEDIUM** (touches the type + value object) |
| `src/Components/AdminRoute.tsx` *(new)* | Like `PrivateRoute` but also checks `isAdmin` | **NEW, small** |
| `src/App.tsx` | Register `/admin/*` routes behind `AdminRoute` | **LOW** |

---

## P1 — Reporting + moderation queue *(the core ask)*

### 1. Reporting system (data + write endpoints)

New `reports` collection. Because reviews have no id, a **review report must store
`{ targetType, recipeId, reportedUsername }`**; a recipe report stores `{ targetType, recipeId }`.

```
report = {
  _id,
  targetType: 'recipe' | 'review',
  recipeId,
  reportedUsername?,   // required when targetType === 'review'
  reporterUid,
  reason,
  details,
  status: 'open' | 'resolved' | 'dismissed',
  createdAt,
  resolvedBy?,
  resolvedAt?
}
```

| File | Change | Severity |
|------|--------|----------|
| `server/routes/reports.js` *(new)* | `POST /reports` (any logged-in user; rate-limit one open report per target), `GET /reports` (admin, filter/paginate), `PATCH /reports/:id` (resolve/dismiss) | **NEW, medium** |
| `server/app.js` | Mount `reportRoutes` | **LOW** (1 line) |
| `src/api/reports.ts` *(new)* | Client for the above | **NEW, small** |
| `src/pages/SingleRecipe/*` + review components | Add "Report" affordance on recipe + each review | **MEDIUM** (UI in busy existing components) |

### 2. Admin moderation actions (soft-hide)

| File | Change | Severity |
|------|--------|----------|
| `server/routes/reviews.js` | Admin takedown that bypasses owner check; set a moderation flag on the `ratings` doc by `{username, recipeId}` | **MEDIUM** (sensitive auth logic) |
| `server/routes/recipes.js` | Admin hide/unhide bypassing `userId`; add `status`/`hidden` field **and filter it from all read paths** (see gotcha #2) | **MEDIUM–HIGH** (ripples through every recipe read) |

### 3. Admin dashboard shell + report queue UI

| File | Change | Severity |
|------|--------|----------|
| `src/pages/Admin/AdminLayout.tsx` *(new)* | Sidebar/nav shell for the admin section | **NEW, medium** |
| `src/pages/Admin/Reports/Reports.tsx` *(new)* | Report queue: list, filters (open/resolved, type), inline preview of reported content, resolve/dismiss/takedown actions | **NEW, large** (the centerpiece UI) |
| `src/pages/Admin/Reports/*.scss` *(new)* | Styling | **NEW, medium** |

---

## P2 — Extended moderation

| Area | Files | Severity |
|------|-------|----------|
| **User suspension/ban** | `server/routes/admin-users.js` *(new)*; introduce a user-status source of truth (Firebase `disabled` flag + a `users`/`userStatus` record). `verifyToken` may need to reject disabled users | **HIGH** — no central user record exists today (gotcha #3) |
| **Recipe feature/unpublish** | `recipes.js` read filters, new admin endpoints, `src/pages/Admin/Recipes/*` | **MEDIUM** |
| **Admin user search/detail** | New endpoints joining `usernames` + `userRecipeData` + counts; `src/pages/Admin/Users/*` | **MEDIUM** |

---

## P3 — Polish / lower priority

- **Audit log** — `auditLog` collection; every admin action writes an entry. **LOW each, MEDIUM in
  aggregate.**
- **Admin analytics dashboard** — reuse `stats` collection + new aggregations. **MEDIUM.**
- **Notifications/email** to reporters or offending users — **MEDIUM**; requires choosing an email
  provider (none exists yet).
- **Bulk actions / saved filters / pagination polish** on the queue — **LOW–MEDIUM.**

---

## Severity legend

- **LOW** — small additive change, low blast radius.
- **MEDIUM** — touches existing logic or a meaningful new component.
- **HIGH** — structural change that ripples across multiple files / read paths.
- **NEW** — brand-new file.

---

## Open decisions (deferred, not blocking P0/P1)

- `[?]` **User-record source of truth for banning (P2).** Propose a `users` status record when we
  reach P2; revisit then.
- `[?]` **Email provider for notifications (P3).** None exists; pick before P3 notifications.

---

## Progress tracker *(update as we build)*

**Current status (2026-06-11): P0 + P1 + P2 built + smoke-tested on
`worktree-feat+admin-service` (off origin/development). Tests green — server 220,
frontend 215, tsc clean. Pushed (no PR), not merged. P3 still to do.**

P2 smoke test PASS (2026-06-11). Fixes applied during it: account-status banner
(pulled forward from P3 — persistent upfront notice for suspended/banned users),
Users page live/clearable search + pagination, and admin-bypass on `getRecipe`
(`optionalAuth`) so admins keep access to hidden/unpublished recipes to restore
them (with status pills on the recipe Admin strip).

Decisions locked while building: takedown model is a **`status` enum** on recipes
(`'active' | 'hidden'`, room for P2 states) + a distinct **`moderationHidden`**
flag on the `ratings` doc for reviews (original text preserved, reversible).

### P0 — Foundation ✅
- `[x]` `requireAdmin` middleware in `server/middleware/auth.js` (+ `req.isAdmin` set in `verifyToken`)
- `[x]` `server/scripts/setAdmin.js` grant script (`node scripts/setAdmin.js <uid|email> [--revoke]`)
- `[x]` `isAdmin` surfaced in `AuthContext` (from `getIdTokenResult().claims.admin`)
- `[x]` `AdminRoute` component (login + admin claim; `authLoading` guard so admins aren't bounced on refresh)
- `[x]` `/admin/*` routes registered in `App.tsx` (own `AdminLayout` shell, outside the public Layout)

### P1 — Reporting + moderation queue ✅
- `[x]` `reports` collection + `server/routes/reports.js` (`POST`/`GET`/`PATCH`, rate-limited one-open-per-reporter-per-target, admin queue enriched with content snapshot)
- `[x]` `server/app.js` mounts report routes
- `[x]` `src/api/reports.ts` client (+ report types in `src/types.ts`)
- `[x]` Report affordance on recipe (`SingleRecipe`, non-owners) + reviews (`ReviewOptions`, non-authors) via reusable `src/Components/ReportControl`
- `[x]` Soft-hide `status` field + filter ALL recipe read paths (`/recipes`, `getRecipe`, `getTrendingRecipes`, `searchAutoCompleteRecipes`, `getCreatedRecipes`, `getSavedRecipes`) via `server/util/moderation.js` (`$ne` predicate — legacy docs stay visible)
- `[x]` Admin recipe hide/unhide (`PATCH /api/admin/recipes/:id/moderation`) + review takedown by `username`+`recipeId` (`PATCH /api/admin/reviews/moderation`); both filter from `getReviews`/`getSingleUserReviews`
- `[x]` `AdminLayout` shell
- `[x]` `Reports` queue dashboard UI (status tabs, inline previews, take-down/resolve/dismiss)
- `[x]` Tests: server `reports.test.js` + `admin-moderation.test.js`; frontend `AdminRoute.test.tsx` + `ReportControl.test.tsx`

**Known nuances to revisit (intentional for P1, candidates for P2 polish):**
- A soft-hidden recipe is hidden from its **own author** too (`getCreatedRecipes`),
  and a taken-down review is hidden from its author's list (`getSingleUserReviews`).
  P2 should add an owner-facing "your content was moderated" surface.
- `getSavedRecipes` `totalCount` still counts a saved-but-hidden recipe even though
  it's filtered from the returned page (minor pagination drift).

### P2 — Extended moderation ✅
Built on `worktree-feat+admin-service`. Decisions: central status lives in a new
**`users` collection** (uid-keyed, legacy-safe — absent ⇒ active); **ban is a soft
DB flag**, enforced identically to suspend (writes blocked, reads/login allowed),
NOT coupled to Firebase `disabled`; recipe item = a **`featured` flag** + a distinct
**`unpublished`** status separate from the P1 moderation `hidden`.
- `[x]` User-status source of truth + suspension/ban — `server/util/userStatus.js`
  + `requireActive` middleware (`server/middleware/auth.js`) returning 403 +
  `ACCOUNT_SUSPENDED`/`ACCOUNT_BANNED` code; gates content/social writes in
  recipes/reviews/reports/drafts/auth (deletes intentionally left open).
- `[x]` Admin user management — `server/routes/admin.js`: `GET /admin/users`
  (username-prefix / email / uid search, enriched with status + recipe/review/
  open-report counts), `GET /admin/users/:uid` (detail + email + recent content),
  `PATCH /admin/users/:uid/status` (self-guard + can't-action-another-admin guard).
- `[x]` Recipe feature/unpublish — `RECIPE_VISIBLE` now `$nin ['hidden','unpublished']`;
  `PATCH /admin/recipes/:id/publish` (stamps publishUpdatedBy, NOT moderatedBy) +
  `PATCH /admin/recipes/:id/feature`; `getTrendingRecipes` pins `featured` first.
- `[x]` Frontend — `src/api/admin.ts`; `/admin/users` page (`src/pages/Admin/Users`)
  + nav item; admin-only `AdminRecipeControls` strip on the recipe page
  (feature/publish/takedown); http-common interceptor toasts the blocked-account 403.
- `[x]` Tests — server `admin-users.test.js`, `user-status-enforcement.test.js`,
  `admin-recipe-curation.test.js` (firebase-admin mock gained getUser/getUserByEmail
  + __setUsers); frontend `AdminUsers.test.tsx`, `AdminRecipeControls.test.tsx`.
  Green: server 217, frontend 211, tsc clean.

**Done during smoke test (was P2→P3):** persistent in-app "your account is
suspended/banned" banner — `AccountStatusBanner` (in Layout) + `GET /getMyStatus`.

**Still P3:** a dedicated admin "moderated content" list (find hidden/unpublished
recipes without a direct URL); optional functional split between suspend & ban
(auto-expiry / Firebase-disable) — currently identical enforcement, semantic only.

### P3 — Polish
- `[ ]` `auditLog` collection + writes on every admin action
- `[ ]` Admin analytics dashboard
- `[ ]` Notifications/email (provider TBD)
- `[ ]` Bulk actions / saved filters
