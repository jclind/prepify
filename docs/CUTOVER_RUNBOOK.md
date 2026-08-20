# Prepify — 1.0 Cutover Runbook

> **⚠ SUPERSEDED (2026-07-11) by [`RELEASE_RUNBOOK.md`](./RELEASE_RUNBOOK.md)** — which folds in
> Waves 9–13, corrects Phase 5's mis-filing of the rating-type migration (it is sequencing-critical
> and coupled to the deploy — V5, PR #303), and grounds every step in the 2026-07-11 dev rehearsal
> ([`evidence/CUTOVER_REHEARSAL_2026-07-11.md`](./evidence/CUTOVER_REHEARSAL_2026-07-11.md)).
> The smoke-test checklists in this file are still referenced from there; the ordered steps are not.

The single ordered checklist for flipping Prepify from **beta → 1.0**. Everything the parallel
backlog program tracked (`BACKLOG_ROADMAP.md` Waves 1–8) is merged; the only work left is this
owner-driven cutover. It is deliberately **not** automatable — the beta flip is the intentional
final/celebration step, and the data/infra ops touch **production**.

Companion docs: [`RELEASE_PLAN.md`](./RELEASE_PLAN.md) (the launch gate + audit log),
[`IMAGE_PIPELINE.md`](./IMAGE_PIPELINE.md) (image-ops runbooks), [`BACKLOG.md`](./BACKLOG.md).

> **Deploy model:** branch-based. Merging `development` → `release` triggers the prod Netlify build
> + prod Railway service. All prod env vars are already set (see RELEASE_PLAN "Infra status").
> Firebase = Auth + Storage only (not Hosting).

> **Environment safety:** the local `.env` / `server/.env` point at **dev** (`prepify-dev-58579`
> Firebase + `prepify-dev` Mongo). Every prod ops command below must be run with an **explicit prod
> `MONGO_URI`** on the command line — never rely on the checked-in `.env` for a prod operation.

Legend: `[ ]` todo · `[x]` done. Check boxes off in a working copy as you go.

---

## Phase 0 — Pre-flight (no writes)

Do these first; none of them change prod. Goal: confirm the tree is green and find out exactly what
data ops prod needs.

- `[ ]` **Tree is green on `development`.** From repo root:
  - `npx tsc --noEmit`
  - `npm test` (Vitest)
  - `npm run build`
  - `cd server && npm test` (Jest) — X4 hardened this; expect it stable.
- `[ ]` **`development` is fully merged + pushed** (board drained, no stray open PRs): `gh pr list --state open`.
- `[ ]` **Snapshot prod state.** Run the read-only migration checker against **prod** to see what Phase 1
  will actually need (it reads only):
  ```bash
  MONGO_URI='<PROD_MONGO_URI>' node server/scripts/checkMigrationState.js
  ```
  Record its output. It reports legacy string-`_id` recipes and recipes missing the `rating` aggregate,
  and prints the exact `--apply` command to fix each. Re-run it after Phase 1 until it reports **0 pending**.
- `[ ]` **Take a prod DB backup / note the Atlas snapshot timestamp** before any `--apply` run below.

---

## Phase 1 — Prod data ops (owner-gated, idempotent, dry-run-first)

Each script is **DRY RUN by default** and only writes with `--apply`. Always run the dry run, read the
diff, then re-run with `--apply`. All are idempotent (a second `--apply` is a no-op). These can run
**before** the code deploy — prod already runs the code that tolerates both states (the `recipeIdQuery`
shim; per-recipe rating self-heal).

### 1a — Legacy string-`_id` → ObjectId migration (W1, #268)

The 8 legacy recipes have 24-char-hex string `_id`s; the script re-inserts each under
`ObjectId(sameHex)` and deletes the string doc in one transaction (hex-preserving, so `String(_id)`
is byte-identical and foreign refs never move).

- `[ ]` Dry run: `MONGO_URI='<PROD>' node server/scripts/migrateLegacyRecipeIds.js`
- `[ ]` Apply: `MONGO_URI='<PROD>' node server/scripts/migrateLegacyRecipeIds.js --apply`
- `[ ]` **Also convert/re-clone dev** (same 8 docs) so dev matches prod.
- `[ ]` Verify: `checkMigrationState.js` reports 0 legacy ids.
- ⚠️ **Do NOT retire the `recipeIdQuery` shim yet** — that's a separate post-cutover PR (Phase 5). The
  shim must stay until the data is converted *and* the converted code is live.

### 1b — Rating-aggregate breakdown backfill (§D, #266)

Populates the per-star `breakdown` histogram everywhere. Until run, prod hides the histogram and
self-heals per-recipe on rating writes.

- `[ ]` Dry run: `MONGO_URI='<PROD>' node server/scripts/reconcileRatingAggregates.js`
- `[ ]` Apply: `MONGO_URI='<PROD>' node server/scripts/reconcileRatingAggregates.js --apply`
  *(dev done 2026-07-09 — 11 recipes corrected)*
- `[ ]` Verify: `checkMigrationState.js` reports 0 recipes missing the aggregate.

---

