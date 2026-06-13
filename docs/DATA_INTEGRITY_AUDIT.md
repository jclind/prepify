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

## D1 — `ratings` are keyed by `username`, not `uid` `[~]` **(root cause)**

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

**Touches:** `server/routes/reviews.js`, `server/routes/auth.js` (setUsername, deleteAccount,
exportMyData), `server/routes/publicProfile.js`, plus a one-off backfill migration script.

**Sequencing:** do this first — it shrinks D2 and D3.

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

## Recommended order

**D1 → D2 → D3.** D1 is the root cause; fixing it makes D2's cascade key consistent (`userId` /
`recipeId`) and removes one of D3's partial-failure modes (the rename propagation). D2 and D3 are
then smaller, self-contained passes.
