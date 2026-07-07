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
| **2** | **F1 · TimeInput NaN bug** | edit/draft-resume blank prep/cook time (`TimeInput.tsx:23-27`) | `[x]` [#235](https://github.com/jclind/prepify/pull/235) (2026-07-06) | `TimeInput.tsx` | **merged** — scope narrowed to `TimeInput.tsx` only (AddRecipe already passed the object shape); review filed the "clear doesn't propagate" follow-up (BACKLOG.md Bugs, low). AddRecipe lane (C1/R1) rebases onto this. |
| **2** | **F2 · AuthContext memo** | `value` object recreated every render → wrap in `useMemo` | `[x]` [#240](https://github.com/jclind/prepify/pull/240) (2026-07-07) | `src/context/AuthContext.tsx` | **merged** — full fix, not just the `value` memo: `getAuth()`→`useMemo`, all 8 handlers `useCallback`'d, then `value` memoized (a bare `value` memo would no-op against per-render handler identities). Added a referential-stability regression test; runtime-verified the full auth lifecycle. Rebased onto current `development` before merge. |
| **2** | **F3 · Saved-tab memo** | `refreshAfterMutation` not `useCallback`'d → defeats `React.memo(RecipeCard)` (`SavedRecipes.tsx:133-136,372`) | `[x]` [#237](https://github.com/jclind/prepify/pull/237) (2026-07-07) | `SavedRecipes.tsx` | **merged** — `useCallback(refreshAfterMutation, [queryClient, uid])` stabilizes the handler passed as `onMutated` to the memoized grid; verified live (0 vs 54 re-renders, search/unsave refresh intact). Rebased onto current `development` before merge. |
| **2** | **F4 · change-password subhead** | redundant `<h3 class='sr-subhead'>` (`AccountSection.tsx:188`) | `[~]` `worktree-feat+f4-changepw-subhead` 2026-07-06 | `Settings/sections/AccountSection.tsx` | — |
| **2** | **F5 · housekeeping one-liners** | brand-asset comment (`generate-brand-assets.mjs:6`); CLAUDE.md RecipeContext drift; rename `validateIngredientQuantityStr`→`formatQuantity` (3 imports) | `[x]` [#239](https://github.com/jclind/prepify/pull/239) (2026-07-07) | `scripts/`, `CLAUDE.md`, `src/util/` | **merged** — rename repointed 4 importers (+1 commented ref); both comment/doc fixes verified true against disk (font file is `MediumItalic`, `src/context/` has only `AuthContext.tsx`) |
| **2** | **F6 · account nav polish** | Saved/Ratings section-nav styling (`SegmentedNav.tsx`) | `[ ]` | `Account/components/SegmentedNav.tsx` | subjective; better inside **R2** |
| **3** | **C1 · AddRecipe cluster** ⚠ lane | dropdown/`FormInput` uniformity (`recipeSelectStyles.ts`); summary-bar sticky; group-label styling; `/add-recipe` `noindex`; Cuisine/MealType selector unit tests; `updateIngredients` test + dead-code | `[ ]` | `src/pages/AddRecipe/**`, `src/test/` | ⚠ **subsumed by R1** — decide refactor-vs-smalls first |
| **3** | **C2 · route-constant single-sourcing** | `RECIPES_PATH` const (`DesktopBar:45`,`NavMenu:20`,`Recipes.tsx:113-119`); `browseAll`→`clearFilters`; `accountTabs` as app-wide route source (`DesktopAccountMenu:74`,`footerData:43-44`,`DraftResumeBanner:47`) + `activeAccountTab` helper | `[P]` [#242](https://github.com/jclind/prepify/pull/242) `worktree-feat+c2-route-constants` 2026-07-07 | Navbar/* + `Recipes.tsx` + `accountTabs.tsx` + `footerData.ts` + `DraftResumeBanner.tsx` | both share DesktopBar → one lane |
| **3** | **C3 · SingleRecipe lane** ⚠ lane | CLS controls-block reserve (`SingleRecipe.tsx:308-317`, `RecipeControls.scss`); JSON-LD `</script>` escaping (`buildRecipeJsonLd.ts:38-39`) | `[P]` [#243](https://github.com/jclind/prepify/pull/243) `worktree-feat+c3-singlerecipe-lane` 2026-07-07 | `SingleRecipe.tsx`, `RecipeControls.scss`, `buildRecipeJsonLd.ts` | hero `srcset` deferred to **I1**; JSON-LD gates with prerender; **CLS half is a no-op** — `RecipeControls` is owner-only, non-owner path already fully reserved (see status log) |
| **3** | **C4 · SearchRecipesInput lane** | autocomplete footer-label debounce disagreement (`:274` vs `:336`); press-`/` global focus-search feature | `[x]` [#238](https://github.com/jclind/prepify/pull/238) (2026-07-07) | `SearchRecipesInput.tsx` (+ Layout for key handler) | **merged** |
| **3** | **C5 · focus-ring tokens** ⚠ SCSS loner | `$focus-ring-*` group in `helpers.scss` + migrate ~13 literal `0 0 0 3px` rings | `[x]` [#241](https://github.com/jclind/prepify/pull/241) 2026-07-07 | `helpers.scss` + ~9 component `.scss` | **merged** — shipped as `@mixin focus-glow()` (parametrised, not a `$focus-ring-*` token set) |
| **4** | **I1 · image resize pipeline** | Storage width variants + `srcset`/`sizes` on card + hero (mobile LCP) | `[ ]` | Storage pipeline/CDN + `RecipeCard.tsx`, `SingleRecipe.tsx` hero | structural; unblocks C3 hero srcset |
| **4** | **I2 · uid-key recipe images** | re-key `recipeImages/{uid}/{uuid}` (`src/api/recipes.ts:188`) + tighten `storage.rules:27-32` to owner | `[ ]` | `src/api/recipes.ts`, `storage.rules` | pairs w/ I1; migrate existing objects |
| **4** | **I3 · autocomplete title index** | Mongo text index / Atlas Search for fuzzy fallback (`recipes.js:194-240`) | `[ ]` | `server/routes/recipes.js` | ⚠ after **S1**; low urgency/scalability |
| **5** | **R0 · Claude conventions doc** | code & architecture standard (`CONVENTIONS.md`/CLAUDE.md) | `[~]` `worktree-feat+r0-conventions-doc` 2026-07-07 | new doc | do **before** R1/R2 |
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
- **2026-07-06** — **F3 claimed** (`worktree-feat+f3-savedtab-memo`). Claim recorded directly on `development`
  (same convention as S4-S7/F1/F2) so concurrent sessions see the lane taken. Scope: `refreshAfterMutation`
  in `SavedRecipes.tsx:133-136` is a plain function rebuilt every render and passed as `onMutated` to the
  memoized `RecipeCard` (`:372`), so every saved-grid card re-renders on any parent render — `useCallback` it
  (deps `[queryClient, uid]`) to restore `React.memo(RecipeCard)`. Disjoint from all in-flight lanes (F1 =
  `TimeInput`/`AddRecipe`, F2 = `AuthContext`, S7 merged) -> no collision. **Caught an F2 race while
  claiming:** a concurrent session pushed the F2 claim to `origin/development` between my fetch and my pull, so
  pulling `development` first (the anti-race step) surfaced it before I double-claimed — picked the next open
  disjoint track (F3) instead. Verified the bug is still present and `development` in sync with origin (0/0)
  after the pull. Worktree not yet created.
- **2026-07-06** — **F3** implemented in `worktree-feat+f3-savedtab-memo` → PR
  [#237](https://github.com/jclind/prepify/pull/237) opened (`[P]`). `refreshAfterMutation` was a plain
  function rebuilt every `SavedRecipes` render and handed as `onMutated` to the memoized `RecipeCard` grid
  (`export default React.memo(RecipeCard)`), so its changing identity defeated the memo — every saved card
  re-rendered on any parent render (search keystroke, sort change, page bump, collection edit). Wrapped it in
  `useCallback` keyed on `[queryClient, uid]` (the only closed-over values; `setCurrPage` is a stable setter)
  so the reference is stable and `React.memo(RecipeCard)` actually holds. One file, frontend-only. Gates:
  `tsc` clean, Vitest **553 passed / 2 skipped** (75 files), `npm run build` clean; app boots (client + dev
  API healthy, MongoDB connected). Second Wave-2 track PR'd (F1 #235 + F3 #237 now both `[P]`; F2 in a
  worktree).
- **2026-07-06** — **F1 merged** ([#235](https://github.com/jclind/prepify/pull/235), merge `642e259`) → `[x]`.
  The `TimeInput` hydration effect read `Number(val)` where `val` is a `{ hours, minutes } | null` **object** — `Number({...})`
  is `NaN`, so `Number(val) !== 0` was always true and both prep/cook fields were set to `NaN`, blanking them on recipe edit and
  draft-resume (read as data loss). Fixed to read `val.hours`/`val.minutes` directly (a `0` component renders empty, matching
  `minToHrMin`'s intent). **Scope narrowed to `TimeInput.tsx` only** — `AddRecipe.tsx:86-91,160-161` already convert stored
  minutes via `minToHrMin` into the object shape before passing it down, so the stale effect was the whole bug (the board's wider
  file list predated that migration). Added a `TimeInput hydration` regression block — the prior tests only rendered `val={null}`,
  never the object path the bug lived in. **Verified via runtime `/verify`**: drove the real authed draft-resume flow (custom-token
  sign-in → create draft prep 2h15m/cook 0h45m → reload into `?draftId=`) — fixed code repopulated `2/15/''/45`, and the buggy
  counterfactual (restored via HMR) blanked all four while the title still hydrated, the exact reported symptom. **Also
  code-reviewed** (local): fix approved, no blocking findings. CI green (Backend/Frontend/E2e/Fallow/GitGuardian). **Merged via
  owner-authorized admin override** of the phantom `Static (typecheck + build)` required check — that context was on `development`'s
  branch protection but no workflow produced it until #236 (a concurrent lane) landed the job hours earlier; matches how S1–S7
  landed (`enforce_admins=false`). **Follow-up filed, not fixed** (off the code review): clearing **both** `TimeInput` fields to
  empty never fires the `if (minutes || hours) setVal(...)` writeback (`TimeInput.tsx:61-64`), so on an edit the parent silently
  keeps the old prep/cook time and the `!prepTime` required-field guard still passes — latent before F1, reachable now that
  hydration works (BACKLOG.md Bugs, low; belongs to the AddRecipe C1/R1 lane). First Wave-2 track merged; F2 (worktree) + F3
  ([#237](https://github.com/jclind/prepify/pull/237) `[P]`) still open.
- **2026-07-06** — **F5 claimed** (`worktree-feat+f5-housekeeping`). Claim recorded directly on `development` (same convention
  as S4–S7/F1–F3) so concurrent sessions see the lane taken. **Caught an F4 race while picking:** I had scoped F4
  (change-password subhead) and was about to claim it, but a pull surfaced a concurrent session's commit
  (`45682f4`, session `01JwP5…`) that had *already* flipped F1→[x] (merged #235) **and** claimed F4 with the exact branch
  name I'd chosen — my identical board edit was a clean no-op. Per the anti-race protocol (same as the F2→F3 pivot) I backed
  off F4 and took the next open disjoint track, **F5**. Scope: the three verified housekeeping one-liners — (1) `generate-brand-assets.mjs:6`
  header comment lists `Montserrat-{…,Italic}.ttf` but `:28` loads `Montserrat-MediumItalic.ttf` (comment stale, fix the
  `Italic` entry); (2) `CLAUDE.md:20,121` still call `src/context/RecipeContext.tsx` "commented out" but the file is **deleted**
  (only `AuthContext.tsx` remains) — correct both references; (3) rename `src/util/validateIngredientQuantityStr.ts` →
  `formatQuantity.ts` (it now exports only the `closestFraction` display formatter) + update its imports —
  `IngredientItemText.tsx`, `SingleRecipe.tsx`, `PrintableRecipe/PrintableRecipe.tsx`, and the `closestFraction.test.ts` /
  commented `updateIngredients.ts` refs. Disjoint from all in-flight lanes (F2 = `AuthContext`, F3 = `SavedRecipes`, F4 =
  `AccountSection`) — none touch `scripts/`, `CLAUDE.md`, or `src/util/`. Verified all three sub-items still present and
  `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-06** — **C4 claimed** (`worktree-feat+c4-searchinput-lane`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5) so concurrent sessions see the lane taken. **First Wave-3
  lane opened.** Picked C4 over the strictly-next board items on purpose: Wave 2's only remaining open item
  **F6** is flagged "defer to R2" and **C1** needs the refactor-vs-smalls decision (rule 5) — both are
  owner-decision-gated, not clean picks — while C2 (overlaps R2's account routes) and C3 (JSON-LD half
  entangled with deferred prerender, rule 6) each carry a soft dependency. C4 is fully self-contained with no
  overlap or deferral. Scope, both verified still present in `SearchRecipesInput.tsx`: (1) the autocomplete
  footer-label debounce disagreement — the empty-state quotes the **debounced** query (`trimmedQuery`,
  `:274`) while the "Search for …" footer button quotes the **live** input (`searchRecipeVal.trim()`,
  `:336`), so during the 300ms debounce window the two affordances show different text; reconcile them onto
  one value. (2) the press-`/` global focus-search feature — no global keydown handler exists yet; add one
  (in `Layout`, guarded so it doesn't steal `/` while the user is typing in an input/textarea/contenteditable)
  that focuses the navbar search input. Disjoint from all in-flight lanes (F2 = `AuthContext`, F3 =
  `SavedRecipes` [#237 `[P]`], F5 = `scripts`/`CLAUDE.md`/`src/util`; F4 = `AccountSection`, claimed on
  another machine). Verified the three live local worktrees (f2/f3/f5) all match their board claims — no
  forgotten/unmarked work — and `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-07** — **F3 merged** ([#237](https://github.com/jclind/prepify/pull/237), merge `0549eac`) → `[x]`.
  `refreshAfterMutation` in `SavedRecipes.tsx` was a plain function rebuilt every render and handed as
  `onMutated` to the memoized `RecipeCard` grid (`export default React.memo(RecipeCard)`), so its changing
  identity defeated the memo — every saved card re-rendered on any parent render (search keystroke, sort
  change, page bump, collection edit). Wrapped it in `useCallback` keyed on `[queryClient, uid]` (the only
  closed-over values; `setCurrPage` is a stable setter) so the reference is stable and the memo actually
  holds. One file, +6/−3, frontend-only. **Verified live** (not just gates): memo probe showed **0 saved-card
  re-renders with the fix vs 54 without** across 9 parent renders, and search-filter + unsave-refresh behavior
  was byte-identical on both builds (no functional regression). **Rebased onto current `development`** (past
  F1/TimeInput + the C4 claim) before merge so history stays linear; force-pushed, re-ran CI green (Backend,
  E2e/Cypress, Vitest 553✓, Static typecheck+build, Fallow advisory all pass), merged. Second Wave-2 track
  landed (F1 #235 + F3 #237 both merged; F2/F4/F5 still in worktrees, C4 first Wave-3 lane claimed).
- **2026-07-07** — **C4** implemented in `worktree-feat+c4-searchinput-lane` → PR
  [#238](https://github.com/jclind/prepify/pull/238) opened (`[P]`). Both `SearchRecipesInput` items shipped;
  frontend-only, no `server/` changes. (1) **Footer-label debounce disagreement:** the `Search for "…"` footer
  button quoted the **live** input (`searchRecipeVal.trim()`) while the empty-state above it quotes the
  **debounced** query (`trimmedQuery`) — the whole dropdown (results, corrected banner, empty-state) describes
  the query that actually ran, so within the 300ms debounce window the footer could disagree with its `No
  matches for …` sibling. Pointed the footer label at `trimmedQuery` too; the submit *action* stays on the live
  value (shared with Enter / the top Search button, which must fire for <3-char queries that never open a
  dropdown). (2) **Press-`/` focus-search:** new `useSlashFocusSearch` hook attached once at the app shell
  (`Layout`) — a bare `/` outside a text field focuses the page's primary recipe search and selects its text;
  modifier combos, IME composition, and keystrokes already inside an input/textarea/select/contenteditable are
  ignored. Targeting walks the **ancestor chain** for `display:none`/`visibility:hidden` (not just the input's
  own style) to pick the first *focusable-visible* `.search-recipes-input` — so it skips the desktop nav search
  hidden in a `display:none .dnav__search` on the Home hero and the `visibility:hidden` closed mobile menu,
  landing on the navbar search on most pages, the page's own search on `/recipes`, or the hero search on Home.
  `getComputedStyle` (not `offsetParent`) keeps the check meaningful under jsdom so the happy path stays
  unit-testable. Added `src/test/useSlashFocusSearch.test.tsx` (focus+select, typing-context guard, modifier
  guard, visibility-skip). Gates: `tsc` clean, Vitest **560 passed / 2 skipped** (76 files), `npm run build`
  clean. **Runtime-verified** end-to-end in the running app (Playwright, Home + `/recipes`): `/` focuses the
  *visible* search (skips the `display:none` nav search → hero search), the `/` isn't inserted into the field,
  the typing-guard holds, the footer renders the settled query, and `/recipes` focuses its own search. First
  Wave-3 lane PR'd. **Claim/`[P]` flips recorded on `development` directly** (not the lane branch) to keep
  backlog edits off the PR — a prior lane (S3) hit a BACKLOG chokepoint conflict that marked the PR DIRTY and
  silently suppressed its `pull_request` CI until rebased.
- **2026-07-07** — **C5 claimed** (`worktree-feat+c5-focus-ring-tokens`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5/C4) so concurrent sessions see the lane taken. **Second Wave-3
  lane, and the SCSS loner** — verified no other SCSS-token worktree is in flight (the live lanes F2/F5/C4 and
  the off-machine F4 touch `AuthContext`/`scripts`+`CLAUDE.md`+`src/util`/`SearchRecipesInput`+`Layout`/
  `AccountSection` respectively — none touch `helpers.scss` or the ring-bearing component `.scss`), so C5 owns
  the one-SCSS-token-lane-at-a-time slot cleanly. Picked C5 over the other open `[ ]` tracks on purpose: every
  remaining open item is decision-gated — **F6** "defer to R2", **C1** needs the refactor-vs-smalls call
  (rule 5), **C2** overlaps R2's account routes, **C3**'s JSON-LD half gates with deferred prerender (rule 6),
  and Waves 4/5 are structural/owner-scoped — while C5 is fully self-contained. Scope: add a documented
  `$focus-ring-*` token group (or `@include focus-ring(...)` mixin, since ring **colour/opacity vary** — teal
  `$primary`/`$secondary`, `$error-red`, a green `#29a155`) to `src/helpers.scss` alongside the existing
  elevation/shadow ramps (the `:187` comment already flags rings as "a separate concern, left for a later
  pass"), then migrate the **12 verified literal `box-shadow: 0 0 0 3px …` rings** across 7 component `.scss`
  (`CreateUsername`, `RecipeFormTextArea`, `Recipes`, `Help` ×3, `FormStyles`, `FormInput` ×2, `controls` ×3)
  onto it; also reconcile the now-focus-rings-only "remaining hardcoded values" BACKLOG sub-item. **Anti-race
  note:** while claiming, a pull surfaced a concurrent session's uncommitted board flips in this checkout —
  **C4 → `[P]` #238** (with its status-log entry) and **F2 → `[P]` #240** — carried along in this same commit
  (line-distinct rows, all truthful current state; F2's own status-log entry left for its session). Verified
  the three live local worktrees (f2/f5/c4) each match their board claims with real committed work — no
  forgotten/unmarked lanes — and `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-07** — **F5 merged** ([#239](https://github.com/jclind/prepify/pull/239), merge `23e7183`). The three
  housekeeping one-liners landed as scoped: (1) `generate-brand-assets.mjs:6` comment now names `Montserrat-MediumItalic.ttf`
  (the file `:28` actually loads / that exists in `scripts/fonts/`); (2) both `CLAUDE.md` RecipeContext references flipped from
  "commented out" to "removed" (`src/context/` holds only `AuthContext.tsx`); (3) `src/util/validateIngredientQuantityStr.ts`
  → `formatQuantity.ts` via `git mv`, repointing all **4** live importers (`SingleRecipe`, `PrintableRecipe`, `IngredientItemText`,
  the `closestFraction` test) plus the one commented ref in `updateIngredients.ts`. **Verified:** runtime — drove 3 live recipe
  pages, `closestFraction` renders whole + fractional quantities (`8 ounce`, `1/2 cup`, `1 1/2 cup`, `1/4 cup`) with zero console
  errors (a broken import would throw a Vite overlay); local high-effort code review — 0 findings (all importers repoint, old file
  gone, no stale source refs, both doc-claims true against disk). Gates green (tsc, Vitest 556/2-skip, build, full CI incl. Cypress).
  **Follow-up filed-not-fixed (out of F5's `scripts/`+`CLAUDE.md`+`src/util/` domain, low):** two *other* docs still name the old
  filename — `docs/ADD_RECIPE_AUDIT.md:268` and `docs/sweeps/ROADMAP.md:185` — harmless (historical audit/sweep prose, no build
  impact); the backlog docs mention it correctly as the task description.
- **2026-07-07** — **F2 merged** ([#240](https://github.com/jclind/prepify/pull/240), merge `aeb5337`). The
  `AuthContext` provider `value` was a fresh object literal every render, so its identity churned constantly and
  forced **every** `useAuth()` consumer to re-render for nothing. Shipped the *complete* fix, not the literal
  "wrap `value` in `useMemo`" (which would no-op): (1) `getAuth()` → `useMemo(() => getAuth(), [])` so `auth` is a
  stable reference — still resolved lazily inside the provider, preserving the "importing this module never
  triggers Firebase init" invariant; (2) all **8** handlers wrapped in `useCallback` with exhaustive deps
  (`logout`/`signInWithGoogle`/`signInDefault`/`signUp` → `[auth, navigate]`, `forgotPassword` → `[auth]`,
  `updateProfileData`/`changePassword` → `[user]`, `deleteAccount` → `[user, auth, navigate]`); (3) `value`
  memoized over `[user, isAdmin, loading, …8 handlers]` — the handlers had to be stable first or the value memo
  would never hit. **Verified:** runtime — drove the full auth lifecycle in a real browser against dev infra
  (Firebase `prepify-dev-58579` / `prepify-dev` Mongo): signup → set-username → signed-in render → reload
  (persistence) → logout → login → wrong-password probe → delete-account cleanup; all steps passed, only console
  error the expected Firebase 400 from the wrong-password probe, test account self-cleaned via the delete flow.
  Local high-effort code review — 0 findings (deps exhaustive so no stale closures; grepped all 18 `useAuth`
  consumers — none place a handler or the value object in a dependency array, so stabilizing identity is a pure
  re-render reduction with no behavioral coupling). Added a `referential stability` regression test that fails on
  the pre-fix code and asserts value + handler identity survive an incidental re-render; no new `exhaustive-deps`
  disables needed. Gates green (tsc, Vitest, build, full CI incl. Cypress 3m29s). Rebased onto current
  `development` (8 behind, `AuthContext` had moved under `8680f2a`) — clean, no semantic conflict — before merge.
- **2026-07-07** — **C2 claimed** (`worktree-feat+c2-route-constants`). Claim recorded directly on `development`
  (same convention as S4–S7/F1–F5/C4/C5) so concurrent sessions see the lane taken. **Third Wave-3 lane.**
  Picked C2 as the next lane after confirming all *cleaner* tracks are gone: C4 (`[P]` #238) and C5 (`[~]`) hold the
  two self-contained Wave-3 lanes, and every other open `[ ]` item is decision-gated — **F6** "defer to R2", **C1**
  needs the refactor-vs-smalls call (rule 5), **C3**'s JSON-LD half gates with deferred prerender (rule 6), Waves 4/5
  are structural/owner-scoped. C2 is the one remaining **fully-completable** track (pure route-string extraction);
  owner confirmed to proceed on it despite the soft R2 overlap (R2 not imminent). Scope re-verified still present:
  (1) `'/recipes'` literal hardcoded at `navItems.ts:7`, `DesktopBar.tsx:45,58`, `NavMenu.tsx:20`, `Recipes.tsx:118`,
  `footerData.ts:29` → single-source as `RECIPES_PATH`; (2) `Recipes.tsx` still has both `browseAll` (`:113`) and
  `clearFilters` (`:104`) → collapse `browseAll`→`clearFilters`; (3) the `accountTabs` map already exists
  (`Account/components/accountTabs.tsx`) but only feeds the Account SegmentedNav — the app-wide consumers still
  hardcode their `/account/...` strings (`DesktopAccountMenu.tsx:73-75,101`, `footerData.ts:43-44`,
  `DraftResumeBanner.tsx:47`) → point them at `accountTabs` + add an `activeAccountTab` helper. Disjoint from all
  in-flight lanes (C4 = `SearchRecipesInput`/`Layout`, C5 = `helpers.scss`+ring `.scss`, F4 = `AccountSection`) — none
  touch Navbar/`Recipes.tsx`/`accountTabs.tsx`/`footerData.ts`/`DraftResumeBanner.tsx`. Verified the sole local
  worktree (c4) matches its board claim with committed work — no forgotten/unmarked lane — and `development` in sync
  with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-07** — **C3 claimed** (`worktree-feat+c3-singlerecipe-lane`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5/C4/C5) so concurrent sessions see the lane taken. **Third
  Wave-3 lane, and the SingleRecipe ⚠ solo lane** — verified no other SingleRecipe worktree is in flight and
  the lane's three files (`SingleRecipe.tsx`, `RecipeControls.scss`, `buildRecipeJsonLd.ts`) are disjoint from
  every live lane: **C4** (`SearchRecipesInput.tsx` + `Layout`, PR [#238](https://github.com/jclind/prepify/pull/238)
  `[P]`, local worktree), **C5** (`helpers.scss` + the `CreateUsername`/`RecipeFormTextArea`/`Recipes`/`Help`/
  `FormStyles`/`FormInput`/Settings-`controls.scss` focus-ring set — **not** `RecipeControls.scss`, which carries
  no `0 0 0 3px` literal, so the earlier feared C3↔C5 collision is a non-issue), and **F4** (`AccountSection.tsx`,
  off-machine). Picked C3 over the other open `[ ]` tracks on purpose: **C1**/**F6** are owner-decision-gated
  (rule 5), **C2** turned out murkier than the board (its `accountTabs` half is *already* partially single-sourced
  — `accountTabs.tsx` is a "single source of truth" with an `activeAccountTabIndex` helper; consumers still
  hardcode strings, and the cited `Recipes.tsx:113-119` path has drifted) and softly overlaps the far-off R2,
  and Waves 4/5 are structural/owner-scoped — while C3 is a self-contained solo lane whose main deliverable is a
  concrete CLS win. Scope, both verified still present: (1) **CLS controls-block reserve** — `RecipeControls`
  renders behind `{currRecipe && …}` (`SingleRecipe.tsx:308`) with no reserved height, so the controls row pops
  in after the recipe fetch resolves and shoves the hero/content down (layout shift); reserve its height in
  `RecipeControls.scss` (min-height/skeleton) so the block occupies its final space from first paint. (2)
  **JSON-LD `</script>` escaping** — `buildRecipeJsonLd.ts` assembles the LD+JSON object from user-controlled
  recipe fields (title/description/instructions) with no `</script>` / `<`→`<` escaping before it's
  serialized into the `application/ld+json` script tag; latent-harmless under today's CSR (rule 6) but a real
  injection vector the moment SSR/prerender lands — fold the defensive escape in now since it's a harmless
  one-liner (and one less thing the prerender PR must remember). **Hero `srcset` stays deferred to I1.** Verified
  no forgotten/unmarked local work first: the four stale local branches (`button-hover-audit`,
  `public-recipe-projection`, `s4`, `s6`) are all merged into `development`; `moderation-pr-c-ratelimiter` is the
  known off-board orphan (S5 log); only `c4-searchinput-lane` is a live worktree and it matches its `[P]` board
  row. `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-07** — **C5** implemented in `worktree-feat+c5-focus-ring-tokens` → PR
  [#241](https://github.com/jclind/prepify/pull/241) opened (`[P]`). The **field-focus glow** (the soft coloured
  halo a focused form field casts, paired with a `border-color` shift) was hand-rolled as
  `box-shadow: 0 0 0 3px rgba(accent, …)` at **12 sites across 7 component `.scss`** — the same fixed 3px
  geometry repeated, several with the teal accent as a raw `rgba(0, 173, 181, …)` literal instead of
  `$secondary`. Collapsed onto one **`@mixin focus-glow($color: $secondary, $opacity: 0.15)`** in `helpers.scss`
  (grouped beside `@mixin outline()`); every ring routes through it keeping its **exact colour + opacity**, so
  the compiled CSS is **byte-identical** — verified against the production build (all 12 rings emit the same
  hex+alpha: teal `#00adb5` at .12/.15×5/.16/.2/.25, green `#29a155`/.18, `$error-red`/.15, `$primary`/.12) —
  a pure de-dup, **zero visual change**. **Deliberately distinct from the a11y `@mixin outline()`** (the blue
  `#4d90fe` `:focus-visible` keyboard ring): the glow is the ":focus/:focus-within, field is active" affordance
  and the two coexist — this lane doesn't touch `outline()`. Documented the split in `docs/scss-conventions.md`
  (new field-glow subsection) + repointed the stale helpers.scss "focus rings left for a later pass" comment at
  the mixin; reconciles the now-focus-rings-only "remaining hardcoded values" sub-item. **Opacity preserved,
  not normalised** — the teal glows still vary .12–.25 (intentional-vs-drift is a follow-up design call, noted
  in the doc). **Out-of-lane observation (not touched):** `controls.scss` `.has-success` uses a bare `#29a155`
  for *both* its border-colour and glow (≠ the `$success-green` token, and a third green `#0a7d2c` for the hint)
  — a colour-token dedup, separate from the focus-ring concern; the glow keeps `#29a155` to stay coherent with
  its border. Gates: `tsc` clean, `npm run build` clean (SCSS compiles through the mixin), Vitest **557 passed /
  2 skipped** (75 files); no `server/` changes → no Jest. Second Wave-3 lane PR'd. **Anti-race:** the row `[~]`
  claim reached origin earlier by being swept into a concurrent session's push; verified the live worktrees
  match their board rows (no forgotten/unmarked work) before claiming.
- **2026-07-07** — **C2** implemented in `worktree-feat+c2-route-constants` → PR
  [#242](https://github.com/jclind/prepify/pull/242) opened (`[P]`). Frontend-only, no `server/` changes.
  Introduced **`src/routes.ts`** as the single source of truth for route strings duplicated across files, so a
  rename can't silently drift copies apart (TypeScript resolves every consumer). (1) **`RECIPES_PATH`
  (`'/recipes'`)** now backs the navbar link + both navbar search-suppression checks (`pathname === RECIPES_PATH`),
  the footer link, and `Recipes.tsx`'s `syncUrl`/`browseAll` navigations. (2) **Four `ACCOUNT_*_PATH` consts** —
  `accountTabs` consumes them for its tab `.to` fields and the app-wide nav links (`DesktopBar` saved,
  `DesktopAccountMenu` your-recipes, footer my/saved, `DraftResumeBanner` drafts) point at the same constants, so
  the account tab strip and the global nav can't drift. (3) Added **`activeAccountTab(pathname)`** alongside
  `activeAccountTabIndex` (kept for SegmentedNav); Account's SR heading reads the cleaner helper. **Two judgment
  calls** (BACKLOG left both open): (a) *`browseAll`→`clearFilters`* — extracted a shared **`resetFilters()`** setter
  block both use, rather than literally calling `clearFilters()` inside `browseAll` (which would double-navigate:
  `clearFilters`'s `syncUrl` pushes `/recipes?q=…`, then `browseAll`'s bare navigate pushes `/recipes` — an extra
  history entry + refetch); the extract is DRY **and** behaviour-preserving. (b) *account routes* — chose the leaf
  `routes` const both sides consume over importing `accountTabs` into `Components/*`, avoiding a
  `Components→pages/Account` layering inversion (BACKLOG explicitly offered this option). **Scope guard:**
  `RECIPES_PATH` migrated only within C2's collision surface — left `SingleRecipe.tsx` (**C3**),
  `SearchRecipesInput.tsx` (**C4**), the `App.tsx` route definition, and the ~10 other page-level `/recipes` links
  for a follow-up adopt-everywhere sweep (filed as an observation, not fixed here). **Verified:** gates — `tsc`
  clean, Vitest **557 passed / 2 skipped** (75 files), `npm run build` clean; behaviour coverage (jsdom) —
  `browseAll`/`clearFilters` by `Recipes.test.tsx` (incl. "Browse all → bare /recipes, refetch `query:''`/`diets:[]`"),
  `activeAccountTab` by `Account.test.tsx` (23 tests across all four account routes), nav structure by
  `navItems`/`DesktopNav`/`NavMenu`; dev server (client :3005 / API :4003) — no Vite resolve errors, `/recipes` +
  `/account/saved-recipes` serve 200. Third Wave-3 lane PR'd. **`[P]` flip recorded on `development` directly** (not
  the lane branch), same convention as C4/C5 — keeps backlog edits off the PR so a BACKLOG chokepoint conflict
  can't mark it DIRTY and suppress its `pull_request` CI.
- **2026-07-07** — **C4 merged** (PR [#238](https://github.com/jclind/prepify/pull/238), merge commit
  `3ac9b31`; board row → `[x]`). First Wave-3 lane to land. All six required checks green before merge
  (Backend/Supertest, Frontend/Vitest, Static typecheck+build, E2e/Cypress 3m34s, Fallow advisory, GitGuardian);
  merged as a merge commit per convention, remote branch `worktree-feat+c4-searchinput-lane` deleted, worktree
  torn down. **What landed:** (1) footer label now quotes the **debounced** query (`trimmedQuery`) so it can't
  disagree with the `No matches for …` empty-state / results within the 300ms window; the submit *action* stays
  on the **live** value (shared with Enter / the top Search button, which must fire for <3-char queries) — a
  `/code-review` pass flagged the label-vs-action skew, judged it one-directional + self-correcting (a click
  always searches the freshest query, never a staler one) and **intentional**, so it was left as-is with a
  clarifying comment added on `handleSubmit` (commit `469beb5`) rather than "reconciled". (2) `useSlashFocusSearch`
  press-`/` focus hook at the app shell, with the modal-focus-trap guard (`[aria-modal="true"], [role="dialog"]`)
  that a mid-lane `/verify` runtime pass caught and fixed (a bare `/` had escaped an open modal and stolen focus
  to the background search) + regression test. No follow-ups filed.
- **2026-07-07** — **C3** implemented in `worktree-feat+c3-singlerecipe-lane` → PR
  [#243](https://github.com/jclind/prepify/pull/243) opened (`[P]`). Frontend-only. The lane's two items split
  cleanly into "one real fix, one no-op after investigation":
  **(1) JSON-LD `</script>` escaping — fixed.** `buildRecipeJsonLd` builds the schema.org/Recipe object from
  user-controlled `title`/`description`/`instructions`, and `SingleRecipe.tsx` injected it via
  `{JSON.stringify(recipeJsonLd)}` into a `<script type="application/ld+json">`. A literal `</script>` in any of
  those fields is inert under today's CSR (React sets the child as a text node → never re-parses) but a real
  breakout the instant SSR/prerender serializes the subtree (rule 6). Added `serializeRecipeJsonLd()` — stringify
  then replacing every `<` with its backslash-u003c unicode escape (still valid JSON, decoded back to `<` by any
  JSON-LD parser) — and render the
  pre-escaped string directly. New `src/test/buildRecipeJsonLd.test.ts` (+6): escape + JSON round-trip for a
  malicious title/description/instruction (no raw `<` survives, escape present, original text recoverable) + core
  build output. Did the escape now rather than defer to the prerender PR since it's a harmless one-liner and one
  less thing that PR must remember.
  **(2) CLS controls-block reserve — no-op by design.** Investigation found `RecipeControls` **renders only for
  the recipe owner** (`if (!isUsersRecipe) return null`, `RecipeControls.tsx:52`), so the BACKLOG item's
  "CLS ≈ 0.10, dominant layout-shift source" was an *owner-view* measurement — for the SEO-relevant logged-out
  majority (and logged-in users browsing others' recipes) that block renders nothing and never shifts. Every
  **non-owner**-visible control on the page is *already* CLS-reserved: action-bar exact-dim skeletons
  (`SingleRecipe.tsx:461`), servings-stepper placeholder (`:496`), full ratings skeleton (`:638`), the
  `.sr-controls` `min-height: 30px` that reserves the report-kebab row (`SingleRecipe.scss:26`), and the made-row
  (empty when logged-out; renders frame 1 otherwise, `MadeRecipeBtn.tsx:69`). Any *speculative* reserve for the
  owner banner can't know ownership until the fetch resolves, so it would regress a larger segment to fix the
  rarest case — **per an explicit product call (owner: "don't fix the signed-in/owner CLS, tailor to non-owners"),
  the owner-only shift is left unreserved**, and the already-tailored non-owner path stands. No code for this item;
  BACKLOG.md's CLS item gets a won't-reserve resolution note at merge, the JSON-LD item ticks `[x]`.
  **Verified:** gates — `tsc` clean, Vitest **563 passed / 2 skipped** (76 files), `npm run build` clean; runtime
  — headless Chrome against the running dev app (client :3004 / API :4002) rendered a valid, parseable ld+json
  `<script>` on a real recipe (`@type: Recipe`, correct name, ingredients + aggregateRating, no raw `</script>`),
  and the existing `SingleRecipe.test.tsx` exercises the serialize→script path in integration. Hero `srcset` stays
  deferred to **I1**. **`[P]` flip recorded on `development` directly** (not the lane branch), same convention as
  C2/C4/C5 — keeps backlog edits off the PR so a BACKLOG chokepoint conflict can't mark it DIRTY and suppress CI.
  (Board moved during the lane: **C4 merged** `[x]` #238 and **C2** reached `[P]` #242 — verified both against the
  tree before appending; my C3 row + this entry are line-distinct from theirs.)
- **2026-07-07** — **C5 merged** ([#241](https://github.com/jclind/prepify/pull/241), merge `59c7d92`). The **SCSS
  loner** landed as a **pure refactor** single-sourcing the field-focus glow. Shipped `@mixin focus-glow($color:
  $secondary, $opacity: 0.15)` in `helpers.scss` — a **parametrised mixin, not the mooted `$focus-ring-*` token
  set** (ring **colour and opacity both vary**: 4 accents — teal `$secondary`, `$primary`, `$error-red`, a valid
  green `#29a155` — × 6 opacities `.12–.25`, so a fixed token group would have exploded into a dozen names; the
  geometry `0 0 0 3px` is the one thing that's invariant, and that's what the mixin fixes). Migrated the **12
  literal `box-shadow: 0 0 0 3px …` rings** across 7 component `.scss` (`FormInput` ×2, `RecipeFormTextArea`,
  `CreateUsername`, `Recipes`, `Help` ×3, `FormStyles`, `controls` ×3) onto it, each preserving its **exact**
  colour+opacity. Deliberately named `focus-glow` (not `focus-ring`) to stay distinct from the a11y `@mixin
  outline()` keyboard ring — the two focus signals coexist and the split is now documented in
  `docs/scss-conventions.md` (new "field-focus glow is a separate signal" subsection). **Verified zero visual
  change** by production-build byte-equivalence: all 12 rings emit their identical pre-refactor hex+alpha
  (`#00adb526` ×5 teal/.15, `#00adb51f/29/33/40`, `#ff57221f`, `#c5303f26`, `#29a1552e`). Local code review — 1
  minor finding (the mixin's header comment overclaimed "`:focus` not `:focus-visible`", contradicted by the 4
  `:focus-visible` call sites where the glow doubles as the WCAG 2.4.7 keyboard indicator); fixed in a follow-up
  comment-only commit (`85763f5`, reworded both `helpers.scss` and the doc) before merge. Gates green (build,
  Vitest, full CI incl. Cypress 3m33s). **`[x]` flip recorded on `development` directly** (not the lane branch),
  same convention as C2/C3/C4. **Follow-up filed-not-fixed (out of a pure-refactor's scope, design call):** the
  per-surface opacity spread (`.12–.25`) is *preserved not normalised* — whether to converge on one or two canonical
  glow opacities is a separate visual-design decision, noted in `scss-conventions.md`. Also the `controls.scss`
  `.has-success` green is a bare `#29a155` literal (≠ the `$success-green` token) for both its border and glow — a
  colour-token dedup that's a different concern from the ring geometry this track owned.
- **2026-07-07** — **R0 claimed** (`worktree-feat+r0-conventions-doc`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5/C2–C5) so concurrent sessions see the lane taken. **First
  Wave-5 lane** — opened only after confirming every cleaner track is gone: the four self-contained Wave-3
  lanes are all resolved (**C4** `[x]` #238, **C5** `[x]` #241, **C2** `[P]` #242, **C3** `[P]` #243) and every
  remaining open item is decision-gated (**F6** "defer to R2", **C1** needs the rule-5 refactor-vs-smalls call),
  structural/infra-gated (**I1**/**I2** image pipeline, **I3** the Mongo-text-index-vs-Atlas-Search call), or
  owner-scoped (**R1**/**R2**). Presented that state to the owner via a decision prompt; **owner picked R0**
  over I3/C1/holding — a new doc with zero collision surface and the explicit prerequisite the board says to
  land "before R1/R2". Scope: write the Claude code & architecture standard (`CONVENTIONS.md`, cross-linked
  from `CLAUDE.md`) that **R1** (create-recipe refactor) and **R2** (account refactor) will follow, extracting
  the conventions already latent in the tree — route-constant single-sourcing (C2's `src/routes.ts`), the
  `asyncHandler`-wraps-every-route server invariant (S5), the Lucide single-icon-family import boundary, the
  SCSS focus-glow-vs-`outline()` split + `helpers.scss` token discipline (C5), the memo/`useCallback` render-
  stability patterns (F2/F3), the persisted-shape/type-ownership decoupling in the ingredient parser, and the
  test-gate expectations (tsc + Vitest + build; Jest for `server/`). **Anti-race:** a concurrent session's
  commit `9db0b2e` (C5 → `[x]`) swept in this R0 board flip alongside its own C5 edit mid-claim — verified both
  rows are truthful (C5 #241 genuinely merged, the R0 flip is mine) and line-distinct before proceeding.
  Verified the three then-live worktrees each match their board rows with real committed work — no
  forgotten/unmarked lane (c2 = #242 `[P]`, c3 = #243 `[P]`, c5 = merged/tearing down) — and re-synced
  `development` before appending. Worktree not yet created.
