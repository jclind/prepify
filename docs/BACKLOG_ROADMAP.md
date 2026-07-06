# Backlog — Delivery roadmap & "what can run in parallel?"

A parallelism-aware plan for burning down the open items in [`BACKLOG.md`](./BACKLOG.md), grouped into
**waves** by collision surface so independent work can run in separate worktrees without stepping on each
other, and genuinely-shared files serialize instead of merge-conflicting.

Modelled on [`sweeps/ROADMAP.md`](./sweeps/ROADMAP.md) (the same Board / Waves / Status-log pattern, applied
to the *sweep program*); this file applies it to the **general backlog**. Companion to
[`BACKLOG.md`](./BACKLOG.md) (the item write-ups) and [`RELEASE_PLAN.md`](./RELEASE_PLAN.md) (the launch gate).

> **Verification pass 2026-07-03.** Every open (`[ ]`/`[~]`) BACKLOG item was re-checked against the current
> tree before being placed on a wave. Three came back **STALE** and are pulled off the board (see
> [Stale reconciliations](#stale-reconciliations--update-backlogmd)); a couple had line/detail drift noted inline.

---

## How to use this doc (the continue-protocol)

If you're Claude Code and were pointed here to "pick up the backlog," do exactly this:

1. **Read the [Board](#board).** The active wave is the lowest-numbered wave not yet fully `[x]`, but Waves 1–3
   are largely independent — you don't have to finish Wave 1 to start a non-colliding Wave 2/3 lane.
2. **Pick a track** whose status is `[ ]` and whose **Domain (collision surface)** doesn't overlap any `[~]`/`[P]`
   track already in flight — check the [Parallelism rules](#parallelism-rules) first. A track marked
   **⚠ chokepoint / solo** may have only one worktree in flight at a time.
3. **Claim it.** `/worktree-create <track> — <goal>`, set the track's Board status to `[~]` with your branch +
   today's date, and **commit that claim first** so a concurrent session sees the lane is taken.
4. **Do the work.** Keep the gates green: `npx tsc --noEmit`, `npm test` (Vitest), `npm run build`; and
   `cd server && npm test` (Jest) for any `server/` change. Don't touch the **beta tag** (Phase-5 cutover).
5. **On PR open** flip to `[P]`; **on merge** flip to `[x]`, append a [Status log](#status-log) entry, and tick
   the item's box in [`BACKLOG.md`](./BACKLOG.md).
6. **Merge hygiene for parallel worktrees:** edit only your own track's row (distinct lines auto-merge) and keep
   the Status log append-only at the bottom.

Running several lanes at once? The `sweeps/ROADMAP.md`
[tmux recipe](./sweeps/ROADMAP.md#running-it-in-parallel-tmux-one-session-per-worktree) applies verbatim —
one Claude session per tmux window, one worktree each, on free ports (never 3000/4000).

---

## Collision-surface map (why the waves are shaped this way)

The waves fall out of which files each item touches. A handful of files are **chokepoints** — several items
want them, so those items must serialize into one lane:

| Chokepoint file | Items that touch it | Lane |
|---|---|---|
| `server/routes/auth.js` | data-export bodies · `updatePrivacy` limiter · `deleteAccount` recompute | **S2** |
| `server/routes/reviews.js` | ratings Load-More count · admin-takedown username→userId | **S3** |
| `server/routes/recipes.js` | `save` TOCTOU · numeric validation · autocomplete fuzzy index | **S1** (+ I3 later) |
| `src/pages/AddRecipe/**` | TimeInput bug · dropdown uniformity · summary bar · group labels · `noindex` · selector/updateIngredients tests | **C1** (⇢ subsumed by R1) |
| `Navbar/DesktopBar.tsx` | `/recipes` route const · `accountTabs` route source | **C2** |
| `SingleRecipe.tsx` | CLS controls reserve · JSON-LD escaping · hero `srcset` | **C3** |
| `SearchRecipesInput.tsx` | autocomplete footer label · press-`/` focus | **C4** |
| `helpers.scss` + component `.scss` | focus-ring token group + ~13 literal rings | **C5** ⚠ SCSS loner |

Everything **not** in that table touches a file no other open item wants — those are the free-to-parallelize
tracks (Waves 1–2's isolated lanes).

---

## Board

Status: `[ ]` not started · `[~]` in a worktree · `[P]` PR open · `[x]` merged · `[blocked]` waiting on a decision · `[dropped]` off the board.

| Wave | Track | Backlog items covered | Status | Domain (collision surface) | Notes / deps |
|---|---|---|---|---|---|
| **1** | **S1 · recipes.js write-safety** | `save` TOCTOU (`recipes.js:778-801`); numeric/array bounds in `recipeLimits.js` | `[x]` [#228](https://github.com/jclind/prepify/pull/228) (2026-07-04) | `server/routes/recipes.js`, `server/util/recipeLimits.js` | **merged** — unblocks **I3** |
| **1** | **S2 · auth.js account routes** | data-export saved-recipe bodies (`:355`); `updatePrivacy` writeLimiter (`:310`); harden `deleteAccount` recompute (`:454-461`) | `[x]` [#229](https://github.com/jclind/prepify/pull/229) (2026-07-05) | `server/routes/auth.js` | **merged** — recompute pairs with **S6** |
| **1** | **S3 · reviews.js correctness** | ratings Load-More count (`:281-308`); admin-takedown username→userId (`:318-353`) | `[x]` [#231](https://github.com/jclind/prepify/pull/231) (2026-07-05) | `server/routes/reviews.js` | **merged** |
| **1** | **S4 · rate-limit breadth** | reports per-uid limiter (`reports.js:69`); `acknowledgeAchievements` limiter (`gamification.js:31`) | `[x]` [#230](https://github.com/jclind/prepify/pull/230) (2026-07-06) | `server/routes/reports.js`, `server/routes/gamification.js` | **merged** — also folded in the `reports.js` review-preview userId fix (S3 twin) |
| **1** | **S5 · asyncHandler consistency** | `nutrition.js` `/details` + `ingredients.js` `/parse` bare async → wrapper | `[x]` [#232](https://github.com/jclind/prepify/pull/232) (2026-07-06) | `server/routes/nutrition.js`, `ingredients.js` | **merged** |
| **1** | **S6 · rating-aggregate ops** | one-off reconciliation script; post-6-phase DB check | `[x]` [#233](https://github.com/jclind/prepify/pull/233) (2026-07-06) | `server/scripts/` (+ ops run) | **merged** — new files; pairs w/ S2 |
| **1** | **S7 · firebase-admin@14 bump** | 8 moderate transitive CVEs (breaking major, on `^13.8.0`) | `[x]` [#234](https://github.com/jclind/prepify/pull/234) (2026-07-06) | `server/package.json` + lockfile (+ root/`cypress.config.ts`) | **merged** — folded in the root/cypress Admin bump so audit=0 in **both** trees |
| **2** | **F1 · TimeInput NaN bug** | edit/draft-resume blank prep/cook time (`TimeInput.tsx:23-27` + `AddRecipe.tsx:86-91,160-161`) | `[P]` [#235](https://github.com/jclind/prepify/pull/235) `worktree-feat+f1-timeinput-nan` 2026-07-06 | `TimeInput.tsx` + `AddRecipe.tsx` | ⚠ first claim on AddRecipe.tsx — do before/inside **C1** |
| **2** | **F2 · AuthContext memo** | `value` object recreated every render → wrap in `useMemo` | `[~]` `worktree-feat+f2-authcontext-memo` 2026-07-06 | `src/context/AuthContext.tsx` | — |
| **2** | **F3 · Saved-tab memo** | `refreshAfterMutation` not `useCallback`'d → defeats `React.memo(RecipeCard)` (`SavedRecipes.tsx:133-136,372`) | `[ ]` | `SavedRecipes.tsx` | one line |
| **2** | **F4 · change-password subhead** | redundant `<h3 class='sr-subhead'>` (`AccountSection.tsx:188`) | `[ ]` | `Settings/sections/AccountSection.tsx` | — |
| **2** | **F5 · housekeeping one-liners** | brand-asset comment (`generate-brand-assets.mjs:6`); CLAUDE.md RecipeContext drift; rename `validateIngredientQuantityStr`→`formatQuantity` (3 imports) | `[ ]` | `scripts/`, `CLAUDE.md`, `src/util/` | rename touches 3 call sites |
| **2** | **F6 · account nav polish** | Saved/Ratings section-nav styling (`SegmentedNav.tsx`) | `[ ]` | `Account/components/SegmentedNav.tsx` | subjective; better inside **R2** |
| **3** | **C1 · AddRecipe cluster** ⚠ lane | dropdown/`FormInput` uniformity (`recipeSelectStyles.ts`); summary-bar sticky; group-label styling; `/add-recipe` `noindex`; Cuisine/MealType selector unit tests; `updateIngredients` test + dead-code | `[ ]` | `src/pages/AddRecipe/**`, `src/test/` | ⚠ **subsumed by R1** — decide refactor-vs-smalls first |
| **3** | **C2 · route-constant single-sourcing** | `RECIPES_PATH` const (`DesktopBar:45`,`NavMenu:20`,`Recipes.tsx:113-119`); `browseAll`→`clearFilters`; `accountTabs` as app-wide route source (`DesktopAccountMenu:74`,`footerData:43-44`,`DraftResumeBanner:47`) + `activeAccountTab` helper | `[ ]` | Navbar/* + `Recipes.tsx` + `accountTabs.tsx` + `footerData.ts` + `DraftResumeBanner.tsx` | both share DesktopBar → one lane |
| **3** | **C3 · SingleRecipe lane** ⚠ lane | CLS controls-block reserve (`SingleRecipe.tsx:308-317`, `RecipeControls.scss`); JSON-LD `</script>` escaping (`buildRecipeJsonLd.ts:38-39`) | `[ ]` | `SingleRecipe.tsx`, `RecipeControls.scss`, `buildRecipeJsonLd.ts` | hero `srcset` deferred to **I1**; JSON-LD gates with prerender |
| **3** | **C4 · SearchRecipesInput lane** | autocomplete footer-label debounce disagreement (`:274` vs `:336`); press-`/` global focus-search feature | `[ ]` | `SearchRecipesInput.tsx` (+ Layout for key handler) | both touch same file → one lane |
| **3** | **C5 · focus-ring tokens** ⚠ SCSS loner | `$focus-ring-*` group in `helpers.scss` + migrate ~13 literal `0 0 0 3px` rings | `[ ]` | `helpers.scss` + ~9 component `.scss` | only one SCSS-token worktree at a time |
| **4** | **I1 · image resize pipeline** | Storage width variants + `srcset`/`sizes` on card + hero (mobile LCP) | `[ ]` | Storage pipeline/CDN + `RecipeCard.tsx`, `SingleRecipe.tsx` hero | structural; unblocks C3 hero srcset |
| **4** | **I2 · uid-key recipe images** | re-key `recipeImages/{uid}/{uuid}` (`src/api/recipes.ts:188`) + tighten `storage.rules:27-32` to owner | `[ ]` | `src/api/recipes.ts`, `storage.rules` | pairs w/ I1; migrate existing objects |
| **4** | **I3 · autocomplete title index** | Mongo text index / Atlas Search for fuzzy fallback (`recipes.js:194-240`) | `[ ]` | `server/routes/recipes.js` | ⚠ after **S1**; low urgency/scalability |
| **5** | **R0 · Claude conventions doc** | code & architecture standard (`CONVENTIONS.md`/CLAUDE.md) | `[ ]` | new doc | do **before** R1/R2 |
| **5** | **R1 · refactor create-recipe page** | the big AddRecipe refactor | `[ ]` | `src/pages/AddRecipe/**` | **subsumes C1** |
| **5** | **R2 · refactor account page** | the big Account refactor | `[ ]` | `src/pages/Account/**` | **subsumes F6**; overlaps C2 |
| **—** | **Deferred / post-1.0 / owner** | see [that section](#deferred--post-10--owner-off-the-active-board) | `[blocked]`/`[dropped]` | — | prerendering, Edamam, theming, brand-orange, DB relocation, ideas |

---

## Parallelism rules

1. **One worktree per chokepoint file.** The rows marked **⚠ lane** (C1 AddRecipe, C3 SingleRecipe) and the
   **SCSS loner** (C5 `helpers.scss`) may each have only one worktree in flight — mirrors the sweeps' "one
   `2-scss` lane at a time." Their *internal* items are done sequentially inside that one worktree.
2. **The SCSS token file (`helpers.scss`) is the global chokepoint.** Only **C5** touches it now, but if any
   future token track spins up, it shares this lane. One SCSS-token worktree at a time, always.
3. **Server route files don't overlap across S-tracks — but each S-track owns its file exclusively.** S1/S2/S3
   are disjoint (`recipes.js`/`auth.js`/`reviews.js`) so they parallelize freely; **I3 must wait for S1** to
   merge (both edit `recipes.js`) then rebase.
4. **`AddRecipe.tsx` is contended between F1 and C1/R1.** F1 (TimeInput bug) is a small surgical fix but edits
   `AddRecipe.tsx` (2 lines) + `TimeInput.tsx`. Either ship F1 **first and standalone** and rebase the AddRecipe
   lane onto it, or fold F1 in as the AddRecipe lane's first commit. Don't run F1 and C1 in separate worktrees
   simultaneously.
5. **Decide refactor-vs-smalls before spending on C1/F6.** R1 (create-recipe refactor) subsumes the whole C1
   cluster; R2 (account refactor) subsumes F6 and overlaps C2's account-route work. If the refactors are
   imminent, skip the small polish and let the refactor absorb them; if the refactors are far off, ship the
   smalls now — but don't do both.
6. **JSON-LD escaping (C3) and social prerendering (deferred) ship together.** The `</script>` escaping is
   *latent* (harmless in today's CSR) but becomes a real injection vector the moment SSR/prerender lands. If
   prerendering gets scheduled, escaping is no longer optional — pull it into that PR.
7. **Concurrency budget ≈ 2–4 worktrees** for one reviewer. A clean kickoff today: **S1 + S2 + S3** (three
   disjoint server files) or **F2 + F3 + F4 + F5** (four disjoint isolated frontend files).

**A clean parallel kickoff today:** the three server correctness/security lanes **S1 + S2 + S3** in three
worktrees — disjoint route files, all small hardening, all backed by Jest. Add **S5** (trivial) or an isolated
**F2/F3/F4** if you have a fourth window.

---

## The waves

### Wave 1 — Server correctness & security tail (run now, ~3–4 parallel worktrees)
The security-sweep tail plus two correctness bugs, all in `server/`. Disjoint route files → parallelize. All are
small, verified-still-present hardening changes with existing Jest coverage to extend.
- **S1** `recipes.js` — make `save` an atomic array-condition update (kill the TOCTOU double-count, same shape
  as the already-fixed `madeRecipe`); add numeric type+range clamps + per-element caps in `recipeLimits.js`.
- **S2** `auth.js` — hydrate `exportMyData` saved recipes into full bodies; add `profileWriteLimiter` to
  `updatePrivacy`; make the `deleteAccount` recompute non-silent (alert/retry, not just `console.error`).
- **S3** `reviews.js` — count Load-More *after* the visibility filter (or `$lookup`-exclude hidden before the
  count); resolve username→userId in the admin takedown match.
- **S4** rate-limit breadth — per-uid limiter on `POST /reports`; `profileWriteLimiter` on `acknowledgeAchievements`.
- **S5** asyncHandler consistency — wrap `nutrition.js`/`ingredients.js` like every other route.
- **S6** rating-aggregate ops — the one-pass `recomputeRecipeRating` reconciliation script + the post-6-phase DB check.
- **S7** `firebase-admin@14` — breaking major; isolate in its own worktree with a full server regression pass.

### Wave 2 — Frontend isolated quick wins (parallel, disjoint files)
One-file fixes that collide with nothing. Grab any free window.
- **F1** the TimeInput hydration NaN bug (highest-value here — looks like data loss on edit/draft-resume; see rule 4).
- **F2** `useMemo` the AuthContext value · **F3** `useCallback` the Saved-tab refresh · **F4** drop the
  change-password subhead · **F5** the three housekeeping one-liners · **F6** account-nav polish (or defer to R2).

### Wave 3 — Frontend chokepoint lanes (lanes parallel; each internally serial)
The multi-item clusters that share a file. Each lane is one worktree; the lanes' domains are disjoint so they run
alongside each other and Wave 1/2.
- **C1** the AddRecipe cluster (⚠ subsumed by R1 — resolve rule 5 first).
- **C2** route-constant single-sourcing (the two "hardcoded route string" items collapse into one extraction).
- **C3** SingleRecipe: reserve the controls-block height (CLS) + escape the JSON-LD; hero `srcset` waits for I1.
- **C4** SearchRecipesInput: fix the footer-label debounce + add press-`/` focus.
- **C5** focus-ring token group (the SCSS loner) — also reconcile the "remaining hardcoded values" backlog item,
  now essentially just focus rings.

### Wave 4 — Image pipeline & scalability (structural; needs an infra call)
Bigger, deferred-until-needed work.
- **I1** the Storage resize/`srcset` pipeline (the biggest remaining mobile-LCP lever after code-splitting) —
  unblocks C3's and RecipeCard's `srcset`.
- **I2** uid-key recipe images + owner-scoped `storage.rules` (pairs with I1; plan the migration of existing objects).
- **I3** the autocomplete fuzzy-fallback title index (after S1; low urgency at today's catalog size).

### Wave 5 — Big refactors & conventions (owner-scoped; serialize)
- **R0** write the Claude code/architecture standard **first**, so **R1** (create-recipe) and **R2** (account)
  refactors follow it. R1 absorbs C1; R2 absorbs F6 and overlaps C2.

---

## Deferred / post-1.0 / owner (off the active board)

Verified-present but intentionally not scheduled — decisions, post-1.0, or owner-owned:

- **Social link-preview prerendering** — release §C decision (CSR-SPA limitation; crawlers see the generic card).
  **Gates JSON-LD escaping (C3)** — ship them together (rule 6).
- **Colour tokens → CSS custom properties** — post-1.0 theming; blocked on the brand-orange decision.
- **Migrate off Edamam (nutrition)** — post-1.0; now an isolated server-only swap behind `POST /api/nutrition/details`.
- **`@jclind/ingredient-parser` data relocation** — post-1.0 ops; folds into the prod Mongo split (relocate, don't delete).
- **Brand-orange contrast / recolor + collapse remaining brand shades** — owner-owned (a11y sweep reverted
  `$primary-accessible` to vivid `#ff5722`). *Note: the shade literals this item wanted to dedupe are now
  **STALE in source** — see below.*
- **Ideas needing a decision** — friend system · AI-search paid membership · fridge/freezer-life fields — all post-1.0.
- **`numTimesSaved` counter ↔ save-list cross-collection atomicity** — *filed while reviewing S1.* Save/unsave/made
  each write the user's list (`userRecipeData`) and the recipe's tally (`recipes.numTimesSaved`/`numTimesMade`) as
  **two separate `updateOne`s with no transaction**, so a crash/failure between them drifts the counter (list says
  saved, tally not bumped, or vice-versa on unsave). S1 fixed the *concurrency* double-count within each write, but
  not this cross-collection seam. **Low severity** (a soft popularity counter used only for the `popular` sort, ±1
  drift, self-heals on the `$max`-floored unsave), and a real fix needs a **multi-document transaction** (client
  session + `withTransaction`, requires the replica-set deployment) — hence an infra/design call, not a quick patch.

---

## Stale reconciliations — update BACKLOG.md

Found STALE in the 2026-07-03 verification pass; recommend ticking/annotating in [`BACKLOG.md`](./BACKLOG.md):

- **CI actions pinned to Node 20** → **STALE.** `.github/workflows/test.yml` already sets `node-version: 24`
  everywhere + `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` (line 17). The runtime concern is already handled;
  `checkout@v4`/`setup-node@v4` still run, but on Node 24. Close, or narrow to "bump action majors for hygiene."
- **Collapse remaining brand shades** (`#f4501e`/`#a52f0a`/`#006065`) → **STALE in source.** Zero matches across
  `src/**/*.scss`/`.ts`/`.tsx`; they survive only in docs. The dedupe is effectively done — reconcile the sub-item.
- **`reorder` util untested** → **STALE.** It *is* tested (`src/test/IngredientListReorder.test.tsx` has a
  `describe('reorder util')` block). Drop `reorder` from the untested-utils list; `updateIngredients` + the small
  formatters remain genuinely untested.

Detail-drift (still VALID, just corrected):
- **`save` TOCTOU** lines are now `recipes.js:778-801` (was `760-773`).
- **Saved-tab memo** is a named `refreshAfterMutation` (`SavedRecipes.tsx:133-136`), not an inline `() => {}` —
  still un-`useCallback`'d, so still valid.
- **`any` escape hatches** are now ~8 (not ~23); `ReviewFilters` is gone and the select-styles `any`s live in the
  extracted `src/pages/AddRecipe/recipeSelectStyles.ts`.

---

## Status log

Append-only; newest at the bottom. Mirror each merge into the item's box in [`BACKLOG.md`](./BACKLOG.md).

- **2026-07-03** — Roadmap created. All 39 open BACKLOG items verified against the tree (5 parallel verification
  agents); 3 pulled as STALE, the rest placed on Waves 1–5. No tracks started yet.
- **2026-07-03** — **S1** implemented in `worktree-feat+recipes-write-safety`: atomic conditional `save` (kills the
  `numTimesSaved` double-count TOCTOU) + numeric/per-ingredient bounds in `validateRecipeBounds`. Local code review
  extended the atomic fix to the symmetric **unsave** TOCTOU (`DELETE /recipes/:id/save` was still read-then-write).
  Two follow-ups filed off-board: the cross-collection counter-atomicity seam (see Deferred, needs a txn), and
  wiring the client `INGREDIENT_MAX_LENGTH` guard into `IngredientsInput` (done in-lane). Verified via the running
  API + full test gates; not yet PR'd.
- **2026-07-04** — **S1 merged** ([#228](https://github.com/jclind/prepify/pull/228), CI green) into `development`;
  worktree torn down. First Wave-1 track done — **I3** (autocomplete title index) is now unblocked.
- **2026-07-04** — **S4 claimed** (`worktree-feat+s4-rate-limit-breadth`). Claim recorded directly on
  `development` (not on the lane branch) so concurrent sessions see the lane taken — the fix for the trap that
  left **S2**/**S3** looking `[ ]` on `development` while their claims sat on their own branches. Scope: per-uid
  limiter on `POST /reports` (currently `verifyToken, requireActive` only) + `profileWriteLimiter` on
  `POST /acknowledgeAchievements` (currently `verifyToken` only). Worktree not yet created.
- **2026-07-05** — **S2 merged** ([#229](https://github.com/jclind/prepify/pull/229), CI green) into `development`;
  worktree torn down. `exportMyData` saved recipes hydrated to full bodies via `publicRecipeProjection`;
  `profileWriteLimiter` on `updatePrivacy`; `deleteAccount` rating recompute made non-silent (`recomputeWithRetry`).
  Two follow-ups filed off this lane's review, **not** fixed here: the `exportMyData` *own*-recipes/drafts admin-stamp
  leak (unprojected owner export — BACKLOG.md, low) and the `acknowledgeAchievements` limiter (the other half of the
  two-writes item — folded into **S4**). Second Wave-1 track done; the recompute still pairs with **S6**.
- **2026-07-04** — **S3** implemented in `worktree-feat+s3-reviews-correctness`. (1) `getSingleUserReviews`
  Load-More count: the `returnRecipeData=true` path filtered soft-hidden-recipe ratings *after* paging/counting,
  so `totalCount` counted rows the list never returns and the client's "loaded < totalCount" never settled →
  moved the recipe-visibility join **into** the query as a `$lookup`+`$match`+`$facet` aggregation so page and
  count both run over the visible set (`$toString` join spans the ObjectId/string `_id` duality; hidden-status
  list single-sourced off `RECIPE_VISIBLE`). (2) admin takedown matched the rating by its **denormalized**
  `username` (stale after a rename → takedown 404s, content stays up); now resolves handle→uid (the
  `getSingleUserReviews`/unique-index lookup) and matches `{ userId, recipeId }`, stamping audit/notify with the
  author's *current* canonical handle. Extended Jest: rename-resilient takedown, unknown-handle 404, and
  totalCount==returnable on both `getSingleUserReviews` paths; updated 3 existing takedown tests to seed a
  resolvable `usernames` doc + `userId`. Server suite green (the lone `ingredients.test.js` timeout is a
  pre-existing proxy-flake, passes in isolation). **Out-of-lane sibling filed:** the moderation-queue preview in
  `reports.js:188` fetches the review snapshot by the same stale `{ username, recipeId }` — belongs to **S4**
  (owns `reports.js`); a renamed author shows a blank preview there until fixed. Not yet PR'd.
- **2026-07-05** — **S3** runtime-verified (live API on dev Firebase/Mongo, both fixes driven end-to-end incl.
  the newest-page-all-hidden killer case + case-insensitive/rename-resilient takedown; artifacts cleaned up) and
  code-reviewed (2 non-blocking notes: unindexed correlated `$lookup` scans `recipes` per rating — bounded by a
  user's rating count, correctness requires it; aggregation reaches into `RECIPE_VISIBLE.status.$nin` vs
  spreading the whole predicate → drift risk if it grows). PR opened → `[P]`.
- **2026-07-05** — **S3 merged** ([#231](https://github.com/jclind/prepify/pull/231), CI green — Backend/Frontend/
  E2e/Fallow all pass) into `development`; worktree torn down. Rebased onto `development` before merge to clear a
  `BACKLOG_ROADMAP.md` chokepoint conflict (S2 had landed since the fork point) — that conflict had left the PR
  `DIRTY`, which silently suppressed the `pull_request` CI workflow until the rebase cleared it; `reviews.js`
  itself never conflicted (S3-exclusive file). Third Wave-1 correctness track done. **Out-of-lane sibling still
  open:** `reports.js:188`'s moderation-queue preview fetches the review snapshot by the same stale
  `{ username, recipeId }` — belongs to **S4** (owns `reports.js`).
- **2026-07-05** — **S5 claimed** (`worktree-feat+s5-asynchandler-consistency`). Claim recorded directly on
  `development` (same convention as S4) so concurrent sessions see the lane taken. Scope: wrap the two remaining
  bare-async routes — `POST /details` (`nutrition.js:20`) and `POST /parse` (`ingredients.js:52`) — in the shared
  `asyncHandler` wrapper like every other route. Verified both are still bare-async and `development` is in sync
  with origin (0/0) before claiming. **Heads-up for the lane:** the orphan, non-board branch
  `worktree-feat+moderation-pr-c-ratelimiter` (unmerged, no worktree) also edits `ingredients.js` (rate-limiter
  rework) — if it ever lands, this lane rebases; disjoint change (handler wrapping vs limiter wiring), low
  collision. Worktree not yet created.
- **2026-07-05** — **S5** implemented in `worktree-feat+s5-asynchandler-consistency`: wrapped the two remaining
  bare-async routes (`POST /details` in `nutrition.js`, `POST /parse` in `ingredients.js`) in the shared
  `asyncHandler` — the last handlers missing the "every handler is wrapped" invariant, so a rejection outside
  their inner try/catch had no `next(err)` path. Each route's intentional soft-fail try/catch (route-specific
  log tags + graceful degradation) left intact; the wrapper is the outside-the-try safety net → **no behaviour
  change**. Server Jest 734/734 green (one unrelated `admin-recipe-curation` 401 full-suite flake, passes in
  isolation + cleared on re-run); both routes runtime-verified (401 unauth = route resolves). PR
  [#232](https://github.com/jclind/prepify/pull/232) opened → `[P]`.
- **2026-07-06** — **S4 merged** ([#230](https://github.com/jclind/prepify/pull/230), CI green — Backend/Frontend/
  E2e/Fallow/GitGuardian all pass) into `development`; worktree torn down. Per-uid `reportLimiter` (10/min,
  independent bucket) on `POST /reports` — bounds report *breadth* (distinct targets), which the existing
  one-open-report-per-target rule didn't cap; `profileWriteLimiter` on `POST /acknowledgeAchievements`, closing
  the other half of the two-writes item. Rate limiters runtime-verified against the live dev API (per-uid 429
  isolation confirmed). **Folded in the out-of-lane sibling** flagged from S3: `reports.js`'s moderation-queue
  review preview now matches the reported author by the stable `reportedUid` (snapshotted at report creation),
  falling back to the stored handle only for legacy reports with no `reportedUid` — so a renamed author's review
  preview no longer blanks. Kept as a distinct commit; regression test added (Jest 733 green). Fourth Wave-1
  track done. **Still filed, not fixed:** the `exportMyData` own-recipes admin-stamp leak (BACKLOG.md, low).
- **2026-07-06** — **S6 claimed** (`worktree-feat+s6-rating-aggregate-ops`). Claim recorded directly on
  `development` (same convention as S4/S5) so concurrent sessions see the lane taken. Scope: the two open
  rating-aggregate ops items — (1) a one-off catalog-wide reconciliation script alongside `server/scripts/`
  that loops every recipe and runs `recomputeRecipeRating(db, recipeId)` (`server/util/recipeRating.js`) to
  heal stored `recipes.rating` aggregates that drifted from legacy/pre-recompute data (BACKLOG.md:605); and
  (2) the post-6-phase-refactor DB check (BACKLOG.md:691). Pairs with the merged S2 `deleteAccount` recompute.
  Verified no in-flight S6 work exists (no branch, no `server/scripts/` reconciliation file) and only S5 is
  live before claiming. Worktree not yet created.
- **2026-07-06** — **S5 merged** ([#232](https://github.com/jclind/prepify/pull/232), CI green — Backend/Frontend/
  E2e/Fallow/GitGuardian all pass) into `development`; worktree torn down. Wrapped the two remaining bare-async
  routes — `POST /details` (`nutrition.js`) and `POST /parse` (`ingredients.js`) — in the shared `asyncHandler`,
  the last handlers missing the "every handler is wrapped" invariant (a rejection outside their inner try/catch
  previously had no `next(err)` path and could hang the request). Each route's intentional soft-fail try/catch
  (route-specific log tags + graceful degradation to `null`/generic-500) left intact; the wrapper is purely the
  outside-the-try safety net → **no behaviour change**. Verified via server Jest (734/734, one unrelated
  `admin-recipe-curation` 401 full-suite flake that passes in isolation) + live 401-unauth routing on both
  routes. Fifth Wave-1 track done; only **S6** (in flight) and **S7** remain open in Wave 1. No follow-ups filed.
- **2026-07-06** — **S7 claimed** (`worktree-feat+s7-firebase-admin-14`). Claim recorded directly on
  `development` (same convention as S4/S5/S6) so concurrent sessions see the lane taken. Scope: bump
  `server/` `firebase-admin` `^13.8.0` → `@14` (breaking major) to clear the 8 moderate transitive CVEs;
  audit the changelog/migration notes against our actual Admin SDK surface (auth token verification in
  `server/middleware/`, user deletion in `auth.js`, any storage/app init), then run the **full server
  regression pass** the board mandates — server Jest suite + live dev-API smoke of the auth-verification
  path. Solo lane per rule: breaking major isolated in its own worktree; touches only `server/package.json`
  + lockfile (+ any call-site fallout), no collision with the in-flight S6 (`server/scripts/`). Verified
  `development` in sync with origin (0/0) and installed version 13.10.0 before claiming. Worktree not yet
  created.
- **2026-07-06** — **S6** implemented in `worktree-feat+s6-rating-aggregate-ops` → PR
  [#233](https://github.com/jclind/prepify/pull/233) opened (`[P]`). Both open rating-aggregate ops items
  shipped as read-first ops scripts under `server/scripts/` (dry-run/report by default, modeled on the
  existing backfills): (1) `reconcileRatingAggregates.js` loops every recipe, computes the true aggregate
  from its visible `ratings` docs via the canonical util, reports drift, and `--apply` heals each drifted
  recipe through `recomputeRecipeRating` (idempotent); (2) `checkMigrationState.js` — READ-ONLY post-6-phase
  DB check counting records still pending each shipped migration (Phase 5-D string `_id`, `ratings.userId` /
  `reports.reportedUid` backfills, the `rating` aggregate field), naming the fix script for any found and
  exiting `2` when pending (a pre-cutover gate). To let the dry-run diff without writing, split the pure read
  half out of `recomputeRecipeRating` into **`computeRecipeRating`** (delegates then persists — no behaviour
  change); added `recipeRating.test.js` pinning the read-only contract + moderation/numeric filter rules.
  Verified against the **dev** DB: reconciliation caught + healed a real drift (recipe stored `rateCount 2`
  with only 1 visible rating), idempotent on re-run; the migration check surfaced dev's pending 5-D `_id`
  (8) + `userId` (1) records. Server Jest **741/741** (the lone `reports.js` rate-limit full-suite flake
  passes in isolation + cleared on re-run). The actual **prod ops run** (`--apply` against prod Mongo) stays
  owner-gated for the cutover — the scripts are the deliverable; the run is separate. Sixth Wave-1 track PR'd.
- **2026-07-06** — **S7** implemented in `worktree-feat+s7-firebase-admin-14`: `firebase-admin` `^13.8.0` →
  `^14.1.0`. The breaking change bit exactly where expected — v14 **removes the legacy namespaced API**
  (`require('firebase-admin')` no longer exposes `admin.auth()`/`admin.storage()`/`admin.credential`/
  `admin.apps`) — so all 8 production call sites moved to the modular entries (`firebase-admin/app`'s
  `initializeApp`/`getApps`/`cert`; `getAuth()`; `getStorage()`), and the Jest mock became a shared-state
  root (`__mocks__/firebase-admin.js`, all `__` handles unchanged → 14 suites untouched) + submodule mocks
  (`__mocks__/firebase-admin/{app,auth,storage}.js`); `reviews`/`security` suites now swap the auth instance
  via the `getAuth` mock fn instead of the `admin.auth` factory. **Audit: 9 moderate → 0** — the bump clears
  the Firestore chain; `overrides.uuid ^11.1.1` clears the `@google-cloud/storage@7.21.0` chain (no fixed
  storage release exists yet — drop the override when one ships); `npm audit fix` bumped dev-only `js-yaml`.
  `@google-cloud/storage` pinned as an explicit direct dep (v14 demoted it to optional; `firebaseStorage.js`
  uses it). Node floor ≥22 satisfied (repo pins 24). Full regression per the lane mandate: server Jest
  **737/737** (identical to the v13 baseline), live dev-Firebase smoke (v14 `createCustomToken` → real ID
  token → 200 through migrated `verifyToken`; invalid-token 401; `deleteUser` cleanup), storage chain
  load-verified under the uuid override, frontend gates green. PR
  [#234](https://github.com/jclind/prepify/pull/234) opened → `[P]`.
- **2026-07-06** — **S6 merged** ([#233](https://github.com/jclind/prepify/pull/233), merge `686829f`) → `[x]`.
  Landed the two read-first ops scripts (`reconcileRatingAggregates.js`, `checkMigrationState.js`) + the
  behaviour-preserving `computeRecipeRating` split and its `recipeRating.test.js`. Review-driven follow-up
  folded in before merge: `reconcileRatingAggregates.js` now honors `DB_NAME` (default `"prepify"`) like its
  sibling `checkMigrationState.js`, so the two scripts — meant to run back-to-back before a cutover — can't
  silently target different databases. Verified via runtime `/verify` against the **dev** DB (controlled
  inject→detect→heal→verify→cleanup loop: dry-run reads only, `--apply` heals + is idempotent, missing/empty
  `MONGO_URI` and typo'd flag both fail safe) and re-smoked the `DB_NAME` override post-fix; dev restored to
  baseline. CI green (Backend/Frontend/E2e/Fallow). The **prod ops run** (`--apply` against prod Mongo) stays
  owner-gated for the cutover — the scripts are the deliverable, the run is separate. Sixth Wave-1 track done;
  only **S7** (in flight, `[P]`) remains open in Wave 1. No follow-ups filed.
- **2026-07-06** — **F1 claimed** (`worktree-feat+f1-timeinput-nan`). Claim recorded directly on `development`
  (same convention as S4–S7) so concurrent sessions see the lane taken. Scope: the TimeInput hydration NaN bug —
  the effect in `TimeInput/TimeInput.tsx:23-27` does `Number(val)` on `val` (a `{hours, minutes} | null` object),
  which is always `NaN`, so on edit/draft-resume the prep/cook fields blank out instead of rehydrating. Fix the
  effect to read `val.hours`/`val.minutes` (+ the paired `AddRecipe.tsx:86-91,160-161` shape). **First claim on
  `AddRecipe.tsx`** — per parallelism rule 4, F1 ships first/standalone so the AddRecipe lane (C1/R1) rebases onto
  it; verified no AddRecipe worktree is in flight (only S7, server-only) and `development` is in sync with origin
  (0/0) before claiming. Worktree not yet created.
- **2026-07-06** — **S7** scope widened after a local review of PR #234: the server bump alone left the **repo
  root** on `firebase-admin ^13.9.0` (a devDependency used only by `cypress.config.ts` for E2E token minting),
  so root `npm audit` still reported the same 8 moderate advisories the lane exists to kill. Folded the
  frontend/tooling side into the same PR — root → `^14.1.0`; `cypress.config.ts` migrated to the modular API
  (v14 removed the `admin.*` namespace, so its `admin.auth().createCustomToken`/`admin.apps`/
  `admin.credential.cert` would have thrown); `overrides.uuid ^11.1.1` **scoped under `firebase-admin`** (not
  blanket — the root has a direct `uuid@^14.0.0` the frontend bundles, which a top-level override would
  downgrade and npm rejects as conflicting with a direct dep). Result: **both trees `npm audit` = 0** (server
  was 9→0, root 8→0). Also refreshed `CLAUDE.md` (the stale `if (!admin.apps.length)` note → modular API +
  the uuid-override removal condition) and annotated the auto-applied subpath mocks. Re-verified: server Jest
  737/737, frontend tsc/Vitest 553/build green, and a live dev-Firebase `createCustomToken` through the
  migrated cypress path. **Standing cleanup for a future session:** both `package.json`s carry the `uuid`
  override only because `@google-cloud/storage` has no release with a patched `uuid` yet — **remove both
  overrides once one ships** (tracked in `CLAUDE.md`).
- **2026-07-06** — **F1** implemented in `worktree-feat+f1-timeinput-nan` → PR
  [#235](https://github.com/jclind/prepify/pull/235) opened (`[P]`). The TimeInput hydration effect still treated
  `val` as a total-minutes **number** (`Number(val)`), but the prop is a `{ hours, minutes } | null` **object** —
  `Number({...})` is `NaN`, so `Number(val) !== 0` was always true and both fields were set to `NaN`, blanking
  prep/cook time on recipe edit and draft-resume (read as data loss). Fixed to read `val.minutes`/`val.hours`
  directly (a `0` component renders empty, matching `minToHrMin`'s intent). **Scope narrowed:** `AddRecipe.tsx`
  needed **no change** — its `:86-91`/`:160-161` already convert stored minutes via `minToHrMin` into the object
  shape before passing it down; the stale effect in `TimeInput` was the whole bug (board note carried the wider
  file list from before that migration). Added a `TimeInput hydration` regression block — the existing tests only
  rendered `val={null}`, never exercising the object path the bug lived in. Gates: `tsc` clean, Vitest **556
  passed / 2 skipped** (75 files), `npm run build` clean; app boots (client + dev API healthy) and the new
  component tests drive the fixed effect end-to-end in jsdom. First Wave-2 track PR'd; per rule 4 the AddRecipe
  lane (C1/R1) now rebases onto this.
- **2026-07-06** — **S7 merged** ([#234](https://github.com/jclind/prepify/pull/234), merge `8dca809`) → `[x]`.
  `firebase-admin` `^13.8.0`→`^14.1.0` across **both** package trees, migrated to the modular API (v14 removed
  the legacy `admin.*` namespace): server (`middleware/auth.js`, `routes/{auth,admin,publicProfile}.js`,
  `util/{email,automod,firebaseStorage}.js`, `scripts/setAdmin.js`) via `getAuth()`/`getStorage()`/
  `initializeApp`+`getApps`+`cert`, plus the root's `cypress.config.ts` E2E token-minting. Jest mocks
  restructured to a shared-state root + auto-applied `firebase-admin/{app,auth,storage}` submodule mocks
  (all `__` handles preserved → 14 suites untouched). **Audit cleared repo-wide: server 9→0, root 8→0** —
  the bump fixes the Firestore chain; a `uuid ^11.1.1` override clears the `@google-cloud/storage` chain's
  nested `uuid@9` (blanket on server; **scoped under `firebase-admin`** at root, which has a direct
  `uuid@^14.0.0` a blanket override would have downgraded). `@google-cloud/storage` pinned as an explicit
  server dep (v14 demoted it to optional; `firebaseStorage.js` uses it). Verified: server Jest 737/737
  (identical to the v13 baseline — zero behaviour drift), live dev-Firebase smokes on both the server
  `verifyToken` path and the cypress `createCustomToken` path, CI green incl. the **E2e/Cypress** run that
  exercises the migrated config. `CLAUDE.md` refreshed (modular API + override-removal condition). **Wave 1
  is now fully complete (S1–S7 all `[x]`).** **Standing cleanup:** remove both `uuid` overrides once
  `@google-cloud/storage` ships a patched-uuid release (tracked in `CLAUDE.md` + memory).
- **2026-07-06** — **F2 claimed** (`worktree-feat+f2-authcontext-memo`). Claim recorded directly on
  `development` (same convention as S4-S7/F1) so concurrent sessions see the lane taken. Scope: the
  `AuthContext` provider builds its `value` object inline every render (`AuthContext.tsx:377`, passed at
  `:392`) with no `useMemo`, handing consumers a fresh reference each render and defeating memoization for
  the whole auth-consuming subtree; wrap it in `useMemo` keyed on its members. Disjoint from both in-flight
  lanes (F1 = `TimeInput`/`AddRecipe`, S7 = server/root deps) -> no collision. Verified the bug is still
  present and `development` in sync with origin (0/0) before claiming; confirmed the two live worktrees are
  on their marked tracks (F1 = PR #235 open, S7 = #234 merged) with no forgotten/unmarked work. Worktree not
  yet created.
