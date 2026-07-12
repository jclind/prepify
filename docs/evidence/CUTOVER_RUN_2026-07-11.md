# Prepify — 1.0 Release Runbook — LIVE RUN LOG (2026-07-11)

> **This is the live cutover run log**, copied from `RELEASE_RUNBOOK.md` and annotated as we execute.
> Owner: Jesse (driving). Copilot: Claude. Every command output, count, decision, and timestamp lands here.
> `[x]` = done this run · inline `» RUN:` notes are live annotations.

## Live run log — §1 pre-flight

- **15:41 EDT** — State verification: `development` clean, up to date with `origin/development`, HEAD `82eda16` (at target), 0 unpushed.
- **15:41 EDT** — Stray-PR check: only **#303** open (`feat/v5-review-timestamp-flip`, `[DO NOT MERGE]`, not a draft) — expected parked V5 flip. No other open PRs. ✅
- **15:40 EDT** — Five local gates GREEN:
  | gate | result |
  |---|---|
  | `tsc --noEmit` | exit 0 |
  | `tsc -p tsconfig.tests.json --noEmit` | exit 0 |
  | Vitest (`vitest run`) | 757 passed / 2 skipped (92 files) |
  | `vite build` | ✓ built |
  | server Jest (`jest --runInBand`) | 908 passed / 43 suites |
- **CONCURRENT-SESSION EVENT (resolved):** while paused, a separate session landed the **2026-07-11 security-audit remediation batch** into `development` — `#316` (audit writeup, docs) + `#317` (code fixes H1/M1/M2/M3/M4/L1: paid-API daily cost ceiling, UID/admin-stamp projection, ghost/self-rating guards, authorUsername impersonation fix, servingPrice bounds recompute, requireActive on 2 routes). Its own branch was merged + cleaned up. **Owner decision: the security batch is IN 1.0** (already merged; launches hardened). New boot index `paidQuota.expireAt` (TTL, non-unique, new collection) — does NOT affect the 2e unique-index gate.
- **00:09 EDT (2026-07-12)** — Re-verified after rollover: on `development`, tree clean, `development` == `origin/development` == `d483bac`; only `#303` open.
- **00:12 EDT (2026-07-12)** — Re-ran all five gates on `d483bac` (post-security-batch) — GREEN: tsc 0 ×2 · Vitest 757/2 · build ✓ · **Jest 928/44** (+20 security tests).
- **~00:20 EDT (2026-07-12)** — §1 prod snapshot COMPLETE (owner ran all via `!`; prod URI never echoed). Board, all read-only:
  | check | prod | verdict |
  |---|---|---|
  | prod DB name | `prepify` | ✅ (hardcoded-`db('prepify')` scripts safe) |
  | W1 legacy `_id` | 8 pending, 8 clean converts, 0 SKIP | ✅ matches dev |
  | V5 `normalizeRatingTypes` (dry) | 17 scanned, 13 would rewrite, **0 GARBAGE** | ✅ |
  | D1 `backfillRatingUserIds` (dry) | 0 missing, **0 unresolved handles** | ✅ cleaner than dev (no orphan) |
  | reports `reportedUid` | 0 | ✅ |
  | rating aggregates (presence) | 0 pending | ✅ (breakdown re-checked at 2b) |
  | **dup ratings (2e input)** | **0** — re-run explicitly on `prepify` via `getSiblingDB` (first raw `mongosh` defaulted to `test`; total=17 confirmed prepify) | ✅ no E11000 risk |
- **§1 GO/NO-GO: GO** (owner) — data is clean, cleaner than the dev rehearsal; no data fixes needed, no orphan-disposition call.
- **TIMING DECISION (owner, ~00:20 EDT): FULL SEND — ship 1.0 tonight.** Proceed 2a→2d→§5 straight through despite past-midnight. Copilot holds every hard gate; explicit owner confirmation required at the `development`→`release` merge (point of no return).
- **Rollback anchor:** owner confirmed Atlas backup in place before any §2 write ("backups in place", ~00:2x EDT 2026-07-12). Exact snapshot timestamp: _(owner to paste; retro-recorded)_.

