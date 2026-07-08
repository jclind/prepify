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

> **Note-triage pass 2026-07-08.** Waves 1–5 fully drained, then Jesse's Obsidian dump (21 new items) was
> verified item-by-item (7 parallel agents; 7 already fixed, 4 tracked/deferred elsewhere). The survivors are
> boarded as **Wave 6 (N1–N7)** below — mutually disjoint lanes, built for parallel worktrees.

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
| **2** | **F4 · change-password subhead** | redundant `<h3 class='sr-subhead'>` (`AccountSection.tsx:188`) | `[x]` [#246](https://github.com/jclind/prepify/pull/246) (2026-07-07) | `Settings/sections/AccountSection.tsx` | **merged** — reclaimed an orphaned claim first; dropped the redundant subhead (`Connected accounts` heading kept); runtime-verified via a real signup→settings flow |
| **2** | **F5 · housekeeping one-liners** | brand-asset comment (`generate-brand-assets.mjs:6`); CLAUDE.md RecipeContext drift; rename `validateIngredientQuantityStr`→`formatQuantity` (3 imports) | `[x]` [#239](https://github.com/jclind/prepify/pull/239) (2026-07-07) | `scripts/`, `CLAUDE.md`, `src/util/` | **merged** — rename repointed 4 importers (+1 commented ref); both comment/doc fixes verified true against disk (font file is `MediumItalic`, `src/context/` has only `AuthContext.tsx`) |
| **2** | **F6 · account nav polish** | Saved/Ratings section-nav styling (`SegmentedNav.tsx`) | `[dropped]` stale (R2, 2026-07-07) | `Account/components/SegmentedNav.tsx` | closed as stale — nav already redesigned (#136 rail) + token-normalized; no concrete defect |
| **3** | **C1 · AddRecipe cluster** ⚠ lane | ~~`/add-recipe` `noindex`~~; ~~Cuisine/MealType selector unit tests~~; ~~`updateIngredients` test + dead-code~~ **(R1 #248)** · ~~dropdown/`FormInput` uniformity (`recipeSelectStyles.ts`)~~ **(C1-tail)** · ~~summary-bar sticky~~ / ~~group-label styling~~ **(C1-tail audit — decided no-change)** | `[x]` [#252](https://github.com/jclind/prepify/pull/252) (2026-07-08) | `src/pages/AddRecipe/**`, `src/_exports.module.scss` | **merged** — C1 cluster fully resolved: R1 #248 folded in the tests/noindex/dead-code; this lane aligned the selects to `FormInput` (the one real fix) and closed the summary-bar (owner keeps release-at-end) + group-label (intentional post-overhaul) items as **decided, no code change**. Whole backlog board now drained. |
| **3** | **C2 · route-constant single-sourcing** | `RECIPES_PATH` const (`DesktopBar:45`,`NavMenu:20`,`Recipes.tsx:113-119`); `browseAll`→`clearFilters`; `accountTabs` as app-wide route source (`DesktopAccountMenu:74`,`footerData:43-44`,`DraftResumeBanner:47`) + `activeAccountTab` helper | `[x]` [#242](https://github.com/jclind/prepify/pull/242) (2026-07-07) | Navbar/* + `Recipes.tsx` + `accountTabs.tsx` + `footerData.ts` + `DraftResumeBanner.tsx` | **merged** — RECIPES_PATH migration is partial by design (nav/footer/browse only; other `/recipes` links deferred) |
| **3** | **C3 · SingleRecipe lane** ⚠ lane | CLS controls-block reserve (`SingleRecipe.tsx:308-317`, `RecipeControls.scss`); JSON-LD `</script>` escaping (`buildRecipeJsonLd.ts:38-39`) | `[x]` [#243](https://github.com/jclind/prepify/pull/243) (2026-07-07) | `SingleRecipe.tsx`, `buildRecipeJsonLd.ts` | **merged** — JSON-LD `</script>` escape only; hero `srcset` deferred to **I1**; **CLS half was a no-op** (`RecipeControls` owner-only, non-owner path already fully reserved) so `RecipeControls.scss` untouched (see status log) |
| **3** | **C4 · SearchRecipesInput lane** | autocomplete footer-label debounce disagreement (`:274` vs `:336`); press-`/` global focus-search feature | `[x]` [#238](https://github.com/jclind/prepify/pull/238) (2026-07-07) | `SearchRecipesInput.tsx` (+ Layout for key handler) | **merged** |
| **3** | **C5 · focus-ring tokens** ⚠ SCSS loner | `$focus-ring-*` group in `helpers.scss` + migrate ~13 literal `0 0 0 3px` rings | `[x]` [#241](https://github.com/jclind/prepify/pull/241) 2026-07-07 | `helpers.scss` + ~9 component `.scss` | **merged** — shipped as `@mixin focus-glow()` (parametrised, not a `$focus-ring-*` token set) |
| **4** | **I1 · image resize pipeline** | Storage width variants + `srcset`/`sizes` on card + hero (mobile LCP) | `[x]` [#247](https://github.com/jclind/prepify/pull/247) (2026-07-07) | Storage pipeline/CDN + `RecipeCard.tsx`, `SingleRecipe.tsx` hero | **merged** — frontend `srcset` + owner-gated Firebase Resize Images extension; **inert until the owner installs the extension, backfills, and flips `VITE_IMAGE_VARIANTS_ENABLED`** (two safety nets: build-flag + per-`<img>` fallback). Also carries C3's deferred hero `srcset` |
| **4** | **I2 · uid-key recipe images** | re-key `recipeImages/{uid}/{uuid}` (`src/api/recipes.ts:188`) + tighten `storage.rules:27-32` to owner | `[x]` [#249](https://github.com/jclind/prepify/pull/249) (2026-07-07) | `src/api/recipes.ts`, `storage.rules` | **merged** — uid-scoped uploads + owner-write rules (`request.auth.uid == uid`), fail-closed on no-uid; legacy flat path kept read-only for un-migrated objects. **Inert until the owner deploys the rules + migrates existing objects** (runbook in `docs/IMAGE_PIPELINE.md`). Also fixed I1's variant-naming doc example for the now-extensionless `{uuid}` originals. **Migration tooling shipped** in [#254](https://github.com/jclind/prepify/pull/254) (`server/scripts/migrateRecipeImagesToUid.js`, dev-verified) — the owner `--apply` run stays gated for the cutover |
| **4** | **I3 · autocomplete title index** | Mongo text index / Atlas Search for fuzzy fallback (`recipes.js:194-240`) | `[x]` [#245](https://github.com/jclind/prepify/pull/245) (2026-07-07) | `server/routes/recipes.js` (+ `server/db.js`) | **merged** — index-backed `$text` tier between exact + fuzzy; fuzzy scan now typo-only |
| **5** | **R0 · Claude conventions doc** | code & architecture standard (`CONVENTIONS.md`/CLAUDE.md) | `[x]` [#244](https://github.com/jclind/prepify/pull/244) (2026-07-07) | new doc | **merged** — shipped `docs/CONVENTIONS.md` (grounded in a 4-way survey + REFACTOR.md), cross-linked from `CLAUDE.md`; **R1/R2 now have a standard to follow** |
| **5** | **R1 · refactor create-recipe page** | the big AddRecipe refactor | `[x]` [#248](https://github.com/jclind/prepify/pull/248) (2026-07-07) | `src/pages/AddRecipe/**` | **merged** — structural refactor: extracted `useRecipeForm` (useReducer) + pure `recipeFormValidation` + `FormField`; fixed the TimeInput clear-both bug; +38 tests. Folded in **part** of C1 (noindex, selector tests, `updateIngredients` test + dead-code); C1's visual smalls (dropdown/`FormInput` uniformity, summary-bar sticky, group-label styling) still open. See status log. |
| **5** | **R2 · refactor account page** | the big Account refactor; **closes F6 (stale)** | `[x]` [#250](https://github.com/jclind/prepify/pull/250) (2026-07-07) | `src/pages/Account/**` | **merged** — subsumes F6 (closed stale); overlaps merged C2 |
| **6** | **N1 · price-data quality** | "$10 parfait" estimates + un-proven `backfillServingPrice --apply` (BACKLOG Bugs) | `[x]` closed — resolved via N6; re-enrich backfill re-filable (2026-07-08) | `server/scripts/`, `src/pages/AddRecipe/Ingredients/updateIngredients.ts` | **closed as resolved**: root cause was a stale v1 gram-estimate on **one** dev recipe (`1 cup strawberries` = $25.34), not a parse/division bug (0 servingPrice drift on dev). Durable defensive fix (option B, price-outlier flag) shipped in **N6** [#255]. The re-enrich backfill (option A) is **not built** — proxy-gated + prod-ops-gated + speculative (unknown if prod is dirty); **re-filable as a fresh owner ops task** if prod proves dirty and the v2 proxy is healthy. Option C (owner re-saves the parfait → self-heals under v2) is a manual 30-sec fix. |
| **6** | **N2 · report reason "incorrect info"** | new `ReportReason` across the 3 synced lists (BACKLOG Features) | `[x]` [#256](https://github.com/jclind/prepify/pull/256) (2026-07-08) | `src/types.ts`, `ReportControl.tsx`, `server/routes/reports.js` | **merged** — **Recipe-gated** (server 400s it on review/user targets; UI hides it). Also touched the admin queue reason pill (underscore→space) as a 4th display surface |
| **6** | **N3 · auth-page home links** | brand-mark `<div>` → `<Link to='/'>` on Login + Signup (BACKLOG UX) | `[x]` [#257](https://github.com/jclind/prepify/pull/257) (2026-07-08) | `src/pages/Login/`, `src/pages/Signup/` | **merged** |
| **6** | **N4 · SingleRecipe lane** ⚠ lane | author-byline + reviewer-name → `/u/:username` links; servings-pill spacing/glyph visual check (BACKLOG UX + pixel batch a) | `[x]` [#258](https://github.com/jclind/prepify/pull/258) (2026-07-08) | `src/pages/SingleRecipe/**` (incl. `Reviews/RecipeReview.tsx`) | **merged** — author-byline profile link + servings-pill (Lucide `+`/`−` glyphs, rebalanced spacing). Reviewer-name link deferred to §D (rule 8b); pill was screenshot-gated. Runtime-verified (byline click → `/u/:username`, pill rescale) |
| **6** | **N5 · polish sweep** | skip-link overscroll fix (A11y); RecipeNotFound copy/search; /recipes search-btn offset; footer bug-btn decision (pixel batch b, c) | `[x]` [#259](https://github.com/jclind/prepify/pull/259) (2026-07-08) | `Layout.scss`, `RecipeNotFound/*`, `Footer.scss` | **merged** — skip-link + RecipeNotFound copy/search shipped as code; search-btn 6px offset & footer left-adjacency closed by-design; footer bug-btn re-aligned to the legal-strip row per owner feedback |
| **6** | **N6 · ingredient-miss telemetry** (+ N1 outlier guard) | persist enrichment misses + admin list (BACKLOG Features, admin); **folds in N1's price-outlier flag** | `[x]` [#255](https://github.com/jclind/prepify/pull/255) (2026-07-08) | `server/routes/ingredients.js`, `server/routes/admin.js`, `src/pages/Admin/**` | **merged**: new `ingredientMisses` collection; write stays best-effort. N1's guard rides this surface as a second event type (flag, not clamp). Review folded in the missing `ingredientMisses` indexes (`{count,lastSeen}` + type-led compound) to match the auditLog pattern the route mirrors |
| **6** | **N7 · ops: storage-bucket env** | set `FIREBASE_STORAGE_BUCKET` (prod+dev) + real empty-env skip (BACKLOG Tech debt) | `[x]` [#260](https://github.com/jclind/prepify/pull/260) (2026-07-08) | server envs (owner) + `server/util/firebaseStorage.js` | **merged** — code half (early-return skip when env unset); owner confirmed the env is set on **both dev + prod**, so cleanup is live |
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
8. **Wave 6 N-tracks are mutually disjoint — any subset parallelizes.** Two seams to respect: **(a)** N2's
   `src/types.ts` is app-shared, but the change is an additive union member (merge-trivial; still rebase
   before PR); **(b)** N4's reviewer-name link lives in `RecipeReview.tsx`, which the **RELEASE_PLAN §D
   Ratings & Reviews overhaul** will rewrite — if that dedicated session is imminent, N4 ships only the
   author-byline link + pill check and §D absorbs the reviewer link (and the reviewer-avatar fold-in). N1 is
   investigate-first (no code until the backfill run + parfait spot-check attribute the bad data); N7's env
   half is owner-only.

**A clean parallel kickoff today (Wave 6):** **N3 + N4 + N5 + N6** in four worktrees — fully disjoint
domains (auth pages / SingleRecipe / polish smalls / server+admin). **N2** slots in as a fifth if wanted
(rebase-friendly). Run **N1**'s investigation solo in the main checkout (it's a dev-DB script run + data
spot-check, not a code lane yet), and hand **N7**'s env change to the owner. *(The original Wave 1–5 kickoff
note is retired — that board is drained.)*

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

### Wave 6 — 2026-07-08 note triage (N-tracks; all lanes disjoint)
The survivors of Jesse's Obsidian-note triage (item write-ups in `BACKLOG.md`, tagged *(triaged 2026-07-08)*).
Deliberately cut so every lane owns a disjoint file surface — see rule 8 for the two seams.
- **N1** price-data quality — the "$10 parfait". ✅ **Closed as resolved** — root cause was a stale v1
  gram-estimate on one dev recipe (not a parse/division bug); the defensive fix shipped in N6 [#255]. The
  re-enrich backfill (option A) is proxy/prod-ops-gated and re-filable as a fresh owner task. See status log.
- **N2** the `incorrect_info` report reason — one additive value across `types.ts` / `ReportControl` /
  `reports.js`, ideally gated to recipe targets.
- **N3** auth-page home links — `<Link to='/'>` around the brand mark on Login + Signup.
- **N4** SingleRecipe lane ⚠ — username→profile links (byline + reviewer name) + the servings-pill
  spacing/glyph screenshot check. Reviewer-name half yields to §D if that session is imminent (rule 8b).
- **N5** polish sweep — the skip-link overscroll fix (the one confirmed bug here), RecipeNotFound
  copy/search emphasis (owner voice), /recipes search-button offset, footer bug-button decision.
- **N6** ingredient-miss telemetry — persist enrichment misses + a read-only admin list.
- **N7** ops — `FIREBASE_STORAGE_BUCKET` in prod+dev envs (owner) + the empty-env early-return.

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
- **Reviewer avatars on review cards** — *(2026-07-08 triage)* deliberately **not** an N-track: it folds into
  the **RELEASE_PLAN §D Ratings & Reviews overhaul** (blocker), whose scope already owns `RecipeReview.tsx` +
  `reviews.js`. Write-up in BACKLOG Features.
- **Avatar customizer on the profile page** — *(2026-07-08 triage)* post-1.0 personalization idea, captured in
  `FEATURE_IDEAS.md` (builds on the existing upload flow + `DefaultAvatar`; a preset/color or XP-frame picker
  persisting a style descriptor).
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
- **2026-07-07** — **C2 merged** (PR [#242](https://github.com/jclind/prepify/pull/242), merge commit
  `c9eea00`; board row → `[x]`). All six required checks green before merge (Backend/Supertest, Frontend/Vitest,
  Static typecheck+build, E2e/Cypress 3m38s, Fallow advisory, GitGuardian); merged as a merge commit per
  convention, remote branch `worktree-feat+c2-route-constants` deleted, worktree torn down. **What landed:** the
  `src/routes.ts` extraction as described in the C2-implemented entry above, plus a **post-implementation
  `/code-review` pass** that caught the `routes.ts` header over-claiming to be "the single source of truth for
  route strings that appear in more than one place" while `RECIPES_PATH` migration is deliberately partial (9
  other `/recipes` literals across Home/About/PublicProfile/SingleRecipe/SavedRecipes/UserRatings/… stay inline,
  scope-guarded off C3/C4's files). Softened the comment to scope the claim to its actual nav/footer/browse
  consumers and name the deferred sites, so the const doesn't imply a centralization it doesn't yet provide
  (commit `0f9c8a0`, comment-only). **Follow-up filed-not-fixed:** the adopt-`RECIPES_PATH`-everywhere sweep once
  C3/C4's overlapping files have landed (C3 #243 merged concurrently just ahead of this).
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
- **2026-07-07** — **C3 merged** ([#243](https://github.com/jclind/prepify/pull/243), merge `7028520`, all 6 checks
  green) into `development`. The **SingleRecipe lane** landed as a **1-file security hardening** — `buildRecipeJsonLd.ts`
  gains `serializeRecipeJsonLd()` (stringify → replace every `<` with its backslash-u003c escape; still valid JSON,
  decoded back to `<` by any JSON-LD parser) and `SingleRecipe.tsx` renders that pre-escaped string straight into the
  `<script type="application/ld+json">` instead of `{JSON.stringify(...)}`. Closes the `</script>` breakout from
  user-controlled `title`/`description`/`instructions`: inert under today's CSR (React sets it as a text node) but a
  real vector the instant SSR/prerender serializes the subtree (rule 6) — shipped now so the deferred prerender PR has
  one less thing to remember. +6 tests (`buildRecipeJsonLd.test.ts`): no raw `<` survives, escape present, original
  text recoverable for a malicious title/description/instruction, plus core build output. **CLS controls-block reserve
  shipped as a no-op** — investigation found `RecipeControls` renders only for the recipe owner
  (`RecipeControls.tsx:52`), so the BACKLOG item's "CLS ≈ 0.10" was an owner-view measurement; the SEO-relevant
  logged-out/non-owner path is already fully reserved (action-bar skeletons, `.sr-controls` `min-height`), and per an
  explicit product call ("tailor to non-owners, don't reserve for the signed-in owner") the owner-only shift is left
  unreserved. Net: `RecipeControls.scss` untouched, hero `srcset` still deferred to **I1**. **Verified** pre-merge:
  tsc + Vitest (563 pass) + build clean, and runtime — headless Chrome route-intercepted a `</script>` payload into a
  live recipe's title/description and confirmed the rendered ld+json script escaped it to `</script>` with
  `JSON.parse` recovering the exact payload, no raw `</script>`, 0 console errors (no shared-DB mutation). Remote
  branch deleted, worktree torn down. (**R0** lane left running untouched.)
- **2026-07-07** — **I3 claimed** (`worktree-feat+i3-autocomplete-index`). Claim recorded on `development`
  (same convention as S4–S7/F1–F5/C2–C5/R0) so concurrent sessions see the lane taken. **Owner-chosen** via a
  decision prompt: with every Wave-3 self-contained lane resolved (**C4**/**C5** `[x]`, **C2** `[P]` #242,
  **C3** `[x]` #243) and every other open item decision-gated (**F6** "defer to R2", **C1** rule-5 refactor-vs-
  smalls) / structural (**I1**/**I2** image pipeline) / owner-scoped (**R1**/**R2**, and blocked on R0 landing),
  I3 is the one remaining **completable** track — server-only, Jest-backed, disjoint from every live lane (C2 =
  frontend routes, R0 = new doc). **Scope re-verified against the tree, and it has drifted from the board:** the
  autocomplete *fuzzy fallback already exists in-process* — `fuzzyRankTitles` (`server/util/recipeTitleMatch.js`,
  landed #167) ranks a capped `FUZZY_CANDIDATE_CAP = 1000` candidate scan (`recipes.js:227-241`); and there is
  **no `$text` index** on `recipes.title` in `db.js`'s `ensureIndexes()` (title reads today are unindexed — the
  exact-substring `$regex` pass at `:219` and the fuzzy candidate pull are both COLLSCANs). So I3's remaining
  scope is purely the **scalability** half the board named: **owner chose a Mongo `$text` index over Atlas
  Search** (low urgency at current catalog size) — add the index in `ensureIndexes()` and back the fuzzy
  candidate source with it instead of the 1000-doc scan, keeping the exact-substring first pass. Note `$text` is
  word/stem-tokenised so it *won't* catch typos ("chikcen") on its own → `fuzzyRankTitles` stays as the final
  typo-tolerant ranker; `$text` just makes the candidate pull index-backed and unbounded-safe (exact design to
  be settled in-lane). Extend the existing `recipeTitleMatch.test.js` + a route test. Touches only
  `server/routes/recipes.js` + `server/db.js`. **Anti-race note:** the `[~]` row flip reached origin by being
  swept into the concurrent **C3 `/worktree-land`** session's commit `02d9946` ("flip C3 to [x]"), which ran
  `git commit` over the whole board file while my I3 edit sat in this shared checkout's working tree (same
  swept-in pattern documented for C5/R0) — verified both rows truthful and line-distinct (C3 genuinely `[x]`
  #243 merged `7028520`; the I3 flip is mine) before proceeding; this entry is the missing log half. **Worktree
  audit (no forgotten/unmarked work):** c2 = #242 `[P]` with real committed route-constant work; c3 = merged
  (#243) / torn down; r0 = `[~]` claim-only (0/0 vs development, claim commit only — expected, just claimed).
  `development` in sync with origin (0/0) before appending. Worktree not yet created.
- **2026-07-07** — **F4 reclaimed** (`worktree-feat+f4-changepw-subhead`, keeping the original branch name — it's
  free). The prior `[~]` claim was an **orphan**: traced it to commit `45682f4` (2026-07-06 17:26, *"flip F1 to
  [x] (merged #235)"*), a **docs-only** commit that recorded the F4 claim on `development` but **never created a
  worktree or touched code** — the standard "claim first, worktree second" step that then got stranded. The **F5
  log entry (above)** is the smoking gun: that same session (`01JwP5…`) bundled the F4 claim into its F1-merge
  commit, then **backed off F4 and took F5**, leaving the `[~]` behind; later sessions saw the branch name with no
  local worktree and *guessed* "another machine," but the real cause is the abandoned claim step. **Verified
  abandoned, not in-flight:** no `worktree-feat+f4-changepw-subhead` ref in any namespace (local/remote/tags/notes,
  post `--prune` fetch), no PR ever (open/closed/merged), the claim commit was docs-only so the target still sits
  unfixed at `AccountSection.tsx:188`, the claim is >24h old (every other same-day claim here PR'd within hours),
  and `development` is 0/0 with origin. Owner authorized the reclaim after this diagnosis. Scope (single verified
  item): drop the redundant `<h3 class='sr-subhead'>Change password</h3>` at
  `src/pages/Settings/sections/AccountSection.tsx:188` — the section is already labelled, so the SR-only subhead is
  duplicative (mirror the audit note; confirm the paired `Connected accounts` subhead at `:229` and the
  `.sr-subhead` rule in `sections.scss:27` before touching either). Frontend-only, one file, disjoint from the two
  live worktrees (I3 = `server/`, R0 = new doc). Worktree not yet created.
- **2026-07-07** — **I1 claimed** (`worktree-feat+i1-image-pipeline`). Claim recorded directly on `development`
  (same convention as S4–S7/F1–F5/C2–C5/R0/I3/F4) so concurrent sessions see the lane taken. **First Wave-4
  lane** — opened after an owner decision prompt, since every remaining open `[ ]` track is gated: **R1/R2** are
  blocked on **R0** landing (still in flight), **C1** is subsumed by R1 (rule 5), **F6** defers to R2, and
  **I1/I2** are the structural Wave-4 pair needing an infra call. Owner picked **I1** (biggest remaining mobile-LCP
  lever, and completable without waiting on R0). **Infra sub-decision — owner chose the Firebase Resize Images
  extension** (`storage-resize-images`) over client-side canvas resize / a custom sharp Cloud Function / an
  external CDN: idiomatic to the existing Firebase Storage stack, lowest custom-code + bug surface, backfills
  existing objects via its own import tool; cost is Blaze (pay-as-you-go, ≈ pennies/mo at this catalog size) + the
  owner-run `ext:install` in **both** the dev (`prepify-dev-58579`) and prod projects. Scope, two halves: **(A)
  generate variants** — install + configure the extension (width variants e.g. 400/800/1600, WebP) in
  `firebase.json`/`extensions/`, and resolve the download-URL/token gotcha (each resized object gets its own
  Storage token, so a `srcset` can't reuse the original's `?token=` — switch the recipe-image path to token-less
  public URLs `https://storage.googleapis.com/<bucket>/<path>`, which the existing "public read" `storage.rules`
  already permit, making `srcset` pure path-templating) + an original-fallback for the async post-upload gap;
  **(B) consume variants** — add `srcset`/`sizes` to `RecipeCard.tsx` and the `SingleRecipe.tsx` hero (mobile LCP).
  The actual `ext:install` + Blaze enablement + existing-image backfill run stay **owner-gated** (like the S6 prod
  ops run) — the config, URL migration, frontend consumption, and a documented runbook are the deliverable; the
  install/backfill is a separate owner action. **Unblocks C3's deferred hero `srcset`.** Touches `firebase.json`,
  new `extensions/` config, `storage.rules` (if the public-URL switch needs it), `src/api/recipes.ts` (upload/URL
  shape), `RecipeCard.tsx`, `SingleRecipe.tsx` — **overlaps I2** (`src/api/recipes.ts` + `storage.rules`), so I2
  stays serialized behind this lane (board already pairs them). **Anti-race / worktree audit:** shared
  `development` checkout — a concurrent session appended the **F4 reclaim** entry (above) and pushed mid-claim;
  verified F4 is disjoint (`AccountSection.tsx`) and its row truthful. Live local worktrees each match their board
  rows with no forgotten/unmarked work: `feat+c2-route-constants` = **#242 merged** (branch fully in `development`,
  0 unique commits — a torn-down-pending leftover; board row already `[x]`), `feat+r0-conventions-doc` = `[~]`
  claim-only (0 ahead of `development`, no doc work yet — expected). I3/F4 are claimed on other machines (no local
  branch/worktree). `development` in sync with origin (0/0) before appending. Worktree not yet created.
- **2026-07-07** — **R0 merged** ([#244](https://github.com/jclind/prepify/pull/244), merge `1011ca7`) → `[x]`.
  Shipped **`docs/CONVENTIONS.md`** — the house code & architecture standard — plus a pointer at the top of
  `CLAUDE.md`. **First Wave-5 lane; unblocks R1/R2** (they now have a documented standard to follow). Docs-only
  (+398 lines, no source touched). Covers: **frontend** (one-way `pages → Components → hooks/util/api` layering,
  `src/`-absolute imports, `src/types.ts` persisted-shape ownership, class+singleton API clients over one axios
  instance w/ token interceptor, React Query v5, `useAuth`/lazy `getAuth`, the `useMemo`/`useCallback`/`React.memo`
  render-stability rule, route-string single-sourcing); **backend** (`asyncHandler`-wraps-every-handler, middleware
  order `verifyToken → requireActive/requireAdmin → limiter`, trust-the-token identity, per-uid `makeUserLimiter`,
  server-authoritative `validateRecipeBounds`, atomic conditional writes, `getDB()` singleton, machine-readable
  error `code` shapes, the Phase-5 API contract, firebase-admin v14); **design/SCSS** (colocated `.scss`,
  tokens-not-literals, the `focus-glow` vs `outline()` split, hover dialects, the Lucide icon boundary + guard) —
  **cross-linking `scss-conventions.md` + `design/*` rather than duplicating**; **testing** gates + mocking +
  regression practice; env/config; and the behaviour-preserving / separate-PR / worktree process rules. **Method:**
  grounded in a 4-way parallel codebase survey (frontend/server/design/testing) + `REFACTOR.md`'s Decision Log,
  every rule anchored to a real `file:line`. **Two accuracy calls baked in:** (1) `src/routes.ts` didn't exist at
  R0's fork point (**C2** [#242](https://github.com/jclind/prepify/pull/242) hadn't merged into the base), so
  route single-sourcing is documented as it *actually* was — `accountTabs.tsx` for account sub-routes, top-level
  strings still hardcoded — with C2 flagged as the in-flight extension (C2 has since merged; a later doc pass can
  drop the "in-flight" caveat); (2) the `DB_NAME` gotcha (runtime hardcodes the `prepify` db; only
  `server/scripts/` read `DB_NAME`). **Verified:** all 6 CI checks green (Backend/Frontend/Static/E2e-Cypress
  3m30s/Fallow/GitGuardian); internal links resolve (every referenced doc/source file exists on disk) and a stray
  Devanagari typo was caught + fixed pre-merge. Merged as a merge commit; remote branch deleted; main-checkout
  `development` fast-forwarded (no divergence). **Follow-ups filed-not-fixed:** refresh §2.8's "in-flight" note once
  C2's `src/routes.ts` is adopted everywhere; the `#29a155` `.has-success` token drift (§4.2) stays a separate
  colour-token dedup. **Other live lanes untouched:** I1/I3 (`[~]`), F4 (reclaimed), C3 (#243 `[P]`).
- **2026-07-07** — **I3** implemented in `worktree-feat+i3-autocomplete-index` → PR
  [#245](https://github.com/jclind/prepify/pull/245) opened (`[P]`). Server-only. **Scope had drifted from the
  board** (claim entry has the detail): the autocomplete *fuzzy fallback already existed in-process*
  (`fuzzyRankTitles`, #167); the open half was **scalability** — every under-filled query (exact substring < 8)
  ran a capped **1000-doc candidate COLLSCAN** to feed the ranker, unindexed and blind to near-misses past the
  first 1000 as the catalog grows, with **no `$text` index** on `recipes.title`. Added `{ title: 'text' }` in
  `db.js` `ensureIndexes` and inserted an **index-backed `$text` tier** between the exact-substring pass and the
  fuzzy fallback: (1) exact `$regex` (unchanged, precise/ordered); (2) **new** `$text` word/stem match —
  index-backed, scales, matches query words in **any order/position** ("basil salmon" → *Grilled Salmon with
  Tomatoes & Basil*) and **stems** ("grilling" → *Grilled …*); (3) fuzzy Levenshtein (unchanged) — now only runs
  for actual typos (`$text` can't match misspellings), so the correctly-spelled hot path no longer hits the
  capped scan. Owner chose Mongo `$text` over Atlas Search (low urgency). A new `toTextSearch()` strips `$text`
  operator chars (leading `-`, quotes) so user input can't flip the query into a negation/phrase; the `$text`
  tier is `try/catch`-guarded so a missing/late index **degrades to the fuzzy scan instead of 500-ing**;
  `RECIPE_VISIBLE` preserved in every tier. Tests: `toTextSearch` unit cases + route tests for the stemmed
  `$text` match (picked below the 0.7 fuzzy threshold so it isolates tier 2) and index-absent graceful
  degradation. **Server Jest 747/747.** **Runtime-verified** against the live dev API across all three tiers +
  sanitization (`basil salmon`/`pasta sausage` out-of-order, `grilling` stemmed, `chikcen`/`medaterranean` typo,
  `tuscan` substring, `-salmon` sanitized), and confirmed no internal `_score` leaks into the payload. **Push
  note:** direct pushes to `development` are policy-gated this session, so the `[~]`→`[P]` board flip is committed
  locally and rides the next land sweep to origin (same swept-in pattern as the C2/C3 lands that carried the I3
  `[~]` claim + its log entry up). **Hero `srcset`/I1 untouched** — disjoint lane.
- **2026-07-07** — **F4** implemented in `worktree-feat+f4-changepw-subhead` → PR
  [#246](https://github.com/jclind/prepify/pull/246) opened (`[P]`). Frontend-only, one-line removal. Dropped the
  redundant `<h3 class='sr-subhead'>Change password</h3>` (`AccountSection.tsx:188`): the change-password
  subsection in **Settings → Account & Security** is already self-describing — its fields carry their own labels
  (*Current / New / Confirm password*) and the **Update password** button names the action — so under the
  governing `<h2>Account & Security</h2>` (`Settings.tsx:103`) the extra `<h3>` just restated the button and added
  clutter. Kept the `.sr-subsection` wrapper (its `border-top` divider) so the block retains its visual grouping;
  only the redundant label is gone. **`Connected accounts` keeps its subhead on purpose** — it labels a passive,
  display-only provider list with no self-describing control. Repointed the federated-account *"hides the
  change-password section"* test off the removed heading text onto the block-unique **New password** field label
  (the `Update password` button check unchanged) so it stays meaningful; the 7-test `describe('change password')`
  block that renders this exact subsection for a password-provider user is unaffected. **Verified:** `tsc` clean,
  Vitest **568 passed / 2 skipped** (77 files, `AccountSection` suites 25/25), `npm run build` clean. *No authed
  pixel screenshot — the block is gated behind `hasPasswordProvider` and the Cypress `test-cypress-user` has no
  `password` provider (custom-token uid, empty `providerData`), so `cy.login()` can't render it without mutating
  shared dev-auth; a pure static-markup removal covered by the render tests + retained-divider CSS.* **Reclaim
  provenance** (see the earlier F4-reclaimed entry): the prior `[~]` was an orphaned claim-only step from
  `45682f4` that never created a worktree; verified abandoned (no ref/PR anywhere) before reclaiming. **Follow-up
  filed-not-fixed:** the heading asymmetry (password subsection now divider-without-heading vs *Connected
  accounts*'s divider+heading) is inherent to the owner's "this heading is redundant" call — left as a separate
  visual-design decision. **Anti-race / swept-in:** this same commit carries the concurrent **I3** session's
  truthful `[~]`→`[P]` #245 row flip + its status-log entry (that session is push-gated and expected the flip to
  ride the next sweep — verified #245 genuinely OPEN and its rows line-distinct from mine); the F4 and I3 board
  edits don't overlap. `development` HEAD was `74b429b` (== origin, I1 claim + R0 #244 merge already landed) before
  this append.
- **2026-07-07** — **I1** implemented in `worktree-feat+i1-image-pipeline` → PR
  [#247](https://github.com/jclind/prepify/pull/247) opened (`[P]`). First Wave-4 lane. Serves right-sized WebP
  variants for the browse-grid card + single-recipe hero (the main mobile-LCP lever) via the owner-chosen
  **Firebase Resize Images** extension. Split into two halves. **(A) generate variants (owner-gated install):**
  `firebase.json` + `extensions/storage-resize-images.env` pin `firebase/storage-resize-images@0.3.5` → 400/800/1600
  WebP variants beside each original, scoped to `recipeImages/` (`INCLUDE_PATH_LIST`); **same-directory output keeps
  them a single path segment under `recipeImages/{imageId}`, so the existing `allow read: if true` rule covers them —
  no `storage.rules` change**; original kept as the fallback. `docs/IMAGE_PIPELINE.md` is the install/backfill/flag
  runbook incl. the one owner **VERIFY** step (variant filename must match the helper's `<stem>_WxH.webp`) + the
  mixed-bucket caveat. **(B) consume variants (the runtime change):** `src/util/recipeImageVariants.ts` derives
  **token-less** variant URLs from the stored original, **bucket-agnostic** (the dev catalog spans buckets —
  legacy `prepify-9b974.appspot.com` *and* the dev bucket). Token-less `?alt=media` reads are authorized by the
  existing public-read rule (**verified 200** against a real image), sidestepping the per-variant download-token
  problem the board flagged; `RecipeCard` + `SingleRecipe` hero emit `srcset`/`sizes` with a per-image `onError`
  fallback to the original. **Two safety nets → safe to merge before the install:** (1) `VITE_IMAGE_VARIANTS_ENABLED`
  gates srcset emission (default **off** ⇒ zero behaviour change, no variant requests); (2) `onError` fallback covers
  legacy/un-backfilled images + the post-upload gap. **Verified:** `tsc` clean, Vitest **577 pass / 2 skip** (+9 new
  helper tests), `build` clean; **runtime (headless Chrome vs the running dev app):** flag **off** → no srcset, **0**
  variant requests, images load (identical to pre-I1); flag **on** → srcset emitted (**11** variant requests),
  variants **404** (well-formed/token-less/correct-bucket — confirmed by `curl`), `onError` falls back so **every
  image still loads**. Happy-path rendering (variants present) is the owner's post-install VERIFY step. **Also closes
  C3's deferred hero `srcset`**; pairs with **I2** (runbook note). Frontend + config only; no `server/` change.
  **`[P]` flip recorded on `development` directly** (not the lane branch), same convention as C2–C5 — keeps backlog
  edits off the PR. `development` in sync with origin (0/0) before this append.
- **2026-07-07** — **R1 claimed** (`worktree-feat+r1-addrecipe-refactor`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5/C2–C5/R0/I3/F4/I1) so concurrent sessions see the lane taken.
  **Second Wave-5 lane** — opened after an owner decision prompt: with every self-contained lane resolved and
  every other open track gated (**I2** collides with the in-flight **I1** `[P]` #247 on `src/api/recipes.ts` +
  `storage.rules` → serialized behind it; **C1** subsumed by R1 per rule 5; **F6** "defer to R2"; **R2** softly
  overlaps the in-flight **F4** `[P]` #246 Settings/Account surface), the owner picked **R1** over R2/C1/hold.
  R1 is now unblocked — **R0** (`docs/CONVENTIONS.md`) merged [#244](https://github.com/jclind/prepify/pull/244)
  specifically so R1/R2 have a documented standard to follow — and per rule 5 the refactors are now "imminent,"
  so ship R1 (which **subsumes the whole C1 cluster**) rather than the C1/F6 smalls. **Collision surface
  disjoint from all three live lanes:** R1 owns `src/pages/AddRecipe/**` (40 files, `AddRecipe.tsx` 579 lines);
  F4 = `Settings/sections/AccountSection.tsx`, I1 = `RecipeCard.tsx`/`SingleRecipe.tsx`/`src/api/recipes.ts`/
  Storage config, I3 = `server/` — none touch AddRecipe. **Scope (to be finalized in-lane against the existing
  planning docs — `docs/ADD_RECIPE_AUDIT.md`, `ADD_RECIPE_UX_AUDIT.md`, `REFACTOR.md`, `REFACTOR_NOTES.md` — and
  `docs/CONVENTIONS.md`):** the create-recipe page refactor, folding in the deferred **C1 cluster** (dropdown/
  `FormInput` uniformity via `recipeSelectStyles.ts`; summary-bar sticky behaviour; group-label styling;
  `/add-recipe` `noindex`; Cuisine/MealType selector unit tests; `updateIngredients` test + dead-code) and the
  two filed-not-fixed TimeInput follow-ups that belong here (the clear-both-fields writeback that never fires
  `if (minutes || hours) setVal(...)` at `TimeInput.tsx:61-64`, latent-but-reachable since F1). A concrete plan
  will be presented to the owner before heavy implementation spend, since this is a large owner-scoped refactor.
  **Worktree audit (no forgotten/unmarked work):** the three live worktrees each match their `[P]` board rows
  with real committed work + open PRs — f4 = #246, i1 = #247, i3 = #245; all other local branches are merged/
  stale/the known off-board `moderation-pr-c-ratelimiter` orphan. `development` in sync with origin (0/0) before
  this append. Worktree not yet created.
- **2026-07-07** — **I3 merged** ([#245](https://github.com/jclind/prepify/pull/245), merge commit `2456a08`,
  `worktree-feat+i3-autocomplete-index` torn down). **What landed:** `/api/searchAutoCompleteRecipes` went from
  two tiers (exact `$regex` substring → capped in-process fuzzy scan) to **three** — a new index-backed `$text`
  word/stem tier slots between them, backed by a `{ title: 'text' }` index added to `ensureIndexes()` in
  `server/db.js`. Correctly-spelled queries — including **out-of-order multi-word** ones the adjacent-substring
  pass structurally can't match (`"basil salmon"` → *Grilled Salmon with Tomatoes & Basil*) and **stemmed**
  forms (`grilling`→grill←grilled) — now serve off the index and skip the `FUZZY_CANDIDATE_CAP = 1000` scan
  entirely; the O(n) Levenshtein fallback still runs but only when tiers 1–2 leave slots open, i.e. genuine
  typos `$text` can't stem-match (`chikcen`→*…Chicken…*). A shared `addUnique` accumulator dedupes by `_id`
  across all three tiers and caps at `AUTOCOMPLETE_LIMIT = 8`; `RECIPE_VISIBLE` is preserved in every tier.
  **Safety:** user input is stripped of `$text` phrase (`"`) and per-term negation (leading `-`) operators via a
  new `toTextSearch` sanitizer (else `salmon -grilled` would *exclude* grilled) — the exact tier keeps its
  `escapeRegex`; and the `$text` tier is `try/catch`-guarded so a missing/deferred text index **degrades to the
  fuzzy scan rather than 500-ing** the endpoint (logs `[autocomplete] $text search unavailable: …`). **Design
  call:** Mongo `$text` over Atlas Search per owner (low urgency at today's catalog size); one text index per
  collection, `title` is the only autocompleted field. **Verified:** full server Jest suite 747/747 (adds a
  stemmed-match test that isolates tier 2 — `grilling`/`Grilled Salmon` scores 0.625 < the 0.7 fuzzy threshold,
  so only `$text` can surface it — and an index-absent degradation test that drops/recreates the text index).
  Runtime-verified live against the dev API: all three tiers, operator-sanitization probes, regex-injection
  (`.*`/`.+` → `[]`, no catalog dump), the 8-cap, and graceful degradation (dropped `title_text` → `grilling`
  returns `[]` HTTP **200**, not 500; recreated → match returns). **Filed-not-fixed (no action, by owner
  decision):** the `{ title: 'text' }` build is `await`ed in `ensureIndexes()`, so it blocks startup readiness —
  benign at current sub-second scale, and uniquely safe to defer because the route degrades gracefully without
  it (unlike the browse index); the documented trigger to revisit is the whole `ensureIndexes()` set going
  non-blocking if the collection ever grows enough to stall a cold build. **Other live lanes untouched:** I1
  `[P]` #247, F4 `[P]` #246, R1 claimed — none touch `server/routes/recipes.js` or `server/db.js`. First Wave-4
  **I**-track done; `development` fast-forwarded to origin (0/0), no concurrent board commits to rebase.
- **2026-07-07** — **F4 merged** ([#246](https://github.com/jclind/prepify/pull/246), merge commit `b7f1384`) → `[x]`.
  Dropped the redundant `<h3 class='sr-subhead'>Change password</h3>` (`AccountSection.tsx:188`): the
  change-password subsection in **Settings → Account & Security** is already self-describing — its fields carry
  their own labels (*Current / New / Confirm password*) and the **Update password** button names the action — so
  under the governing `<h2>Account & Security</h2>` the extra `<h3>` just restated the button. Kept the
  `.sr-subsection` wrapper (its `border-top` divider) so the block retains its visual grouping; **`Connected
  accounts` keeps its subhead** (it labels a passive, display-only provider list with no self-describing control).
  Repointed the federated-account *"hides the change-password section"* test off the removed heading text onto the
  block-unique **New password** field label so it stays meaningful. **Reclaim provenance:** the prior F4 `[~]` was
  an orphaned claim-only step from `45682f4` (docs commit that never created a worktree — the claiming session had
  pivoted to F5); verified abandoned (no branch/PR/ref anywhere) before reclaiming under owner authorization.
  **Verified:** gates — `tsc` clean, Vitest **568 passed / 2 skipped** (77 files, `AccountSection` 25/25), build
  clean; **runtime `/verify`** — drove the real **signup → create-username → Settings → Account & Security** flow
  in headless Chromium against dev infra to mint a genuine `password`-provider session (the Cypress test user has
  no password provider so `cy.login()` can't reach the block), confirmed the DOM has no "Change password" subhead
  while all password fields + **Update password** + the *Connected accounts* heading render, and probed the block's
  validation live (empty-current → "Current password required"; mismatch → "New passwords do not match" on both
  fields); throwaway dev account + Mongo username reservation cleaned up afterward, 0 console errors. **Follow-up
  filed-not-fixed:** the heading asymmetry (password subsection now divider-without-heading vs *Connected
  accounts*'s divider+heading) is inherent to the owner's "this heading is redundant" call — a separate
  visual-design decision. **Swept-in:** this same commit carries the concurrent **I3** session's truthful
  `[P]`→`[x]` #245 flip + its status-log/BACKLOG entries (I3 genuinely merged `2456a08`; rows line-distinct from
  F4's) — `development` was fast-forwarded to origin `b7f1384` (my F4 merge) with the I3 doc edits preserved before
  this append. **Wave 2's active items are all landed** (F1–F5 merged; **F6** remains `[ ]`, intentionally deferred
  into R2). Other live lanes untouched: I1 `[P]` #247, R1 claimed.
- **2026-07-07** — **I1 merged** ([#247](https://github.com/jclind/prepify/pull/247), squash `2270777`). Responsive
  recipe-image variants: a bucket-agnostic URL helper (`src/util/recipeImageVariants.ts`) derives a token-less
  WebP `srcset` (400/800/1600w) from the stored original URL, wired onto the browse-card thumb (`RecipeCard.tsx`)
  and the SingleRecipe hero (`SingleRecipe.tsx`) — the latter is **C3's deferred hero `srcset`**, landed here.
  Backend is the owner-gated **Firebase Resize Images** extension pinned in `firebase.json` +
  `extensions/storage-resize-images.env` (same-dir variants ⇒ no `storage.rules` change; runbook in
  `docs/IMAGE_PIPELINE.md`). **Ships inert:** `VITE_IMAGE_VARIANTS_ENABLED` defaults off (no `srcset`, zero
  behaviour change) and even flag-on keeps the original as `<img src>` with a per-image `onError` fallback, so a
  missing/un-backfilled variant never shows a broken image. **Owner follow-ups (filed-not-fixed):** install the
  extension on dev then prod (Blaze), backfill existing images, VERIFY the variant naming is `<stem>_WxH.webp`
  (the one thing the frontend can't self-check — see runbook §2), then flip the flag. **Verified** pre-merge:
  CI green (Vitest/Supertest/typecheck+build/Cypress all pass) + a runtime Playwright pass — flag **off** = 0
  variant requests / no `srcset` (identical to pre-I1); flag **on** = `srcset` emitted, browser selects the
  DPR-appropriate variant, and 9 malicious `recipeImage` payloads (HTML/attr/`javascript:`-injection, path
  traversal, malformed `%`-encoding, 9 KB URL) all rendered inert (no XSS/throw). **Local code review:** clean,
  no blocking issues. **Other live lanes untouched:** R1 claimed. **I2** (uid-key recipe images) is the natural
  next pair — keep resized variants in the same directory as their original if I2 re-keys the path.
- **2026-07-07** — **I2 claimed** (`worktree-feat+i2-uid-key-recipe-images`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5) so concurrent sessions see the lane taken. Scope: recipe-image
  uploads land at `recipeImages/${imageFile.name}` (`src/api/recipes.ts:188`), keyed by the raw filename — so
  (a) two users uploading `photo.jpg` collide/overwrite and (b) `storage.rules:27-32` can only auth-gate the
  path, not scope writes to the owner (any signed-in user can overwrite/delete any recipe image). Re-key new
  uploads to `recipeImages/${uid}/${uuidv4()}` (both `AuthAPI.getUID()` and `uuidv4` are already imported in
  `recipes.ts`) and tighten the Storage rule to `request.auth.uid == uid` (mirroring the uid-scoped
  `profilePhotos/{userId}` at `:15-21`). **Constraint from I1** (#247, just merged): the owner-gated Firebase
  Resize Images extension writes variants in the *same directory* as the original, so the new `{uid}/` prefix
  must keep original + variants co-located (no separate variants path / rules split). Migrating existing
  filename-keyed objects is an owner-gated ops step (like I1's backfill) — the code re-key + rule tightening is
  the deliverable. **Disjoint from the one in-flight lane:** R1 (`src/pages/AddRecipe/**`) touches neither
  `src/api/recipes.ts` nor `storage.rules` (verified against its branch diff); F6 deferred into R2, C1 subsumed
  by R1. Verified the bug is still present, no forgotten/unmarked worktree exists (only R1 is live, on its
  marked track), and `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-07** — **R1** implemented in `worktree-feat+r1-addrecipe-refactor` → PR
  [#248](https://github.com/jclind/prepify/pull/248) opened (`[P]`). The **create-recipe refactor**, owner-scoped
  to *moderate* (hook + section components), one lane, sequenced commits, **subsuming the live C1 cluster**.
  **Structural (behaviour-preserving), three commits:** (1) `recipeFormValidation.ts` — pure
  `validateRecipeForm(state) → errors` + `isRecipeFormValid`, lifted verbatim from the in-component `validate()`
  (same messages/rules; cook time, cuisine, diet stay optional), +8 unit tests; (2) `useRecipeForm.ts` — all form
  logic out of the 579-line god component into a hook: field state is a **typed `useReducer`** whose `SET_FIELD`
  supports the useState updater-fn form so child setters keep their `Dispatch<SetStateAction<T>>` contract
  (Ingredients/Instructions containers rely on functional updates), and the hook owns the draft
  hydration/URL-sync/validation effects + draft-autosave wiring + `handleSubmit`; ancillary UI/status state stays
  `useState`; (3) `FormField.tsx` — collapses the repeated `<div className='X input-field'>`+`SectionHeader`+inline
  error+control scaffold into one wrapper, **byte-identical DOM** (classes/header/error/aria) so CSS+tests are
  untouched. Net `AddRecipe.tsx` **579 → 257 lines**, purely presentational. **C1 folded in:** TimeInput
  clear-both-fields fix (emptying both fields now propagates `null` instead of silently keeping the stale time on
  edit — the `if (minutes||hours)` writeback never fired the all-empty case; gated behind a `hasUserEdited` ref so
  the pre-hydration render can't be mistaken for a user clear; closes the F1-filed follow-up) +2 tests;
  `/add-recipe` `noindex` meta (matches Account/Settings/CreateUsername); Cuisine/MealType selector unit tests
  (+12, incl. the fixed meal-type placeholder regression); `updateIngredients` +7 tests and removal of the
  long-dead commented `mixedToDecimal`/`decimalToFraction` block (the function is **live** — SingleRecipe servings
  stepper, not dead). **Deferred (filed-not-fixed):** the two *subjective visual* C1 items — dropdown/FormInput
  uniformity + group-label styling — are brand/design calls (the dropdowns' orange focus/hover was a deliberate
  recent `recipeSelectStyles.ts` fix vs FormInputs' teal `$secondary` per C5; converging them changes
  brand-orange→teal, owner-owned territory), left for a design pass. **Verified:** `tsc` clean, `npm run build`
  clean, Vitest **597 pass / 2 skip** (+29 new) incl. the 25-case `AddRecipe` suite that mounts the real
  component → `useRecipeForm` (real reducer/validation/effects) + the draft-resume flows; the authed
  real-component `addRecipe.cy.ts` (13 tests) runs as a **required CI check** and every DOM/class hook it selects
  (`.prep-time`/`.course`/`.cuisine`/`.instructions`/`.submit-btn` + all placeholders) is preserved by the
  FormField refactor (statically verified) — a full local Cypress run needs the reserved 3000/4000 ports +
  Admin token-minting, disproportionate for a behaviour-preserving refactor, so the authed E2E rides CI.
  **`[P]` flip recorded on `development` directly** (not the lane branch), same convention as C2–C5/I1/I3 — keeps
  backlog edits off the PR. **Anti-race:** a concurrent session claimed **I2** (`src/api/recipes.ts` +
  `storage.rules`) mid-lane — disjoint from R1 (`src/pages/AddRecipe/**`), its claim already committed to
  `development`; my R1 row + this entry are line-distinct. `development` was 0/0 with origin before this append.
- **2026-07-07** — **R2 claimed** (`worktree-feat+r2-account-refactor`). Claim recorded directly on
  `development` (same convention as S4–S7/F1–F5/C2–C5/R0/I3/F4/I1/R1) so concurrent sessions see the lane taken.
  **Third Wave-5 lane, and the last substantive open track** — the board is otherwise drained: **C1** is
  subsumed by **R1** (folded into #248), and **F6** ("defer to R2") folds into *this* lane. **Owner-authorized:**
  with R1 being landed/verified in a separate session, the Wave-5 "refactors serialize" guidance is moot here
  because R2's domain is **disjoint** from R1's — verified R1 #248's diff touches only `src/pages/AddRecipe/**` +
  its `src/test/*` selectors + `src/util/updateIngredients.ts`, **nothing** under `src/pages/Account/**` (R2's
  20-file exclusive domain: `Account.tsx`/`.scss`, `components/{accountTabs,SegmentedNav,ProfileControls,LevelCard,
  AchievementsModal}`, and the `Drafts`/`SavedRecipes`/`UserRatings`/`UserRecipes` sub-pages). **Scope (to be
  finalized in-lane against `docs/CONVENTIONS.md` + the planning docs, and presented to the owner before heavy
  implementation spend, per the R1 precedent):** the account-page refactor following the R0 standard, folding in
  the deferred **F6** (Saved/Ratings SegmentedNav polish). Overlaps the *already-merged* **C2** — `accountTabs.tsx`
  + the `ACCOUNT_*_PATH`/`activeAccountTab` route single-sourcing already landed, so R2 builds on it rather than
  colliding. **Worktree audit (no forgotten/unmarked work):** the two live worktrees each match their board rows —
  **I2** `[~]` (`feat+i2-uid-key-recipe-images`) is genuinely mid-implementation (uncommitted `src/api/recipes.ts`
  + `storage.rules` + `docs/IMAGE_PIPELINE.md` edits in its worktree, its scope files — correctly claimed, left
  untouched); **R1** `[P]` #248 (`feat+r1-addrecipe-refactor`) is CLEAN/all-6-checks-green/MERGEABLE, being landed
  elsewhere. The four stale local branches are merged; `moderation-pr-c-ratelimiter` is the known off-board orphan.
  `development` in sync with origin (0/0) before this append. Worktree not yet created.
- **2026-07-07** — **I2** implemented in `worktree-feat+i2-uid-key-recipe-images` → PR
  [#249](https://github.com/jclind/prepify/pull/249) opened (`[P]`). Recipe-image uploads landed at
  `recipeImages/{imageFile.name}` (`src/api/recipes.ts`), keyed by the **raw filename**, so (a) two users'
  `photo.jpg` collided/overwrote and (b) `storage.rules` could only *auth-gate* the path — any signed-in user
  could overwrite/delete **any** recipe image. Re-keyed uploads to `recipeImages/${uid}/${uuidv4()}` (`uid` from
  `AuthAPI.getUID()`, both already imported; **fails closed** if no uid rather than falling back to an unscoped
  path; no extension — Firebase sets `contentType` from the `File` and the I1 helper derives the srcset stem
  regardless). Tightened `storage.rules`: new `match /recipeImages/{uid}/{imageId}` enforces
  `request.auth.uid == uid` + 5 MB + `image/*` (mirrors `profilePhotos/{uid}`) and covers the I1 resize
  **variants** (same `{uid}/` dir) for public read; the legacy one-segment `match /recipeImages/{imageId}` (disjoint)
  is kept publicly **readable** so un-migrated images still render but **write-denied**, closing the old flat-path
  overwrite gap. **I1 compatibility preserved:** `RESIZED_IMAGES_PATH` stays empty (variants co-located under
  `{uid}/`); `INCLUDE_PATH_LIST=/recipeImages` leading-segment match still catches nested originals; server
  `parseStorageUrl` decodes the whole `/o/<enc>` segment so moderation/delete are depth-agnostic (**no server
  change**) — config/doc comments updated (`extensions/storage-resize-images.env`, `docs/IMAGE_PIPELINE.md`).
  Tests: `RecipesApi.test.ts` asserts the exact uid-keyed `ref` path + fail-closed throw; `firebaseStorage.test.js`
  covers nested-path extraction. Gates: `tsc` clean, Vitest **579 passed / 2 skipped**, `npm run build` clean,
  server Jest green. **Rules exercised under the Firebase Storage rules emulator — 11/11** (owner write; cross-uid,
  anon, oversize, non-image, legacy-flat writes all denied; public read on original + `_400x400.webp` variant +
  legacy; `profilePhotos` regression). **Owner-gated (ships inert like I1):** `firebase deploy --only storage`
  (dev→prod) + migrate existing filename-keyed objects to the uid path — until then the deployed flat rules keep
  today's uploads working. **Off-board note (pre-existing, not fixed):** `deleteRecipeImage` removes only the
  original, so a deleted recipe orphans its I1 resize variants (latent since I1, independent of this re-key). Lane
  disjoint from the two live tracks (R1 `AddRecipe`, R2 `Account`).
- **2026-07-07** — **R2** implemented in `worktree-feat+r2-account-refactor` → PR
  [#250](https://github.com/jclind/prepify/pull/250) opened (`[P]`). The **account-page refactor** — owner-scoped to
  **structural, behaviour-preserving** (F6 restyle deliberately excluded, see below), following `docs/CONVENTIONS.md`,
  four sequenced commits. **(1) `usePaginatedLoadMore`** (`src/pages/Account/usePaginatedLoadMore.ts`): the load-more
  state machine (page cursor, page-0-replaces/later-pages-append accumulation, `isMore` off `totalCount`,
  flash-guarded skeleton gate) was **triplicated** across the Saved/Ratings/Your-Recipes tabs — collapsed to one
  typed hook exposing primitives + a convenience `showList`; +5 unit tests. **(2) Wired all three list tabs** onto it:
  `UserRecipes`/`UserRatings` (DOM/CSS untouched, each keeps its exact `showList` gate incl. the `dataHasItems`
  flash-guard the two carry and SavedRecipes doesn't) and `SavedRecipes` (kept its collections/search/sort chrome,
  `blankSlate` logic, and the **F3 `useCallback(refreshAfterMutation)` memo** — the four `setCurrPage(0)` reset sites
  now route through the hook's `reset()`; no-flash-guard `showList` preserved byte-for-byte). **(3) Account shell
  tidy:** lifted the four header reads (username/profile/counts/gamification) + derived display strings into
  `useAccountData` and the newly-unlocked achievements toast into `useAchievementsToast` — `Account.tsx` **204 → 126
  lines**, now presentational. Net +426/−201 across 8 files. **F6 closed as stale (owner-confirmed):** the account
  section nav F6 names was **already redesigned** (#136 vertical rail, 2026-06-14) and token-normalized after; the F6
  line was a bulk backlog-seed added 2026-06-17 (three days *after* the rail shipped) with no concrete defect behind
  it — so R2 subsumes it by closing it, not restyling. **Verified:** gates — `tsc` clean, Vitest **582 passed / 2
  skipped** (577 baseline + 5 new hook tests), `npm run build` clean (eslint passes); **runtime `/verify`** (headless
  Chromium vs the running dev app, custom-token auth via `__cy_signIn__`) — authed `/account` rendered the shell + all
  four tabs with correct active-tab tracking and **zero console errors**, and the load-more path was driven against the
  **real** Saved component/hook over a **stubbed** `getSavedRecipes` multi-page payload (6 → Load-More → 9 accumulated,
  button hides at `totalCount`; search → reset-to-page-0 + refetch → 1 filtered, button gone; clear → 6 restored) —
  **no dev-DB writes / no mutation of the shared Cypress user** (chose the network-stub over seeding `test-cypress-user`,
  which has no saved/rated/created data and is used by CI). **`[P]` flip + F6 stale-closure recorded on `development`
  directly** (not the lane branch), same convention as C2–C5/I1/I3/R1 — keeps backlog edits off the PR. **Disjoint from
  the one live lane:** I2 (`src/api/recipes.ts` + `storage.rules`) — R2 owns `src/pages/Account/**`; R1 (`AddRecipe`)
  already merged/landing. `development` was 0/0 with origin (a sweep had carried the R2 claim + R1 doc entries up)
  before this append.
- **2026-07-07** — **R2 merged** ([#250](https://github.com/jclind/prepify/pull/250), merge `ecd23d7`, all 6 checks
  green) into `development`; worktree torn down. The load-more state machine that was triplicated across the Saved /
  Ratings / Your-Recipes tabs is now one typed, unit-tested hook (`usePaginatedLoadMore` — page cursor,
  page-0-replaces / later-pages-append accumulation, `isMore` off `totalCount`, flash-guarded skeleton gate), and the
  `Account` shell's data + achievements-toast were lifted into `useAccountData` / `useAchievementsToast` so `Account.tsx`
  is presentational (204→126 lines). Behaviour-preserving (structural-only): per-tab flash-guard differences kept
  (Saved retains its own inline `recipes.length>0 || isLoading` gate; the other two consume the hook's `showList`),
  distinct cache-key prefixes intact, F3 `refreshAfterMutation` memo preserved (stable `reset` identity). **Closed
  F6 as stale** (nav already redesigned #136 + token-normalized; no concrete defect) — `[dropped]` in both docs.
  Verified pre-merge via the running dev app (headless, custom-token auth): shell + all four tabs render, load-more
  accumulates/hides at `totalCount`, search resets to page 0 and refetches, zero console errors — no shared-user/DB
  writes (network-stub). Local code review found no correctness issues; three non-blocking notes filed-not-fixed
  (dropped defensive `Number(totalCount)` cast — still safe via JS coercion; unused `page` export; pre-existing
  load-more skeleton-swap while a never-cached page fetches — out of scope, carried forward untouched).
- **2026-07-07** — **R1 merged** ([#248](https://github.com/jclind/prepify/pull/248), merge `8b652fd`, all 6 checks
  green) into `development`; worktree torn down. The 579-line `AddRecipe.tsx` is now a presentational shell (257
  lines) over three extracted units: `useRecipeForm` (a `useReducer`-backed hook owning all field state, draft
  autosave/hydration/URL-sync, validation, and submit orchestration — with per-field setters that preserve the
  `Dispatch<SetStateAction<T>>` contract so `React.memo` child boundaries stay stable), a **pure**
  `recipeFormValidation` module (one source of truth for the field-error map, unit-testable in isolation), and a
  `FormField` section wrapper (collapses the header/error/control boilerplate every field repeated). Behaviour-
  preserving except one intended bug fix carried over from F1's review: **TimeInput now propagates `null` when the
  user clears both fields** (previously the all-empty writeback branch never fired, so clearing a time on edit left
  the stale value and the required-guard kept passing) — guarded by a `hasUserEdited` ref so the pre-hydration empty
  render can't be mistaken for a user clear. Added 38 tests (validation rules, TimeInput hydrate/clear regressions,
  Cuisine/MealType selector value↔option mapping, `updateIngredients` rescale). **Folded in part of C1** (noindex on
  `/add-recipe`, the two selector test suites, `updateIngredients` test + dead-code prune); **C1's three visual smalls
  stay open** (dropdown/`FormInput` uniformity, summary-bar sticky, group-label styling) → C1 flipped to `[~]` for a
  small tail lane. Verified pre-merge via the running dev app (headless, fresh user, custom-token auth): create flow
  publishes, validation gates + clears correctly, TimeInput clear-both invalidates, double-submit guarded, draft
  resume rehydrates, XSS payloads escape (React default) — all on dev infra. Local code review + full suite (597
  pass / 2 skip, tsc clean) green; whitespace-only-title guard gap left filed-not-fixed (pre-existing `!title` vs
  `.trim()`, BACKLOG.md Bugs, low). Board/doc edits committed on `development` in the main checkout, not the lane
  branch (same convention as C2–C5/I1/I3/R2).
- **2026-07-07** — **I2 merged** ([#249](https://github.com/jclind/prepify/pull/249), merge `5bab02e`, all 6 checks
  green) into `development`; worktree torn down. Recipe-image uploads are now keyed by owner uid at
  `recipeImages/{uid}/{uuid}` (was `recipeImages/{filename}`, which let two users' `photo.jpg` collide and carried no
  uid for the rules to scope on) — a random `uuid` makes the object collision-proof so the original filename is
  dropped (uploads are now **extensionless**). `uploadRecipeImage` **fails closed** (throws before touching the SDK)
  when there's no authenticated uid. `storage.rules` now enforces owner-scoped writes on the two-segment path
  (`request.auth.uid == uid`, mirroring `profilePhotos/{uid}`) and **denies** writes to the legacy one-segment flat
  path while keeping it publicly readable, so un-migrated recipes keep rendering. This completes the I1/I2 image pair:
  the Resize Images extension keeps writing variants into the same `{uid}/` directory (config unchanged — leading-
  segment `INCLUDE_PATH_LIST` match + empty `RESIZED_IMAGES_PATH`), covered by the two-segment read rule. **Inert on
  the live deployment until the owner runs the rollout** — the re-keyed client 403s against the still-deployed flat
  rules, so `storage.rules` and the client must deploy together, followed by the flat→uid object migration; both are
  documented in the new **"Runbook — I2 uid re-key rollout"** section of `docs/IMAGE_PIPELINE.md`. Verified pre-merge
  at two real runtime surfaces: a real-app upload captured the `recipeImages/{uid}/{uuid}` request (403 under the old
  deployed rules, as designed) and an 11-scenario `@firebase/rules-unit-testing` emulator matrix (owner-write allow,
  cross-uid deny, unauth deny, oversize/non-image deny, legacy read-allow/write-deny) went 11/11. Local code review
  found no correctness issues; the PR also folded in a fix to I1's variant-naming doc example (the helper's last-dot
  split already handled the now-extensionless `{uuid}` stem — doc/comment only, no code change). Server delete/
  moderation path needed no change (`parseStorageUrl` decodes the whole `%2F`-encoded nested path; added a regression
  test). Board/doc edits committed on `development` in the main checkout, not the lane branch (same convention as
  C2–C5/I1/I3/R1/R2).
- **2026-07-08** — **`exportMyData` own-recipes/drafts admin-stamp leak claimed** (`worktree-feat+export-own-recipes-projection`).
  Claim recorded directly on `development` (same convention as S4–S7/F1–F5/C2–C5/R0–R2/I1–I3) so concurrent sessions see the
  lane taken. **The Wave-1–5 board is fully drained** (all tracks `[x]`/`[dropped]`; C1's remaining tail is owner-owned
  brand/design calls) — this is a `BACKLOG.md` **Bugs**-section follow-up filed 2026-07-03 in the S2 review, the *last*
  unprojected account read in the #397/#446 recipe-projection leak class. Scope: `GET /exportMyData` (`server/routes/auth.js:346-347`)
  returns the owner's own `recipes`/`drafts` via `find({ userId: uid }).toArray()` with **no projection**, so the six internal
  admin stamps (`moderatedBy`/`moderatedAt`/`featuredBy`/`featuredAt`/`publishUpdatedBy`/`publishUpdatedAt`) on any recipe an admin
  ever moderated/featured leak into the JSON the non-admin owner downloads. Fix per the item's recommendation: strip **just** those
  six stamps (a shared `RECIPE_INTERNAL_STAMPS` exclusion in `server/util/recipeFields.js`, which already names them) while keeping
  the full user-authored body — an export should stay higher-fidelity than a public card, so *not* the `publicRecipeProjection`
  card whitelist the saved-recipe half (`:371`) uses. Verified still present against the tree + `development` in sync with origin
  (0/0) before claiming; no live worktree/branch matches (nothing silently in flight). Disjoint server-only lane (`auth.js` +
  `recipeFields.js`), Jest-backed. Also noted (not claimed): the whitespace-only recipe-title guard (`recipeFormValidation.ts:40`,
  `!form.title` w/o `.trim()`) remains the next open follow-up; BACKLOG.md:506 (numeric/array server validation) is *partially*
  closed by S1 #228 (numeric clamps + per-element caps shipped; array-shape bounding may remain) — left un-ticked. Worktree not yet created.
- **2026-07-08** — **`exportMyData` own-recipes/drafts admin-stamp leak** implemented → PR
  [#251](https://github.com/jclind/prepify/pull/251) opened (`[P]`). Added a shared `RECIPE_INTERNAL_STAMPS` constant
  (`server/util/recipeFields.js`) naming the six admin stamps once + a derived `recipeInternalStampsExclusion`
  (`{ field: 0 }`), and applied it as the projection on both the `recipes` and `recipeDrafts` finds in `GET /exportMyData`
  (`server/routes/auth.js`). **Exclusion, not the card whitelist** — an export stays higher-fidelity than a public card, so
  the owner's own body is kept in full minus only the six admin-uid stamps; the saved-recipe half is untouched (still
  `publicRecipeProjection`, since those are other users' recipes). Verified: extended the auth Jest suite with an
  own-recipes/drafts regression (seeds all six stamps + a non-whitelist `description`, asserts stamps gone from both arrays
  while the body incl. `description` survives — proves exclusion-not-whitelist); full server Jest **32 suites / 749 tests**
  green; server boots (`Connected to MongoDB`) + endpoint routes (401 unauth) with the new wiring. The worktree ran on
  ports client 3002 / server 4001 (main 3000/4000 untouched). `[P]` flip recorded on `development` in the main checkout
  (not the lane branch), same convention as C2–C5/I1–I3/R1–R2. Closes the last unprojected account read in the #397/#446
  leak class. **Next open follow-up remains the whitespace-only recipe-title guard** (`recipeFormValidation.ts:40`).
- **2026-07-08** — **`exportMyData` own-recipes/drafts admin-stamp leak merged** ([#251](https://github.com/jclind/prepify/pull/251),
  merge `4dbbf82`, all 6 checks green) into `development`; worktree torn down. `GET /exportMyData` returned the owner's own
  `recipes`/`drafts` as raw Mongo docs, so any recipe an admin ever moderated/featured leaked the six internal admin stamps
  (`moderatedBy`/`moderatedAt`, `featuredBy`/`featuredAt`, `publishUpdatedBy`/`publishUpdatedAt` — admin Firebase uids) into the
  JSON the non-admin owner downloads. Fixed with a shared `RECIPE_INTERNAL_STAMPS` constant (`server/util/recipeFields.js`,
  single source of truth for what the public whitelist also excludes) + a derived `recipeInternalStampsExclusion` (`{ field: 0 }`)
  applied as the projection on both owner finds — an **exclusion, not the card whitelist**, so an export stays higher-fidelity
  (full authored body) minus only the admin PII. Saved-recipe half untouched (still `publicRecipeProjection` — other users' recipes).
  **Verified two ways:** extended the auth Jest suite with an own-recipes/drafts regression (seeds all six stamps + a non-whitelist
  `description`, asserts stamps gone from both arrays while the body incl. `description` survives — proves exclusion-not-whitelist);
  full server Jest **32 suites / 749 tests** green; **plus a live `/verify` run** — minted a real Firebase ID token through the
  actual `verifyToken` middleware, seeded a stamped own-recipe+draft in dev Mongo, hit the running endpoint (200) and confirmed
  `LEAKED stamps = (none)` on both while `title`/`description`/`ingredients`/`status` were retained, then cleaned up docs + the
  throwaway Auth user. **Closes the #397/#446 recipe-projection leak class** (last unprojected account read). No follow-ups filed.
  **Board fully drained; the next open BACKLOG.md Bugs follow-up is the whitespace-only recipe-title guard** (`recipeFormValidation.ts:40`,
  `!form.title` w/o `.trim()`).
- **2026-07-08** — **whitespace-only recipe-title guard claimed** (`worktree-feat+whitespace-title-guard`). Claim recorded directly on
  `development` (same convention as the S/F tracks + the #251 follow-up) so concurrent sessions see it taken. Scope (BACKLOG.md:61,
  filed off the R1 runtime verification): an all-spaces title (`"     "`) is truthy, so the client's `!form.title` check
  (`src/pages/AddRecipe/recipeFormValidation.ts:40`) and the server's `val === ''` emptiness test
  (`validateRequiredRecipeFields`, `server/util/recipeLimits.js:63-71`) **both** pass it → a recipe publishes with a blank `<h1>`.
  Fix: guard the client on `!form.title.trim()` (+ trim the submitted payload) and make the server treat a whitespace-only required
  string as missing (defence-in-depth). **Disjoint from the in-flight C1-tail lane** (`worktree-feat+c1-tail-audit`, AddRecipe *styling*
  — `recipeSelectStyles.ts` + `_exports.module.scss`): this touches the validation module + server bounds, not those files, so no
  collision despite both being AddRecipe-adjacent (the item itself authorizes "a small F-track"). Verified both halves still present
  and `development` in sync with origin (0/0) before claiming. Worktree not yet created.
- **2026-07-08** — **whitespace-only recipe-title guard** implemented in `worktree-feat+whitespace-title-guard` → PR
  [#253](https://github.com/jclind/prepify/pull/253) opened (`[P]`). Fixed at **both** layers: client `validateRecipeForm` now
  trims before the presence check (`!form.title.trim()`, length cap on the trimmed value) and `useRecipeForm.handleSubmit` trims
  the title in the `formData` payload (covers create + edit); server `validateRequiredRecipeFields` treats a whitespace-only
  required string as missing (defence-in-depth — drafts untouched, they use `validateRecipeBounds` only). +regression tests
  (`recipeFormValidation.test.ts` whitespace case; new `server/__tests__/recipeLimits.test.js` pinning the predicate). Gates:
  `tsc` clean, Vitest **614 pass / 2 skip**, `build` clean, server Jest **753/753** (incl. the `recipes.test.js` route-level
  `POST /addRecipe` "Missing required fields" 400 that exercises the server predicate through the real Express app). Runtime
  surface verified through the two-layer test suites driving the exact `"     "` input through the production validator + predicate
  (a live authed dev-Mongo POST would need seeding an active user + Firebase user + image — disproportionate for this low-sev
  data-quality guard). Disjoint from the in-flight C1-tail styling lane; no collision.
- **2026-07-08** — **C1-tail lane claimed** (`worktree-feat+c1-tail-audit`) to finish the C1 AddRecipe cluster
  (the last `[~]` track on the board). Approached as an **audit** — the owner had already done the bulk of the
  create-recipe visual overhaul, so each of the three remaining smalls was re-checked against the current tree
  (post-R1 #248 / #204 FormInput-converge / the type-scale + hover + focus-ring sweeps) plus the git history of
  the exact files. Verdict: **① dropdown/`FormInput` uniformity — genuinely still live** (the selects' only
  substantive touch, `e274b33`, just deduped the three copies + fixed the orange-hover bug; it never harmonized
  them with the `compact` field — objective mismatch: 2px default-grey border vs 1px `$tertiary-text`, orange
  focus w/ no ring vs teal `$secondary` + glow, default radius/height vs the token/40px). **② summary-bar
  sticky — still true but an explicit design decision** (`position: sticky; bottom:0; margin-top:auto`
  unchanged since #164; not a regression; owner keeps release-at-end). **③ group labels — subjective, and the
  view-side already reads intentional** post-overhaul. Per the owner's call: **fix ① only; close ②/③ as decided,
  no code change**, so C1 stops lingering as `[~]`.
- **2026-07-08** — **C1-tail ① implemented** in `worktree-feat+c1-tail-audit`. `recipeSelectStyles.ts` now
  mirrors the shared `FormInput` `compact` field: teal `$secondary` focus border + the `@mixin focus-glow` halo
  (was orange `$primary`, no ring), 1px `$tertiary-text` resting border (was a 2px react-select default grey),
  the `$border-radius` token (10px), a 40px `min-height`, a 1rem `valueContainer` inset, and no orange hover
  shift (the text fields give none). Three tokens (`secondary` / `borderRadius` / `focusGlow`) surfaced through
  `_exports.module.scss` so the values stay single-sourced with the SCSS (build output confirmed
  `secondary:#00adb5`, `borderRadius:10px`, `focusGlow:0 0 0 3px rgba(0,173,181,0.15)`). Gates: `tsc` clean,
  `npm run build` clean, Vitest **613 passed / 2 skipped** (83 files, unchanged). **Verified visually** via an
  authed headless pass over `/add-recipe` (real signup → `/add-recipe`, playwright-core): resting, focused
  (teal border + glow), and selected states all now match the neighbouring `SERVINGS`/`TITLE` text fields; no
  console errors. Two-file diff (`recipeSelectStyles.ts` + `_exports.module.scss`). ②/③ ticked in `BACKLOG.md`
  as **decided — no change**. C1 cluster now fully resolved.
- **2026-07-08** — **C1-tail merged** ([#252](https://github.com/jclind/prepify/pull/252), merge `4bd0b73`,
  all 6 checks green — Backend / Frontend / Static / E2e / Fallow / GitGuardian) → `[x]`; worktree torn down.
  The one real fix: the Cuisine / Course / Diet `react-select` controls now mirror the shared `FormInput`
  `compact` field (1px `$tertiary-text` border, teal `$secondary` focus + `focus-glow` ring, `$border-radius`
  10px, 40px `min-height`, 1rem inset, no orange hover shift), with `secondary` / `borderRadius` / `focusGlow`
  single-sourced through `_exports.module.scss`. The other two C1 smalls closed as **decided, no code change**
  (summary-bar sticky = owner keeps release-at-end, not a regression; group labels = intentional post-overhaul).
  **Verified via `/verify`** before land: authed headless pass over the running `/add-recipe` (real signup),
  `getComputedStyle` confirming `1px solid rgb(102,108,117)` / `10px` / `40px` across all three selects, plus
  probes — hover stays neutral (no orange), the Diet multi-select grows gracefully with chips, the teal focus
  ring wraps the control even over chips, zero console errors. **Rebased onto `development` before merge** to
  clear a `BACKLOG_ROADMAP.md` status-log conflict (the #253 whitespace-title-guard claim had landed since the
  fork) — that `DIRTY` state had suppressed the `pull_request` CI workflow (only GitGuardian ran) until the
  rebase cleared it, the same trap S3 hit; post-rebase all six checks ran and passed. **This closes the C1
  cluster and drains the entire parallel backlog board** — every named track across Waves 1–5 is now `[x]`,
  `[dropped]`, or (I1/I2) merged-but-owner-gated; what remains is the Deferred/post-1.0/owner section. No
  follow-ups filed.
- **2026-07-08** — **whitespace-only recipe-title guard merged** → [#253](https://github.com/jclind/prepify/pull/253)
  (`e7318c9`), closing the last open BACKLOG.md Bugs follow-up. Shipped the two-layer fix from the PR-open entry
  above **plus a server-side title-trim added after review**: a code review flagged that the server *rejected* an
  all-blank title but still *persisted* `body.title` verbatim, so a direct (non-browser) API call could store a
  padded title like `"  Soup  "`. Added a shared `normalizeRecipeInput(body)` (`server/util/recipeLimits.js`) that
  trims the title in place, wired into **both** the create (`POST /addRecipe`) and edit (`PUT /editRecipe`) routes
  right after the required-field check and *before* the bounds check — so the length cap and the persisted value
  both see the trimmed title, matching the client. `typeof`-guarded so a non-string title can't throw; drafts stay
  untouched (`validateRecipeBounds` only). **Verified live at the real surface** (not just the test suites): drove
  the running dev API with a real minted Firebase token — POST `title:"  Live Probe Soup  "` persisted as
  `"Live Probe Soup"` read straight from dev Mongo (`client.db('prepify')`), then deleted via the API and removed
  the throwaway auth user (net-zero dev data). Gates green on the pushed commit: Backend Supertest, Frontend
  Vitest, Static (typecheck+build), E2e Cypress, Fallow, GitGuardian all pass; server Jest suite 134/134 on the
  two recipe suites (adds 3 `normalizeRecipeInput` unit cases). Remote branch deleted, worktree torn down.
- **2026-07-08** — **I2 recipe-image migration script merged** ([#254](https://github.com/jclind/prepify/pull/254),
  merge `c2e413d`, all 6 checks green) into `development`; worktree torn down. Ships the **migration half** of the
  I2 uid re-key rollout (the code half was #249): `server/scripts/migrateRecipeImagesToUid.js` moves already-uploaded
  flat `recipeImages/{filename}` objects under their owner's uid prefix (`recipeImages/{uid}/{uuid}`) and repoints
  `recipes.recipeImage`. Read-first ops script in the S6 mould — **dry-run by default**, `--apply` to write,
  `--delete-old` to purge the old object, `--id=`/`--limit=` for cautious/targeted runs. Per flat recipe: parse
  bucket+path (**mixed-bucket → copies within the object's own bucket**), resolve owner uid (`userId` →
  `authorUsername` → `usernames`), copy + ensure a Firebase download token + repoint at the tokened URL.
  **Idempotent** (already-uid paths skipped), **non-destructive by default** (old object kept, still public-read),
  per-object try/catch so a foreign/unreadable bucket is reported + skipped (exits non-zero if any failed).
  **Verified against dev** (`prepify-dev-58579`) with a controlled inject → `--apply` → assert → cleanup loop
  (10/10: copy+repoint, same-bucket, token-URL public-readable `200`, old-object retention, `--delete-old`,
  idempotent re-run, dry-run-writes-nothing; dev catalog restored to baseline) + a 7-case unit test
  (`server/__tests__/migrateRecipeImagesToUid.test.js`, pins `classifyImage` + `downloadUrl` encoding); full
  server Jest **34 suites / 763** green. `docs/IMAGE_PIPELINE.md` step 2 now points at the script. **Note:** dev's
  own catalog images live in the legacy `prepify-9b974` bucket the dev SA can't write, so a real dev `--apply`
  over them reports per-object failures (expected) — the real object moves happen at the **owner-run prod
  cutover** wherever the service account owns the target bucket. Not a new board track — this is owner tooling
  for the already-merged I2; the board stays drained.
- **2026-07-08** — **Wave 6 filed (Obsidian-note triage).** Jesse's running note (21 new items, filed
  2026-06-17→07-02) verified item-by-item with 7 parallel read-only agents. **7 already fixed** by the
  late-June/July work, several the same day they were filed: review kebab/report menus (#166), drafts
  action-row squish (`5d91e7a`), load-more unification (`2d99d3a`), Home "see all" (`d430ec1`), navbar
  Recipes hover (`b6305fc`), settings save-bar flash (`ready` gate in `ProfileSection`), and the delete-user
  "bucket" error (never a crash — best-effort catch + explicit-bucket branch predate the report; only the env
  remained → N7). **4 tracked/deferred elsewhere:** parser overhaul superseded by the v2 migration (#190);
  drop-Edamam already open (Deferred); Home orange-hover split is the owner's brand-orange recolor; avatar
  customizer → `FEATURE_IDEAS.md`. **Survivors boarded as N1–N7** (+ the reviewer-avatar fold-in to
  RELEASE_PLAN §D); item write-ups added to `BACKLOG.md` tagged *(triaged 2026-07-08)*. Also flipped the
  stale "Press `/` to focus search" Features line to `[x]` (shipped in C4 #238). No tracks started yet.
- **2026-07-08** — **N1 claimed** (main-checkout investigation, no worktree). Claim recorded directly on
  `development` (same convention as the Wave-1 S-tracks) so concurrent sessions see the lane taken. Verified
  first that Wave 6 was fully open (no N-track claim anywhere in the log, only the main checkout in
  `git worktree list`, the lingering `worktree-feat+*` branches are stale refs from torn-down Wave 1–5 lanes,
  `development` in sync with origin 0/0). N1 is **investigate-first** per rule 8 / the kickoff note — a dev-DB
  script run + data spot-check, *not* a code lane yet, so it runs solo in the main checkout rather than a
  worktree. Scope of the investigation: (1) run `server/scripts/backfillServingPrice.js` (dry-run) against the
  **dev** DB to measure stored-`servingPrice` drift and prove whether an `--apply` has ever landed; (2) pull
  the "$10 parfait" recipe's per-ingredient `totalPriceUSACents` and attribute the absurd total to a mis-parsed
  quantity/unit (`updateIngredients.ts`) vs a bad proxy gram-estimate vs stale v1-era stored prices — **then**
  decide the actual fix lane. No code changed under this claim yet.
- **2026-07-08** — **N1 investigation complete** (read-only, dev DB; all probes torn down, tree clean). Three
  findings, attributing the "$10 parfait" decisively:
  **(1) Zero `servingPrice` drift on dev.** `backfillServingPrice.js` dry-run over all **13** dev recipes:
  `would update: 0`, `unchanged: 13`, `skipped: 0`. So the stored `servingPrice` already equals the recompute
  from stored per-ingredient prices everywhere — the **PR #152 division bug (flat ~$1.00) does not manifest on
  dev**, and the *ops half* (the un-proven `--apply`) is a **no-op on dev**. (Prod may still carry pre-#152
  docs, but that bug's signature is a flat ~$1.00, not a $10 parfait — a separate thing.)
  **(2) The "$10 parfait" is real and is a bad price ESTIMATE, not a parse or division bug.** Recipe *"Yogurt
  and Fruit Parfaits"* (`63fe34ad3d057633b6e2970e`), `servingPrice` **$10.85** (= sum $43.41 / 4, so the
  math is internally correct). Its per-ingredient `parsedIngredient` quantities/units **all parsed correctly**
  (`1 cup` strawberries, `3 cup` yogurt, `1 pint` blackberries, `1 cup` granola) — so **not** a
  quantity/unit parse bug. The total is dominated by one line: **`1 cup strawberries` = `totalPriceUSACents`
  2533.86 → $25.34**, ~15–25× a sane price (1 cup ≈ 150 g ≈ $1–1.65). Yogurt ($8.09) and blackberries
  ($8.38) are also 2–3× high. Root cause = the enrichment's **gram-estimated proxy price** (the route comment
  in `ingredients.js` names it: *"v2 prices are gram-estimated floats"*), and the parfait's stored
  `ingredientData` is **v1-era** (`dateAdded` 1677013118622 = 2023-02-21, carries the legacy
  `names`/`dateAdded`/`originalName` shape) — stale enrichment that **won't self-heal** unless the recipe is
  re-saved/re-enriched under v2.
  **(3) It's the lone real offender on dev.** Of 13 recipes only 2 tripped the outlier flags; the second
  (*"Testing Title"*, `2 pound chicken breast` = $8.07) is a sane price on a throwaway test doc. Every other
  recipe's per-ingredient prices look plausible.
  **Side note:** a live re-enrich probe of the four parfait strings through the current v2 hosted proxy
  **threw `Ingredient proxy request failed` on all four** — the proxy was erroring at investigation time, so
  no fresh comparison number was obtained (and any re-enrich backfill is **proxy-availability-gated**).
  **Fix-lane options (owner's call — the mandate was investigate-then-decide, and this is 1 dev recipe +
  proxy-paired + prod-ops-gated, so no code was written):**
  **(A) Re-enrich backfill** — a `server/scripts/` script (sibling to `backfillServingPrice.js`) that re-runs
  v2 enrichment per ingredient, rewrites `totalPriceUSACents`, and recomputes `servingPrice`. Heals stale v1
  prices catalog-wide; **depends on the proxy** (down right now), spends Spoonacular quota, and inherits
  whatever imprecision the v2 gram-estimate still has. Owner-gated prod run, same as the other backfills.
  **(B) Write-time outlier guard / telemetry** — cap or flag per-ingredient prices above a sane per-unit
  ceiling at enrichment/`updateIngredients` time so a future $25 cup of strawberries is caught before it's
  stored. Defensive regardless of proxy; **folds naturally into N6** (ingredient-miss telemetry — same
  best-effort write surface). **(C) Minimal** — owner re-saves the one parfait (new/edited recipes already
  re-enrich under v2); fixes the symptom, not the systemic garbage-in. **Recommendation:** don't rush a code
  lane — (B)'s guard is the durable win and should ride N6's telemetry surface; (A) is an owner ops decision
  once the proxy is healthy. N1 stays `[~]` pending that call.
- **2026-07-08** — **N6 claimed** (`worktree-feat+n6-ingredient-telemetry`), **folding in N1's outlier guard**
  (fix-option B) per the owner's call. Claim recorded directly on `development` (same convention as the Wave-1
  S-tracks) so concurrent sessions see the lane taken. Scope: (1) the N6 build proper — a best-effort upsert
  into a new `ingredientMisses` collection from `POST /parse` on an enrichment miss (`{ _id: normalized(str),
  raw, count: $inc, lastSeen, type }`), a read-only admin route, and a `src/pages/Admin/Ingredients` list
  sorted by count desc (mirrors the Users/Reports pattern); the write stays try/catch'd so telemetry never
  affects the parse response, and the route gets the `getDB()` handle it currently lacks. (2) N1's guard as a
  **second event `type` on the same surface** — when `/parse` enriches a row whose `totalPriceUSACents`
  exceeds a high per-row ceiling (the $25-strawberries class), record a `price_outlier` telemetry event so
  admins can spot bad proxy estimates. **Flag, not clamp** — the stored price is untouched (clamping would
  mangle legitimately expensive rows like a pound of saffron); the guard is pure observability. N1's row
  updated: option-B is now this lane; the re-enrich backfill (option A) stays owner/proxy-gated. Disjoint from
  every other N-lane (owns `ingredients.js`/`admin.js`/`src/pages/Admin`). Verified `development` in sync with
  origin before claiming and no in-flight worktree on these files.
- **2026-07-08** — **N6 implemented** in `worktree-feat+n6-ingredient-telemetry` → PR
  [#255](https://github.com/jclind/prepify/pull/255) opened (`[P]`). `POST /api/ingredients/parse` now writes
  best-effort telemetry into a new **`ingredientMisses`** collection — `miss` (a clean Spoonacular miss, which
  was `console.warn`-only) and, folding in **N1**'s guard, `price_outlier` (an enriched row whose
  `totalPriceUSACents` clears a **$15/row ceiling** — the "$10 parfait" class, e.g. `1 cup strawberries` =
  $25.34 on dev). Upsert keyed `${type}:${normalized}` with a `$inc` counter + `firstSeen`/`lastSeen`; the
  write is `try/catch`'d so a telemetry/DB failure never affects the parse response, and the route finally
  gets the `getDB()` handle it lacked. **Flag, not clamp** — the returned/stored price is untouched (clamping
  would mangle legitimately expensive rows like a pound of saffron); the guard is pure observability. Surfaced
  read-only via `GET /admin/ingredients` (admin-gated, count-desc, `type` filter) + a new **Admin › Ingredients**
  page mirroring the Audit list (type tabs, pagination). Tests: server integration (real app + real Mongo) 9
  cases — parse writes `miss`/`price_outlier`/nothing + increments; admin auth/list/filter — and frontend
  component 3 cases (render both types + formatted $25.34, filter refetch, empty state). Gates: `tsc` clean,
  Vitest 617, Jest 772, `npm run build` clean; live dev server route-mount confirmed (401 parity with
  `/admin/audit`), nodemon reloaded cleanly. **N1's re-enrich backfill (option A) stays owner/proxy-gated** —
  out of this PR's scope (the hosted v2 proxy was erroring during the N1 investigation).
- **2026-07-08** — **N6 merged** ([#255](https://github.com/jclind/prepify/pull/255), merge `c7ae1fc`) → `[x]`.
  Runtime-verified before merge by driving the live server end-to-end (minted admin Firebase token + a stub
  proxy via `INGREDIENT_PARSER_PROXY_URL` on an isolated instance, since the hosted v2 proxy was still down):
  all three write branches fired against real dev Mongo (`miss`, `price_outlier` @ $45.36 returned to client
  unchanged = flag-not-clamp, normal row wrote nothing), the repeat probe incremented a single doc's counter
  (×3, not 3 docs), and `GET /admin/ingredients` sorted count-desc + honored the `type` filter behind the
  admin gate (401 without a token). A local code review then caught that the route mirrors `/admin/audit` but
  **`ingredientMisses` had no index** while `auditLog` carries its sort-key + compounds — folded the fix into
  the PR (`server/db.js`: `{count:-1,lastSeen:-1}` for the "All" tab + `{type:1,count:-1,lastSeen:-1}` for the
  filtered tabs). Follow-ups filed-not-fixed (review Low notes): `miss` keys are quantity-fragmented (weakens
  the count ranking used for cache-seeding) and the collection is unbounded (no TTL/cap). **N1 stays `[~]`** —
  its re-enrich backfill (option A) is still owner/proxy-gated.
- **2026-07-08** — **N2 claimed** (`worktree-feat+n2-report-reason-incorrect-info`). Claim recorded directly on
  `development` (same convention as the S/N tracks) so concurrent sessions see the lane taken. Scope: add an
  `incorrect_info` report reason across the three lists that must stay aligned — `ReportReason` (`src/types.ts:247`),
  `REASON_OPTIONS` (`src/Components/ReportControl/ReportControl.tsx:29`), and `REASONS`
  (`server/routes/reports.js:55`, validated `:99`). Open design nuance to resolve in-lane: `REASON_OPTIONS`
  renders unfiltered for all target types (recipe/review/user), so either gate the new reason to
  `targetType === 'recipe'` (it's really about recipe content/price) or accept it on review/user reports —
  leaning toward recipe-gating since "incorrect info / price" is recipe-specific. Verified all three sync points
  still match the write-up and `development` is in sync with origin (0/0) before claiming; confirmed no other
  worktree/branch/PR is in flight on these files (board is the only checkout, no open PRs). Additive union member
  in shared `types.ts` → merge-trivial, but rebase before PR (rule 8a). Worktree not yet created.
- **2026-07-08** — **N3 claimed** (`worktree-feat+n3-auth-page-home-links`). Claim recorded directly on
  `development` (same convention as the S/N tracks) so concurrent sessions see the lane taken. Scope: the Login
  and Signup pages render outside `Layout` (no navbar), so their "P" brand mark is a dead end — a plain
  `<div className='brand-mark'>P</div>` (`Login.tsx:39`, `Signup.tsx:49`) with no way back to home. Wrap it in
  `<Link to='/'>` on both so the mark navigates home (aria-label for the icon-only link). Fully disjoint from
  the in-flight **N2** lane (`types.ts`/`ReportControl`/`reports.js`) — different files, no collision. Verified
  the defect is still present (both marks are bare `<div>`s), no other worktree/branch/PR touches these auth
  pages, and `development` is in sync with origin before claiming. Worktree not yet created.
- **2026-07-08** — **N2 implemented** in `worktree-feat+n2-report-reason-incorrect-info` → PR
  [#256](https://github.com/jclind/prepify/pull/256) opened (`[P]`). Added an `incorrect_info` report reason,
  **recipe-gated** (the owner's call — wrong quantities / bad price estimate is a recipe-content complaint, not
  a review/user one). Touched the three synced lists plus one display surface the write-up didn't enumerate:
  `ReportReason` (`types.ts`); `REASONS` + a new `RECIPE_ONLY_REASONS` guard in `reports.js` that **400s** the
  reason on review/user targets (the authoritative check, with a target-specific error, not "Invalid reason");
  `REASON_OPTIONS` in `ReportControl` gains a `recipeOnly` flag and the rendered list is filtered by
  `target.targetType` (default/reset reason `spam` stays in every filtered set, so `reason` can't point at a
  hidden option); and the admin queue's reason pill now spaces underscores so `incorrect_info` reads as
  "incorrect info" (it rendered the raw value — fine for the prior single-word reasons). Tests: server 3 (accept
  on recipe, reject on review + user via the gate), frontend 2 (option shown+submittable on recipe, hidden on
  review/user). Gates: `tsc` clean, Vitest 14 (ReportControl + Reports), server Jest 60 (reports), `npm run
  build` clean. Additive union member → rebase before merge if the board moved (rule 8a).
- **2026-07-08** — **N4 claimed** (`worktree-feat+n4-singlerecipe-profile-links`). Claim recorded directly on
  `development` (same convention as the S/N tracks) so concurrent sessions see the lane taken. Verified the
  two live worktrees are on their marked tracks with no forgotten/unmarked work (**N2** = PR #256 open; **N3**
  = PR #257 open, so its board row is stale at `[~]` — left for the N3 lane to flip, not this lane's row) and
  `development` is in sync with origin (0/0) before claiming. **Scope — deliberately narrowed to the two
  §D-disjoint halves:** (1) the recipe **author byline** (`SingleRecipe.tsx:410-411`, a bare
  `<strong>@{authorUsername}</strong>` inside `.author-row`) → wrap in `<Link to={'/u/' + username}>`
  (ideally the whole author-row incl. avatar), matching what the admin pages already do; (2) the
  **servings-pill** visual check (pixel batch a, `SingleRecipe.scss:286-330`) — screenshot first, likely a
  no-op after the same-day a11y resize (`51fb2ac`) or a confirm-wanted Lucide `+`/`−` swap. **Yielded to §D:**
  the **reviewer-name** link (`Reviews/RecipeReview.tsx:77`) sits inside the RELEASE_PLAN §D Ratings & Reviews
  overhaul's file surface (rule 8b) — §D is an unstarted blocker that redesigns that file end-to-end, so a
  link added here now would just be rewritten; §D absorbs it. Worktree not yet created.
- **2026-07-08** — **N2 merged** ([#256](https://github.com/jclind/prepify/pull/256), merge `76e2f6f`). The
  recipe-only `incorrect_info` report reason landed across all four surfaces: the `ReportReason` union
  (`types.ts`), the client `REASON_OPTIONS` (new `recipeOnly` flag, filtered by `target.targetType`), the
  server `REASONS` + a new `RECIPE_ONLY_REASONS` gate (`reports.js` 400s `incorrect_info` on review/user
  targets, ordered after the `TARGET_TYPES`/`REASONS` checks and before the DB lookup), and the admin queue
  reason pill (underscore→space). **Verified:** `/verify` drove the live server on :4001 with a minted Firebase
  token — recipe+`incorrect_info` → 201 & persisted (409 on retry proves the write), review/user+`incorrect_info`
  → 400 with the target-specific message, adjacent `Invalid reason` path intact, review+`offensive` → 201 (gate
  doesn't over-reject); GUI filter + admin pill covered by component tests + build (not browser-driven). A
  local code review confirmed the four surfaces are the complete set (no 5th consumer: the `reason` refs in
  `admin.js`/`email.js` are the unrelated account-status free-text reason) with no correctness/security
  findings. CI green (Backend, Frontend, E2e, Static, Fallow, GitGuardian). Rebased the concurrent **N4** claim
  (`321ba49`→`0322d8c`) onto the merge before pushing. No follow-ups.
- **2026-07-08** — **N3 merged** ([#257](https://github.com/jclind/prepify/pull/257), merge `ad004dc`) → `[x]`.
  The Login and Signup pages render outside `<Layout>` (no navbar), so their "P" brand mark was a dead-end
  `<div>` with no route home; wrapped it in `<Link to='/' aria-label='Prepify home'>` on both
  (`Login.tsx:39`, `Signup.tsx:49`), and updated the shared `.brand-mark` rule (`FormStyles.scss`) to strip the
  anchor underline, keep the tile flat (chrome doesn't lift) with a `brightness(1.06)` hover + a `focus-glow`
  ring on `:focus-visible`. **Verified** via `/verify` — headless Playwright drove the live pages on :3006:
  clicking the mark on `/login` and `/signup` navigates to `/`; Tab focuses it first (accessible name "Prepify
  home"), Enter activates → `/`, and the `:focus-visible` ring renders; hover applies `brightness(1.06)`;
  `text-decoration-line: none` (no underline regression); tile visually unchanged. Gates green (tsc, Vitest
  617/2-skipped, build; no server changes). CI green (Backend, Frontend, E2e, Static, Fallow, GitGuardian).
  Merged after the concurrent **N2** land + **N4** claim advanced the board; no rebase needed (disjoint files,
  the N3 claim commit `06ff786` had already reached origin via N2's push). No follow-ups.
- **2026-07-08** — **N5 claimed** (`worktree-feat+n5-polish-sweep`). Claim recorded directly on `development`
  (same convention as the S/N tracks) so concurrent sessions see the lane taken. Verified the only other
  in-flight worktree is **N4** (`worktree-feat+n4-singlerecipe-profile-links`, still `[~]` — its PR not yet
  opened) with no forgotten/unmarked work, no `n5`/`n7` branch exists anywhere (local or remote), and
  `development` is in sync with origin before claiming. **Scope — the four disjoint polish smalls, each in its
  own file:** (1) the **skip-link overscroll** bug (`Layout/Layout.scss:25-43`) — the one confirmed defect:
  the negative-`top` hide pattern parks painted geometry above the viewport that iOS/Android rubber-band
  overscroll reveals, so switch to a clip-based visually-hidden pattern (`clip-path`/1px box, full size only on
  `:focus`) — the keyboard-Tab reveal must survive; (2) **RecipeNotFound copy + search emphasis**
  (`RecipeNotFound/*`) — de-AI the body copy (needs Jesse's voice → **draft options, don't invent**) + a
  clearer search treatment; (3) **/recipes search-button asymmetry** (`Recipes.scss:26-67`) — screenshot-gated
  one-line `right`-offset nudge if confirmed; (4) **footer "Report a bug" centering** (`Footer.scss:121-137`) —
  screenshot + owner decision (centered vs. by-design), then relayout or close. N5 is the next actionable Wave-6
  track — **N7**'s substance is owner-gated env vars (only a 3-line early-return in code), **N1** is
  investigate-done/owner-pending. Worktree not yet created.
- **2026-07-08** — **N4 implemented** in `worktree-feat+n4-singlerecipe-profile-links` → PR
  [#258](https://github.com/jclind/prepify/pull/258) opened (`[P]`). Shipped the two §D-disjoint halves of the
  lane. **(1) Author byline → profile link:** the byline was a plain `<div>` with a bare
  `<strong>@{authorUsername}</strong>` while the admin pages already linked handles; the **whole author-row**
  (avatar + `@handle` + date) is now one `<Link to={'/u/' + authorUsername}>` — reuses the existing
  `.author-row` class on the anchor (`inline-flex` + `align-self:flex-start` so the hit area hugs the byline,
  link resets, underline-on-hover/focus **on the handle only**, `@mixin outline()` focus ring), with an
  `aria-label` for the icon-only avatar. **(2) Servings-pill (pixel batch a):** screenshotted first — the pill
  reads fine after the same-day a11y resize (`51fb2ac`), so the residual nit was the raw `−`/`+` **text
  glyphs** riding font optical metrics for centering; per the owner's call, swapped them for house-family
  Lucide `MinusIcon`/`PlusIcon` (new `LuMinus` export in the icons barrel) which flex-center crisply in the
  32px buttons. Buttons keep their `aria-label`s + icons are `aria-hidden` → labels/increment behaviour
  unchanged. **Yielded to §D (rule 8b):** the reviewer-name link (`Reviews/RecipeReview.tsx`) — the unstarted
  Ratings & Reviews overhaul rewrites that file end-to-end. Gates: `tsc` clean, Vitest **620 passed / 2
  skipped** (incl. the icon single-source guard), `npm run build` clean; runtime-verified on the dev-infra
  worktree app (rendered `<a class="author-row" href="/u/aaa">`, `/u/:username` route resolves, pill
  before/after screenshots). +1 regression test (byline links to `/u/:username`). Rebased onto `development`
  (N3 #257 merge + N5 claim) before the PR; the feature branch deliberately doesn't touch this roadmap, so
  the board flip lives here on `development`.
- **2026-07-08** — **N5 implemented** in `worktree-feat+n5-polish-sweep` → PR
  [#259](https://github.com/jclind/prepify/pull/259) opened (`[P]`). Of the four polish smalls, **two shipped
  as code, two closed by-design** (owner-confirmed via clarifying questions). **(1) Skip-link overscroll (the
  one confirmed bug):** `.skip-to-content` hid via `position:absolute; top:-3rem`, and since `.app-shell` sets
  no `position` the offset resolved against the document and scrolled with the page, so iOS/Android rubber-band
  overscroll exposed the parked link. Switched to a **clip-based visually-hidden box** (`top:0.5rem;
  clip-path:inset(50%); 1px; overflow:hidden`) so there's no off-viewport geometry to reveal; the keyboard-Tab
  reveal survives (full size on `:focus`). Runtime-verified headless (390px): hidden = 1px box at `top:8`;
  after one Tab = `activeElement`, 170×38, "Skip to content" with the focus ring. **(2) RecipeNotFound copy:**
  de-AI'd into the owner's voice — owner picked *"That recipe's off the menu. It may have been removed, or the
  link might be broken. Try a search below."* from drafted options (constraint: no em dash). **(3)
  RecipeNotFound search emphasis:** the shared `SearchRecipesInput` renders a white borderless input that
  vanished on the white card; gave it a bordered pill (`$gray-400` border, `$primary-background` fill,
  `@mixin focus-glow($primary)`), mirroring the `/recipes` toolbar, right gutter reserved for the "Search"
  button that mounts on typing. **Closed by-design (no code):** the `/recipes` search-button 6px inset is a
  consistent nested-control gap (≈4px vertical inset), not meant to mirror the 17.6px decorative *text* gutter
  (measured both); and the footer "Report a bug" left-adjacency (owner kept it — a lone centered link in the
  legal strip reads oddly). Gates: `tsc` clean, Vitest **619 passed / 2 skipped**, `npm run build` clean; no
  server changes. Files: `Layout.scss`, `RecipeNotFound.{tsx,scss}` — disjoint from the in-flight N4 lane; the
  feature branch doesn't touch this roadmap, so the board flip lives here on `development`. **N5 is the last
  actionable Wave-6 code lane** — only **N7** (owner-gated env + 3-line early-return) and **N1**
  (owner-pending) remain open on the board.
- **2026-07-08** — **N5 merged** ([#259](https://github.com/jclind/prepify/pull/259), merge `a775e60`) → `[x]`.
  All CI green incl. **E2e (Cypress)**. Landed: the skip-link overscroll fix (clip-based visually-hidden) and
  the RecipeNotFound copy + bordered-pill search. Also **folded in a follow-up** not in the original scope: after
  the by-design call on the footer "Report a bug" placement, the owner flagged it read a size *smaller* than the
  © / version spans on the legal row (root cause: the shared `.bug-report-trigger.btn` compact `$text-fine`
  style). Fixed with a `.footer-legal`-scoped `font-size/weight/line-height: inherit/inherit/normal` override
  (specificity 0,3,0 > the component's 0,2,0), landing all three on the shared `align-items:center` baseline;
  the trigger keeps its compact style everywhere else. Verified at runtime (headless): all three items
  13.6px / fw600 / vertically centered on desktop; on narrow viewports the version tag wraps to line 2 by the
  strip's pre-existing `flex-wrap` + `margin-left:auto` (not a regression). Local code review before landing:
  clean, CSS/copy-only, selectors target real markup, tokens respected; two non-blocking notes — the skip-link
  reveal is now instant (dropped the `top` transition, which no longer applies) and RecipeNotFound's `0.14s`
  transition is a raw value mirroring the `/recipes` field rather than a motion token. **Wave 6 code lanes are
  now drained** — only **N7** (owner-gated) and **N1** (owner-pending) remain.
- **2026-07-08** — **N4 merged** ([#258](https://github.com/jclind/prepify/pull/258), merge `aa26478`) → `[x]`.
  Shipped the two §D-disjoint halves of the SingleRecipe lane. **(1) Author byline → profile link:** the byline
  was a plain `<div>` with a bare `<strong>@{authorUsername}</strong>` while the admin pages already linked
  handles; the **whole author-row** (avatar + `@handle` + date) is now one `<Link to={'/u/' + authorUsername}>`
  — reuses the existing `.author-row` class on the anchor (`inline-flex` + `align-self:flex-start` so the hit
  area hugs the byline, link resets, underline-on-hover/focus **on the handle only**, `@mixin outline()` focus
  ring), with an `aria-label` for the icon-only avatar. **(2) Servings-pill (pixel batch a):** screenshot-gated
  first — the pill read fine after the same-day a11y resize (`51fb2ac`), so the residual nit was the raw
  `−`/`+` **text glyphs** riding font optical metrics for centering; swapped for house-family Lucide
  `MinusIcon`/`PlusIcon` (new `LuMinus` export in the icons barrel), which flex-center crisply in the 32px
  buttons. Then rebalanced the pill spacing on owner feedback (narrowed `.serv-input` 28→25px + a small input
  left-margin and larger `serv` right-margin) so the number↔"serv" gap is a comfortable middle and the buttons
  keep their breathing room — verified 8/24/88 counts don't collide. Buttons keep their `aria-label`s + icons
  are `aria-hidden` → labels/increment behaviour unchanged. **Yielded to §D (rule 8b):** the reviewer-name link
  (`Reviews/RecipeReview.tsx`) — the unstarted Ratings & Reviews overhaul rewrites that file end-to-end.
  Verified: `tsc` clean, Vitest **620 passed / 2 skipped** (incl. the icon single-source guard), `npm run
  build` clean, and a `/verify` runtime pass driving the live app with Playwright (byline **click →
  `/u/aaa`** renders the full public profile, 0 console errors; pill `+`/`−` rescale servings 8→9→8 and
  ingredients `3 cup → 3 3/8 cup`; byline keyboard-focusable; bogus recipe id → "Recipe not found", no crash).
  +1 regression test (byline links to `/u/:username`). No follow-ups filed. Fifth Wave-6 track done (N4 with
  N2/N3/N5/N6 all `[x]`); only **N1** (owner-pending) and **N7** (owner-gated env) remain open on the board.
- **2026-07-08** — **N7 claimed** (`worktree-feat-n7-storage-bucket-env`). Claim recorded directly on
  `development` (same convention as the Wave-1/6 lanes) so concurrent sessions see the lane taken. Scope: the
  **code half only** (the env half — set `FIREBASE_STORAGE_BUCKET` in prod+dev server envs — stays owner-gated).
  `deleteProfilePhoto` (`server/util/firebaseStorage.js:41-55`) falls back to `getStorage().bucket()` when the
  env is unset, but Admin init passes no default `storageBucket` (`middleware/auth.js:10-12`), so that fallback
  **throws** and gets swallowed — logging an error on every account deletion and silently orphaning the avatar.
  The `.env.example:19-24` comment promises "leave empty to skip profile-photo cleanup" — so the fix is an
  early-return (`return false`) when `FIREBASE_STORAGE_BUCKET` is empty/unset, making behaviour match the
  documented contract instead of throw-and-swallow. Verified N7 is still `[ ]`/unstarted (no branch, no
  worktree), only the merged N4 worktree remained on disk, and `development` is current before claiming.
  Worktree created on free ports (client 3006 / server 4001).
- **2026-07-08** — **N7** implemented in `worktree-feat-n7-storage-bucket-env` → PR
  [#260](https://github.com/jclind/prepify/pull/260) opened (`[P]`). `deleteProfilePhoto` now early-returns
  `false` when `FIREBASE_STORAGE_BUCKET` is empty/unset, **before** touching Storage — so the "leave empty to
  skip" `.env.example` contract is real instead of the throw-and-swallow (argless `getStorage().bucket()` →
  "Bucket name not specified", caught, but a spurious `console.error` on every account deletion + orphaned
  avatar). Named-bucket path unchanged, so the owner setting the env (the ops half) turns cleanup back on with
  no further code change. Only caller is the best-effort account-deletion cascade (`auth.js:550`, return value
  ignored) → no behaviour change beyond the removed log noise. Tests: new `deleteProfilePhoto` block in
  `firebaseStorage.test.js` (named-bucket delete asserting bucket + `profilePhotos/{uid}` path, skip-when-unset,
  skip-when-empty-string, invalid/missing uid, error-swallow); `auth.test.js` D5 cascade sets the env
  (scoped `beforeAll`/`afterAll`) so the profile-photo deletion path is still exercised. Server Jest
  **780/780** green. Sixth Wave-6 track PR'd; only **N1** (owner-pending fix-lane) remains open on the board.
- **2026-07-08** — **N1 closed as resolved** → `[x]` (owner's call; no worktree — a doc close, no code). The
  investigation had already attributed the "$10 parfait" decisively: a **bad v2 gram-estimated proxy price on
  one stale v1-era dev recipe** (`1 cup strawberries` = $25.34), **not** a parse or division bug (0
  `servingPrice` drift across all 13 dev recipes on the `backfillServingPrice.js` dry-run). The durable
  defensive win — **option B**, the write-time price-outlier flag — already shipped in **N6**
  [#255](https://github.com/jclind/prepify/pull/255) ($15/row ceiling → `price_outlier` telemetry, flag-not-clamp,
  surfaced in Admin › Ingredients), so future bad estimates are caught going forward. What remained on N1 was
  only **option A** (a catalog-wide re-enrich backfill), which is **speculative** (unknown whether prod carries
  dirty pre-#152 / v1-era docs — dev has just the one), **proxy-gated** (the v2 hosted proxy was erroring at
  investigation time), and a **prod ops decision**, not a backlog code lane. Rather than leave N1 dangling at
  `[~]`, closing it — **option A is re-filable as a fresh owner-driven ops task** if/when prod is proven dirty
  and the proxy is confirmed healthy (nothing is lost by closing). **Option C** (owner re-saves the one parfait
  in the UI → it self-heals under v2) stays available as a 30-second manual fix. With N1 `[x]`, only **N7**
  (owner-gated env half, code PR'd in [#260](https://github.com/jclind/prepify/pull/260)) remains on the board.
- **2026-07-08** — **N7 merged** ([#260](https://github.com/jclind/prepify/pull/260), merge `6bc3cf2`) → `[x]`;
  worktree torn down. `deleteProfilePhoto` (`server/util/firebaseStorage.js`) now early-returns `false` when
  `FIREBASE_STORAGE_BUCKET` is empty/unset, **before** touching Storage — killing the throw-and-swallow of the
  argless `getStorage().bucket()` ("Bucket name not specified", caught but logging a spurious `console.error`
  on every account deletion + orphaning the avatar). Named-bucket path unchanged, so the env being set simply
  turns cleanup back on. Only caller is the best-effort account-deletion cascade (`auth.js:550`, return value
  ignored) → no behaviour change beyond the removed log noise. Tests: new `deleteProfilePhoto` block in
  `firebaseStorage.test.js` (named-bucket delete asserting bucket + `profilePhotos/{uid}` path, skip-when-unset,
  skip-when-empty-string, invalid/missing uid, error-swallow); `auth.test.js` D5 cascade sets the env (scoped
  `beforeAll`/`afterAll`) to keep exercising the profile-photo path. Server Jest **780/780**, CI green
  (Backend/Frontend/E2e/Static/Fallow/GitGuardian). **Owner half done:** Jesse confirmed
  `FIREBASE_STORAGE_BUCKET` is set on **both dev and prod** (dev = `prepify-dev-58579.firebasestorage.app`;
  prod value mirrors the prod frontend's `VITE_FIREBASE_STORAGE_BUCKET`) — so profile-photo cleanup is live,
  not just skip-safe. **With N7 `[x]` and N1 closed, the entire Wave-6 board (N1–N7) is drained — nothing open
  remains on the active board.**
