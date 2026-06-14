# Prepify — Data Integrity Audit

> **Scope:** data-model / referential-integrity issues, distinct from the security audit
> (`docs/SECURITY_AUDIT_2026-06-11.md`) and the historical error-handling audit
> (`docs/server-audit.md`). These are correctness problems in how documents reference each
> other across collections — orphaned rows, denormalized fields that drift, and multi-collection
> writes that aren't atomic.
>
> Surfaced while building the settings overhaul (delete-account cascade + username rename). The
> settings work shipped tactical fixes (username rename now propagates to `ratings`/`reports`);
> this doc tracks the underlying root causes that deserve a dedicated pass.

## Status legend

- `[ ]` open · `[~]` partially addressed · `[x]` done

---

## D1 — `ratings` are keyed by `username`, not `uid` `[x]` **(root cause)**

**What:** Review/rating documents in the `ratings` collection identify their author by a
denormalized `username` string (e.g. `{ username: 'jesse', recipeId, rating, reviewText }`), not
by the stable Firebase `uid`. `reports` likewise snapshot `reportedUsername`. Because a username
is mutable, every rename risks detaching a user from their own reviews, their public review list,
and the moderation queue.

**Impact:**
- A username change orphaned all of that user's existing reviews until patched (see below).
- The delete-account cascade has to resolve `username` first and delete `ratings` by it — fragile
  if the username doc is already gone.
- Any future feature that joins reviews → user (notifications, author profiles) has to round-trip
  through `usernames` instead of joining on `uid`.

**Already mitigated (tactical, in the settings branch):**
- `POST /setUsername` now propagates a rename: `ratings.username` and `reports.reportedUsername`
  are `updateMany`'d from the old handle to the new one (`server/routes/auth.js`, the
  `prevUsername` block). Covered by the `rename propagation` tests in
  `server/__tests__/auth.test.js`.

**Proper fix:** add a stable `userId` field to `ratings` (and `reports`), backfill it from
`usernames` (`username_lower → _id`), switch all reads/writes to key on `userId`, and treat
`username` as a denormalized display field refreshed at read time (or dropped in favour of a join).
Then the rename propagation and the username-based delete cascade both become unnecessary.

**Done (PR: D1):**
- `ratings` now carry the author's stable `userId`; every author-facing write/read keys on it —
  `addRating` / `newReview` / `editReview` / `deleteReview` / `checkIfReviewed` match `{ userId,
  recipeId }`, `getReviews` derives `isCurrentUser` from a direct uid match, and
  `getSingleUserReviews` resolves the public handle → uid then queries on `userId`
  (`server/routes/reviews.js`). `username` stays on each doc purely as a denormalized display field.
- `getAccountCountsFor`, `GET /exportMyData`, and the `POST /deleteAccount` ratings delete all key
  on `userId` now (no username round-trip; robust even if the `usernames` doc is already gone).
- `reports` review documents snapshot a stable `reportedUid` at creation time
  (`server/routes/reports.js`); `reportedUsername` remains the denormalized display handle.
- One-off backfill: `server/scripts/backfillRatingUserIds.js` — dry-run by default (`--apply` to
  write), maps `username_lower → _id`, stamps `ratings.userId` + `reports.reportedUid`, lists
  unresolved handles (orphans). Idempotent (only touches docs missing the field).
- Index: `ratings { userId: 1, recipeId: 1 }` added to `server/scripts/createModerationIndexes.js`
  to back the new point lookups and uid-prefix scans.
- Regression tests: `reviews.test.js` "D1: review identity keyed on userId" (edit/upsert/flag still
  work when the stored handle is stale, i.e. post-rename), `reports.test.js` reportedUid stamping.

**Deploy ordering:** new writes already stamp `userId`, so run the backfill at deploy time to close
the brief window where a legacy username-only `ratings` doc could be double-written. Run
`createModerationIndexes.js` for the new ratings index.