### §2 — prod data ops (live)

- **2a — W1 legacy `_id` → ObjectId — ✅ DONE.**
  - Canary `--apply --id=652ec5f57f529103dab7e4a3` ("Pad Thai", 0 refs): 1 converted, 7 remaining. Mechanism confirmed on prod.
  - Full `--apply`: **7 converted** (incl. Tuscan Chicken Skillet 8r/3rep/6lists), `string _ids remaining: 0`, refs untouched.
  - Gate — verification dry-run: `legacy string-_id docs: 0`, **exit=0**. Idempotency proven. ✅
- **2b — §D rating-aggregate `breakdown` backfill — ✅ DONE.**
  - Dry-run: 12 scanned, **12 would correct** — all `breakdown (absent)`, purely additive (rateCount/rateValue unchanged; histograms reconcile to stored averages, spot-checked Tuscan 3.75 / Granola 4.5 / Egg-Fried-Rice 2.5). Explains §1's "0 aggregates pending" = presence check, not breakdown.
  - `--apply`: **12 corrected**.
  - Gate — convergence dry-run: `12 already in sync, 0 would correct`. ✅ (No rating averages/counts moved.)

---

# Prepify — 1.0 Release Runbook

The single ordered checklist for the owner-driven **beta → 1.0** cutover session. This supersedes
[`CUTOVER_RUNBOOK.md`](./CUTOVER_RUNBOOK.md) (kept for history): it folds in Waves 9–13, the **V5
rating-type cutover** (which the old runbook mis-filed as a casual post-cutover follow-up — it is
**sequencing-critical**, see step 2d), and is grounded in the **2026-07-11 dev rehearsal**:
[`evidence/CUTOVER_REHEARSAL_2026-07-11.md`](./evidence/CUTOVER_REHEARSAL_2026-07-11.md). That
rehearsal covered **2a / 2c / 2d / 3a**; **2b** (`reconcileRatingAggregates`) was run on dev in a
separate earlier session (2026-07-09), and **2e's unique-index build has NOT been rehearsed
end-to-end** (dev's backfill had 0 updatable rows, so the unique index never built over real
backfilled data) — treat its prod run as a first run with its own gate (see 2e).

Companion docs: [`RELEASE_PLAN.md`](./RELEASE_PLAN.md) (launch gate + audit log),
[`IMAGE_PIPELINE.md`](./IMAGE_PIPELINE.md) (image-ops detail), [`BACKLOG.md`](./BACKLOG.md).