## Phase 2 — Image infra ops (owner dashboard + scripts) — OPTIONAL for 1.0

Both image efforts shipped inert behind flags/fallbacks, so **1.0 can ship without them** and pick
them up in a 1.0.x. Do them here only if you want them live at launch. Full runbooks:
[`IMAGE_PIPELINE.md`](./IMAGE_PIPELINE.md).

### 2a — uid-keyed recipe images + tightened rules (I2 #249/#254, X3 delete-grant #275)

- `[ ]` Deploy storage rules (includes the X3 owner-delete grant for orphan cleanup):
  `firebase deploy --only storage`
- `[ ]` Dry run: `MONGO_URI='<PROD>' node server/scripts/migrateRecipeImagesToUid.js`
- `[ ]` Apply: `MONGO_URI='<PROD>' node server/scripts/migrateRecipeImagesToUid.js --apply`
  (safe sequence: `--apply` copies+repoints; legacy flat path stays read-only for un-migrated objects).

### 2b — Responsive image variants (I1 #247)

- `[ ]` Install the **Firebase Resize Images** extension on the prod project; backfill existing objects.
- `[ ]` Set `VITE_IMAGE_VARIANTS_ENABLED=true` in the **Netlify Production** build env (currently `false`
  in `.env.example`). `srcset` is inert + has a per-`<img>` fallback until this flips, so only enable it
  **after** variants exist.

---

## Phase 3 — The code cutover (the beta flip)

The beta label is hardcoded in 3 UI spots + the release-notes flag. Do these together in **one PR** off
`development`. `grep -rn -iE "beta" src` currently returns 13 hits; after these edits it should return
only the `.beta-tag` SCSS class (decide keep-or-rename — cosmetic).

- `[ ]` **Footer version suffix** — `src/Components/Footer/shared/LegalBar.tsx:16`: drop `-beta`
  (`v{version}-beta` → `v{version}`).
- `[ ]` **Beta button** — `src/Components/Navbar/PrepifyLogo.tsx:17-18`: remove the
  `<button className='beta-tag'>Beta</button>` (decision 2026-06-17: remove, option a).
- `[ ]` **`isBeta` flag** — `src/Components/ReleaseNotes/ReleaseNotes.tsx:15`: `const isBeta = true` →
  `false` (drives the `-beta` suffix at `:80-81`).
- `[ ]` **Release date** — `ReleaseNotes.tsx:14`: confirm `RELEASE_DATE` = the actual ship date
  (currently `'6/23/2026'`).
- `[ ]` **Version bump** — `package.json` `"version": "2.6.3"` → `"1.0.0"`. The chip reads
  `VITE_APP_VERSION`, injected at build from `package.json` (`vite.config.ts:16`), so the bump flows to
  the footer + release-notes chip automatically — no other edit needed.
- `[ ]` Re-run gates (`tsc` / Vitest / build); open the PR, get CI green, merge to `development`.
- `[ ]` **Final grep gate:** `grep -rn -iE "beta|isBeta" src` returns only the `.beta-tag` SCSS class.

### Pre-flight smoke test (dress rehearsal — NON-prod)

Run against the flip PR's **Netlify deploy-preview** (or local dev via the run-prepify skill) **before**
merging to `development` — this is the last cheap chance to catch the flip itself + a core-flow regression
on a build that isn't yet public. Non-prod, so use the Cypress test user / throwaway accounts freely.
Do a logged-out pass and a logged-in pass.

- `[ ]` **Flip is correct:** no `Beta` button in the navbar; footer version reads `v1.0.0` (no `-beta`);
  open the Release Notes modal → header shows `1.0.0` with no `-beta` suffix and the right `RELEASE_DATE`.
- `[ ]` **Home:** hero, Trending, "For You" (logged-in), Browse-by-meal, and View-all-recipes all render;
  "What should I cook?" opens; zero console errors.
- `[ ]` **Browse `/recipes`:** grid loads, filters + sort work, load-more paginates, no-results empty state.
- `[ ]` **Search autocomplete:** typing yields result cards (home hero + mobile menu); no-results state shows.
- `[ ]` **Single recipe:** renders with nutrition card, ingredient checkboxes, price/cost, save↔unsave toggles.
- `[ ]` **Auth:** log in as the test user, log out, `/signup` reachable, `/forgot-password` renders.
- `[ ]` **Create/edit/delete recipe:** add a recipe **with an image upload** → it saves and shows in Your
  Recipes; edit it; save a draft; delete it. Confirms image upload + the ownership-scoped write routes.
- `[ ]` **Ratings & reviews (§D flow):** post a review + rating → own-review card appears; edit it in place;
  delete the rating and confirm the review survives; the summary strip histogram + facepile update; the
  New/Top sort pills reorder; reviewer name links to `/u/:username`.
- `[ ]` **Account + Settings:** all four Account tabs (Saved / Ratings / Your Recipes / Drafts) and all four
  Settings sections load; a public profile `/u/:username` renders.
- `[ ]` **Static/legal/support:** `/help` contact form loads **logged-out**, an unknown route shows the
  designed 404, `/privacy` + `/terms` render, footer links resolve.