**Deferred (residual):** the admin review-moderation endpoint and the reports queue still *reference*
a review by its denormalized `(username, recipeId)` / `reportedUsername`, so `POST /setUsername` keeps
its rename propagation to keep those display handles fresh — identity is now uid-stable regardless, so
this is a display concern, not a correctness one. Fully dropping propagation would mean moving the
moderation/queue lookups to `reportedUid` too.

**Touches:** `server/routes/reviews.js`, `server/routes/auth.js` (deleteAccount, exportMyData),
`server/routes/reports.js`, `server/routes/publicProfile.js`, `server/util/accountCounts.js`, plus
the one-off backfill migration script.

**Sequencing:** done first — it shrinks D2 and D3.

---

## D2 — Deleting a recipe orphans other users' ratings of it `[ ]`

**What:** `ratings` are keyed by `recipeId`. Deleting a recipe (via delete-recipe, or as part of
the delete-account cascade which removes the user's `recipes`) does **not** remove other users'
ratings/reviews of those recipes. Those rows survive pointing at a `recipeId` that no longer exists.

**Impact:** orphaned `ratings` accumulate; `getSingleUserReviews?returnRecipeData=true` already has
to null-guard missing recipes (noted in `docs/server-audit.md`); aggregate counts (rating averages,
review totals) can reference dead recipes.

**Fix:** when a recipe is deleted, cascade-delete its `ratings` by `recipeId` (in both the
delete-recipe path and the delete-account cascade). Alternatively a periodic sweep that removes
`ratings` whose `recipeId` has no matching `recipes` doc. Add a regression test asserting no
orphans remain after a recipe delete.

**Touches:** `server/routes/recipes.js` (deleteRecipe), `server/routes/auth.js` (deleteAccount
cascade).

---

## D3 — Multi-collection writes are not atomic `[ ]`

**What:** Several flows mutate several collections in sequence with no transaction:
- `POST /deleteAccount` deletes across `usernames`, `userProfiles`, `users`, `userRecipeData`,
  `recipes`, `recipeDrafts`, `ratings`, then `admin.auth().deleteUser` last.
- `POST /setUsername` writes `usernames`, then `updateMany`s `ratings` + `reports`.

A failure partway through leaves partial state — e.g. a username renamed in `usernames` but the
`ratings` update not yet applied (exactly the D1 bug, re-introduced on a partial failure), or an
account half-deleted.

**Impact:** rare in practice, but the failure modes are silent inconsistency rather than a clean
error. The delete cascade's Mongo-first / Firebase-last ordering is deliberate and correct (a
partial failure leaves the login recoverable to retry) — this item is specifically about the
*Mongo-side* steps not being atomic with each other.

**Fix:** wrap each multi-collection write in a MongoDB transaction (the deployment is a replica set
— `MongoMemoryReplSet` in the Jest setup confirms transactions are available), or make each step
idempotent so the whole operation is safely retryable. Prefer transactions for the delete cascade;
idempotency is enough for the rename.

**Touches:** `server/routes/auth.js` (deleteAccount, setUsername), `server/db.js` (a
`withTransaction` helper).

---

## D4 — delete-account deletes a user's reviews without recomputing the recipes' rating aggregates `[ ]`

**What:** `POST /deleteAccount` runs `ratings.deleteMany({ username })`
(`server/routes/auth.js`), removing the departing user's reviews from recipes that *other* users
still own. Recipes carry a denormalized rating average + count maintained by `recomputeRecipeRating`
(`server/util/recipeRating.js`), which every `reviews` mutation calls (`server/routes/reviews.js`,
add / edit / delete). The bulk delete skips the recompute, so each affected recipe keeps an
average/total that still counts the now-deleted review.

**Impact:** silent rating drift on surviving recipes — a recipe's displayed average and review count
stay inflated until the next add/edit/delete on *that* recipe happens to trigger a recompute. The
more reviews the departing user left, the more recipes drift.

**Fix:** before the bulk delete, collect the distinct `recipeId`s from the user's `ratings`; delete;
then `recomputeRecipeRating(db, recipeId)` for each — skipping recipes that the cascade itself
deleted because the user authored them (no point recomputing a deleted recipe). Batchable. Add a
regression test: a recipe reviewed by two users shows the correct average after one of them deletes
their account.