> **Deploy model:** branch-based. Merging `development` → `release` triggers the prod Netlify build
> (`prepifymeals.com`) + the prod Railway service (`prepify-production-63a6.up.railway.app`).
> All prod env vars are already set and verified (RELEASE_PLAN "Infra status", 2026-06-26).
> Firebase = Auth + Storage only (Netlify hosts the frontend). **Prod `release` is ~633 commits
> behind `development` (PR #102, 2026-06-03)** — this deploy is a big jump; the smoke test matters.
>
> **Environment safety:** the local `.env` / `server/.env` point at **dev** (`prepify-dev-58579`
> Firebase + `prepify-dev` Mongo). Every prod ops command below therefore needs its prod target
> **explicitly on the command line** (`MONGO_URI='<PROD>' node …`, and for step 3a a prod
> `FIREBASE_SERVICE_ACCOUNT`) — never rely on the checked-in `.env` for a prod operation. If you
> instead temporarily edit `server/.env`: **revert it and restart the `:4000` dev server root
> process afterwards** (a long-lived server keeps the URI it started with — this bit us 2026-07-09).

Legend: `[ ]` todo · `[x]` done (dev-rehearsed state noted inline). Work through a copy, top to bottom.

---

## 1 — Pre-flight (read-only, no prod writes)

- `[ ]` **Tree green on `development`:** `npx tsc --noEmit` · `npx tsc -p tsconfig.tests.json --noEmit`
  (the U2 gate) · `npm test` (Vitest) · `npm run build` · `cd server && npm test` (Jest).
- `[ ]` **No stray open PRs** (`gh pr list --state open`) — *except* the parked
  **[DO NOT MERGE] V5 flip PR #303**, which must still be open and is merged inside step 2d only.
  Owner-disposition branches `worktree-feat+moderation-pr-c-ratelimiter` and `feat/legal-pages`
  are known parked work, not blockers.
- `[ ]` **Snapshot prod state** (read-only):
  ```bash
  MONGO_URI='<PROD>' node server/scripts/checkMigrationState.js
  MONGO_URI='<PROD>' node server/scripts/normalizeRatingTypes.js        # dry run — V5 pending counts
  MONGO_URI='<PROD>' node server/scripts/migrateLegacyRecipeIds.js      # dry run — W1 pending counts
  MONGO_URI='<PROD>' node server/scripts/backfillRatingUserIds.js       # dry run — orphaned handles?
  ```
  Record the outputs. Watch for two things the dev rehearsal flagged:
  **GARBAGE lines** from `normalizeRatingTypes` (non-parseable values — must be resolved manually
  before its exit code can reach 0; dev had none) and **unresolved handles** from
  `backfillRatingUserIds` (dev has exactly one, a deleted test user's rating — prod orphans need a
  disposition: they cannot be backfilled, so delete the row or accept a permanently non-green check).
  Note: `checkMigrationState` does **NOT** cover V5 string-typed ratings — a green board here does
  not mean 2d is done; the V5 gate is 2d-(vi)'s count query.
- `[ ]` **Duplicate-ratings pre-check for 2e's unique index** (audit finding 2026-07-11; must
  return no rows — prod never had a uniqueness constraint, so historical double-submits or rename
  artifacts are plausible, and a duplicate `(userId, recipeId)` pair after 2c's backfill makes 2e's
  unique-index build throw E11000):
  ```js
  db.ratings.aggregate([
    { $group: { _id: { u: { $ifNull: ['$userId', { $toLower: '$username' }] }, r: '$recipeId' },
                n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ])
  ```
  Any hits: dedup the rows (keep the newest, per the upsert semantics) **before** running 2c/2e.
- `[ ]` **Note the Atlas snapshot timestamp** for `prepify-prod` (or take a manual backup) before any
  `--apply` below. This is the data-rollback point for the whole session.

---

## 2 — Prod data ops (idempotent, dry-run-first)

Every script: DRY RUN by default, writes only with `--apply`, second `--apply` is a no-op. Exit-code
gating (exit 2 = pending, so `$?` doubles as the gate) holds for `normalizeRatingTypes`,
`migrateLegacyRecipeIds`, and `checkMigrationState` ONLY — **`reconcileRatingAggregates` and
`backfillRatingUserIds` always exit 0 on a successful run even with drift/orphans remaining**
(audit finding 2026-07-11): gate those two on `checkMigrationState`'s board, never on `$?`. Both
also hardcode `client.db('prepify')` (they ignore `DB_NAME`) — fine iff the prod database is named
`prepify`; confirm that in the §1 snapshot before relying on them. Steps 2a–2c are safe **before**
the code deploy — verified this week that the *live* `release` code already uses the
`recipeIdQuery` shim on every recipe read/write, so converted ids keep resolving. Step 2d is the
one that must be **coupled to the deploy**.

### 2a — W1: legacy string `_id` → ObjectId (`migrateLegacyRecipeIds.js`)

Hex-preserving re-insert + delete in one transaction; `String(_id)` is byte-identical afterwards,
so `ratings.recipeId` / `reports.recipeId` / `userRecipeData` string refs never move.
*Dev rehearsal:* 8/8 converted (incl. the cautious `--id=` single-doc first run), post-apply
dry-run exits 0, `checkMigrationState` flipped green. **Dev is already converted** — no
"also convert dev" step this time.

