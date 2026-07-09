# Prepify — 1.0 Cutover Runbook

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

---

## Phase 4 — Deploy + verify

- `[ ]` **Tag a GitHub Release** for `1.0.0` (release-notes content is already refreshed for 1.0).
- `[ ]` **Deploy:** merge `development` → `release` (triggers prod Netlify build + prod Railway service).
- `[ ]` **Confirm build env:** Netlify **Production** context has `VITE_SENTRY_DSN` set (and
  `VITE_IMAGE_VARIANTS_ENABLED` only if Phase 2b is done) *before* the build runs.
- `[ ]` **Smoke-test production** (`prepifymeals.com`): load home, view a recipe, sign in, create a
  recipe (confirms image upload + save), leave a review + rating (confirms the §D flow + histogram now
  shows post-backfill). Zero console errors; no `-beta` anywhere; version reads `1.0.0`.
- `[ ]` **Watch logs / Sentry** for the first hours.

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