**Touches:** `server/routes/auth.js` (deleteAccount); reuses `server/util/recipeRating.js`.

---

## D5 — account-delete leaves Firebase Storage objects orphaned (recipe images + profile photo) `[ ]`

**What:** `DELETE /deleteRecipe` correctly calls `deleteRecipeImage(recipe.recipeImage)` after its
transaction (`server/routes/recipes.js:342`). The delete-account cascade does **not** — it
`recipes.deleteMany({ userId })` and never touches Storage. The user's **profile photo**
(`profilePhotos/{uid}`, written by `AuthContext.updateProfileData`) is likewise never deleted by the
cascade.

**Impact:** every deleted account leaves its recipe images and avatar blob in Storage indefinitely —
unreferenced files that still cost storage and stay publicly fetchable by URL if one was cached or
shared.

**Fix:** in the cascade, *read* the user's recipes (`find({ userId }).toArray()`) before deleting
the docs and best-effort `deleteRecipeImage(r.recipeImage)` each; also best-effort-delete
`profilePhotos/{uid}`. Keep it best-effort / never-throw (same posture as `recordAudit` and the
existing `deleteRecipeImage` — an orphaned blob beats a failed account delete). The profile photo is
keyed by path, not a download URL, so it needs a small delete-by-path helper alongside the existing
URL-parsing one.

**Touches:** `server/routes/auth.js` (deleteAccount); `server/util/firebaseStorage.js` (add a
delete-by-path helper).

---

## D6 — the delete-account cascade re-implements recipe teardown instead of reusing the thorough one `[ ]` **(unifies D2 / D5 for the account path)**

**What:** `DELETE /deleteRecipe` already does a complete, atomic per-recipe teardown
(`server/routes/recipes.js:319`): delete the recipe, `ratings.deleteMany({ recipeId })`, `$pull` the
`recipeId` out of every user's `savedRecipes` / `madeRecipes` / `userRecipes`, then delete the image
— all in a transaction. The delete-account cascade ignores every bit of that and just
`recipes.deleteMany({ userId })`. So for the departing user's recipes: other users' reviews of them
orphan (the account-path half of **D2**), other users' saved/made references dangle, and images leak
(**D5**). Separately, reports the user *filed* (`reports.reporterUid`, `server/routes/reports.js`)
are never removed by the cascade at all.

**Impact:** dangling `savedRecipes` entries on other users (a saved card that 404s), orphaned
`ratings` (D2), leaked Storage objects (D5), and stale moderation reports authored by a user who no
longer exists.

**Fix:** factor the per-recipe teardown out of `DELETE /deleteRecipe` into a shared
`teardownRecipe(db, recipe, session)` and call it for each of the user's recipes inside the cascade,
so the two paths can't drift. Then decide reporter cleanup: `reports.deleteMany({ reporterUid: uid })`
if the filed reports are disposable, or anonymize `reporterUid` if the moderation queue needs the
history. Pairs naturally with D3 (wrap the whole thing in one transaction).

**Touches:** `server/routes/recipes.js` (extract `teardownRecipe`); `server/routes/auth.js`
(deleteAccount); `server/routes/reports.js` (reporter-cleanup decision).

---

## Recommended order

**D1 → {D2, D4, D5, D6} → D3.** D1 is the root cause; fixing it makes the cascade key consistent
(`userId` / `recipeId`) and removes one of D3's partial-failure modes (the rename propagation).

D2, D4, D5 and D6 are really one piece of work — *rewrite the delete-account cascade to reuse the
recipe teardown that `DELETE /deleteRecipe` already has* (covers D2's account half + D5's recipe
images + D6's dangling saves), plus add the reviewer-side recompute (D4) and the profile-photo +
reporter cleanup. Do them in a single pass over `deleteAccount`.

D3 (wrapping the multi-collection writes in a transaction) comes last and makes the whole cascade
atomic — best done once the cascade's *contents* are settled.