- `[ ]` Dry run: `MONGO_URI='<PROD>' node server/scripts/migrateLegacyRecipeIds.js`
  — expect the same 8 recipes as dev; any `SKIP` line (non-hex / collision) is a stop-and-look.
- `[ ]` Cautious first apply: `… --apply --id=<one of the 8>`
- `[ ]` Full apply: `… --apply` → then re-run the dry run: **exit 0, 0 remaining**.
- ⚠️ The `recipeIdQuery` shim stays until step 6 (post-cutover PR). Never retire it in the same
  session as the migration.
- **Rollback:** none needed for code rollback (the shim tolerates both shapes forever). If the
  script itself misbehaves, restore the Atlas snapshot; don't hand-edit ids.

### 2b — §D: rating-aggregate `breakdown` backfill (`reconcileRatingAggregates.js`)

Until run, prod hides the per-star histogram and self-heals per-recipe on rating writes.
*(Dev done 2026-07-09 — 11 corrected.)*

- `[ ]` Dry run: `MONGO_URI='<PROD>' node server/scripts/reconcileRatingAggregates.js`
- `[ ]` Apply: `… --apply`, then `checkMigrationState.js` → aggregates 0 pending.
- **Rollback:** not applicable — it computes the aggregate the deployed code would compute anyway.

### 2c — D1: `backfillRatingUserIds.js`

- `[ ]` Apply: `MONGO_URI='<PROD>' node server/scripts/backfillRatingUserIds.js --apply`
- `[ ]` Decide the disposition of any **unresolved handles** it reports (see pre-flight): a
  username with no `usernames` doc belongs to a deleted account — the row is unreachable by any
  user; deleting it is the clean option. Record the decision.
- `[ ]` **Gate:** re-run `checkMigrationState.js` → `ratings missing userId` is 0 (or only the
  accepted orphans remain). The backfill script itself always exits 0 — its `$?` is NOT this gate.

### 2d — V5: rating-type cutover — **TWO HALVES, ONE STEP** ⚠️

The `ratings` collection must be single-typed for the New/Top sorts (`{reviewCreatedAt:-1}` /
`{rating:-1}`), because MongoDB sorts by BSON type before value. The two halves:

- **Data half:** `normalizeRatingTypes.js --apply` on prod (string `rating` → double, string
  `reviewCreatedAt` → number; `''` = "no review yet" is deliberately preserved).
- **Code half:** the parked **[DO NOT MERGE] PR #303** (`feat/v5-review-timestamp-flip`:
  `Date.now().toString()` → `Date.now()` in `newReview` + `editReview`, tests asserting
  `expect.any(Number)`, transitional `string | number` client types, API_CONTRACT update;
  opened 2026-07-11 against the dev-rehearsed tree — Jest 883/883, Vitest 735/2 skipped,
  both tsc gates clean).

**Why neither half ships alone:** migrate without the flip and the very next review written by the
(old) live code re-introduces a string — its doc type-blocks out of the New sort. Flip without
migrating and every new review is a number sorting against a string-typed legacy collection — all
new reviews type-block instead of interleaving. *Dev rehearsal:* 17 docs normalized, convergence
exit 0; a probe doc written in the flipped shape interleaved correctly by value on both sort pills.

The live prod code writes string timestamps until the deploy goes out, so the sequence closes that
window with an idempotent re-apply:

- `[ ]` (i) Dry run: `MONGO_URI='<PROD>' node server/scripts/normalizeRatingTypes.js` — resolve any
  GARBAGE lines first.
- `[ ]` (ii) Apply: `… --apply` → re-run dry: exit 0.
- `[ ]` (iii) Merge the **[DO NOT MERGE] V5 flip PR #303** into `development` (strip the label). Safe for
  dev immediately — dev's collection was normalized 2026-07-11.
