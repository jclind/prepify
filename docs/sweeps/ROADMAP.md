# Sweeps — Roadmap & "where are we?"

A parallelism-aware plan for running the five [assurance sweeps](README.md) to completion, designed so
the inevitable **deferred tail** of each sweep (fix-small / file-large) becomes the next wave of work
instead of getting lost in the backlog. Companion to [`README.md`](README.md) (the playbooks + run-log
ledger) and modelled on [`../RELEASE_GAMEPLAN.md`](../RELEASE_GAMEPLAN.md) (the same board/waves/log
pattern, applied to the release).

**Point Claude Code here to pick up where the last session left off** — the [continue-protocol](#how-to-use-this-doc-the-continue-protocol)
below tells it how to find the next available track and claim it without colliding with an in-flight worktree.

---

## How to use this doc (the continue-protocol)

If you're Claude Code and were pointed at this file to "continue the sweeps," do exactly this:

1. **Read the [Board](#board).** The active wave is the lowest-numbered wave not yet fully `[x]`.
2. **Pick the next track** in that wave whose status is `[ ]` *and* whose **Domain** doesn't collide with
   any `[~]`/`[P]` track already in flight — check the [Parallelism rules](#parallelism-rules) first.
   If everything runnable is blocked or in-flight, say so and stop; don't force a colliding track.
3. **Claim it.** `/worktree-create <sweep> — <goal>`, then set the track's Board status to `[~]` with your
   branch + today's date and **commit that claim first** so a concurrent session sees the worktree is taken.
4. **Run the sweep** per its playbook in this directory (e.g. [`security.md`](security.md)). Fix small/safe in
   place; file everything structural to [`../BACKLOG.md`](../BACKLOG.md) with a `surfaced YYYY-MM-DD` note.
   Newly-surfaced deferrals get added to this roadmap's **Wave 2/3** as new tracks — that's the point of the doc.
5. **On PR open** flip the track to `[P]`; **on merge** flip to `[x]`, append a [Status log](#status-log)
   entry, and update the [README run-log](README.md#run-log) ledger + the sweep doc's `> Status:` banner.
6. **When a wave is fully `[x]`,** advance to the next and re-read its overlap notes before kicking off.

> Merge hygiene for parallel worktrees: **edit only your own track's row** (distinct lines → git
> auto-merges) and keep the Status log **append-only** at the bottom. The reviewer reconciles the rest.

### Running it in parallel (tmux, one session per worktree)

Claude Code has no UI for spawning N parallel interactive sessions, and a single session would work the
tracks *serially*. To actually run a wave in parallel — and survive an SSH drop, since the server keeps the
sessions alive — give each track **its own Claude session in its own tmux window**, one worktree each:

```bash
tmux new -s sweeps          # Ctrl-b c → new window (×N) · Ctrl-b 0/1/2 → switch · Ctrl-b d → detach
```

In each window, from the main repo, start `claude` and hand it **one** track, e.g.:
*"Read docs/sweeps/ROADMAP.md and run the Security sweep (Wave 1). Use the worktree-create skill."*
Each session's `/worktree-create` makes its own worktree dir + boots the app on free ports (never 3000/4000),
so the sessions don't collide on disk or ports — the [Parallelism rules](#parallelism-rules) handle the
*file-domain* collisions at merge. Have each session **commit its `[~]` claim first** (step 3) so a glance
across windows shows who owns what. Budget ~2–4 windows for one reviewer.

*(For hands-off automation instead of review-as-you-go, a single session can fan out background subagents via
the Agent tool's `isolation: "worktree"` — but then you don't get to steer each sweep, which is usually the point.)*

---

## Board

Status: `[ ]` not started · `[~]` in a worktree · `[P]` PR open · `[x]` merged · `[blocked]` waiting on a decision.

| Wave | Track | Status | Domain (collision surface) | Branch / PR |
|---|---|---|---|---|
| — | Accessibility sweep (initial) | `[x]` | — | #179 (+#181/#184) |
| — | Design-consistency sweep (initial) | `[x]` | — | #180 (+#183/#185/#186/#192) |
| **1** | **Security sweep** | `[x]` | `server/` (routes, middleware, `app.js` CORS), Firebase rules, `.env.example`, `src/api/http-common.ts` | #197 |
| **1** | **Performance sweep** | `[x]` | measure → backlog; cheap wins = image `loading`/`decoding` deferral + grid memo + trending cache (img dims trialled & reverted — CLS) | #198 |
| **1** | **Code-quality & tests sweep** | `[x]` | `src/test/`, `server/` tests, `cypress/`, types, **dead-code delete (`RecipeThumbnail`)**, error handling | #199 |
| **2-iso** | A11y: autocomplete listbox + keyboard nav | `[x]` | `SearchRecipesInput.tsx` | #201 |
| **2-iso** | A11y: servings stepper target-size | `[P]` | `SingleRecipe.tsx/.scss` (pill layout) | #202 |
| **2-iso** | A11y: account-heading route-map | `[x]` | `Account.tsx` | #200 |
| **2-iso** | Design: shared react-modal style config | `[ ]` | 7 modal components | — |
| **2-iso** | Design: one icon per concept | `[ ]` | new `src/Components/icons` + import swaps | — |
| **2-iso** | Design: `RecipeFormInput` → shared `FormInput` | `[ ]` | `AddRecipe/*`, `Components/Form/*` | — |
| **2-iso** | Design: toast punctuation + string dedupe | `[ ]` | ~10 toast call sites (TSX strings) | — |
| **2-iso** | Design: codify loading-state pattern | `[ ]` | convention + `TailSpin`/skeleton outliers | — |
| **2-scss** | Design: pill `.btn` system | `[ ]` | **`index.scss` + many page `.scss`** ⚠ chokepoint | — |
| **2-scss** | Design: type scale (~520 `font-size:` literals) | `[ ]` | **`helpers.scss` + ~60 files** ⚠ chokepoint | — |
| **2-scss** | Design: elevation/shadow re-author (~52 literals) | `[ ]` | **`helpers.scss` + page `.scss`** ⚠ chokepoint | — |
| **2-scss** | Design: one danger-red token | `[ ]` | **`helpers.scss` + SingleRecipe/ReportControl/…** ⚠ chokepoint | — |
| **2-scss** | Design: name the `$admin-*` sub-palette | `[ ]` | **`helpers.scss` + Admin/moderation `.scss`** ⚠ chokepoint | — |
| **2-scss** | A11y: `$primary-hover` AA-on-hover | `[ ]` | **`helpers.scss`** ⚠ chokepoint | — |
| **blocked** | A11y: brand-orange contrast (AA) | `[blocked]` | `helpers.scss` `$primary-accessible` — **needs the brand-orange decision** | — |
| **blocked** | Design: collapse remaining brand shades | `[blocked]` | entangled with the brand-orange recolor above | — |
| **3** | Re-sweep & verify before 1.0 | `[ ]` | re-run baselines (Lighthouse a11y/perf, `npm audit`, `tsc`/tests); reconcile `RELEASE_PLAN.md` §A/§C | — |

*(The 2-iso / 2-scss / blocked items are the deferred tails of the two completed sweeps — see
[`../BACKLOG.md`](../BACKLOG.md) → Accessibility / UX-visual-polish / Tech-debt for the full write-ups.)*

---

## Parallelism rules

1. **The SCSS token system is the chokepoint.** Every `2-scss` track edits `helpers.scss` and/or shared page
   styles, so **only one `2-scss` worktree may be in flight at a time** (the sweep-equivalent of the release's
   "Sass migration is the loner"). The `2-iso` tracks touch *distinct* files and run freely alongside it and
   each other. This is why Wave 2 is split: `2-iso` parallelizes, `2-scss` serializes.
2. **`RecipeThumbnail` deletion belongs to exactly one track.** Both the Wave-1 code-quality sweep (dead-code
   pass) and the design tail want to delete it. **Code-quality owns it** (it's a dead-code delete, verified no
   live importer); the design "delete `RecipeThumbnail`" backlog item closes when that merges. Don't do it twice.
3. **Server routes overlap between Security and Code-quality.** Security is read-mostly (small hardening);
   code-quality's server work should stay in tests + `asyncHandler`/error-middleware checks. If both end up
   editing the same route file, **merge Security first** and rebase code-quality onto it.
4. **The brand-orange decision gates the `[blocked]` lane.** The a11y sweep reverted `$primary-accessible` to
   vivid `#ff5722` at the owner's request, which knowingly re-fails AA on ~96–97 routes. The contrast +
   shade-dedupe tracks can't land until that brand call is made — don't recolor blind. See
   [`../BACKLOG.md`](../BACKLOG.md) → Accessibility (the `[~]` contrast item) for the shade exploration.
5. **Concurrency budget ≈ 2–4 worktrees** for one reviewer (same as the release). Wave 1's three sweeps fit;
   in Wave 2, run the single `2-scss` lane + up to ~3 `2-iso` tracks.

**A clean parallel kickoff today:** Security + Performance + Code-quality (Wave 1) in three worktrees — their
domains barely touch (server vs. measurement vs. tests), modulo rule 3.

---

## The waves

### Wave 1 — the three unrun sweeps (run now, ~3 parallel worktrees)
The sweeps that have never been run. Largely disjoint file domains, so kick all three off together.
- **Security** — `security.md`. Read-and-report first; the highest-value check is authz/IDOR. Launch-gating
  findings also flag in `RELEASE_PLAN.md` §C.
- **Performance** — `performance.md`. Run Lighthouse against a **prod preview**, not the dev server. Most
  findings (code-splitting, indexes) are backlog; cheap wins are image dims/`loading`.
- **Code-quality & tests** — `code-quality.md`. Owns the `RecipeThumbnail` deletion (rule 2). Critical-path
  coverage + E2E journeys + type soft-spots; keep all suites green.

### Wave 2 — the deferred tails (after Wave 1; one `2-scss` lane + parallel `2-iso`)
The structural items the two completed sweeps filed. Split by collision surface (see rule 1):
- **`2-iso` (parallel-safe):** autocomplete listbox, servings target-size, account-heading, modal config,
  icon module, `RecipeFormInput`, toast punctuation, loading-state pattern.
- **`2-scss` (serialize — one at a time):** pill `.btn` system, type scale, elevation re-author, danger-red
  token, `$admin-*` palette, `$primary-hover` AA. Each needs design sign-off on the normalization.

### Wave 3 — re-sweep & verify (before the 1.0 cutover)
Re-run each sweep's automated baseline once to confirm no regressions crept in (Lighthouse a11y/perf,
`npm audit`, `tsc`/tests), re-run the **accessibility** sweep once the brand-orange decision lands to confirm
AA is restored, and reconcile `RELEASE_PLAN.md` §A/§C against the final state.

---

## Status log

Append-only; newest at the bottom. Mirrors the run-log ledger in [`README.md`](README.md#run-log) but
narrates the *why*.

- _2026-06-25_ — **Accessibility sweep** run (PR #179, contrast follow-ups #181/#184). Cheap wins shipped;
  5 follow-ups filed → Wave 2 (`2-iso`: autocomplete, target-size, account-heading; `2-scss`: `$primary-hover`;
  `[blocked]`: brand-orange). Recipe page 89→97.
- _2026-06-25_ — **Design-consistency sweep** run (PR #180, token follow-ups #183/#185/#186/#192). Cheap wins
  + radius/breakpoint/admin-wiring/decorative-tint shipped; ~10 follow-ups filed → Wave 2.
- _2026-06-26_ — Roadmap created. Wave 1 (Security / Performance / Code-quality) defined and open; the two
  completed sweeps' tails organized into Wave 2 (`2-iso` parallel + `2-scss` serialized) and a `[blocked]`
  brand-orange lane; Wave 3 = pre-1.0 re-sweep. Nothing in Wave 1 started yet.
- _2026-06-26_ — **Security sweep** run (PR #197). Highest-value authz/IDOR check + CORS, secrets-in-git, and
  XSS all came back **clean**. Cheap hardening shipped: `madeRecipe` global-counter inflation (single account
  could re-POST to inflate `numTimesMade`) deduped off the atomic `$addToSet`; `POST /reports` username→uid
  oracle closed (stopped echoing `reportedUid`); `addRating` got the missing per-user limiter; type guards
  on 4 review read/delete routes. 8 structural follow-ups filed → [BACKLOG → Security](../BACKLOG.md#security)
  (headline: **revoke the live OpenAI key on disk** — also `RELEASE_PLAN.md` §B; public `getRecipe` full-doc
  leak; recipe numeric validation; `firebase-admin` major bump for 8 moderate transitive CVEs). Server suite
  697/697; authenticated headless smoke confirmed no regressions.
- _2026-06-26_ — **Performance sweep** run (PR #198, `[P]`). Cheap wins shipped: `loading`/`decoding` deferral
  on the Home cards, `RecipeCard` memo + `decoding`, trending `staleTime`. Measured against a prod preview —
  the app ships as one 1.19 MB / 372 kB-gz JS chunk with **TBT ≈ 0**, so the weak mobile scores (P 56–69, LCP
  7–11 s) are download-bound: **code-splitting is the biggest lever**, filed. 6 structural follow-ups → Tech
  debt (code-splitting, Mongo indexes, `/recipes/facets` scans, recipe-page CLS pop-in, `AuthContext` memo,
  image `srcset`). Image `width`/`height` was trialled and **reverted** — the hero/thumb boxes are already
  CSS-reserved, so dims gave no benefit and reproducibly doubled recipe-page CLS (0.10 → 0.26). home-mobile
  66 → 69; no regressions.
- _2026-06-27_ — **Performance sweep code review** (PR #198, still `[P]`). High-effort review of the diff: all
  four changes correct, no regressions. One follow-up filed (now 7 total) — `React.memo(RecipeCard)` is defeated
  on the Saved tab because `refreshAfterMutation` is an unmemoized inline callback; the memo lands as intended on
  the `/recipes` grid. Filed to Tech debt (wrap in `useCallback`); pairs with the `AuthContext` memo item.
- _2026-06-27_ — **Performance sweep merged** (PR #198 → `development`, `[P]`→`[x]`). All five CI checks green
  (Backend/Supertest, E2E/Cypress, Frontend/Vitest, Fallow advisory, GitGuardian). Worktree + branch torn down.
  Wave 1 now: Security `[x]`, Performance `[x]`, Code-quality still in flight.
- _2026-06-27_ — **Code-quality & tests sweep** PR opened (#199, `[~]`→`[P]`). Dead code removed (`RecipeThumbnail`
  + scss + test, `getIndexById`, ~375 commented lines in `validateIngredientQuantityStr`, the dead `RecipeAI`
  route); a silent delete-review failure now surfaces a toast; +33 tests (closestFraction, formatRating,
  nutrition math, time converters, delete-failure path). All suites green / tsc clean / build passing. Filed →
  Testing: **server Jest flakiness under CPU contention** (pre-existing, the headline finding), two E2E gaps
  (review-submit, password-reset), untested `updateIngredients`; → Tech debt: `any`/`asyncHandler`/`CLAUDE.md`
  doc-drift follow-ups. Branch merged onto current `development` (post-#198); ROADMAP conflict reconciled.
- _2026-06-27_ — **Code-quality & tests sweep merged** (PR #199 → `development`, `[P]`→`[x]`). All five CI checks
  green (Backend/Supertest, E2E/Cypress, Frontend/Vitest, Fallow advisory, GitGuardian); diff independently
  verified by driving the running app (recipe + home render clean post-dead-code-removal, `closestFraction` live).
  Worktree + branch torn down. **Wave 1 now fully `[x]`** (Security #197, Performance #198, Code-quality #199) —
  advance to Wave 2 (the deferred `2-scss` / `2-iso` tails) per the Board.
- _2026-06-27_ — **Wave 2 kickoff (`2-iso`)**: three account-area accessibility tracks claimed in parallel
  worktrees — autocomplete-listbox (`SearchRecipesInput.tsx`), servings-target-size (`SingleRecipe.*`), and
  account-heading route-map (`Account.tsx`). Disjoint file domains, so no `2-scss` chokepoint contention.
- _2026-06-27_ — **A11y account-heading route-map** PR opened (#200, `[~]`→`[P]`). Single-sourced the account
  route→label map: extracted the tab defs out of `SegmentedNav.tsx` into a shared `accountTabs.tsx` (now with an
  `srHeading` field per route) + an `activeAccountTabIndex(pathname)` helper, so the visually-hidden per-panel
  `<h2>` and the nav highlight derive from one list and can't drift when a route is renamed. Heading text
  unchanged (SR-only); matching tightened from substring `includes()` to the nav's `startsWith()` prefix. +4
  tests asserting the SR heading per route. Frontend suite 531/2-skip green, `tsc` clean, build passing. Closes
  the BACKLOG 'Account tab heading duplicates SegmentedNav's route map' item.
- _2026-06-27_ — **A11y account-heading route-map merged** (PR #200 → `development`, `[P]`→`[x]`). All five CI
  checks green against HEAD (Backend/Supertest, E2E/Cypress, Frontend/Vitest, Fallow advisory, GitGuardian).
  High-effort code review found **no correctness bugs**; applied the one in-scope follow-up (bare-`/account`
  redirect now uses `accountTabs[0].to` so it can't drift either) and filed two out-of-scope notes → [BACKLOG →
  Tech debt](../BACKLOG.md#tech-debt--process--infra) (app-wide route-string single-sourcing across 5 other
  call sites; optional `activeAccountTab(pathname)` helper). Worktree + branch torn down. **First of the three
  Wave-2 `2-iso` a11y tracks to land**; autocomplete-listbox + servings-target-size still in flight.
- _2026-06-27_ — **A11y autocomplete listbox + keyboard nav** PR opened (#201, `[~]`→`[P]`). Implemented the APG
  editable-combobox-with-list-autocomplete pattern in `SearchRecipesInput`: input is `role="combobox"`
  (aria-expanded/controls/activedescendant), results are valid `<li role="option">` direct children of the
  listbox, and arrow/Home/End/Enter/Escape drive the highlight with focus staying on the input (mouse hover
  syncs the same index). Closes the BACKLOG a11y item. Two pre-existing dropdown bugs fixed in passing
  (skeleton-offset thumbnail; box-sizing overflow → horizontal scroll + tag clipping in the navbar instance).
  +9 tests (frontend suite 536/2-skip green), `tsc` clean, build passing; high-effort code review run and
  findings addressed; verified live in a headless browser. Second of the three Wave-2 `2-iso` a11y tracks to
  reach PR.
- _2026-06-29_ — **A11y autocomplete listbox + keyboard nav merged** (PR #201 → `development`, `[P]`→`[x]`). All
  five CI checks green against the merge HEAD (Backend/Supertest, E2E/Cypress, Frontend/Vitest, Fallow advisory,
  GitGuardian); a mid-flight conflict with #200 over the shared sweep docs was reconciled (Board auto-merged;
  Status log kept append-only) and CI re-ran clean. Worktree + branch torn down. **Second of the three Wave-2
  `2-iso` a11y tracks to land**; servings-target-size still in flight.
