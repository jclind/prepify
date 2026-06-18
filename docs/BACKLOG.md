# Prepify — Backlog

Triaged from Jesse's running notes (2026-06-17). This is the general backlog: bugs, UX polish,
a11y, tech debt, testing, and ideas. The beta→1.0 launch checklist lives separately in
[`RELEASE_PLAN.md`](./RELEASE_PLAN.md) — items here are **not** release blockers unless cross-referenced.

Legend: `[ ]` todo · `[~]` partial · `[x]` done · `[?]` needs a decision.

## Idea capture & triage workflow

Keep two stages separate so ideas never get lost to friction:

1. **Capture (Obsidian):** jot every idea into the running Obsidian note — one idea per line,
   dated, append-only. Don't categorize or polish; just get it out of your head. This is the
   low-friction inbox, available on phone and off-branch.
2. **Triage (here):** when the note builds up, hand the dump to Claude. Each item gets sorted
   into the right section below (or `RELEASE_PLAN.md` / `FEATURE_IDEAS.md`), code-touching items
   get verified, and you get back an annotated copy marking where each one landed
   (`→ BACKLOG#Section · date`). Then clear the Obsidian note back to empty.

The triage date stamped on items is the date they were filed here, not when they were thought of.

---

## Bugs

- `[x]` **Deleting a review leaves the star rating behind** — **fixed in PR #150 (merged, track 1a)**:
  added `DELETE /removeRating` (clears just the star; keeps any review; deletes the doc when
  rating-only), and `deleteReview` now keeps the rating and deletes the doc when there's nothing left —
  no orphan with neither text nor rating. A "Remove rating" control was added to the recipe rating card.
  *(verified; live authed smoke-test passed 2026-06-17)*
- `[x]` **Save-recipe functionality is broken** — **fixed in PR #157 (merged, track 1b)**: root-caused to
  `useSaveRecipe`'s hand-rolled optimistic write over the shared `['savedRecipeIds']` cache (default
  `staleTime: 0`). A stale refetch (window-focus / sibling card / `invalidateSavedCaches`) resolving
  mid-write overwrote the optimistic value, and with no post-write reconciliation the bookmark stayed
  reverted even though the server save had succeeded. Rewrote the toggle as a proper React Query optimistic
  mutation (`onMutate` cancel+snapshot, `onError` rollback, `onSettled` reconcile). Added Vitest hook
  coverage (optimistic + rollback + reconcile-after-clobber guard) and extended server Jest with
  `GET /getSavedRecipeIds` + a save→read→unsave→read round-trip.
- `[x]` **Account "Ratings" list renders inaccurately** — **fixed (track 1c):** rating docs store
  neither `recipeImage` nor `recipeTitle`, and `GET /getSingleUserReviews?returnRecipeData=true` only
  attached the recipe as a nested `recipeData` object — but `UserRatings.tsx` reads flat
  `review.recipeImage` / `review.recipeTitle`, so both resolved to `undefined` (blank `<img>` + empty
  title). Server now denormalizes `recipeImage`/`recipeTitle` from the recipe doc onto each review (keeps
  `recipeData` for admin callers). Added server + Vitest coverage.