- `[ ]` (iv) Proceed to the deploy (step 5) **in the same session**.
- `[ ]` (v) Immediately after the prod deploy is live: **re-run** `… --apply` to convert any review
  written into prod during the (ii)→(deploy) window. Idempotent; expect 0–few docs.
- `[ ]` (vi) **Verify:** the query below returns **0**, then post + edit a real review on prod
  (throwaway account) and confirm it *still* returns 0 and the review interleaves on both pills:
  ```js
  db.ratings.countDocuments({ $or: [
    { rating: { $type: 'string' } },
    { reviewCreatedAt: { $type: 'string', $ne: '' } },
  ] })
  ```
- **Rollback:** the migration is value-preserving (same numbers, new BSON type) — a *code* rollback
  to the pre-flip server simply resumes writing strings, which re-degrades the New sort to today's
  behavior but breaks nothing else; re-running `--apply` re-converges. Restore the snapshot only
  for data corruption, not for sort complaints.
- **Known residue (accepted):** legacy docs' `reviewLastUpdated` strings are *not* normalized (the
  script doesn't touch that field) and nothing sorts by it; post-flip writes make new ones numeric.
  Fold a `reviewLastUpdated` pass into the script later only if something starts reading it.

### 2e — Prod index provisioning (sweep finding, 2026-07-11) ⚠️

The D1 ratings index `{ userId: 1, recipeId: 1 }` (unique, partial) is provisioned two ways since
Wave 14 **#308** (merged 2026-07-11): `server/db.js` `ensureIndexes` at boot AND the manual script.
**But boot SWALLOWS a failed build** (logs and continues — deliberate, so a bad index can't stop
the server coming up), so #308 is NOT a safety net for the duplicate-rows case: if prod holds any
duplicate `(userId, recipeId)` pair after 2c, both paths fail the unique build with E11000 and the
server runs WITHOUT the invariant — `getSingleUserReviews` / account counts / every rating upsert
COLLSCANs prod and double-ratings become possible. This step is therefore a **HARD GATE before
step 5's deploy**, and the §1 duplicate pre-check is its input:

- `[ ]` `MONGO_URI='<PROD>' node server/scripts/createModerationIndexes.js` → **must exit 0**
  (the script, unlike boot, exits 1 when any index fails). An E11000 here = dedup the reported
  duplicate rows, re-run `backfillRatingUserIds.js --apply`, then re-run this script. Do NOT
  proceed to step 5 on a failed build.
- `[ ]` Verify: `db.ratings.getIndexes()` includes `userId_1_recipeId_1` (unique, partial).
- Note: the `username_1` index stays. Corrected twice now (audit 2026-07-11): #310 moved the
  *rename cascade* to `userId`, but three live queries still filter ratings by bare `username` —
  the admin user-list review tally (`admin.js:103`), admin user-detail `recentReviews`
  (`admin.js:~250`), and the reports legacy fallback (`reports.js:232-238`). The dropIndex seed
  stays parked until those migrate.

---

## 3 — Image infra ops — OPTIONAL for 1.0 (can be a 1.0.x)

Both shipped inert behind flags/fallbacks; 1.0 ships fine without them. **But the pieces are
coupled to the deploy** — see the matrix in IMAGE_PIPELINE.md "Ordering": the tightened
`storage.rules` (I2 + X3 delete-grant) and the uid-writing frontend must go live **together**.
Deploying the rules while prod still serves the old flat-writing frontend 403s every prod image
upload. So if doing these at 1.0: deploy rules in the same window as step 5's merge.

### 3a — I2: uid re-key (`storage.rules` deploy + object migration)

- `[ ]` `firebase use <prod-project>` (`prepify-9b974`) && `firebase deploy --only storage`
  — **in the same window as the step-5 deploy** (carries the X3 owner-delete grant automatically).
