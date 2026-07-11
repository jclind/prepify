# Cutover rehearsal on dev — 2026-07-11 (overnight session)

Full dry-run → `--apply` → dry-run rehearsal of every owner-gated migration script against the
**dev** environment, run to de-risk the 1.0 cutover. Every command below ran with the checked-in
`server/.env`, whose targets were verified first:

- `MONGO_URI` host: `prepify-dev.qos9fvb.mongodb.net` (the `prepify-dev` cluster) ✅
- `FIREBASE_SERVICE_ACCOUNT` `project_id`: `prepify-dev-58579` ✅
- Frontend `VITE_FIREBASE_PROJECT_ID`: `prepify-dev-58579` ✅

No prod system was touched. Consumed by [`../RELEASE_RUNBOOK.md`](../RELEASE_RUNBOOK.md).

## Baseline

`node server/scripts/checkMigrationState.js` (read-only) before any run:

| check | pending |
|---|---|
| recipes with legacy string `_id` | **8** |
| ratings docs missing stable `userId` | **1** |
| review reports missing `reportedUid` | 0 |
| recipes missing rating aggregate | 0 |

## V5 — `normalizeRatingTypes.js` (rating/reviewCreatedAt string→number)

| step | command | result | exit |
|---|---|---|---|
| dry run | `node server/scripts/normalizeRatingTypes.js` | 21 scanned, **17 would rewrite** (8 rating string→double, 15 reviewCreatedAt string→num), 0 garbage | 2 |
| apply | `… --apply` | **17 rewritten**, `string-typed docs remaining: 0` | 0 |
| dry run again | `node server/scripts/normalizeRatingTypes.js` | 21 scanned, 21 in sync, 0 to rewrite | **0** |

**Idempotency/convergence proven.** No garbage (non-parseable) values in the dev collection — on prod,
any GARBAGE lines keep the exit code at 2 and need manual resolution before the cutover gate passes.

### Mixed pre/post-flip sort verification (dev)

A probe doc shaped exactly like the **flipped** `newReview` write (double `rating: 3.5`, **numeric**
`reviewCreatedAt` chosen *between* two existing values) was inserted into `ratings` for recipe
`6408d2495491ab77fb7780b0` (7 visible reviews), the exact `getReviews` queries were run, and the
probe was deleted:

- **New** (`{ reviewCreatedAt: -1 }`): all 8 values monotonic by value; probe interleaved at index 6
  (not a type block at either extreme). ✅
- **Top** (`{ rating: -1 }`): `5,5,5,5,4,→3.5←,2,1` — monotonic; probe interleaved at index 5. ✅

So after normalization, docs written by the flipped write path sort correctly by value alongside
normalized legacy docs on both sort pills.

### Write-path flip half

**PR #303** (`feat/v5-review-timestamp-flip`, titled **[DO NOT MERGE]** — see the runbook's V5
step): `Date.now().toString()` → `Date.now()` at both write sites (`POST /newReview`,
`editReview`), write-path tests strengthened to `expect.any(Number)`, transitional
`string | number` client types + `formatDate` widening, API_CONTRACT updated. Gates against the
branch: server Jest **883/883**, client Vitest **735 passed / 2 skipped**, `tsc` main + tests
configs clean. `''` sentinels ("no review yet") deliberately preserved — `normalizeRatingTypes.js`
skips them by design.

## W1 — `migrateLegacyRecipeIds.js` (string `_id` → ObjectId, hex-preserving)

| step | command | result | exit |
|---|---|---|---|
| dry run | `node server/scripts/migrateLegacyRecipeIds.js` | **8 legacy docs, all 8 plan as clean converts** (0 non-hex, 0 collisions); per-recipe ref counts printed (e.g. Tuscan Chicken Skillet: ratings 11, reports 3, userRecipeData 7) | 2 |
| targeted apply | `… --apply --id=63fe34ad3d057633b6e2970e` | 1 converted ("Yogurt and Fruit Parfaits"), 7 remaining | 2 |
| full apply | `… --apply` | 7 converted, `string _ids remaining: 0` | 0 |
| dry run again | `node server/scripts/migrateLegacyRecipeIds.js` | 0 legacy docs | **0** |

**Idempotency/convergence proven**, and the cautious `--apply --id=<one>` first-run path works as
documented. `checkMigrationState.js` re-run: legacy-`_id` check flipped to ✓ 0 pending.
**Dev is now converted** — the cutover's "also convert dev" box is already done.

## I2 — `migrateRecipeImagesToUid.js` (flat → `recipeImages/{uid}/{uuid}`)

| step | command | result | exit |
|---|---|---|---|
| dry run | `node server/scripts/migrateRecipeImagesToUid.js` | 16 scanned: **12 would migrate, 4 already uid-scoped**, 0 non-Storage; owner uid resolved for all 12 | 0 |
| apply | `… --apply` | **12 FAIL / 0 migrated**: every flat object lives in the legacy **prod** bucket `prepify-9b974.appspot.com`, and the dev service account gets `storage.objects.get` **permission denied** on each. Per-object isolation held: the run completed, no Mongo writes happened, recipes still point at their old (rendering) URLs | 1 |

**This is the documented mixed-bucket case (IMAGE_PIPELINE.md), not a bug** — and it is the decisive
rehearsal finding: **the I2 `--apply` must run with the PROD `FIREBASE_SERVICE_ACCOUNT`** (the
`prepify-9b974` project's SA owns that bucket), regardless of which Mongo it points at. Corollary:
dev's own catalog can only be image-migrated by a prod-SA + dev-Mongo run (optional dev-parity step).
Idempotency of the skip path is demonstrated by the 4 `already uid-scoped` docs. The failure mode is
non-destructive by design.

## D1 — `backfillRatingUserIds.js` (bonus: it gates `checkMigrationState`)

| step | command | result | exit |
|---|---|---|---|
| dry run | `node server/scripts/backfillRatingUserIds.js` | 1 missing-field doc, **0 updatable, 1 unresolved handle**: `"settings_test_edit"` | 0 |

The one pending doc is dev-only test residue (rating `_id 6a2dc32a9c54d628353cb079`, created
2026-06-13 by an automated settings-rename test whose user no longer exists in `usernames`). It
cannot be backfilled and was deliberately left for the owner. **Prod must be checked for its own
orphans at cutover** — orphaned handles keep `checkMigrationState` non-green and want a
disposition (backfill impossible → delete or accept).

## End state of dev after the rehearsal

`checkMigrationState.js`: legacy-`_id` ✓ 0 · aggregates ✓ 0 · reportedUid ✓ 0 ·
ratings-missing-`userId` ✗ 1 (the orphan above, owner-disposition). `ratings` is single-typed
(V5 verification query returns 0). Recipe images still flat/prod-bucket (blocked on prod SA, by design).