- `[x]` **Rating aggregate went *down* after a 5-star** — **root-caused + symptom fixed (PR #150, merged,
  track 1a):** the
  `recomputeRecipeRating` math is correct; the drop is a **stale STORED aggregate** being corrected on
  the next recompute. A live smoke test found *Homemade Granola* stored `5/4.6` while only 4 rating docs
  actually exist (true avg `4.5`). PR #150 makes every rating change recompute + the UI refresh, so a
  recipe self-heals the moment anyone rates it, and the displayed average no longer lags. **REMAINING
  (does not block #150):** recipes nobody re-rates stay drifted → needs the one-off reconciliation in
  Tech debt below.
- `[x]` **Serving price looks wrong** — **fixed in PR #152 (merged, track 1d)**; audited
  `src/util/calculateServingPrice.ts` against real data + added regression tests.
- `[x]` **"Your Recipes" flashes an empty state** — **reproduced + fixed (track 1c):** the existing
  `useDelayedLoading` guard only covers the in-flight window; it does NOT cover the gap where
  react-query flips `isLoading` to false but the `recipes` state is still `[]` (it's populated by an
  effect one render later, to support paged accumulation). On a fast load the empty state mounted for
  that one frame. Fixed by gating the grid on the resolved payload (`data.recipes`) as well, so the
  empty state only renders once the query genuinely returns zero recipes. Same latent flash existed in
  the Ratings list and got the same gate. A Vitest test (records every `EmptyState` mount) reproduces
  the flash and guards the fix.
- `[ ]` **Account ratings "Load More" count can be off when a rating's recipe is hidden** —
  `GET /getSingleUserReviews` computes `totalCount` from `countDocuments(query)` over *all* of the
  user's rating docs (`server/routes/reviews.js:283`), but with `returnRecipeData=true` the returned
  `reviews` array is filtered to recipes that are still visible (`:294-308`, drops soft-hidden/deleted
  recipes). So if a user rated a recipe that was later hidden, `totalCount > reviews.length`, and the
  client trusts that count to decide pagination (`UserRatings.tsx:113`:
  `isMoreReviews = Number(totalCount) > updated.length`). Symptom: the "Load More Reviews" button can
  show with nothing left to load, or a later page returns fewer rows than expected. *(surfaced by
  track 1c; pre-existing, not a regression — out of that track's scope. Same shape likely in the
  created-recipes list.)* Fix: count post-visibility-filter, or paginate via an aggregation `$lookup`
  that excludes hidden recipes before the count.
- `[~]` **Data export omits saved-recipe content** — `exportMyData` now exports full recipes, drafts,
  ratings, and profile, but `savedRecipes` is still an array of IDs only (`server/routes/auth.js:323`).
  Expand it to full saved-recipe content. *(partially addressed)*

## UX / visual polish

- `[ ]` **Better "no results found" on the Recipes page** — current indicator is weak.
- `[ ]` **Optimistic ingredient add** — when adding an ingredient, show it in the list immediately
  instead of waiting for the parse/nutrition request to return.
- `[ ]` **Search autocomplete "autocorrect" is weak** — fuzzy matching on recipe search autocomplete
  needs improvement.
- `[ ]` **"You created this recipe" — mobile styling** — slightly off on the single-recipe page.
- `[ ]` **Recipe stats styling** — consider dropping the rating from the stats row (it already shows
  right below) and centering the remaining three stats.
- `[ ]` **Add-recipe bottom bar overlaps the footer** — scrolling to the bottom of the add-recipe page,
  the sticky bottom bar hides the footer. *(minor)*
- `[ ]` **Single-recipe "no recipe found" looks bad** — improve the visual of `RecipeNotFound`.
- `[ ]` **Drop search from the topmost navbar on /recipes** — for the new navbar, the recipes page
  shouldn't carry search in the top-most bar. *(noted 2026-06-10)*
- `[ ]` **Serving price not prominent enough** — surface it more clearly on the single-recipe page.
- `[ ]` **Review UI needs work** — the "Your Review" UI is poor, and the rating dropdown (shown once
  you give a rating) isn't positioned where it should be.
- `[ ]` **Show the recipe rating up top on the single-recipe page** — the top action-bar rating tile
  was replaced by the per-serving price tile (2c). Re-surface the rating compactly near the title/hero
  (e.g. "★ 4.5 · N ratings") rather than adding a 4th action-bar tile (which would crowd mobile). It
  still shows in the Ratings & Reviews header. *(→ Track 3c)*
- `[ ]` **Account nav sections UI** — improve the Saved / Ratings / etc. section navigation styling.
- `[ ]` **`/u/:username` public profile visual polish** — minor visual updates.
- `[ ]` **"Change Password" title is redundant/cluttered** — in Account & Security settings.
- `[ ]` **create-username page revamp** — re-evaluate the page, and add a logout (or escape hatch) so a
  user can't get stuck on it. Page lives at `src/pages/CreateUsername/`.

## Accessibility

- `[ ]` **Stop focus outline on mouse button clicks** — keep it for keyboard nav only
  (`:focus-visible`).
- `[ ]` **Desktop navbar account chevron animation shifts the focus outline** — the chevron animation
  moves the focus outline; decouple them.

## Features

- `[ ]` **Press `/` to focus search** — global keyboard shortcut to bring up search. No handler exists today.
- `[ ]` **Report a *user* from their profile page** *(admin)* — `ReportTargetType` is only
  `'recipe' | 'review'` (`src/types.ts:188`); add a user-report flow. *(verified missing)*
- `[ ]` **Double-check report-recipe styling in the controls element** *(admin)*.
- `[ ]` **Report controls should be visible when logged out** — `ReportControl` renders `null` for
  logged-out users (both the single-recipe footer link and the per-review links), so they have no
  signal that reporting exists. Keep the trigger visible and, on click while logged out, prompt to log
  in (a toast or a login link is enough — no full modal). One change covers both recipe + review since
  they share `ReportControl`. *(→ Track 3c; behavior change to a shared component, so out of the 2c
  visual-polish scope)*
- `[ ]` **Username validation: disallow certain characters** — tighten the allowed character set.

## Tech debt / process / infra

- `[ ]` **One-off rating-aggregate reconciliation** — stored `recipes.rating` aggregates can drift from
  the actual `ratings` docs (confirmed live: *Homemade Granola* stored `5/4.6` vs true `4/4.5`). Likely
  legacy/pre-recompute data or a past silent best-effort failure. Write a script (alongside
  `server/scripts/`) that loops every recipe and runs `recomputeRecipeRating(db, recipeId)`
  (`server/util/recipeRating.js`) to reconcile the whole catalog in one pass. *(surfaced by track 1a /
  PR #150, which only self-heals a recipe when someone next rates it.)*
- `[ ]` **Harden `deleteAccount`'s rating recompute** — the per-recipe recompute after an account delete
  is best-effort/post-commit and only `console.error`s on failure (`server/routes/auth.js` ~L447-454),
  so a silent failure can re-introduce aggregate drift. The set of recipes is correct
  (`distinct('recipeId', { userId })` covers rating-only docs); only the failure mode is silent. Consider
  a periodic reconciliation job (pairs with the item above) or alerting on recompute failure. *(low priority)*
- `[ ]` **Migrate Sass `@import` → `@use`** — build emits Sass `@import` deprecation warnings
  (pre-existing; Sass 1.x warns `@import` is going away in 3.x). Cosmetic now, worth migrating.
- `[ ]` **Point Railway at the production branch** — currently not deploying from production.
- `[ ]` **Post-6-phase-refactor DB check** — confirm no existing database records need updating/migrating
  after the refactor.
- `[ ]` **Establish a code & architecture standard for Claude** — write a conventions doc so generated
  code stays consistent (likely an addition to `CLAUDE.md` or a new `CONVENTIONS.md`).
- `[ ]` **Refactor the create-recipe page**.
- `[ ]` **Refactor the account page**.
- `[ ]` **Ingredient parser: handle "not found"** — on a parser miss, add an exit/timeout instead of
  hanging.

## Testing

- `[ ]` **Tests for the toast/alert system** — newly implemented `react-hot-toast` is untested.
- `[ ]` **Create-recipe tests** — Cypress (E2E) + Vitest (unit).
- `[ ]` **Cypress: test autocomplete on the Recipes page**.
- `[ ]` **Node 26 test-harness gaps — missing globals in the test sandbox** — this dev machine runs
  **Node 26**, whose VM/sandbox no longer injects some globals that the test stacks assume:
  - **Server (Jest):** `server/__tests__/email-notifications.test.js` fails **7/22** with
    `ReferenceError: clearTimeout is not defined`, thrown from `superagent/request-base.js:28` (via
    supertest) → cascades to 5000ms test timeouts. **Confirmed pre-existing and environment-induced**, not
    a product bug: reverting `server/` entirely to base `a7a6653` reproduces the identical 7 failures, and
    the file imports nothing app-specific. Other server suites that use supertest pass — only the
    slower email-send paths trip the missing timer global. Likely fix: inject the timer globals when absent
    in `server/__tests__/setup.js` (e.g. `const t = require('node:timers'); global.clearTimeout ??= t.clearTimeout; global.setTimeout ??= t.setTimeout`), mirroring the client fix below.
  - **Client (Vitest):** the analogous `localStorage`-is-undefined gap (`savedFilters` / `SingleRecipe`)
    was the **same root family** and is **already fixed** in PR #156 via an in-memory `Storage` polyfill in
    `src/test/setup.ts`.
  - *(Both are masked once everyone is on a Node where the sandbox restores these globals; the guards are
    no-ops then. Surfaced during track 1c review, 2026-06-18.)*

## Ideas / needs a decision

- `[ ]` **Friend system** — **post-1.0** (decided 2026-06-17). Backlog only; not in the 1.0 scope.
- `[ ]` **AI recipe search as a paid membership feature** — **post-1.0** (decided 2026-06-17). Future idea.
- `[ ]` **Fridge & freezer life on the create-recipe form** — **post-1.0** (decided 2026-06-17). The
  `fridgeLife`/`freezerLife` fields still exist in the data model (`src/types.ts:13-14`) but were
  removed from the create form; revisit re-adding them after launch.

---

## Resolved / verified done (recorded, not active)

- `[x]` **Sign-up button copy** — already reads "Create account" (`src/pages/Signup/Signup.tsx:110`).
- `[x]` **Bug reporting & viewing system** — shipped: `BugReportModal` + `/admin/bug-reports` queue +
  `bugReports` collection/route.
- `[x]` **Monitor images & comments for harmful content** — content moderation shipped (blocklist +
  OpenAI text + Google Vision image). See `docs/CONTENT_MODERATION.md`.
- `[x]` **Fix failing tests** *(2026-06-14)*.
- `[x]` **Fix the print-recipe page** *(2026-06-14)*.
- `[x]` **Migrate React env → Vite** *(2026-05-10)*.