- `[ ]` **Acquire the prod service-account JSON first** (audit gap 2026-07-11): Firebase console →
  project `prepify-9b974` → Project settings → Service accounts → *Generate new private key*. This
  is a **different credential** from the `firebase use`/`firebase deploy` CLI login above — the CLI
  auth deploys the rules; the SA JSON is what the node script below authenticates with. Keep it out
  of the repo; pass it inline on the command line only.
- `[ ]` Object migration — **must run with the PROD service account.** The 2026-07-11 dev
  rehearsal proved this the hard way: **every flat object (12/12 on dev, and by construction all
  of prod's) lives in the `prepify-9b974.appspot.com` bucket, and the dev SA gets
  permission-denied on each** (12 FAILs, exit 1, zero writes — the per-object isolation and
  non-destructive posture held). So:
  ```bash
  MONGO_URI='<PROD>' FIREBASE_SERVICE_ACCOUNT='<PROD_SA_JSON>' \
    node server/scripts/migrateRecipeImagesToUid.js            # dry run
  …                                            --apply         # copy + repoint (old objects kept)
  ```
  Old flat objects stay in place (still readable) — reversible until a later `--delete-old` sweep.
- `[ ]` Optional dev parity: same command with prod SA + **dev** `MONGO_URI` (dev's images live in
  the prod bucket too).
- **Rollback:** redeploy the previous `storage.rules`; repointed recipes keep working either way
  (the old objects were not deleted).

### 3b — I1: responsive variants (Resize extension + flag)

- `[ ]` `firebase deploy --only extensions` on prod (Blaze plan; manifest is committed) → verify
  variant naming (`{uuid}_400x400.webp`, IMAGE_PIPELINE.md §2) → run the extension backfill.
- `[ ]` **Re-run the backfill after 3a's `--apply`** (moved originals need variants at the new path).
- `[ ]` Set `VITE_IMAGE_VARIANTS_ENABLED=true` in **Netlify Production** context only after
  variants exist; redeploy the client.
- **Rollback:** flip the flag back to `false` and redeploy — instant, extension can stay.

---

## 4 — The beta flip PR (code cutover)

One PR off `development` (all anchors re-verified 2026-07-11):

- `[ ]` `src/Components/Footer/shared/LegalBar.tsx:16` — `v{version}-beta` → `v{version}`.
- `[ ]` `src/Components/Navbar/PrepifyLogo.tsx:17-18` — remove the `beta-tag` button (decision
  2026-06-17: remove).
- `[ ]` `src/Components/ReleaseNotes/ReleaseNotes.tsx:15` — `isBeta` → `false`; `:14` — set
  `RELEASE_DATE` to the actual ship date (currently `'6/23/2026'`).
- `[ ]` `package.json` `"version": "2.6.3"` → `"1.0.0"` (flows to footer + release-notes chip via
  `VITE_APP_VERSION`, `vite.config.ts`).
- `[ ]` Gates green (`tsc` ×2 / Vitest / build) → PR → CI green **for the current head SHA** → merge.
- `[ ]` Grep gate: `grep -rn -iE "beta|isBeta" src` → only the `.beta-tag` SCSS class remains.
- `[ ]` **Dress rehearsal on the PR's Netlify deploy-preview** (non-prod, test users fine):
  run the smoke list from CUTOVER_RUNBOOK.md "Pre-flight smoke test" — flip correctness, home,
  browse, search, single recipe, auth, create/edit/delete with image, §D reviews flow, account +
  settings, legal/support, mobile 390px.
- `[ ]` **Draft-autosave live pass** (first real-browser check of #315's supersede flush — its
  unit coverage is complete but jsdom can't exercise `fetch(keepalive)` past teardown; #294's
  mechanism was live-verified, the supersede flag was not): type in Add-Recipe, hard-reload
  mid-debounce → draft persisted with the newest text; then a two-tab conflict → the conflict
  badge shows; then unload the stale tab → its flush wins (expected last-write-wins semantics).

---

## 5 — Deploy + verify

- `[ ]` Tag the GitHub Release `1.0.0`.
- `[ ]` Confirm Netlify **Production** context: `VITE_SENTRY_DSN` set; `VITE_IMAGE_VARIANTS_ENABLED`
  only if 3b ran.
- `[ ]` Confirm prod Railway `FRONTEND_URLS` = `https://prepifymeals.com,https://www.prepifymeals.com`
  **exactly** (sweep finding 2026-07-11: an unset/typo'd value silently CORS-blocks the entire prod
  frontend while `/health` stays green — the server falls back to localhost-only).
- `[ ]` **2e gate check:** the prod index build (2e) exited 0 and `userId_1_recipeId_1` is on
  `db.ratings.getIndexes()` — do not deploy on a swallowed boot-build being the first real attempt.
- `[ ]` **Merge `development` → `release`** (triggers prod Netlify + Railway). If doing step 3a,
  deploy the storage rules in this same window.
- `[ ]` **Verify CORS functionally after the deploy** (not just by eyeballing the dashboard):
  ```bash
  curl -si -H 'Origin: https://prepifymeals.com' \
    https://prepify-production-63a6.up.railway.app/health | grep -i access-control-allow-origin
  ```
  Must echo the prod origin; no header = `FRONTEND_URLS` misconfigured — fix before the smoke test.
- `[ ]` **V5 step 2d-(v)/(vi):** first confirm the Railway deploy is FULLY live and the old
  instance drained (a lingering old instance keeps writing string timestamps); then re-run prod
  `normalizeRatingTypes.js --apply`, run the verification query until it is *stably* 0, and
  post/edit/delete a throwaway review to confirm.
- `[ ]` **Production smoke test on `prepifymeals.com`** — run CUTOVER_RUNBOOK.md "Comprehensive
  production smoke test" verbatim (transport/cert, flip live, read paths + nutrition proxy, prod
  auth, create-with-image → confirms Storage rules + Vision moderation, §D histogram renders —
  which double-checks 2b actually ran, text moderation block, `/help` + bug-report → Resend email,
  Sentry event for release `1.0.0`, mobile device pass, **delete all throwaway content**).