- `[ ]` **Mobile 390px:** home, single recipe, hamburger menu, and Add-Recipe — **no horizontal overflow,
  no console errors**, tap targets ok.

---

## Phase 4 — Deploy + verify

- `[ ]` **Tag a GitHub Release** for `1.0.0` (release-notes content is already refreshed for 1.0).
- `[ ]` **Deploy:** merge `development` → `release` (triggers prod Netlify build + prod Railway service).
- `[ ]` **Confirm build env:** Netlify **Production** context has `VITE_SENTRY_DSN` set (and
  `VITE_IMAGE_VARIANTS_ENABLED` only if Phase 2b is done) *before* the build runs.
#### Comprehensive production smoke test (`prepifymeals.com`)

Run this the moment the `release` build is live, **before** announcing — it's the first time the flip,
the `1.0.0` bump, prod env vars, and the migrated prod data all meet on the real domain. You're writing
to **prod**, so use a throwaway account, keep test content minimal and clearly labelled, and delete it at
the end (last item). Ideally start this when you can babysit the aftermath (see "Watch logs" below), not
late at night.

- `[ ]` **Transport:** `https://prepifymeals.com` loads with a valid cert; `www` → apex 301; prod API
  `/health` returns 200 over SSL.
- `[ ]` **Right build is live:** `curl <prod-api>/version` and confirm `commitFull` equals the SHA you
  just pushed to `release`. Do this BEFORE the rest of the smoke test — testing against a stale
  container wastes the pass and hides the real result. `/health` alone can't tell you this: it
  returns an identical 200 on old and new code.
- `[ ]` **Flip is live:** no `Beta` button; footer reads `v1.0.0` (no `-beta`); Release Notes header shows
  `1.0.0` + the actual ship `RELEASE_DATE`; **zero console errors** on load.
- `[ ]` **Read paths:** Home (all rows), Browse `/recipes` (filter/sort/load-more), Search autocomplete,
  and a Single recipe with its **nutrition card** (confirms the Edamam server proxy is live in prod).
- `[ ]` **Auth (prod Firebase):** sign in; confirm session persists across a reload; log out.
- `[ ]` **Create recipe with image** (throwaway): saves and appears in Your Recipes — confirms prod
  **Storage rules**, image upload, **and image moderation** (Google Vision key) in one flow. Edit + delete it.
- `[ ]` **Ratings & reviews (§D):** leave a review + rating on a recipe; confirm the **per-star histogram
  renders** (validates the Phase 1b breakdown backfill actually ran — if it's hidden, the backfill was
  skipped); edit then remove your review to clean up.
- `[ ]` **Text moderation** (optional): submit an obviously-disallowed review string → it's blocked inline
  (confirms `OPENAI_API_KEY` + `MODERATION_ENABLED=true` on prod).
- `[ ]` **Support path:** submit the `/help` contact form and the footer "Report a bug" form → confirm the
  admin queue receives it + the `ADMIN_NOTIFY_EMAIL` alert lands (Resend).
- `[ ]` **Error tracking:** confirm a Sentry event lands for the prod release (check the dashboard for the
  `1.0.0` release, or trigger a benign handled error).
- `[ ]` **Social preview (known limitation, not a failure):** pasting a recipe URL into Slack/iMessage
  shows the **generic** site card — expected for the SPA until prerendering ships (RELEASE_PLAN §C).
- `[ ]` **Mobile (real device):** home, single recipe, hamburger menu — no overflow, no console errors.
- `[ ]` **Cleanup:** delete every throwaway account, recipe, image, and review created above.
- `[ ]` **Watch logs / Sentry** for the first hours; keep the rollback path (revert the `development`→`release`
  merge) at hand.

---

## Phase 5 — Post-cutover follow-ups

- `[ ]` **Retire the `recipeIdQuery` shim** (Tech debt, gated on Phase 1a). Now that the 8 legacy docs
  are `ObjectId`s and that state is deployed, open a **separate PR** removing `server/util/recipeIdQuery.js`
  and its callers. Never before Phase 1a is applied *and* live.
- `[ ]` **Legacy rating-type migration** (BACKLOG Bugs, 2026-07-09): old `rating` docs store stringified
  numbers, so the new "Top" sort interleaves wrong by BSON type order — normalize to numbers.
- `[ ]` Flip the RELEASE_PLAN cutover checklist + this runbook's boxes to `[x]`; add an audit-log entry.

---

## Rollback notes

- **Code:** revert the `development`→`release` merge (or redeploy the prior `release` tip). The beta-flip
  PR is a pure UI/flag change — reverting it restores the beta label cleanly.
- **Data:** the Phase 1 migrations are idempotent and hex-preserving, so they don't need rolling back for
  a *code* rollback — the shim still tolerates converted ids. If a data migration itself misbehaves,
  restore from the Phase 0 Atlas snapshot; do **not** hand-edit legacy ids.
- **Never** remove the `recipeIdQuery` shim (Phase 5) as part of an emergency — it's the compatibility
  layer a rollback depends on.