- `[ ]` Watch Sentry/Railway logs for the first hours; keep the rollback at hand.
- **Rollback (code):** revert the `development`→`release` merge (or redeploy the prior `release`
  tip). Data steps deliberately don't need reversal for a code rollback — the shim tolerates
  converted ids, normalized ratings are value-identical, and old image objects were kept. **Never**
  retire the shim or `--delete-old` as part of an emergency.

---

## 6 — Post-cutover follow-ups (each its own PR/session)

- `[ ]` **Retire the `recipeIdQuery` shim** — only after 2a is applied **and** the converted-tolerant
  code is live (it already is, but retire = a fresh PR against the post-cutover tree).
- `[ ]` **Retire client `coerceRating`** (`src/api/recipes.ts`) + narrow `reviewCreatedAt` /
  `reviewLastUpdated` types (`string | number` → `number | ''`) — only after 2d verified on prod.
- `[ ]` **`--delete-old` image sweep** (3a) once everything renders from uid paths, then drop the
  legacy flat read rule from `storage.rules` (IMAGE_PIPELINE.md §3 "final tighten").
- `[ ]` Netlify Production context cleanup: remove dead `VITE_EDAMAM_*` + `VITE_INGREDIENT_PARSER_URL`
  (beta build was their last consumer).
- `[ ]` Rotate the exposed `Cluster0` `jesse` MongoDB password (old shared cluster; noted 2026-06-26).
- `[ ]` Relocate the `ingredients` / `ingredient_names` collections to the parser service's own DB
  (BACKLOG → Tech debt; they are LIVE parser data — never delete).
- `[ ]` Drop the `uuid` override in both `package.json`s once `@google-cloud/storage` ships a
  patched-uuid release (see CLAUDE.md note).
- `[ ]` Flip RELEASE_PLAN's cutover boxes + audit-log entry; mark this runbook done.
