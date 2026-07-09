# Prepify — Backlog

Triaged from Jesse's running notes (2026-06-17). This is the general backlog: bugs, UX polish,
a11y, tech debt, testing, and ideas. The beta→1.0 launch checklist lives separately in
[`RELEASE_PLAN.md`](./RELEASE_PLAN.md) — items here are **not** release blockers unless cross-referenced.

> **Verification pass 2026-06-26:** every open item below was re-checked against the current tree.
> Stale file/line citations were corrected, several claims were re-diagnosed (notably the edit-form
> NaN bug and the now-orphaned `RecipeThumbnail`), and a few items were closed (`/recipes` navbar
> search, Railway prod branch). New findings are folded inline and marked **(verified 2026-06-26)**.

> **Note triage 2026-07-08:** Jesse's Obsidian dump (21 new items, filed 2026-06-17→07-02) was verified
> item-by-item against the tree (7 parallel agents). 7 came back already fixed by the late-June/July sweeps,
> 4 were tracked/deferred elsewhere, and the survivors are filed below tagged *(triaged 2026-07-08)* and
> boarded as **Wave 6 (N1–N7)** in [`BACKLOG_ROADMAP.md`](./BACKLOG_ROADMAP.md).

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

- `[ ]` **Per-ingredient price estimates can be wildly off (the "$10/serving parfait") — the remaining half
  of the serving-price saga** *(triaged 2026-07-08; filed 2026-06-17)* — PR #152 fixed only the division math,
  and that bug's signature was a flat **~$1.00**/serving (see `server/scripts/backfillServingPrice.js:6-10`) —
  so a $10 parfait was never that bug. Two open halves: **(1) ops** — the backfill script recomputes stored
  `servingPrice` from the *already-stored* `totalPriceUSACents` (dry-run by default, `:36`) and nothing in-repo
  proves an `--apply` run ever happened (cross-ref the Tech-debt backfill item at ~L757); **(2) estimate
  quality** — nothing addresses garbage-in: a mis-parsed quantity/unit (`updateIngredients.ts`, ~80 genuinely
  untested lines per the Testing section) or a bad proxy gram-estimate still yields absurd totals, and pre-v2
  recipes keep their v1-era stored per-ingredient prices (see the parser-data item ~L620). Lane: run the
  backfill, then pull the parfait's per-ingredient `totalPriceUSACents` to attribute parse-bug vs
  proxy-estimate before writing any fix. → **N1**
  - *(2026-07-08 update, N6 [#255](https://github.com/jclind/prepify/pull/255))* — **investigated + guarded, not closed**: a dev dry-run showed **0 servingPrice drift** (so half (1)'s `--apply` is a no-op on current data) and attributed the parfait to a **bad proxy gram-estimate** (`1 cup strawberries` = $25.34 on stale v1 data), not a parse or division bug. Fix-option (B) — a **`price_outlier` flag** on enriched rows ≥ $15 — shipped on N6's telemetry surface (**flag, not clamp**). Still open: **(A)** the owner/proxy-gated re-enrich backfill for stale v1 prices, and half (2)'s parse-quality hardening in `updateIngredients.ts`.
- `[x]` **`Received NaN for the \`value\` attribute` warning on Edit Recipe — root-caused; it's a real
  hydration bug, not cosmetic (verified 2026-06-26)** — *(fixed in [#235](https://github.com/jclind/prepify/pull/235), F1:
  hydrate `TimeInput` from `val.hours`/`val.minutes` — the `Number(val)` arithmetic that produced `NaN` on an object `val` is
  gone; a `0` component renders empty per `minToHrMin`'s intent. Added a `TimeInput hydration` regression block. Runtime-verified:
  the authed draft-resume flow repopulated prep/cook `2/15/''/45`, and the buggy counterfactual blanked all four. Scope narrowed —
  `AddRecipe.tsx` needed no change, it already fed the object shape.)* re-diagnosed from source. The culprit is **not** the
  servings/summary-bar math (those are guarded: `ServingsInput.tsx`, `AddRecipeSummaryBar.tsx:52-56`). It's
  **`src/pages/AddRecipe/TimeInput/TimeInput.tsx:23-27`**: the hydration effect treats `val` as a *minute
  number* (`Number(val) % 60`, `Math.floor(Number(val) / 60)`), but `AddRecipe.tsx:82-86` feeds it a
  `{hours, minutes} | null` object (via `minToHrMin`). `Number({hours,minutes})` is `NaN`, so on edit-mount
  it sets `minutes`/`hours` to `NaN` → flows into `RecipeFormInput` `value={NaN}` → the React warning.
  **Bigger than the warning:** because the value is `NaN`, the **prep/cook time fields render blank on edit
  (and on draft-resume, `AddRecipe.tsx:156-157`)** instead of showing the saved time — looks like data loss.
  The save still succeeds (the writeback effect `if (minutes || hours)` is falsy for `NaN`, so the parent
  keeps the correct object), so it's display-only, but confusing. Fix: `setHours(val.hours); setMinutes(val.minutes)`
  (drop the `Number(val)` arithmetic entirely). Originally filed 2026-06-24 as cosmetic; upgraded after verification.
- `[x]` *(fixed in [#248](https://github.com/jclind/prepify/pull/248), R1)* **Clearing a `TimeInput` field silently keeps the old prep/cook time on edit (filed 2026-07-06, off the F1 review)** —
  surfaced reviewing the F1 fix ([#235](https://github.com/jclind/prepify/pull/235)). The writeback effect in
  **`src/pages/AddRecipe/TimeInput/TimeInput.tsx:61-64`** is `if (minutes || hours) setVal(...)`, so when the user clears **both**
  the hours and minutes fields back to empty, `setVal` never fires and the parent's `prepTime`/`cookTime` stays at the last
  non-empty `{hours, minutes}`. On an **edit**, clearing a time and saving therefore silently re-persists the *old* time — and
  `AddRecipe.tsx`'s `if (!prepTime)` required-field guard reads the (still-populated) parent state, so it passes too. **Latent
  before F1** (the broken `NaN` hydration meant the field was never in a populated state to clear); **reachable now** that
  edit/draft-resume rehydrates correctly. **Fix:** emit a clearing signal when both go empty — e.g. an `else setVal(null)` branch
  on that effect (`null` re-triggers the sibling effect's `!val` reset, which is harmless). **Low severity** (only bites
  edit/draft-resume + an intentional clear-to-blank), one file — belongs to the AddRecipe lane (**C1/R1**) or a small F-track.
  *(**Fixed in [#248](https://github.com/jclind/prepify/pull/248)**, R1: writeback now emits `setVal(null)` when both fields
  clear, gated behind a `hasUserEdited` ref so the pre-hydration render can't be mistaken for a user clear; +2 regression tests,
  runtime-verified — filled→valid, clear-both→invalid, re-enter→valid. Merged 2026-07-07.)*
- `[x]` **Whitespace-only recipe title bypasses the "Title is required" guard (filed 2026-07-07, off the R1 runtime verification)** —
  found acting as a malicious user against the running create-recipe form. `validateRecipeForm` (`src/pages/AddRecipe/recipeFormValidation.ts`)
  tests the title with `!form.title`, so an all-spaces title (`"     "`) is truthy → **no "Title is required" error**. Fill the other
  required fields and the form validates and publishes a recipe with a blank-looking (whitespace) title; the saved recipe then renders
  an empty `<h1>`. **Pre-existing, not an R1 regression** — the R1 extraction lifted the `!title` check verbatim from the former
  in-component `validate()`; the same gap existed before. **Fix:** guard on `!form.title.trim()` (and ideally trim the title in the
  submit payload); confirm the server (`validateRecipeBounds`, `server/routes/recipes.js`) also rejects a blank/whitespace title as
  defence-in-depth. **Low severity** (data-quality, self-inflicted — no XSS/security impact; the malicious content itself is escaped
  safely), one-line client fix — belongs to the AddRecipe lane (**R1** follow-up) or a small F-track.
  *(fixed in [#253](https://github.com/jclind/prepify/pull/253), whitespace-title guard: client `validateRecipeForm` now trims
  before the presence check (length cap on the trimmed value) and `useRecipeForm.handleSubmit` trims the submit payload
  (create+edit); server `validateRequiredRecipeFields` treats a whitespace-only required string as missing, **and** a new shared
  `normalizeRecipeInput` trims the title before bounds+persistence in both the create & edit routes — so a direct API call can't
  store a padded title either (drafts untouched: `validateRecipeBounds` only). +regression tests (`recipeFormValidation.test.ts`,
  `server/__tests__/recipeLimits.test.js`). Live-verified against the running dev API: POST `title:"  Live Probe Soup  "`
  persisted as `"Live Probe Soup"` in dev Mongo, then cleaned up. Merged 2026-07-08.)*
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
- `[x]` **Account ratings "Load More" count can be off when a rating's recipe is hidden** — *(fixed in [#231](https://github.com/jclind/prepify/pull/231), S3: the `returnRecipeData=true` path now joins + filters hidden recipes inside a `$lookup`+`$facet` so page and `totalCount` run over the same visible set.)*
  `GET /getSingleUserReviews` computes `totalCount` from `countDocuments(query)` over *all* of the
  user's rating docs (`server/routes/reviews.js:281-284`), but with `returnRecipeData=true` the returned
  `reviews` array is filtered to recipes that are still visible (`:294-308`, drops soft-hidden/deleted
  recipes). So if a user rated a recipe that was later hidden, `totalCount > reviews.length`, and the
  client trusts that count to decide pagination (`UserRatings.tsx:114`/`:118`:
  `setIsMoreReviews(Number(data.totalCount) > …length)`). Symptom: the "Load More Reviews" button can
  show with nothing left to load, or a later page returns fewer rows than expected. *(surfaced by
  track 1c; pre-existing, not a regression — out of that track's scope.)* **(verified 2026-06-26: the
  created-recipes list ("Your Recipes") is NOT affected — `server/routes/users.js:59-68` applies the same
  filter to both `find` and `countDocuments` and does no post-fetch filtering, so its count stays
  consistent. This bug is ratings-only.)** Fix: count post-visibility-filter, or paginate via an
  aggregation `$lookup` that excludes hidden recipes before the count.
- `[x]` **Data export omits saved-recipe content** — was: `exportMyData` exported full recipes, drafts,
  ratings, and profile, but `savedRecipes` was still the raw reference array — `recipeId` + metadata
  (`collectionIds`/`savedAt`), no recipe bodies (`server/routes/auth.js:355`; verified 2026-06-26).
  **Fixed in S2/PR [#229](https://github.com/jclind/prepify/pull/229) (merged 2026-07-05):** each saved entry is
  now hydrated with its recipe body (through `publicRecipeProjection`, since saved recipes are other users'),
  keeping the ref with `recipe: null` for deleted/hidden ones.
- `[x]` **`checkMadeRecipe` response-shape mismatch — the "made once an hour" throttle silently resets on
  reload** *(fixed in [#264](https://github.com/jclind/prepify/pull/264) via **option B**: dropped the phantom
  client-side date/throttle logic and aligned `MadeRecipeBtn` to the server's binary `{ made: boolean }` — once
  marked, the button shows "Made it ✓" and disables (made is one-way per user; re-marks are already idempotent
  server-side, so nothing needed throttling). `checkMadeRecipe` is now typed `{ made: boolean }`; +5 regression
  tests. Option A — a durable per-user cooking log with timestamps — was **not** taken (it would reverse the
  server's deliberate inflation guard) and is instead filed as a feature in
  [`FEATURE_IDEAS.md`](./FEATURE_IDEAS.md) → "Personal cooking log".)* *(surfaced 2026-07-08 in the API-contract
  regeneration ([#262](https://github.com/jclind/prepify/pull/262),
  see [`API_CONTRACT.md`](./API_CONTRACT.md) DRIFT — recipes))* — `GET /checkMadeRecipe` returns
  `{ made: boolean }` (`server/routes/recipes.js:967`) and stores made entries as `{ recipeId }` with **no
  date**, but `src/pages/SingleRecipe/Buttons/MadeRecipeBtn.tsx:20,33-37` casts the result to
  `{ datesMade?: string[] }` and derives `numTimesMade`/`lastDateMade` from it. `datesMade` is always
  `undefined` from the server, so the cooldown (`canMakeAgain`, `MadeRecipeBtn.tsx:10-13`) only ever sees the
  component's **optimistic in-session cache write** (`:48`, `String(new Date().getTime())`) — on refetch/reload
  the derived count/last-date reset to zero and the once-an-hour re-make guard is effectively gone until the
  next in-session mark. **Needs a decision** (`[?]`): either **(A)** persist make timestamps server-side (store
  a `datesMade`/`madeAt` array on each `madeRecipes` entry and return it) so the throttle survives reloads, or
  **(B)** drop the date-based throttle entirely and rework `MadeRecipeBtn` around the boolean the server
  actually returns. Low user impact (the button is a personal marker, not gated writes), but the current code
  reads as if a durable throttle exists when it doesn't. One-file client change for (B); a small server +
  client change for (A).

## UX / visual polish

- `[x]` **No way home from the login/signup pages** *(fixed in [#257](https://github.com/jclind/prepify/pull/257),
  N3; triaged 2026-07-08; filed 2026-06-18)* — both auth pages
  render outside `Layout` (no navbar: `src/App.tsx:405-406`) and the "P" brand mark is a plain `<div>` on both
  (`src/pages/Login/Login.tsx:39`, `src/pages/Signup/Signup.tsx:49`); the only links go to
  forgot-password/signup/terms/privacy/login — never `/`. Three redesign passes (`ca54b8c`, `27b0798`,
  `b994007`) touched these files without adding one. Fix: wrap the brand mark in `<Link to='/'>` on both
  pages (a "Back to Prepify" text link also fine). → **N3** — shipped: `<Link to='/' aria-label='Prepify home'>`
  on both, underline stripped + flat hover/focus-glow ring on `.brand-mark`.
- `[x]` **Usernames aren't links to `/u/:username`** — *(byline half fixed in [#258](https://github.com/jclind/prepify/pull/258), N4: the whole `.author-row` — avatar + `@handle` + date — is now one `<Link to={'/u/' + authorUsername}>`, matching the admin pages; underline-on-handle hover/focus + `@mixin outline()` ring + aria-label. The **reviewer-name half was reassigned to the §D Ratings & Reviews overhaul** (rule 8b — it rewrites `RecipeReview.tsx` end-to-end), so it's tracked there, not here.)* *(triaged 2026-07-08; filed 2026-06-18)* — the public
  profile route exists and admin pages already link it (`Admin/Users/Users.tsx:29`,
  `Admin/Reports/Reports.tsx:207`), but neither public-facing spot does: the recipe author byline
  (`SingleRecipe.tsx:410-411`, plain `<strong>@{authorUsername}</strong>` inside `.author-row`) and the
  reviewer name on each review (`Reviews/RecipeReview.tsx:77`, plain `<div class='name'>`). Wrap both in
  `<Link to={'/u/' + username}>` — for the byline ideally the whole `author-row` incl. avatar. **Note:** the
  reviewer-name half sits inside the RELEASE_PLAN §D Ratings & Reviews overhaul's file surface — see the N4
  dep note on the roadmap. → **N4**
- `[x]` **RecipeNotFound page: search emphasis + de-AI the copy** — *(fixed in [#259](https://github.com/jclind/prepify/pull/259), N5: copy rewritten into the owner's voice — "That recipe's off the menu…" (picked from drafted options, no em dash); the bare `SearchRecipesInput` given a bordered pill treatment — `$gray-400` border, `$primary-background` fill, `focus-glow($primary)` — mirroring the `/recipes` toolbar so the search reads as the primary next action.)* *(triaged 2026-07-08; filed 2026-06-25 —
  content untouched since `236a126`, 2026-06-18)* — current body copy is *"We couldn't find the recipe you're
  looking for — it may have been removed, or the link might be incorrect."*; the search field is the bare
  shared `SearchRecipesInput` under an uppercase eyebrow label with no container emphasis
  (`RecipeNotFound.scss:56-71`). Wanted: a human rewrite of the copy (needs Jesse's voice — draft options,
  don't invent) + a clearer search treatment. → **N5**
- `[x]` **Pixel-nit batch — needs a screenshot pass before touching** *(triaged 2026-07-08; filed
  2026-06-27→07-01)* — three nits survived triage but each needs visual confirmation first:
  **(a) servings-pill spacing** on the recipe page (`SingleRecipe.scss:286-330`) — the same-day a11y resize
  (`51fb2ac`, 26→32px `step-btn`s) reflowed the pill, so it may read fine now; the `−`/`+` are text glyphs
  already flex-centered (`:303-305`), so any residual offset is font optical metrics and the only real fix is
  swapping to the icon-system Lucide plus/minus (confirm wanted). → **N4** — *fixed in [#258](https://github.com/jclind/prepify/pull/258): screenshot-confirmed the pill read fine post-resize, so swapped the `−`/`+` text glyphs to house-family Lucide `MinusIcon`/`PlusIcon` (crisp flex-centering) and rebalanced the number↔"serv" gap + button breathing room (`.serv-input` 28→25px + margins) on owner feedback.*
  **(b) /recipes search-button asymmetry** — the embedded button sits `right: 6px` while the left icon gutter
  is ~17.6px (`Recipes.scss:26-67`); a one-line nudge if confirmed. → **N5** — *closed by-design in [#259](https://github.com/jclind/prepify/pull/259): the 6px inset is a consistent nested-control gap (≈4px vertical inset), not meant to mirror the decorative text gutter; measured both.*
  **(c) footer "Report a bug" centering** — it's *deliberately* left-adjacent in the copy·bug·version row
  (`Footer.scss:121-137`, version pushed right via `margin-left:auto`); decide centered-vs-by-design, then
  either relayout `.footer-legal` or close. → **N5** — *resolved in [#259](https://github.com/jclind/prepify/pull/259): left-adjacency kept (owner call), but the trigger was re-aligned — it read a size smaller than the ©/version spans (shared `.bug-report-trigger.btn` compact `$text-fine`); a `.footer-legal`-scoped inherit override lands all three on the row baseline.*
- `[x]` **Create-recipe form dropdown inputs aren't visually uniform** — *(fixed in the C1-tail lane,
  [#252](https://github.com/jclind/prepify/pull/252), 2026-07-08.)* The Cuisine / Course / Diet `react-select` controls (`recipeSelectStyles.ts`) were tuned to
  mirror the shared `FormInput` `compact` variant exactly: 1px `$tertiary-text` resting border (was a 2px
  react-select default grey), teal `$secondary` focus border + the `@mixin focus-glow` halo (was orange
  `$primary`, no ring), the `$border-radius` token, a 40px `min-height`, a 1rem value inset, and no orange
  hover shift (the text fields give none). Three new tokens (`secondary` / `borderRadius` / `focusGlow`) were
  surfaced through `_exports.module.scss` so the values stay single-sourced. Verified via an authed headless
  pass over `/add-recipe` (resting / focused / selected all match the neighbouring text fields). *(surfaced
  2026-06-29 while consolidating `RecipeFormInput` into the shared `FormInput`.)*
- `[x]` **Better "no results found" on the Recipes page** — *done in PR #167 (track 2d, merged ✅):*
  replaced the weak indicator with a real empty state (icon + contextual copy that names the query and/or
  filters) and Clear-filters / Browse-all affordances.
- `[x]` **Optimistic ingredient add** — *done in PR #164 (track 3d; PR open).* Adding an ingredient now
  parses locally and shows the row immediately, reconciling price/image when enrichment returns; a failure
  keeps the row and flags it with a one-tap retry instead of waiting on the request.
- `[x]` **Search autocomplete "autocorrect" is weak** — *done in PR #167 (track 2d, merged ✅):*
  added a server-side fuzzy fallback (`server/util/recipeTitleMatch.js`) scoped to the autocomplete
  endpoint, so typos like `chikcen` surface `…Chicken…` results, with a "showing similar recipes" banner
  and a redesigned dropdown. *(Follow-ups on the fallback's scalability and the dropdown's a11y are filed
  separately below.)*
- `[x]` **Autocomplete footer label can disagree with the rows shown** — *(fixed in [#238](https://github.com/jclind/prepify/pull/238), C4: pointed the footer label at the debounced `trimmedQuery` so it matches the rows + empty-state; the submit action deliberately stays on the live value — shared with Enter / top Search, which must fire for <3-char queries — a one-directional, self-correcting skew documented on `handleSubmit`.)* The dropdown keeps the previous
  query's results visible during the debounce + refetch (`keepPreviousData`), but the "Search for …"
  footer read the live input (`searchRecipeVal.trim()`), so mid-type it could say *Search for "chica"*
  while the list still shows `chic` matches (rows + empty-state read the debounced `trimmedQuery`). Cosmetic,
  self-corrects on fetch. (`SearchRecipesInput.tsx:228` footer vs `:52-64` debounced query + `:127-128`
  input; lines re-verified 2026-06-26.) *(surfaced 2026-06-22 in the track 2d code review.)*
- `[x]` **Autocomplete result click "swallowed the instant the row appears"** — *root cause was misfiled
  and is now fixed in PR #171.* The reported symptom (clicking a freshly-appeared dropdown row does
  nothing) was **not** a `keepPreviousData` refetch/node-swap race: a production build shows the list is
  stable once results load and an immediate click on a real row navigates fine. The actual cause is that
  the loading **skeleton placeholders shared the `.ac-item` class** (`ac-item ac-item--skeleton`), so for
  the first ~150ms the dropdown is full of non-interactive skeletons that *look* like rows — clicking one
  (or a probe/test resolving `.ac-item` `.first()`) hits a skeleton, which has no navigation. Fixed by
  giving skeletons their own `.ac-skeleton` class (sharing none of the interactive row's selectors), so
  `.ac-item` only ever matches a real, navigable result. Also hardened the narrow genuine swap-race by
  delegating result activation to the stable `.auto-complete-results` container via `data-recipe-id`
  (a row that re-renders mid-interaction can no longer drop the event). Verified on a prod build: during
  load `.ac-item` count is 0 while `.ac-skeleton` shows; after load an immediate real-row click navigates.
  (`SearchRecipesInput.tsx` + `.scss`.) *(originally surfaced 2026-06-22; re-diagnosed and fixed 2026-06-23.)*
  *(Code-review follow-up: the first delegation guarded with a never-resetting `navigatingRef`, which broke the
  navbar's `SearchRecipesInput` — it lives in the persistent `<Layout>` and is reused across navigations, so
  after one navbar nav every later autocomplete click no-op'd until reload. Replaced with a stateless `onClick`
  handler + a "navbar autocomplete works on consecutive uses" regression test.)*
- `[x]` **"You created this recipe" — mobile styling** — *fixed in PR #160 (track 2c)*; owner-stats
  strip now an equal-width row with dividers instead of scattering via `space-between`.
- `[x]` **Recipe stats styling** — *fixed in PR #160 (track 2c)*; rating dropped from the action-bar
  row, replaced by a per-serving price tile (time / servings / price).
- `[x]` **Add-recipe bottom bar overlaps the footer** — *done in PR #164 (track 3d; PR open).* The summary
  bar is now `position: sticky` (+ `margin-top: auto`) so it releases at the page end above the footer
  instead of a fixed overlay; the footer's global top margin is also cancelled on this page (`:has`) so the
  bar sits flush above it, and the cuisine/course dropdowns were lifted above the bar (menu z-index 50→60).
- `[x]` **Add-recipe summary bar doesn't stay visible while scrolling the form** — *(Decided 2026-07-08,
  C1-tail audit — keep the current release-at-end behavior; no code change.)* This was always framed as a
  design decision, not a bug: the tracked footer-overlap regression is fixed, and whether the bar should be
  permanently viewport-pinned is a product/UX call. Owner elected to keep the current `position: sticky;
  bottom: 0` behavior (bar rests at the end of the form column, footer reachable) rather than convert it to
  an always-visible fixed bar. Re-open only if an always-visible summary is later wanted. Original write-up
  retained below for context. — the PR #164 fix uses
  `position: sticky; bottom: 0` + `margin-top: auto` (`AddRecipeSummaryBar.scss`), which correctly releases
  the bar above the footer at page end (the original overlap bug — fixed). But `margin-top: auto` parks the
  bar at the bottom of the form's flex column, so on a tall form it does **not** pin to the viewport bottom
  while you scroll — the summary (totals + submit) is off-screen until you reach the very bottom. The SCSS
  comment ("pins to the bottom of the viewport while the form scrolls") overstates the actual behavior.
  *Decide whether an always-visible summary bar is wanted; if so it likely needs the bar outside the
  `margin-top: auto` column (e.g. a fixed/sticky element relative to the scroll root, with bottom padding on
  the form so the footer stays reachable). Not a regression — the tracked footer-overlap bug is fixed.*
  *(surfaced 2026-06-22 during the Phase-3 verification pass; runtime-confirmed: mid-scroll the bar sits
  off-screen below the fold, footer reachable above the bar at page end. Candidate for the create-recipe
  refactor or the Phase-4 QA sweep.)*
- `[x]` **Add-recipe group labels render underwhelming** — *(Decided 2026-07-08, C1-tail audit — looks
  intentional post-overhaul; no change.)* Re-audited against the current tree: on the **recipe view** the
  labels (`.ing-group-label` / `.step-group-label`, `SingleRecipe.scss`) render as deliberate brand-orange
  bold section headers with spacing; on the **create form** the inserted label row (`.label-text-container
  .text`, `ListComponents/Item.scss`) is a clean bold `$text-md` line. After the create-recipe overhaul (R1
  #248 + the type-scale / hover / focus-ring sweeps) both read as intentional, so the owner closed this as no
  longer "underwhelming." Re-open if a dedicated label restyle is later wanted. *(originally noted
  2026-06-18 after the track-3d smoke test.)*
- `[x]` **Single-recipe "no recipe found" looks bad** — *fixed in PR #160 (track 2c)*; redesigned
  empty-state card (icon + search + "Browse all recipes" CTA), and fixed 404 routing so a missing
  recipe renders instantly instead of retrying ~7s then showing a generic error.
- `[x]` **Drop search from the topmost navbar on /recipes** — **done (verified 2026-06-26):**
  `src/Components/Navbar/desktop/DesktopBar.tsx:47` gates the top-bar search on
  `const showSearch = pathname !== '/recipes'` (block at `:51-54`, `dnav--no-search` modifier at `:50`), so
  the recipes page no longer carries search in the top-most bar; it still shows everywhere else. *(noted
  2026-06-10; the hardcoded `'/recipes'` literal here is the same one tracked under the route-const tech-debt
  item.)*
- `[x]` **Serving price not prominent enough** — *fixed in PR #160 (track 2c)*; per-serving cost is now
  a brand-orange price-tag tile in the top action bar.
- `[x]` **Review UI needs work** — *fixed in PR #160 (track 2c)*; "Your review" is now an eyebrow label
  + a teal-accented, tinted card distinct from the public list. The "rating dropdown" was already
  removed by track 1a (it's the "Remove rating" button now), so only the Your-Review UI applied.
- `[x]` **Show the recipe rating up top on the single-recipe page** — *done in PR #166 (track 3c, merged ✅):*
  a compact `.hero-rating` echo (`★ 4.5 · N ratings`) sits just under the title, shown only once the recipe
  has ratings, so an unrated recipe isn't labelled. Not a 4th action-bar tile (would crowd mobile); the full
  breakdown still lives in the Ratings & Reviews header.
- `[dropped]` **Account nav sections UI** — ~~improve the Saved / Ratings / etc. section navigation styling.~~
  **Closed stale 2026-07-07 (R2).** The account section nav was already redesigned (#136 vertical rail, 2026-06-14)
  and token-normalized after; this line was a bulk backlog-seed added 2026-06-17 — *after* that work — with no
  concrete defect behind it. R2 (#250) subsumes F6 by closing it, not by restyling.
- `[x]` **`/u/:username` public profile visual polish** — **done (track 2e):** centered identity
  (avatar, @handle + share, divided Recipes/Saves/Made counts, "location · Lv N", achievement chips),
  image-first square recipe tiles with rating · time · cost + a bookmark save-count badge, richer
  `EmptyState`, and a working **"Load more"** (new paginated `GET /getPublicProfileRecipes`). Saves/Made
  now come from a server-side aggregate over *all* visible recipes (not just the shown batch). Verified
  live incl. a 15-recipe load-more click-through (12→15, button clears, no dupes).
- `[x]` **"Change password" subhead is redundant/cluttered** *(fixed in [#246](https://github.com/jclind/prepify/pull/246), F4: removed the `<h3 class='sr-subhead'>Change password</h3>` in `AccountSection.tsx` — the subsection is self-describing via its labelled fields + "Update password" button under the governing "Account & Security" `<h2>`; kept the `.sr-subsection` divider and the "Connected accounts" subhead. Runtime-verified via a real signup→settings flow.)* — the `<h3 class='sr-subhead'>Change password</h3>`
  in `src/pages/Settings/sections/AccountSection.tsx:189` (shown only when `hasPasswordProvider`), inside the
  Settings → Account section. *(verified 2026-06-26: it's lowercase "Change password" in a Settings section,
  not a dedicated "Account & Security" page as previously worded.)*
- `[x]` **create-username page revamp** — **done (track 3e):** the page was redesigned into the shared
  soft-glass auth vocabulary alongside login/signup/forgot in **PR #131**, and the escape hatch (a
  "Cancel and log out" control wired to the auth signout, plus a guard that bounces users who already
  have a username) landed in **PR #98**. Reconciled + escape-hatch regression test added in **PR #162**.
  Page lives at `src/pages/CreateUsername/`. Username validation tightening is tracked separately under 3c.
- `[x]` **`RecipeThumbnail` shows the broken-image glyph on a failed image load** — track 3b (PR #170) gave
  `RecipeCard` an `onError` fallback to the icon `RecipePlaceholder` (`imgError` state + `onError`), but
  `RecipeThumbnail` only swaps in the placeholder when `recipeImage` is *absent* — a present-but-broken URL
  still renders the browser's broken-image glyph there (`src/Components/RecipeThumbnail/RecipeThumbnail.tsx`,
  no `onError` on the `<img>`). **(verified 2026-06-26: `RecipeThumbnail` is now orphaned — no app code
  imports it; the only importer is its own test `src/test/RecipeThumbnail.test.tsx`. So the user-facing glyph
  no longer renders anywhere, and the real fix is to DELETE `RecipeThumbnail` + its test rather than patch it
  — see the unify item below.)** Low severity. *(surfaced 2026-06-23 in the track 3b code review.)*
  **(closed by the delete — PR #199 removed `RecipeThumbnail` + its test entirely; marker reconciled
  2026-07-02 in the Wave-3 re-sweep.)**
- `[x]` **Consolidate the bespoke pill buttons into a real `.btn` system** — **done (PR #210, merged 2026-06-30):**
  promoted `.btn` to a full pill base + 5 BEM colour variants (`--primary`/`--outline`/`--ghost`/`--danger`/
  `--danger-solid`) + sizes + `--icon`, migrated ~70 bespoke buttons across ~35 files, documented at
  `docs/design/button-system.md`. Two review passes fixed specificity/leak regressions (review-edit Submit
  grey-on-orange, `load-more-btn` base leak, lost filter-hover transitions). *(original problem, for context:)*
  `.btn` in `src/index.scss`
  only strips defaults (no visual style), so nearly every page re-implements its own orange/ghost pill:
  `home-btn` (`404.scss`), `pp-browse-btn` (`PublicProfile.scss`), `about-btn`/`about-btn-primary`/
  `about-btn-ghost` (`About.scss`), `search-recipes-btn`, the Recipes toolbar pills, HomeCookSuggestion
  `.primary`/`.ghost`, etc. — same shape, slightly different padding/weight/hover each time. Promote
  `.btn--primary` / `.btn--ghost` / `.btn--pill` variants and migrate the bespoke buttons onto them.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[x]` **Unify `RecipeCard` and `RecipeThumbnail` — actually: delete `RecipeThumbnail` (verified 2026-06-26)**
  — **done (PR #199, merged 2026-06-27 — the code-quality sweep's dead-code pass deleted
  `RecipeThumbnail.tsx` + `.scss` + its test; marker reconciled 2026-07-02 in the Wave-3 re-sweep).**
  *(original write-up, for context:)*
  the two are ~80% duplicate (image + price + rating/time meta; differ mostly in `<Link>` vs `<button>`,
  `AiFillStar` vs `AiOutlineStar`, and `skeletonColor` `#e6e6e6` vs `#d6d6d6`), but verification found
  `RecipeThumbnail` is **dead code** — only its own test imports it; the live card everywhere
  (`Recipes.tsx`, `SavedRecipes.tsx`) is `RecipeCard`. So this isn't a merge — it's "delete
  `RecipeThumbnail.tsx` + `src/test/RecipeThumbnail.test.tsx`" (and that closes the broken-image item above
  for free). Confirm no lazy/string-based import first. *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[x]` **One icon per concept (react-icons drift)** — the same concept is drawn from different icon sets:
  star = `AiFillStar` / `AiOutlineStar` / `BsStar(Fill)` / `FiStar`; close = `AiOutlineClose` / `FiX` /
  `IoClose`; bookmark = `Bs*` and `Bi*` outline/filled pairs; time = `CgTimer` and `AiOutlineClockCircle`.
  Pick one icon per concept and re-export from a single `src/Components/icons` module so callers can't drift.
  *(surfaced 2026-06-25 in the design-consistency sweep.)* **(done 2026-06-29 — Wave 2 `2-iso`: added
  `src/Components/icons` single-source module, migrated all 58 call sites, collapsed ~25 drift concepts to one
  glyph each; a Vitest guard `icons-single-source.test.ts` now bans direct `react-icons/*` imports.)***
  **(follow-up done 2026-06-29, PR #206 — single house family: remapped all concepts to **Lucide** (`react-icons/lu`),
  collapsing the remaining 10-family mix to one stroke weight; 2 documented brand exceptions (the Google marks);
  filled variants now `fill="currentColor"` on the outline glyph. See [`design/icon-system.md`](design/icon-system.md).)***
- `[x]` **Share one react-modal style config** — each modal repeats its own `customStyles`/overlay inline,
  and they disagree: `BugReportModal` uses `#fff` + `8px` radius while `ConfirmDeleteReviewModal` /
  `ReleaseNotes` use `#eeeeee` + `5px`. **(verified 2026-06-26: it's 7 inline copies, not 3 — also
  `ReportControl`, `RecipeControls`, `AchievementsModal`, and `HomeCookSuggestion`.)** Extract a shared
  `modalStyles` constant (content + overlay) and a thin wrapper so every dialog reads the same.
  *(surfaced 2026-06-25 in the design-consistency sweep.)* **(done 2026-06-29, PR #203 —
  `src/util/modalStyles.ts` (`panelModalStyles`/`bareModalStyles`/`panelModalStylesWith` + one
  `setAppElement`), all 7 modals migrated, net −144 lines; marker reconciled 2026-07-02 in the Wave-3
  re-sweep.)**
- `[x]` **Codify the loading-state pattern (skeleton vs spinner)** — content grids use
  `react-loading-skeleton`, button actions use `TailSpin`, and several async waits show nothing; the choice
  is per-developer and `TailSpin` sizes vary (18–30px). Write down the rule (skeleton for content
  placeholders, spinner for discrete actions/auth) and align the outliers. *(surfaced 2026-06-25 in the
  design-consistency sweep.)* **(done 2026-06-30, PR #213 — single `loadingStyles` token module
  (`skeletonBase`/`spinnerColor`), `useDelayedLoading` flash-guard promoted to `src/hooks/`, a `.sk-hold`
  reserve-height utility, and a CLS / skeleton-fidelity pass: self-mirroring skeletons, `inline` to drop
  react-loading-skeleton's trailing `<br>`, image hold-until-`onLoad` fade-in, PublicProfile spinner→skeleton.
  Convention written at [`design/loading-states.md`](design/loading-states.md). Measured CLS Home 0.21→0.0002,
  SingleRecipe 0.27→0.02.)***
- `[x]` **Toast copy: consistent terminal punctuation + dedupe strings** — toasts disagree on trailing
  punctuation (`'Could not copy link'`, `'Could not update collections'`, `'Profile link copied'` have no
  period; most others end with `.`/`!`) and on phrasing (`'Profile link copied'` vs `'Profile link copied
  to clipboard'`). Pick one convention (terminal punctuation everywhere is the dominant pattern) and sweep
  the ~10 call sites; lift duplicated strings (`'Email already in use.'`, `'Password incorrect, please try
  again.'`, `'Image cannot be more than 5MB in size.'`) into shared constants. *(surfaced 2026-06-25 in the
  design-consistency sweep; continues the toast-punctuation fix started in track 4-qa.)* **(done 2026-06-29,
  PR #207 — one copy convention codified + `src/util/toastMessages.ts` (12 constants + 2 helpers), ~25 of
  ~90 call sites edited; marker reconciled 2026-07-02 in the Wave-3 re-sweep.)**

## Accessibility

- `[x]` **Mobile overscroll reveals the "Skip to content" link** — *(fixed in [#259](https://github.com/jclind/prepify/pull/259), N5: swapped the negative-offset park for a clip-based visually-hidden box — `top:0.5rem; clip-path:inset(50%); 1px; overflow:hidden`, full size on `:focus` — so there's no off-viewport geometry for overscroll to reveal; the keyboard-Tab reveal survives. Runtime-verified headless at 390px.)* *(triaged 2026-07-08; filed 2026-07-02 —
  confirmed real, not intended)* — the link hides via the negative-offset pattern (`position: absolute;
  top: -3rem`, reveal `top: 0.5rem` on `:focus` — `src/Components/Layout/Layout.scss:25-43`), and since
  `.app-shell` sets no `position`, it resolves against the document and scrolls with the page — so iOS/Android
  rubber-band overscroll exposes the painted geometry parked above `top: 0`. Fix: switch to a clip-based
  visually-hidden pattern (`clip-path: inset(50%)` / 1px box, full size only on `:focus`) so there is no
  off-viewport geometry to reveal. Introduced by the a11y sweep `27b0798` (2026-06-25); the keyboard-Tab
  reveal must survive the change. → **N5**
- `[x]` **Stop focus outline on mouse button clicks** — **done (track 3a, merged in PR #163 ✅):** the
  global `button`/`a` outline rule (`src/index.scss`) and every component-local `@include s.outline()`
  ring were switched from `:focus` to `:focus-visible`, so the ring shows for keyboard nav only.
  Input/textarea focus affordances (border/box-shadow/background) were deliberately left on `:focus` —
  clicking into a field should still highlight it.
- `[x]` **Desktop navbar account chevron animation shifts the focus outline** — **done (track 3a, merged
  in PR #163 ✅):** the caret was wrapped in a fixed-size `overflow:hidden` clip box with an inner
  rotating `<svg>` (`DesktopAccountMenu.tsx` + `DesktopNav.scss`), so the `outline:auto` ring no longer
  tracks the rotating icon's bounding box.
- `[x]` **Account Ratings list nests a `<button>` inside a `<button>`** — **fixed (track 2e):** the rating
  row is now a keyboard-operable `<div role="button">` wrapper (Enter/Space handler, `tabIndex`,
  `aria-disabled`) instead of a `<button>`, so `StarRating`'s per-star `<button>`s are no longer nested in a
  button. *(Pre-existing; surfaced during the Wave 2 verification live smoke test 2026-06-18 — NOT introduced
  by track 1c. Took the non-button-wrapper route over making StarRating render `<span>`s.)*

- `[x]` **Autocomplete dropdown isn't a valid ARIA listbox + has no keyboard nav** —
  **done (Wave 2 accessibility sweep, 2026-06-27, `worktree-feat+a11y-autocomplete-listbox`):** implemented
  the APG editable-combobox-with-list-autocomplete pattern in `SearchRecipesInput.tsx`. The input is now a
  `role="combobox"` with `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`/`aria-activedescendant`;
  each result is a valid `<li role="option" aria-selected>` *direct child* of the `<ul role="listbox">` (the
  intermediate `<li>` wrapper and the inner `<button>` are gone); Arrow/Home/End/Enter/Escape drive a real
  highlight via `aria-activedescendant` (focus stays on the input), Enter on a highlighted option navigates
  to it (falling back to a full search), and the active row scrolls into view. Mouse activation still routes
  through the stable delegated container handler. +7 tests (combobox semantics, valid listbox markup, arrow
  highlight + wrap, Enter-to-navigate, Enter-to-search, Escape); verified live in a headless browser. *(was:
  `<ul role="listbox"><li><button role="option">` with a plain `<li>` between the listbox and its options,
  an `option` on a `<button>`, no arrow-key nav, and every `aria-selected` hardcoded `'false'`. Originally
  surfaced 2026-06-22 in the track 2d code review; re-confirmed in the 2026-06-25 accessibility sweep and
  again 2026-06-26.)*

- `[x]` **Ingredient checklist `<li role="checkbox">` is an invalid ARIA role + breaks the list** —
  **done (accessibility sweep, 2026-06-25):** the checkbox role + keyboard handler moved onto an inner
  `<div role="checkbox">`, leaving each `<li>` plain (`SingleRecipe.tsx` `renderIngredient`). `.ing`
  styling stayed on the now-inner element, so the 2-column grid is visually unchanged (verified by
  screenshot). Clears Lighthouse `aria-allowed-role` + `list`; recipe page **89 → 97**. Keyboard toggle
  (Enter/Space → `aria-checked`) re-verified.
- `[~]` **Contrast (WCAG AA) — grey/teal/beta/red shipped; brand ORANGE reverted to vivid (owner call)**
  *(grey #181; brand + nav-logo + beta-tag + error-red #184; **orange reverted in the bg-lift PR**, 2026-06-25)*.
  The muted-grey, teal, beta-tag and error-red fixes are AA and shipped. **The brand orange, however, was
  intentionally reverted to the vivid `#ff5722` at the owner's request** (`$primary-accessible` points back at
  `#ff5722`): the AA `#bf360c` read too "brown." This **re-fails AA on the orange logo/CTAs/accents and drops
  Lighthouse a11y to ~96–97 on the routes that use them** (every other route stays 100) — accepted for now,
  pending a brand-colour decision. **To restore AA:** set `$primary-accessible` back to ~`#bf360c` (or a
  chosen on-light orange — see the shade exploration below). What's shipped vs reverted:
  - `[x]` **Muted-grey body/meta text (#181):** `$tertiary-text` darkened `#979ba0` → `#666c75` (lightest
    clearing 4.5:1 on white 5.29 / `#fafafa` 5.07 / `#eeeeee` 4.56); three hardcoded `#8a8f99` report-trigger
    greys tokenised onto it.
  - `[x]` **Brand teal (#184):** `$secondary-accessible #00787e` (5.27/4.54) on the teal eyebrow + auth
    buttons — kept, AA.
  - `[~]` **Brand orange — REVERTED to vivid `#ff5722` (owner call):** #184 had darkened it to
    `$primary-accessible #bf360c` (5.60/4.83) across ~25 selectors (logo, CTAs, "See all", eyebrows, price,
    …); that's now pointed back at `#ff5722`, which re-fails AA (2.7–3.2:1). The `#184` plumbing is intact
    (single token, on-tint handling like `.pp-lvl` → `#fff2ed`, active Settings nav `#006065`), so restoring
    AA is a one-line token flip. **Shade exploration (for when you revisit):**
    - The orange can't be both vivid *and* AA: a bright orange physically can't reach 4.5:1 on a light
      surface — to pass it has to deepen toward `#bf360c`.
    - The **logo is large text (≥24px), so its bar is only 3:1**, not 4.5:1 — `#ff5722` already passes 3:1 on
      *white* (3.16) and `#fafafa` (3.03); it only fails on the `#eeeeee` grey (2.73). A barely-perceptible
      nudge (`#f4501e`, 3.0+ on grey) clears it while staying iconic — so the logo *alone* needn't go to
      `#bf360c`.
    - A **lighter page background lets the whole orange go lighter**: on a white page the lightest AA orange
      is `#d83a0a` (4.64 on white), vs `#bf360c` on `#eeeeee` — but white kills card/background separation
      (cards then need a shadow/hairline border). `#bb4b00` (burnt) on `#f5f5f5` (4.68) was the explored
      middle. Candidates that clear 4.5:1 as small text on their bg: `#bf360c`/`#b84008`/`#a8330b` on
      `#eeeeee`; `#c5421a` on `#f5f5f5`; `#d83a0a`/`#bb4b00` only on near-white.
    - Decision axes: how vivid vs how deep · uniform-everywhere vs logo-as-special-case (large-text exemption)
      · how light to push the page background (card-pop trade-off).
  - `[x]` **Nav-logo wordmark (#184):** darkened to `$primary-accessible` on any light nav surface — the
    desktop solid bar (`.nav--solid`, incl. Home once scrolled) and the mobile bar on non-hero pages (new
    `.nav--dark-links` class, since `.nav--solid` is desktop-only and Lighthouse a11y emulates mobile). The
    transparent-over-hero logo keeps vivid `#ff5722` on its dark photo.
  - `[x]` **Beta-tag (#184):** per owner call (it's removed at the 1.0 cutover anyway), recoloured from
    light-on-`#00adb5` (2.78:1) to white-on-`$secondary-accessible` (5.27:1). This is what **unpinned the
    Lighthouse score** — the binary `color-contrast` audit had been failing on every page purely because of
    the ever-present beta-tag. *(Supersedes the earlier "leave it for Phase-5" note; the Phase-5 cutover will
    still remove the tag entirely.)*
  - `[x]` **Danger/error red text (#184):** darkened the shared `$error-red` token `#dc3545` → `#c5303f`
    (the lightest red clearing 4.5:1 on every surface it touches — text on white 5.43 / `#eeeeee` 4.68 /
    danger tint 5.14, and white-on-fill 5.43). Safe across all 13 usages (text / fill / border each gain
    contrast); alert boxes unaffected (own `$alert-error-red-text #721c24`). Took the last route —
    Settings-danger — to 100. Danger zone + inline validation visually re-checked.
- `[x]` **Servings stepper input is below the 24px touch-target minimum** — the `.serv-input` in the
  Ingredients servings pill (`SingleRecipe.tsx`) trips Lighthouse `target-size`. A label was added in
  track 4-qa (`aria-label="Servings"`), but enlarging the tap target is a layout change to the pill.
  *(surfaced 2026-06-23, track 4-qa; re-confirmed 2026-06-25 in the accessibility sweep.)* **Fixed
  2026-06-27 (Wave 2 `2-iso`):** all three controls in `SingleRecipe.scss` sized past the WCAG 2.5.8
  minimum — `.step-btn` 26→32px, `.serv-input` given `width:28px`/`height:32px` (was ~14px). Rendered
  boxes measured 32×32 / 28×32 in the running app; compact pill aesthetic preserved (desktop + 380px
  mobile re-shot, no overflow). CSS-only; markup/aria untouched.
- `[dropped]` **`$primary-hover` token (`#e74e1d`) fails WCAG AA on hover** — *folded into the owner's
  brand-orange recolor (2026-07-01); off the sweep board.* This is a hover **contrast** choice on the brand
  orange, so it belongs with the reverted-`$primary-accessible` decision above, not as an independent sweep
  track. The sweep's remaining hover work is **button hover-*motion* normalization** (a separate, colour-neutral
  concern — see [`design/button-hover-audit.md`](./design/button-hover-audit.md)). Original finding, kept for
  when the owner does the recolor: the design-tokens track added
  `$primary-hover: #e74e1d` (`helpers.scss`) and points several **white-on-fill button hovers** at it
  (`Home.scss:175`, `SingleRecipe.scss:659`, `RecipeNotFound.scss:87`) plus a **text** hover
  (`Footer.scss:72`). White on `#e74e1d` is only **3.81:1** and `#e74e1d` as text on white ~3.8:1 — both
  under 4.5:1, so these controls drop below AA *while hovered* (axe/Lighthouse scan the default state, so it
  doesn't show in the per-page scores). The base fills are fine; only the hover regresses. Fix: darken
  `$primary-hover` to an AA-passing shade (e.g. `≤ #c5421a`, white-on-it 5.04 — or reuse `$primary-accessible
  #bf360c`). NB the a11y brand pass already side-stepped this on the recipe Save button (`SingleRecipe.scss`
  uses a literal `#a52f0a` hover with a comment, *not* `$primary-hover`). *(surfaced 2026-06-25 while merging
  the brand-contrast PR #184 over the design-tokens track.)* After the recolor, re-check that `$hover-brighten`
  (brightness 1.06) doesn't push the new orange fill below WCAG AA contrast (per
  [`design/button-hover-audit.md`](./design/button-hover-audit.md)).
- `[ ]` **Add-recipe form controls need `aria-describedby` wiring** *(a11y follow-up, source
  [`ADD_RECIPE_UX_AUDIT.md`](./ADD_RECIPE_UX_AUDIT.md))* — the custom inputs on `/add-recipe` don't associate
  their help/error text with the control: wire `aria-describedby` on `TimeInput`, the Cuisine/Course/Diet
  react-select pickers, `ImagePicker`, and the ingredient/instruction list containers so screen readers
  announce the hint/validation copy with the field. Low.
- `[ ]` **Add-recipe `SectionHeader` label isn't tied to its inputs (`aria-labelledby`)** *(a11y follow-up,
  source [`ADD_RECIPE_UX_AUDIT.md`](./ADD_RECIPE_UX_AUDIT.md))* — `SectionHeader`
  (`src/pages/AddRecipe/SectionHeader.tsx`) renders its label as a bare `<span className='text'>` inside the
  `<h2>`, with no programmatic link to the fields it governs. Give the label an `id` and point each section's
  inputs (or their group) at it via `aria-labelledby` so the grouping is exposed to assistive tech, not just
  visual. Low.

## Security

*(Filed by the Security sweep, 2026-06-26 — Wave 1 of [`sweeps/ROADMAP.md`](sweeps/ROADMAP.md). The
sweep's cheap, unambiguous hardening shipped in the sweep PR; these are the structural / debatable tail.
The headline IDOR/authz, CORS, secrets-in-git, and XSS checks all came back clean — see the sweep PR's
findings table.)*

- `[x]` **[action] Revoke the live OpenAI key sitting in cleartext in the local `.env`** *(highest-priority
  follow-up)* — `.env:9` carries a full-access `VITE_OPEN_AI_API_KEY = sk-…`. Verified **dead** (zero
  references in `src/`, so Vite does NOT bundle it) and **never committed** (`.env` is gitignored; `git log
  -S` for the key is clean), so it is not an active leak — but it's a live, full-access credential in
  plaintext on disk. **Rotate/revoke it and delete the line.** OpenAI is server-side only now
  (`OPENAI_API_KEY` in `server/.env`). While there, drop the now-dead `SPOONACULAR_API_KEY` from
  `server/.env` (the v2 parser is key-free — the proxy holds the key). These are local gitignored files, so
  this is an operator action, not a code change / PR. *(surfaced 2026-06-26 in the security sweep.)*
  **(done 2026-07-03 — both keys revoked in their provider dashboards (OpenAI + Spoonacular) and the dead
  lines deleted from local `.env` (`VITE_OPEN_AI_API_KEY`) and `server/.env` (`SPOONACULAR_API_KEY`); swept
  the tree afterward, no other on-disk copies remain. The `.env.example` comment noting the key is unneeded
  was left in place.)**
- `[x]` **Public recipe reads return the full Mongo doc, leaking internal fields** — `GET /getRecipe`'s
  public path (`server/routes/recipes.js:411-437`) returned the entire recipe document with no projection,
  so internal curation/moderation stamps (`moderatedBy`/`moderatedAt`/`featuredBy`/`featuredAt`/
  `publishUpdatedBy`/`publishUpdatedAt` — admin Firebase uids + moderation metadata) leaked to
  anonymous clients on any recipe that was ever featured/unhidden. `publicProfile.js:74` & `:157` shared the
  full-doc pattern (only `RECIPE_VISIBLE`/active recipes, so no moderation-state leak, but they still exposed
  the author uid + other internal fields the card never reads). A follow-up code review found the same full-doc
  leak on the two highest-traffic public LIST reads too: `GET /recipes` (browse) and `GET /getTrendingRecipes`
  both `.toArray()`'d unprojected docs — and trending sorts `featured:-1` first, so it was the read *most*
  likely to surface `featuredBy` (an admin uid) to anonymous callers. (The other list reads —
  `searchAutoCompleteRecipes`, `getForYouRecipes`, `recipes/random` — already projected to a card shape.)
  - **DONE (PR #226).** Added a shared **whitelist** (not a blacklist of the six stamps, so a future internal
    field can't silently leak) in `server/util/recipeFields.js`: `publicRecipeProjection` = exactly the client
    `RecipeType` shape, built on `CREATABLE_RECIPE_FIELDS` so new user-content fields propagate automatically;
    and a lighter `publicRecipeCardProjection` — the single lean card shape (image/title/cuisine/time/price/
    rating/saves + the tag arrays For-You scores on; drops `userId`/`status` and all the heavy detail fields)
    now **shared by every public list surface**. This absorbed the pre-existing local `RECIPE_CARD_PROJECTION`
    in `recipes.js` (was used by For-You/random), so there's one card projection instead of two divergent ones.
    - `getRecipe` public (`findOneAndUpdate`) + owner-preview (`findOne`) paths project to
      `publicRecipeProjection`; the **admin** path keeps the full doc. The list reads —
      `GET /recipes` (browse), `getTrendingRecipes`, `getForYouRecipes`, `recipes/random`, and both
      `publicProfile.js` endpoints — project to `publicRecipeCardProjection`. (Browse/trending sort on
      `views`/`featured`/`createdAt`, which stay sortable even though they're not in the projected shape —
      Mongo sorts the stored doc, then projects.)
    - **FE-read check first** (Explore over `src/`): the client reads `userId` (owner-gating on
      `SingleRecipe`/`EditRecipe`) and `status` (owner "held for review" notice) — both **kept** on the detail
      response — but reads **none** of the six stamps anywhere, and the profile page reads neither `userId`
      nor `status`. So the whitelist keeps every field the UI consumes and drops only the unread internal ones.
    - **Evidence — live dev server, anonymous `GET /api/getRecipe` on a recipe seeded with all six stamps +
      `featured:true`:** response keys = `_id, authorUsername, cuisine, description, featured, ingredients,
      instructions, mealTypes, numTimesMade, numTimesSaved, nutritionLabels, rating, status, title, userId,
      views` → **zero** moderation stamps; `userId`/`status` retained; `views` still incremented 10→11 (the
      `$inc` coexists with the projection). Profile cards (`getPublicProfile` + paged): stamps **and**
      `userId`/`status` absent, display fields (title/rating/totalTime/servingPrice/numTimesSaved) present.
      **Browse + trending** (anon, recipe seeded with all six stamps + `featured:true`): both return exactly the
      10 card keys (`_id, cuisine, mealTypes, numTimesSaved, nutritionLabels, rating, recipeImage, servingPrice,
      title, totalTime`) — zero stamps, no `userId`/`status`, and none of the heavy detail fields; the
      featured-first sort still surfaced the recipe, confirming sort-on-unprojected-field.
    - **FE-read check for the card shape** (Explore over `src/`): browse (`RecipeCard`), trending/For-You
      (`HomeRecipeCard`), and the public-profile tiles all read only the 10 card fields — none read `userId`,
      `status`, or any detail field — so narrowing browse/trending/profile to the shared card shape drops
      nothing the UI renders (and made the profile cards lighter, since the old `publicRecipeCardProjection`
      still shipped the full `nutritionData`/ingredients/instructions a card never uses).
    - Tests: `recipes.test.js` "GET /getRecipe — public projection" (anon strips stamps, keeps client fields,
      view still increments, **admin still gets full doc**, owner-preview stripped) + "public list endpoints —
      card projection" (browse + trending omit uid/stamps) + `publicProfile.test.js` "cards omit internal
      fields" (both profile endpoints). Gates: server Jest **714/714**, `tsc --noEmit` clean. Low (PII =
      internal admin uids, not user-facing). *(surfaced 2026-06-26 in the security sweep; list-endpoint leak
      caught 2026-07-02 in code review of the fix.)*
- `[x]` **`getCreatedRecipes` leaks the same admin moderation stamps to the (non-admin) author** — DONE.
  `GET /getCreatedRecipes` (`server/routes/users.js`), the account "My Recipes" list, returned full recipe
  docs with **no projection** (`.find(filter).sort(...).toArray()`, `filter = { userId: uid,
  ...RECIPE_OWNER_VISIBLE }`). If any of the author's own recipes was ever moderated/featured, the doc carried
  `moderatedBy`/`featuredBy`/`publishUpdatedBy` (admin Firebase uids), so the response shipped them to the
  non-admin author — the **same leak class** as the #397 public-projection item, just on an authenticated
  owner endpoint (narrower audience: only the recipe's own author, not anonymous). Pre-existing; not touched by
  PR #226 (which scoped to *public* reads). **Fix:** added a lean whitelist `CREATED_CARD_PROJECTION` local to
  `users.js` (mirrors `SAVED_CARD_PROJECTION`) covering exactly the 10 fields `UserRecipeThumbnail` renders
  (`_id`/title/image/price/`createdAt`/views/saves/made/`totalTime`/rating) — structurally drops the six stamps
  *and* the heavy body (ingredients/instructions/nutritionData) the list never showed. The earlier note here
  assumed the list needed `status` for a "held for review" badge, but the thumbnail renders no such badge, so
  the plain card shape is correct (no `status`/`userId`); a comment flags where to add them if a badge lands.
  Verified against the live DEV endpoint with a minted token + seeded stamped recipe (response carried only the
  10 card fields). *(caught 2026-07-02 in the same code review that found the list-endpoint leak; see the #397
  item above. Fixed 2026-07-03.)*
- `[x]` **`exportMyData` returns the author's own `recipes`/`drafts` as full Mongo docs** *(fixed in [#251](https://github.com/jclind/prepify/pull/251), 2026-07-08 — a shared `RECIPE_INTERNAL_STAMPS` exclusion projection strips the six admin stamps from both owner finds while keeping the full authored body; saved-recipe half untouched. Closes the #397/#446 leak class. Runtime-verified: real ID token → `GET /exportMyData` → stamps gone, non-whitelist `description` kept.)* — same leak class
  as #397/#446, on the last unprojected account read. `GET /exportMyData` (`server/routes/auth.js:344`) builds
  its `recipes`/`drafts` arrays with `db.collection('recipes').find({ userId: uid }).toArray()` (and the
  `recipeDrafts` equivalent) — **no projection** — so any of the user's own recipes that an admin ever
  moderated/featured carries `moderatedBy`/`featuredBy`/`publishUpdatedBy` (admin Firebase uids) straight into
  the exported JSON the (non-admin) owner downloads. Narrowest audience of the three (only the recipe's own
  author, and only via an explicit data export), which is why it wasn't bundled into the S2 fix. Note the
  **saved-recipe** bodies on this same endpoint are NOT affected — S2/PR #229 hydrates them through
  `publicRecipeProjection`; this is only the owner's *own* `recipes`/`drafts`. **Decision needed:** a data
  export arguably *should* be higher-fidelity than a card, so the fix isn't necessarily the card whitelist —
  more likely strip just the six admin stamps (a small shared `RECIPE_INTERNAL_STAMPS` exclusion) while
  keeping the full user-authored body. Pre-existing; not a regression. Low (PII = internal admin uids, and the
  owner already authored everything else in the doc). *(caught 2026-07-03 in local review of S2.)*
- `[x]` **Recipe numeric/array fields aren't range- or type-validated server-side** *(fixed in [#228](https://github.com/jclind/prepify/pull/228), S1: `validateRecipeBounds` now runs a per-field numeric type+range spec — `NUMERIC_RECIPE_FIELDS` in `server/util/recipeLimits.js`, checking finite/integer/min-max on `prepTime`/`cookTime`/`totalTime`/`servings`/`fridgeLife`/`freezerLife`/`servingPrice` — plus a per-element ingredient-length cap. The `nutritionData`/`cuisine`/`mealTypes`/`nutritionLabels` shape/size checks stay unbounded beyond the global body-size limit.)* —
  `validateRecipeBounds` (`server/util/recipeLimits.js`, used by add/editRecipe) bounds title/description
  length, ingredient/instruction counts, and instruction-content length, but NOT the numeric fields
  (`servings`/`prepTime`/`cookTime`/`totalTime`/`servingPrice` accept negative/huge/non-numeric), per-element
  ingredient size, or the shape/size of `nutritionData`/`cuisine`/`mealTypes`/`nutritionLabels` (copied
  through, bounded only by the global JSON body-size limit). Add numeric type+range clamps and per-element
  caps. Low. *(surfaced 2026-06-26 in the security sweep.)*
- `[ ]` **`createdAt` is client-stamped and whitelisted on create** — the create path stamps the timestamp
  in the browser (`src/api/recipes.ts:284`, `createdAt: new Date().getTime().toString()`) and the server
  accepts it verbatim because `createdAt` sits in `CREATABLE_RECIPE_FIELDS` (`server/util/recipeFields.js:41`),
  so a hand-crafted request can back-date or forward-date a recipe (skewing `createdAt`-ordered sorts/feeds).
  Stamp it server-side on insert and drop it from the create whitelist so clients can't set it. Low.
- `[x]` **Admin review takedown matches on the stale denormalized `username`** — *(fixed in [#231](https://github.com/jclind/prepify/pull/231), S3: resolves `username → userId` and matches `{ userId, recipeId }`; audit `targetId` + notification now use the stable uid and current canonical handle.)*
  `PATCH /admin/reviews/moderation` (`server/routes/reviews.js:318-353`) matches `{ username, recipeId }`,
  but ratings are keyed by the stable `userId` (username is a set-once display field). If an author renames
  their handle after posting, the admin match can hit the wrong doc or 404, and the audit `targetId`
  (`${username}:${recipeId}`) inherits the ambiguity. Resolve `username → userId` (as
  `getSingleUserReviews:267` already does) and match on `userId`. Admin-only ⇒ a moderation-reliability bug,
  not an exploit. Low. *(surfaced 2026-06-26 in the security sweep.)*
- `[x]` **`POST /reports` has no per-user rate limiter (report-spam breadth)** — *(fixed in [#230](https://github.com/jclind/prepify/pull/230), S4: per-uid `reportLimiter` at 10/min in an independent bucket, mounted after `verifyToken, requireActive`.)*
  `server/routes/reports.js:69` enforces one-open-report-per-(reporter,target) but nothing caps *breadth*:
  one account can open a report against every recipe/user and re-file after each resolve/dismiss to bloat the
  moderation queue. Only the coarse global per-IP 1000/15min backstop applies. Add a `makeUserLimiter`-style
  per-uid limiter (mirrors how content writes are bounded in `middleware/writeLimiter.js`). Low-med.
  *(surfaced 2026-06-26 in the security sweep.)*
- `[x]` **Two authed writes lack the per-user write limiter (consistency)** — `POST /updatePrivacy`
  (`server/routes/auth.js:310`) and `POST /acknowledgeAchievements` (`server/routes/gamification.js:31`) are
  authed writes with no `profileWriteLimiter`, unlike their sibling profile writes. Both are cheap +
  idempotent so impact is minimal; add the limiter for consistency. Low. *(surfaced 2026-06-26 in the
  security sweep.)* **Done:** the `updatePrivacy` limiter merged in S2/PR
  [#229](https://github.com/jclind/prepify/pull/229) (2026-07-05); the `acknowledgeAchievements` half landed in
  S4/PR [#230](https://github.com/jclind/prepify/pull/230) (2026-07-06) with `profileWriteLimiter`.
- `[x]` **`POST /recipes/:id/save` counter update is read-then-write (TOCTOU)** *(fixed in [#228](https://github.com/jclind/prepify/pull/228), S1: replaced the read-then-`$push`/`$inc` with one atomic conditional write — a `{ _id: uid, 'savedRecipes.recipeId': { $ne: recipeId } }`-gated `$push` at `server/routes/recipes.js:856`, bumping `numTimesSaved` only when the push actually landed (MongoDB re-checks the array-absent filter under the doc write lock), so a racing double-save now 409s instead of double-counting.)* —
  `server/routes/recipes.js:760-773` reads `alreadySaved` then `$push`+`$inc`, so two concurrent saves from
  one user can both pass the guard and double-count `numTimesSaved`. Single-user, low impact. (The sibling
  `madeRecipe` counter-inflation — same shape but exploitable by *intentional* repeat POSTs — was fixed in
  the sweep PR by deduping off the atomic `$addToSet` result; `save` still has the narrow concurrent window.)
  Fix: array-condition update (`$ne` filter) / unique-element write. Low. *(surfaced 2026-06-26 in the
  security sweep.)*
- `[x]` **`firebase-admin` pulls transitive moderate CVEs (needs a breaking major bump)** *(fixed in
  [#234](https://github.com/jclind/prepify/pull/234), S7: bumped `firebase-admin` `^13`→`^14.1.0` in **both**
  trees + migrated to the modular API, and a `uuid ^11.1.1` override to clear the `@google-cloud/storage`
  chain that has no patched release yet — `npm audit` now 0 in server **and** root; remove the override once
  storage ships a fix)* — `cd server &&
  npm audit --omit=dev` was **8 moderate, 0 high/critical**, all transitive under `firebase-admin` →
  `@google-cloud/{firestore,storage}` → `gaxios`/`google-gax`/`teeny-request`/`retry-request`/`uuid`. The
  `uuid <11.1.1` advisory only triggers when the caller passes a `buf` arg, which firebase-admin doesn't —
  no runtime exploit path here. Fix requires `firebase-admin@14.x` (**breaking major**). Schedule it; not
  urgent. (Root/frontend `npm audit` shows 1 high = `undici`, but it's **dev-only/transitive** — `npm audit
  --omit=dev` at root = 0; the deployed bundle is clean.) Low. *(surfaced 2026-06-26 in the security sweep.)*

## Features

- `[x]` **Report reason: "incorrect info / price"** *(fixed in [#256](https://github.com/jclind/prepify/pull/256), N2: added `incorrect_info` across the `ReportReason` union, client `REASON_OPTIONS`, and server `REASONS`; **recipe-gated** — a new `RECIPE_ONLY_REASONS` server gate 400s it on review/user targets and a `recipeOnly` client flag hides it there; also spaced the admin queue reason pill as a 4th display surface)* *(triaged 2026-07-08; filed 2026-06-18 — doesn't exist)*
  — today's reasons are exactly `spam | inappropriate | offensive | copyright | dangerous | other`, synced in
  three places that must stay aligned: `src/types.ts:247-253` (`ReportReason`),
  `ReportControl.tsx:29-36` (`REASON_OPTIONS`), `server/routes/reports.js:55` (`REASONS`, validated `:99`).
  Add an `incorrect_info` value to all three; nuance: `REASON_OPTIONS` renders unfiltered for all target types
  (recipe/review/user), so either gate the new reason to `targetType === 'recipe'` or accept it appearing on
  review/user reports. Small (3 files + tests). → **N2**
- `[x]` **Ingredient-miss telemetry + admin list** *(fixed in [#255](https://github.com/jclind/prepify/pull/255), N6: best-effort `ingredientMisses` upsert in `/parse` — `miss` + N1's `price_outlier` — a read-only `GET /admin/ingredients`, an Admin › Ingredients list, and the sort-serving indexes in `db.js`)* *(admin)* *(triaged 2026-07-08; filed 2026-06-24 —
  unbuilt)* — enrichment misses are only `console.warn`'d (`server/routes/ingredients.js:76-81`, route has no
  DB handle); no persistence, no admin surface (the resolved 3d "not found" item below was the unrelated
  client 12s timeout). Minimal build (~half a day): best-effort upsert into a new `ingredientMisses`
  collection (`{ _id: normalized(ingredientString), raw, count: $inc, lastSeen }`) in `/parse`, a read-only
  admin route, and a `src/pages/Admin/Ingredients` list sorted by count desc (mirror the Users/Reports list
  pattern). Keep the write try/catch'd so a telemetry failure never affects the parse response. → **N6**
- `[ ]` **Reviewer avatars on review cards** *(triaged 2026-07-08; filed 2026-06-23 — not implemented; ships
  inside the §D overhaul, not as a one-off)* — review cards render only `@username`/stars/date
  (`Reviews/RecipeReview.tsx:74-86`); `/getReviews` returns raw ratings docs with no avatar field and no
  `$lookup` (`server/routes/reviews.js`); `ReviewType` (`src/types.ts:226-236`) has no photo field. Avatars
  live in Firebase Auth `photoURL` and ratings docs already carry the stable uid, so the join is a batched,
  deduped `getAuth().getUsers()` (tolerate failures like `publicProfile.js:34-47`) + the existing
  `DefaultAvatar` fallback. **Folded into the RELEASE_PLAN §D Ratings & Reviews overhaul** (blocker), whose
  scope already names `RecipeReview` + `reviews.js`. → RELEASE_PLAN §D
- `[x]` **Press `/` to focus search** — *shipped in [#238](https://github.com/jclind/prepify/pull/238) (C4,
  merged 2026-07-07):* global `/` shortcut focuses the search input (key handler in Layout). *(Line was stale
  — caught in the 2026-07-08 triage pass.)*
- `[x]` **Report a *user* from their profile page** *(admin)* — *done in PR #166 (track 3c, merged ✅):*
  `ReportTargetType` now includes `'user'`; the server accepts/validates/stores the target (no `recipeId`,
  carries `reportedUsername` + a `reportedUid` rename-stable snapshot), PublicProfile exposes a "Report user"
  control, and the admin queue renders user reports (close-only — suspend/ban lives on `/admin/users`).
  Server guards added: 404 on a non-existent handle, 400 on self-reports, case-insensitive rate limit.
- `[x]` **Double-check report-recipe styling in the controls element** *(admin)* — *done in PR #166 (track 3c,
  merged ✅):* tidied `ReportControl.scss` (focus-visible rings, button hover) and reworked the affordances
  into kebab menus (recipe / review / profile) plus a recipe top-controls kebab alongside the kept footer link.
- `[x]` **Report controls should be visible when logged out** — *done in PR #166 (track 3c, merged ✅):*
  `ReportControl` no longer returns `null` for logged-out users; the trigger stays visible (footer link + per-
  review/profile kebabs) and clicking it while logged out fires a "Log in to report this …" toast instead of
  opening the modal. One change in the shared component covers recipe + review + user.
- `[x]` **Username validation: disallow certain characters** — *done in PR #166 (track 3c, merged ✅):*
  server `validateUsername` now rejects anything outside `[A-Za-z0-9._-]` with a clear error, mirrored inline
  on the create-username flow (same rule order: whitespace → length → charset) so feedback matches before the
  availability round-trip.

## Tech debt / process / infra

- `[x]` **Ops: set `FIREBASE_STORAGE_BUCKET` in the server envs (+ make the empty-env skip real)** *(fixed in
  [#260](https://github.com/jclind/prepify/pull/260), N7: code early-returns the skip when the env is unset;
  owner confirmed the env is set on both dev + prod)* *(triaged
  2026-07-08, from the 6-18 "Bucket name not specified" delete-user report)* — user deletion was **never
  broken**: `deleteProfilePhoto` (`server/util/firebaseStorage.js:41-55`) is best-effort try/catch and its
  explicit-bucket branch (PR #134) predates the report. But with the env unset the fallback
  `getStorage().bucket()` throws — Admin init passes no `storageBucket` (`server/middleware/auth.js:10-12`) —
  so deleted users' profile photos are **silently orphaned** and the error logs on every deletion. Two parts:
  **(ops, owner)** set `FIREBASE_STORAGE_BUCKET` in the prod + dev server envs; **(code, optional)** early-return
  when the env is empty so behavior matches the `.env.example:19-24` comment ("leave empty to skip") instead of
  throw-and-swallow. → **N7**
- `[ ]` **CI actions pinned to deprecated Node 20 runtime** — **narrowed 2026-07-08 (still open):** every job in
  `.github/workflows/test.yml` already pins `node-version: 24` (verified 2026-07-03), so the *test steps* run on
  Node 24 — but that does NOT clear this item. The deprecation is about the **actions' own bundled runtime**
  (`actions/checkout@v4`/`actions/setup-node@v4` run on the Node 20 actions runtime), which the `node-version`
  input doesn't affect. The real fix — bumping both actions to `@v5` — is unchanged and still to do. Original find:
  `.github/workflows/test.yml` uses
  `actions/checkout@v4` and `actions/setup-node@v4`, which target the Node 20 actions runtime. GitHub is
  sunsetting Node 20 on the runners and currently force-runs these on Node 24, emitting a deprecation
  annotation on every CI run (seen on PR #204). Bump both to the next major (`@v5`, or whatever is current
  when picked up) to clear the warning before the forced fallback is removed. Low-risk maintenance; not a
  1.0 blocker. *(surfaced 2026-06-29 in CI logs during the `RecipeFormInput`→`FormInput` track.)*
- `[ ]` **Client recipe-list response types over-promise (full `RecipeType` vs the server's lean card
  projection)** *(surfaced 2026-07-08 in the API-contract regeneration ([#262](https://github.com/jclind/prepify/pull/262),
  see [`API_CONTRACT.md`](./API_CONTRACT.md) DRIFT — recipes / auth-users-profile))* — several list/read
  endpoints are typed `RecipeType[]`/`RecipeType` in the client but the server ships a narrow card projection,
  so fields like `ingredients`, `instructions`, `nutritionData`, `description`, `views`, `userId`, `createdAt`,
  `authorUsername` are **absent at runtime** and the compiler wouldn't catch a component reaching for one:
  `getAllRecipes().recipeList`, `getTrendingRecipes()`, `getForYouRecipes()`, `getRandomRecipe()`
  (`src/api/recipes.ts:61,100,106,114` — server projects `publicRecipeCardProjection`), `getSavedRecipes()` /
  `getCreatedRecipes()` (`src/api/recipes.ts:535,553` — `SAVED_CARD_PROJECTION`/`CREATED_CARD_PROJECTION`,
  `server/routes/users.js:18-46`), and `PublicProfileAPI.getPublicProfileRecipes()`
  (`src/api/publicProfile.ts:29`, plus `PublicProfile.recipes` in `src/types.ts`). Also `RecipeDBResponseType`
  (`src/types.ts:194`) declares `page`/`filters`/`entries_per_page` that `GET /api/recipes` never returns
  (server returns only `{ recipeList, total_results }`, `server/routes/recipes.js:154`). **Fix:** introduce a
  narrow `RecipeCardType` (the projected card fields) and type these methods against it, so a component reading
  a non-card field fails to compile. Typing-only cleanup — no runtime behaviour changes (consumers already
  render only card fields today). Low risk, touches types + a handful of API signatures.
- `[ ]` **Server API contract asymmetries between sibling routes** *(surfaced 2026-07-08 in the API-contract
  regeneration ([#262](https://github.com/jclind/prepify/pull/262), see [`API_CONTRACT.md`](./API_CONTRACT.md)
  DRIFT — reviews / reports-bug-reports))* — three inconsistencies between routes that ought to match. None is
  a live client bug (the shipped client sends well-formed input and doesn't branch on these), but each is a
  contract wart worth normalizing:
  - **403 vs 404 on the two delete routes.** `DELETE /deleteReview` returns `403`
    (`server/routes/reviews.js:167`) while `DELETE /removeRating` returns `404`
    (`server/routes/reviews.js:203`) for the identical "you have no doc for this recipe" case. Pick one status
    for "nothing of yours to delete here" and apply it to both.
  - **`GET /api/reports` pagination is unclamped (can 500) while its bug-reports twin clamps.** Non-numeric
    `page`/`perPage` pass through `parseInt` to NaN skip/limit and 500 from the Mongo cursor
    (`server/routes/reports.js:186-187`), whereas `GET /api/admin/bug-reports` clamps both
    (`server/routes/bugReports.js:104-105`). Clamp `/api/reports` the same way. (Reachable only via a direct
    API call with a non-numeric param; the admin UI always sends numbers.)
  - **`POST /api/bug-reports` 429s with a non-JSON body.** Its `submitLimiter` uses express-rate-limit's
    default plain-text 429 (`server/routes/bugReports.js:33-39`, no custom `message`/`handler`) instead of the
    house `{ error, code: 'RATE_LIMITED' }` JSON shape the `makeUserLimiter` routes use. Give it a matching
    JSON handler so 429s are uniform across the API.
- `[ ]` **Phase 5-D: convert the 8 legacy string-`_id` recipes to native `ObjectId`** — `checkMigrationState.js`
  reports **8 recipes** on prod (identical count on dev — dev is a prod clone) whose `_id` is still a plain
  string rather than a BSON `ObjectId`, left over from before the Phase-5 refactor. **Not a correctness bug:**
  `server/util/recipeIdQuery.js` is a deliberate compatibility shim that matches both `_id` shapes (`$or`
  string/ObjectId), so every read/write already works — its own comment calls the legacy form "harmless to
  leave in place." The one-time backfill that would retire the shim was **never written**. Building it is
  non-trivial: `_id` is immutable in Mongo, so the migration must **insert a new doc under the ObjectId +
  delete the old string doc + repoint every foreign reference** to that recipe — `ratings.recipeId`,
  `reports.recipeId`, and users' saved/made lists in `userRecipeData` (all stored as the string id) — ideally
  in a transaction. Needs a read-first `--apply` ops script (same posture as `reconcileRatingAggregates.js`)
  **with tests** before any prod run. Low urgency (shim covers it indefinitely; only 8 docs); do it if/when
  the string/ObjectId duality is retired. *(surfaced 2026-07-08 during the Track-1 owner-ops prod run — the S6
  `checkMigrationState` DB check flagged it; all other checks came back clean.)* **(not a 1.0 blocker)**
- `[ ]` **Colour tokens → CSS custom properties when theming lands** — Jesse wants user-selectable
  themes (dark mode + other palettes) **post-1.0**. That's a *colour* concern: themes swap colours, not
  sizes — so the design tokens that need to become runtime-swappable are the colour groups (`$primary*`,
  `$gray-*`, `$secondary*`, `$alert-*`, `$admin-*`), not the type/space/radius scales. Plan: migrate the
  colour tokens from SCSS variables to CSS custom properties in `:root` (with a `[data-theme]` /
  `.dark` override block per theme), keeping the SCSS-var scales (`$text-*`, `$radius-*`, `$bp-*`) as-is.
  Entangled with the **brand-orange decision** (the blocked a11y lane) — the accessible-vs-vivid orange
  call should be made *before* baking colours into a theme system. The `rem`-based type scale already
  covers a "large text"/density mode via the root font-size, independent of this. *(surfaced 2026-06-30
  during the type-scale sweep, when CSS-custom-properties-vs-SCSS was weighed for `$text-*` and correctly
  deferred to the colour layer; see `docs/design/type-scale.md` rule 4.)* **(post-1.0; not a blocker)**
- `[ ]` **Migrate off Edamam (nutrition source)** — Jesse wants to stop using Edamam for nutrition data
  eventually (filed 2026-06-25). Current state: nutrition is server-proxied via `POST /api/nutrition/details`
  (`server/routes/nutrition.js`, PR #182), so swapping the provider is now an isolated, server-only change —
  the client just gets `NutritionDataType | null` and soft-fails to null. When picking a replacement,
  evaluate licensing/cost and whether it can also cover the macros currently stored in `nutritionData`.
  Note: because of this planned retirement, the formerly-bundle-public Edamam keys are **intentionally not
  being rotated** (see RELEASE_PLAN §B "Rotate any key…"). No deadline; not a 1.0 blocker.
- `[ ]` **`@jclind/ingredient-parser` data is co-mingled in the Prepify app DB** — the parser's
  ingredient data (from the v1 *in-process* library era, when the package wrote to whatever Mongo it was
  handed — Prepify's own `prepify` database) lives in the **same** DB as the app's recipes/users/reviews.
  **Confirmed by the 2026-06-25 inventory:** the two collections are `ingredients` (119 docs, 755KB — the
  single largest thing in the DB) and `ingredient_names` (135) (plus an empty `kroger_prices`); the Prepify
  server has **zero** `collection('ingredients'|'ingredient_names'|'kroger_prices')` references, and v2's
  `ingredientParser` only calls the hosted proxy (it's never handed a Mongo handle —
  `server/routes/ingredients.js`). **⚠️ NOT vestigial / do NOT delete:** `ingredients` + `ingredient_names`
  are **live data owned by the `@jclind/ingredient-parser` server** — they just live in the wrong DB. The
  fix is to **relocate them to the parser service's own database**, not drop them. **Folds into the dev/prod
  Mongo split:** `mongodump --excludeCollection` these from the Prepify-app prod dump (so the new app prod
  cluster is born clean) while **preserving** them in `Cluster0` until the parser service has its own home.
  *(surfaced 2026-06-25 during dev/prod environment-split planning.)* **(post-1.0; not a blocker)**
- `[x]` **Account tab heading duplicates SegmentedNav's route map** — the visually-hidden per-tab `<h2>`
  in `Account.tsx` (added for heading-order in the a11y sweep) derives its label from an inline
  `location.pathname.includes(...)` chain that re-encodes the four account route strings
  (`saved-recipes`/`ratings`/`your-recipes`/`drafts`) already defined in
  `src/pages/Account/components/SegmentedNav.tsx`. Low severity — the SR headings are intentionally
  fuller than the short tab labels, so they can't just reuse the labels — but if a tab's route is
  renamed in SegmentedNav, this heading silently goes stale. Fix: derive both from a single
  route→label source. *(surfaced 2026-06-25 in the accessibility-sweep code review, PR #179; not worth
  blocking the merge.)* **Resolved 2026-06-27 (Wave 2 `2-iso`):** extracted the tab defs into
  `src/pages/Account/components/accountTabs.tsx` (now carrying an `srHeading` field per route) +
  a shared `activeAccountTabIndex(pathname)` helper; SegmentedNav and Account's `<h2>` both derive
  from it, so the heading uses the same route-matching as the nav highlight and can't drift. +4 tests
  asserting the SR heading per route.
- `[x]` **Make `accountTabs` the app-wide source for the four account sub-route strings** *(fixed in [#242](https://github.com/jclind/prepify/pull/242), C2: pulled the four paths into a shared `src/routes.ts` const — `ACCOUNT_{SAVED_RECIPES,RATINGS,YOUR_RECIPES,DRAFTS}_PATH` — that `accountTabs` and every app-wide nav link (`DesktopBar`, `DesktopAccountMenu`, `footerData`, `DraftResumeBanner`) now consume, chosen over importing `accountTabs` into `Components/*` to avoid a layering inversion; sub-item also done — added `activeAccountTab(pathname)` alongside the index helper, and Account's `<h2>` reads it.)* — the Wave-2
  `accountTabs.tsx` refactor (PR #200) centralized the route↔label map for the account-page nav + SR
  heading, but the same four route strings are still hardcoded as `<Link>`/`navigate` destinations
  elsewhere: `DesktopBar.tsx:86` (`/account/saved-recipes`), `DesktopAccountMenu.tsx:77`
  (`/account/your-recipes`), `footerData.ts:43-44` (`/account/your-recipes`, `/account/saved-recipes`),
  and `DraftResumeBanner.tsx:47` (`/account/drafts`). These are app-wide nav links, not the account tab
  strip, so wiring each to import the account-tab module is a judgment call (mild over-coupling vs. true
  single-sourcing) — but if a route is ever renamed, these drift silently. Low priority: either point them
  at `accountTabs[].to` or pull the four route paths into a tiny shared `routes` constant the tab list also
  consumes. **Sub-item (ergonomics):** `activeAccountTabIndex` returns an *index*, forcing
  `accountTabs[activeAccountTabIndex(pathname)].srHeading` at the Account call site; a sibling
  `activeAccountTab(pathname): AccountTab` would read cleaner there (SegmentedNav still wants the index for
  its `i === activeIndex` map, so keep both). *(surfaced 2026-06-27 in the PR #200 high-effort code review;
  out of scope for that PR — the backlog item it closed was scoped to the nav↔heading duplication only.)*
- `[x]` **One-off rating-aggregate reconciliation** — stored `recipes.rating` aggregates can drift from
  the actual `ratings` docs (confirmed live: *Homemade Granola* stored `5/4.6` vs true `4/4.5`). Likely
  legacy/pre-recompute data or a past silent best-effort failure. Write a script (alongside
  `server/scripts/`) that loops every recipe and runs `recomputeRecipeRating(db, recipeId)`
  (`server/util/recipeRating.js`) to reconcile the whole catalog in one pass. *(surfaced by track 1a /
  PR #150, which only self-heals a recipe when someone next rates it.)* *(fixed in
  [#233](https://github.com/jclind/prepify/pull/233), S6: `server/scripts/reconcileRatingAggregates.js` —
  dry-run/`--apply`, idempotent, heals through the canonical `recomputeRecipeRating`; the pure read half was
  split into `computeRecipeRating` so the dry-run diffs without writing. Shipped alongside
  `checkMigrationState.js` (post-6-phase DB check). The prod `--apply` run stays owner-gated for the cutover.)*
- `[ ]` **`setUsername` must keep propagating renames across the username-keyed review collections**
  *(deferred display-only residual, source [`DATA_INTEGRITY_AUDIT.md`](./DATA_INTEGRITY_AUDIT.md))* — admin
  moderation/queue lookups still key reviews by the denormalized `(username, recipeId)` / `reportedUsername`,
  so `setUsername` must keep propagating renames across those collections or a renamed author's reviews go
  stale in the queue. Display-only; revisit if reviews are re-keyed to the stable uid. Low.
- `[x]` **Harden `deleteAccount`'s rating recompute** — was: the per-recipe recompute after an account delete
  is best-effort/post-commit and only `console.error`s on failure (`server/routes/auth.js:454-461`),
  so a silent failure can re-introduce aggregate drift. The set of recipes is correct
  (`distinct('recipeId', { userId: uid })` at `:396` → `reviewedRecipeIds`, and the loop skips the deleted
  user's own recipes); only the failure mode is silent. **Fixed in S2/PR
  [#229](https://github.com/jclind/prepify/pull/229) (merged 2026-07-05):** the recompute now runs through
  `recomputeWithRetry` (bounded retries) and surfaces non-silently rather than a bare `console.error`. A
  standing catalog-wide reconciliation job remains desirable — tracked under **S6** (rating-aggregate ops).
- `[x]` **Autocomplete fuzzy fallback is an O(n) scan + in-process ranking** *(fixed in [#245](https://github.com/jclind/prepify/pull/245), I3: added a `{ title: 'text' }` index in `server/db.js` and inserted an index-backed `$text` word/stem tier between the exact-substring and fuzzy tiers of `/api/searchAutoCompleteRecipes`. Correctly-spelled queries — including out-of-order multi-word ones the substring pass misses — now serve off the index and skip the capped scan entirely; the O(n) Levenshtein fallback still runs, but only for genuine misspellings `$text` can't stem-match. User input is stripped of `$text` phrase/negation operators (`toTextSearch`), and the `$text` tier is try/caught so a missing index degrades to the fuzzy scan instead of 500-ing. Chose Mongo `$text` over Atlas Search per owner — low urgency at today's catalog size.)* — when exact matches <
  `AUTOCOMPLETE_LIMIT = 8` (`server/routes/recipes.js:191`), the `/api/searchAutoCompleteRecipes` handler
  pulls up to `FUZZY_CANDIDATE_CAP = 1000` (`:204`) `{_id, title}` docs (only the `RECIPE_VISIBLE` filter
  narrows them — no title text index; `server/db.js` recipes indexes are `{userId, createdAt}` only) and runs
  `titleScore` (windowed Levenshtein) over each (`server/routes/recipes.js:223-237`,
  `server/util/recipeTitleMatch.js`).
  Negligible at the current catalog size and correctly skipped when exact ≥ 8, but it grows linearly with
  the recipe count on a hot path. Revisit with a Mongo text index / Atlas Search before the catalog gets
  large. *(surfaced 2026-06-22 in the track 2d code review — shipped intentionally as the simplest
  typo-tolerant fallback.)*
- `[x]` **`'/recipes'` route hardcoded across nav + page** *(fixed in [#242](https://github.com/jclind/prepify/pull/242), C2: extracted `RECIPES_PATH` in `src/routes.ts` backing both suppression checks + the navbar/footer links; `browseAll` and `clearFilters` now share an extracted `resetFilters()` setter block rather than `browseAll` calling `clearFilters` — the latter would double-navigate (`clearFilters`'s `syncUrl` pushes `/recipes?q=…`, then the bare `navigate('/recipes')` pushes again), so the shared-setter extract is DRY and behaviour-preserving. Scope-guarded to these three files; ~9 other page-level `/recipes` links left inline for an adopt-everywhere follow-up once C3/C4's overlapping files land.)* — the search-suppression check
  (`pathname !== '/recipes'`) is copy-pasted into `src/Components/Navbar/desktop/DesktopBar.tsx:47` and
  `src/Components/Navbar/menu/NavMenu.tsx:20`, and `Recipes.tsx`'s `browseAll` (`:112-118`) re-issues the
  same filter-resetting setters as `clearFilters` (`:103-107`) instead of calling it. A route rename would
  silently break suppression with no compile error. **(verified 2026-06-26: the bare `'/recipes'` literal
  appears in 4+ spots across these three files — the two suppression checks, `browseAll`'s `navigate('/recipes')`,
  and the `<NavLink to='/recipes'>` in DesktopBar.)** Extract a shared `RECIPES_PATH` const (or a small hook)
  and have `browseAll` call `clearFilters`. *(surfaced 2026-06-22 in the track 2d code review.)*
- `[x]` **Migrate Sass `@import` → `@use`** — **already done in `cb2ac81` (2026-05-09), reconciled
  2026-06-23.** Converted all 36 component/page stylesheets from `@import 'helpers.scss'` to
  `@use 'helpers.scss' as s` and namespaced every var/mixin under `s.`. This predates the release gameplan
  (created 2026-06-17), so the open box was stale, not pending work. Verified: `npm run build` emits **zero**
  Sass deprecation warnings and all 73 `.scss` compile clean. The only remaining `@import` is the plain CSS
  `@import url('…Montserrat…')` font load in `src/index.scss` — not a Sass partial import, not deprecated.
  *(See the 2026-06-23 4-sass status-log entry in `archive/RELEASE_GAMEPLAN.md`.)*
- `[x]` *(fixed in [#249](https://github.com/jclind/prepify/pull/249), I2: uploads re-keyed to
  `recipeImages/{uid}/{uuid}` with a collision-proof uuid — fail-closed on no uid — and `storage.rules`
  tightened to owner-scoped writes `request.auth.uid == uid`, mirroring `profilePhotos/{uid}`; the legacy
  flat path is now read-only for un-migrated objects. **Rules-deploy + object migration are owner-gated** —
  runbook in `docs/IMAGE_PIPELINE.md`.)* **Recipe images aren't keyed by uid in Storage** — uploads went to
  `recipeImages/{imageFile.name}` (`src/api/recipes.ts:188`), keyed by the raw filename rather than the
  owner's uid. (`storage.rules:27-32` auth-gated the path but couldn't scope to the owner — contrast the
  uid-scoped `profilePhotos/{userId}` at `:15-21`; verified 2026-06-26.) Two consequences:
  (a) two users uploading `photo.jpg` collide/overwrite, and (b) the Storage rules couldn't scope writes to
  the owner, so `storage.rules` could only auth-gate that path (any signed-in user could overwrite/delete
  any recipe image). Low severity (writes are auth-gated and the server is the source of truth), but worth
  doing. *(surfaced 2026-06-23 writing the Storage rules, PR #177.)*
- `[ ]` **Orphaned recipe image on a failed create** — `addRecipe` (`src/api/recipes.ts`) uploads the image
  to Firebase Storage (`uploadRecipeImage`, ~`:259`) BEFORE the `POST /addRecipe` (~`:291`), with no
  compensating `deleteObject` if the POST fails (server moderation block, 4xx/5xx, network drop). So every
  failed create leaks a storage object that no recipe doc references. Untracked until now. Fix: delete the
  just-uploaded object in the `addRecipe` catch (best-effort), or defer the upload until the POST succeeds.
  Low. *(surfaced 2026-07-08 in the docs-folder audit.)*
- `[x]` **Point Railway at the production branch** — **done (2026-06-26, per the dev/prod env-split work):**
  Railway now runs two services — a prod service deploying the `release` branch (→ prepify-prod Mongo +
  prepify-9b974 Firebase, `FRONTEND_URLS` = the prepifymeals.com origins, CORS verified live) and a dev
  service deploying `development` (→ prepify-dev infra). *(Branch selection is a Railway-dashboard setting, so
  not visible in-repo; `docs/archive/RELEASE_GAMEPLAN.md` still lists it as open and should be reconciled too.)*
- `[x]` **Rotate the exposed `Cluster0` Mongo `jesse` password** — **done (Jesse, 2026-06-26).** The old
  shared `Cluster0` cluster (which still holds the `@jclind/ingredient-parser` data and serves as the
  prepify-prod/dev restore fallback) had its previously-exposed `jesse` SCRAM password rotated. *(Distinct
  from the deliberately-NOT-rotated Edamam keys — that waiver is Edamam-only.)*
- `[ ]` **Social link previews need server-side prerendering (CSR-SPA limitation)** — track 3b (PR #170)
  added per-route OG/Twitter tags + a branded 1200×630 card and strips the static `index.html` fallbacks on JS
  boot (React 19 hoists meta natively, no cross-`<Helmet>` dedupe). But non-JS social crawlers (Facebook,
  Slack, iMessage, LinkedIn) only read the served `index.html`, so **every shared link shows the generic site
  card**, not the per-recipe/per-profile preview. Googlebot renders JS, so search indexing still gets per-route
  titles/canonical/description — only the social preview is affected. Fix is prerendering for crawler UAs
  (prerender.io / react-snap / Netlify or Cloudflare prerender) or consciously accepting the generic card for
  1.0. **Release-gating copy lives in `RELEASE_PLAN.md` §C (Launch & legal)** — this is the backlog mirror.
  *(surfaced 2026-06-23 in the track 3b verification + review.)*
- `[ ]` **`/add-recipe` is login-gated but indexable** — track 3b (PR #170) added `noindex` to the private
  routes (Account/Settings/CreateUsername/Admin/404) but `AddRecipe` self-canonicalizes `/add-recipe`
  (`src/pages/AddRecipe/AddRecipe.tsx`) with no `noindex`. A create-recipe page being crawlable is a minor
  SEO/privacy wart (crawlers just bounce off the login wall). Add `noindex` to the **create** mode (edit mode
  already canonicalizes to the public recipe URL, which is correct). Low severity. *(surfaced 2026-06-23 in the
  Wave 4 Part 1 verification.)*
- `[x]` **JSON-LD recipe title/description isn't `</script>`-escaped** *(fixed in [#243](https://github.com/jclind/prepify/pull/243), C3: added `serializeRecipeJsonLd()` in `buildRecipeJsonLd.ts` — stringify then replace every `<` with its backslash-u003c escape, still valid JSON that JSON-LD parsers decode back to `<`; `SingleRecipe.tsx` renders the pre-escaped string. Shipped ahead of the prerender PR so the hole is closed before prerendering can make it live. +6 tests.)* — `SingleRecipe.tsx` interpolates
  user-supplied recipe `title`/`description` into a `<script type="application/ld+json">{JSON.stringify(...)}</script>`
  block, and `JSON.stringify` does not escape `<` / `</`. **Not exploitable today** — this is a CSR app, so
  react-helmet-async sets the JSON as a text node via React (not string serialization), and `</script>` in
  `textContent` isn't parsed as a tag. But it **becomes a real injection vector the moment any server-side
  prerendering is added** (see the prerender item above). Escape `<`/`</` in the JSON-LD payload before/when
  prerendering lands. *(surfaced 2026-06-23 in the track 3b code review.)*
- `[x]` **Brand-asset script comment drift** — minor cleanup left after track 3b (PR #170): the header
  comment in `scripts/generate-brand-assets.mjs:6` lists `Montserrat-{Bold,SemiBold,Italic}.ttf` but the code
  actually loads `Montserrat-MediumItalic.ttf` at `:28` (code correct, comment stale on the `Italic` entry).
  **(verified 2026-06-26: the "dead `hero.jpg` (~1.1 MB)" half is already resolved — the file no longer exists
  on disk; only `hero.webp` remains and `HomeHero.tsx:10` references it. So this item is now just the one-line
  comment fix.)** *(surfaced 2026-06-23 in the Wave 4 Part 1 verification.)* *(fixed in
  [#239](https://github.com/jclind/prepify/pull/239), F5: comment now names `Montserrat-MediumItalic.ttf`.)*
- `[ ]` **`ReleaseNotes` imports `package.json` directly for the version string** — `ReleaseNotes.tsx:6`
  still does `import packageJSON from '../../../package.json'` (used as `packageJSON.version` at `:9`) rather
  than reading a build-time define. Replace with a `VITE_APP_VERSION` define (wired in `vite.config.ts` off
  `package.json`) so the component doesn't reach up into the repo root and the version is injected at build.
  Nit; deferred from the R-refactor. *(surfaced 2026-07-08 in the docs-folder audit.)*
- `[ ]` **Post-6-phase-refactor DB check** — confirm no existing database records need updating/migrating
  after the refactor. *(2026-06-26: the tooling exists — `server/scripts/inventory-collections.js` (the DB
  inventory utility from commit 85c0208), plus the `backfillRatingUserIds.js` / `backfillServingPrice.js`
  backfills. This remains a manual run-and-confirm task; nothing in-repo proves it's been done.)*
  - Was the Spoonacular-CDN `imagePath` Mongo migration (the `updateMany` snippet under "Spoonacular CDN URL
    Migration" in [`REFACTOR_NOTES.md`](./archive/REFACTOR_NOTES.md), now under `docs/archive/`) ever run
    against the DB? Unknown — confirm.
- `[x]` **Establish a code & architecture standard for Claude** — write a conventions doc so generated
  code stays consistent (likely an addition to `CLAUDE.md` or a new `CONVENTIONS.md`). *(fixed in
  [#244](https://github.com/jclind/prepify/pull/244), R0: shipped `docs/CONVENTIONS.md` — frontend/backend/
  design/testing/env/process conventions, each anchored to a real `file:line`, cross-linked from `CLAUDE.md`
  and pointing at `scss-conventions.md` + `design/*`. Unblocks R1/R2.)*
- `[ ]` **Refactor the create-recipe page**.
- `[ ]` **Refactor the account page**.
- `[x]` **Ingredient parser: handle "not found"** — *done in PR #164 (track 3d; PR open).* A client-side
  `withTimeout` (12s) races the enrichment request so a hung/"not found" lookup no longer sticks the UI; on
  timeout the row is kept, flagged errored with a retry, and a toast surfaces. Applied to both add and
  inline-edit paths.
- `[~]` **Promote the remaining hardcoded design values into `helpers.scss` tokens** — the
  design-consistency sweep (2026-06-25) applied the two pixel-identical cheap wins from the
  [2026-06-13 audit](./archive/DESIGN_CONSISTENCY_AUDIT_2026-06-13.md): `$primary-hover` (`#e74e1d`, was hardcoded
  in 5 spots + a Footer local var) and `$surface-warm-border` (`#ece2d6`, 11 spots across 8 files). The
  remaining systemic scales need design sign-off because they touch many files / pixels:
    - `[x]` **Type scale** — DONE 2026-07-01 (PR #216). Ten-step modular `$text-*` scale in `helpers.scss`
      (t-shirt names, not the `$fs-*` floated here); ~490 `font-size:` literals across 62 `.scss` normalized
      onto it — 218 land exactly on a step, 273 snap to the nearest (typical ≤0.8px, max 2.8px), the deliberate
      normalization this item called for. Out-of-scope display type left bespoke (PrintableRecipe `pt`, About
      `clamp()`, 404/profile numerals, icon `em`). Documented at `docs/design/type-scale.md`; verified by a
      zero-byte masked-CSS compile diff (only font-size values moved) + a two-pass Cypress pixel-diff (tooling
      PR #215) showing clean reflow, no truncation/overflow.
    - `[x]` **Radius scale** — DONE 2026-06-25 (PR `style/radius-scale-tokens`). `$radius-xs..4xl` +
      `$radius-pill`/`$radius-circle` now in `helpers.scss`; `$border-radius` aliases `$radius-lg`. ~200
      value-identical repoints across 32 `s`-importing files (compiled CSS byte-identical). **Remaining:**
      off-scale one-offs (5/7/9/11/13/18px) need ±1px normalization (design call). *(Updated 2026-07-02,
      Wave-3 re-sweep: the admin files are wired + tokenized now — the only remaining sub-scale admin literal
      is the deliberate `2px` cap rounding on the Analytics chart bars (`Analytics.scss:165`), left bespoke:
      the bars are as narrow as 1px, where a 4px scale-floor radius would distort the data-viz.)*
    - `[x]` **Elevation/shadow scale** — DONE 2026-07-01 (PR #218, `worktree-feat+elevation-shadow-reauthor`).
      Re-authored the interim `$shadow-soft`/`$shadow-chip`/`$card-box-shadow` stopgap into a documented 6-step
      `$elevation-1..6` ramp + `$shadow-brand`/`-strong`/`$shadow-teal` glow tokens in `helpers.scss` (owner
      sign-off via a temp `/elevation-audit` page). Migrated ~51 declarations across 28 files: 37 distinct old
      values → 9 tokens (2 value-identical). Unified tint — one slate `rgba($primary-text, …)` across the ramp,
      replacing the old black/slate/warm mix; the repeated avatar-glow `rgba(255,87,34,0.18)` (audit F5) folded
      onto `$shadow-brand`. Kept bespoke: the two-layer add-ingredient bar, the horizontal drawer, the two
      upward sticky-bar shadows. No pixel regression beyond shadows (compiled-CSS diff vs development
      byte-identical outside `box-shadow`). Documented in `docs/design/elevation.md`.
    - `[x]` **Focus-ring tokens** — DONE 2026-07-07 (fixed in [#241](https://github.com/jclind/prepify/pull/241),
      C5). Surfaced 2026-07-01, deferred out of the elevation track (they're focus indicators, not elevation). The
      12 `box-shadow: 0 0 0 3px rgba(…)` rings across FormInput/FormStyles/Settings controls/CreateUsername/Recipes/
      Help (teal/error/ok-green/orange variants) now route through **`@mixin focus-glow($color, $opacity)`** in
      `helpers.scss` — a parametrised mixin rather than a `$focus-ring-*` token set, since ring colour *and* opacity
      both vary (only the `0 0 0 3px` geometry is invariant). Pure refactor, byte-identical compiled output;
      documented in `docs/scss-conventions.md`. **Remaining (design call):** the per-surface opacity spread
      (`.12–.25`) is preserved, not yet normalised. Pairs loosely with the `$primary-hover` a11y `2-scss` track.
    - `[x]` **Breakpoint tokens/mixin** — DONE 2026-06-25 (PR `style/breakpoint-tokens`). Added an 8-tier
      `$bp-xs..4xl` scale + `$bp-nav`/`$bp-nav-up` and `below()`/`above()`/`between()` mixins; migrated all 69
      width queries. The recurring content breakpoints converged to tiers (7 approved small shifts ≤30px:
      350→375, 420/460/480→450, 550→560, 650→640, 880→900); tuned one-offs (recipe page 700/720/820,
      isolated 500/520, Home 850/851 boundary pair) and the DesktopNav 860/1000/1080/1240 cascade pass
      literal px to the mixins and keep their exact values. **Remaining (design call):** converge those
      deliberately-bespoke one-offs into the scale if/when their layouts are retuned.
  *(surfaced 2026-06-25 in the design-consistency sweep; cheap wins + radius/recurring-shadow scales applied,
  type scale done 2026-07-01 PR #216; elevation re-author done 2026-07-01.)*
- `[~]` **Collapse near-duplicate brand shades to one value**
    - `[x]` **Decorative tint** — DONE (PR #192): `$primary-tint: #ff8a5c` collapses the avatar/XP gradient
      stops (`Account.scss` ×2) + the `RecipePlaceholder` icon `#ff8a65`. Purely decorative, so independent
      of the contrast work; only compiled change was the imperceptible `#ff8a65`→`#ff8a5c`.
    - **Remaining — owned by the brand-orange recolor:** the Drafts hover `#f4501e` and the accessible
      hovers `#a52f0a` / `#006065` are entangled with the in-flux orange-CTA contrast story (the a11y sweep
      reverted `$primary-accessible` back to vivid `#ff5722`). Resolve them as part of that recolor, not as a
      blind dedupe. *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[x]` **One danger-red token** — three reds mean the same thing: `$error-red` (the token — **now
  `#c5303f`** after the a11y pass, plus a new `$error-red-hover #b02a37`; `helpers.scss:43-44`), local
  `$danger #d23f31` (`SingleRecipe.scss:13`), and `#d64545` (`ReportControl.scss` ×7, `AdminRecipeControls.scss:87`,
  `Reports.scss:307`). Consolidate onto the token. *(audit F6; surfaced 2026-06-25; `$error-red` value
  corrected from the stale `#dc3545` on 2026-06-26.)* **(done 2026-06-29, PR #208 — repointed the local
  `$danger` (dropped the dead var) and all 9 `#d64545` usages, incl. ReportControl's `rgba(214,69,69, …)`
  tints → `rgba(s.$error-red, X)`, onto `s.$error-red`. No `helpers.scss` change. Verified live: shipped CSS
  has 0× old reds; every danger surface renders `#c5303f`.)**
- `[x]` **Name the admin/“cool” sub-palette and wire the token-less files into `helpers.scss`** — Admin +
  moderation surfaces hardcode a Tailwind-ish slate/blue palette (`#3b82f6`/`#2563eb` action blue exists
  nowhere in the brand) and several files `@use` nothing at all (audit F1/F2). **(done 2026-06-30, PR #214 —
  see the `[x]` sub-items below.)**
    - `[x]` **Import-wiring + value-identical repoints** — DONE 2026-06-25 (PR `style/admin-token-wiring`).
      Added `@use helpers as s` to the 10 token-less files that had a value-identical win and repointed their
      radii (radius scale) and `#fff`/`#ffffff` → `$white` (compiled CSS byte-identical). The bespoke admin
      palette in those files was deliberately left raw.
    - `[x]` **`$admin-*` token group + literal migration** — DONE 2026-06-30 (PR #214). Defined a documented
      cool `$admin-*` group in `helpers.scss` (slate spine + `action`/`link` + ok/info/warn/danger/automod
      status groups + `cat-green`/`cat-amber` classification accents) and migrated ~200 literals across 12
      admin/moderation `.scss`; ~16 near-dupes normalized onto scale steps. Warm outliers folded to brand
      `$primary-wash`/`-wash-deep`/`-deep`; `rgba(0,0,0,…)` shadows left raw for the elevation track. Of the 5
      previously token-less files, 3 were wired in (`RecipePlaceholder` → warm washes, `ClassifierNote` →
      `$admin-info-text`, `AccountStatusBanner` → warn/danger + `$primary-deep`); `DefaultAvatar` +
      `AddRecipe/ListComponents/Item` hold no colour literals so they stayed raw. No pixel regression
      (compiled-CSS diff: every change a documented collapse or
      value-identical). Documented at `docs/design/admin-palette.md`. The category/type pills were decoupled from
      status tokens (own `$admin-cat-*` group) after a code-review finding.
  *(surfaced 2026-06-25 in the design-consistency sweep; import-wiring applied 2026-06-25, palette naming + migration done 2026-06-30 PR #214.)*
- `[x]` **`RecipeFormInput` duplicates the shared `FormInput`** — AddRecipe ships its own ~85%-identical
  input/textarea (`RecipeFormInput`/`RecipeFormTextArea`) instead of the shared `Components/Form/FormInput`,
  and Settings/BugReport use raw `<input>`/`<textarea>`/`<select>`. Converge on one input primitive.
  *(surfaced 2026-06-25 in the design-consistency sweep.)* **(done 2026-06-29, PR #204 — `RecipeFormInput`
  deleted, `FormInput` gained `size='md'|'compact'`, 8 call sites migrated; the Settings/BugReport raw-input
  half wasn't in #204's scope and no separate item tracks it — fold into the create-recipe dropdown
  UX-polish item if it comes up. Marker reconciled 2026-07-02 in the Wave-3 re-sweep.)**
- `[x]` **Perf: no route-level code-splitting — the whole app ships in one ~1.19 MB / 372 kB-gzip JS chunk**
  — `npm run build` warns the main chunk is >500 kB; `src/App.tsx` statically imports every page (zero
  `React.lazy`/dynamic `import()` anywhere), and `vite.config.ts` has no `manualChunks`/visualizer. This is
  **the biggest lever for mobile**: against a prod preview, mobile Performance is 56–68 with LCP 7.8–10.7 s and
  FCP 3.3–3.9 s while **TBT ≈ 0** — i.e. the bottleneck is downloading/parsing the one bundle, not main-thread
  work. Desktop is fine (89–97). Fix: lazy-load the heavy/rare routes (Admin/* ≈ 5 pages, AddRecipe/EditRecipe
  + the ingredient parser + DnD, SingleRecipe) behind `Suspense`; add `manualChunks` + `rollup-plugin-visualizer`
  to inspect. Needs `App.tsx` route changes + a verification pass → not a blind fix. *(surfaced 2026-06-26 in the
  Performance sweep; before/after Lighthouse in the sweep PR.)* **(done 2026-07-02 — ~22 routes lazy via
  `src/util/lazyRoute.ts` (React.lazy + one-shot stale-deploy reload guard: offline-aware, storage-safe,
  never auto-re-armed; post-reload failures surface as `ChunkLoadError` to the app boundary, whose
  "Try again" hard-reloads since React.lazy caches rejections) behind per-page-keyed `Suspense` inside the
  Layout/outlet shells (keyed because react-router's `startTransition` only shows fallbacks of newly
  mounted boundaries — unkeyed, lazy→lazy navigation freezes on the old page). Eager kept: Home, Recipes,
  SingleRecipe, Login, Signup, 404 — landing surfaces; PublicProfile stays lazy despite being one because
  eager-importing it hoists ~96 kB of shared graph into entry. Initial payload 393 → 274 kB gz (−30%:
  JS 363→257, CSS 30→17), >500 kB warning gone; heaviest splits: AddRecipe 69 kB gz (dnd + react-select),
  Help 11 kB gz (formspree + its stripe transitive). Known tradeoff: first visit to /account, /settings or
  /admin per session loads shell then section chunks sequentially (both tiny, flash-guarded 220 ms so fast
  loads show no spinner at all). Same-machine Lighthouse mobile: Home 69→72 (LCP 7.1→6.6 s), /recipes
  66→67 (LCP 10.8→9.3 s); remaining LCP is image-bound, not JS-bound. `ANALYZE=1 npm run build` writes a
  `rollup-plugin-visualizer` treemap to `reports/stats.html` (gitignored, outside the publish dir); no
  `manualChunks` — rolldown's default shared-chunking already dedupes cleanly.)**
- `[x]` **Perf: hot read paths have no supporting MongoDB indexes** — `server/db.js` `ensureIndexes()` creates
  indexes for usernames/recipeDrafts/reports/bugReports/auditLog, but `recipes` is indexed only on
  `{ userId, createdAt }` and `ratings` only on `{ username }`. So the catalog's hottest queries fall back to
  collection scans + in-memory sorts as the catalog grows:
    - `GET /recipes` browse/filter/sort (`server/routes/recipes.js:56+`) — filters on `status`, `title` (regex),
      `cuisine`, `mealTypes`, `nutritionLabels`; no compound index.
    - `GET /getTrendingRecipes` (`recipes.js:256+`) — sort by `featured`,`views` with a `status` filter; unindexed.
    - `GET /recipes/random` (`recipes.js:318+`) — `$sample` after a `status`/`userId` `$match`; unindexed `$match`.
    - `GET /getReviews` (`server/routes/reviews.js:230+`) — find/sort by `recipeId` + `reviewText`/`moderationHidden`
      + `reviewCreatedAt`/`rating`; **no `recipeId` index on `ratings`** → a scan per recipe-detail/review page.
  Propose compound indexes alongside the existing `ensureIndexes()` block (e.g. `recipes {status:1, featured:-1,
  views:-1}`, `{status:1, mealTypes:1, createdAt:-1}`, `{status:1, nutritionLabels:1}`; `ratings {recipeId:1,
  reviewCreatedAt:-1}` and `{recipeId:1, rating:-1}`). Confirm each with `.explain()` before/after. Negligible at
  today's catalog size; grows linearly. *(surfaced 2026-06-26 in the Performance sweep; pairs with the autocomplete
  fuzzy-fallback scan item above, which is the same missing-index story for title search.)*
  **(done 2026-07-02, PR #224 — grounded in `.explain('executionStats')` against dev, not the proposed keys.
  Two findings reshaped the fix: (1) the proposed `status`-leading compounds are WRONG — `RECIPE_VISIBLE` is
  `status: { $nin: [...] }`, a low-selectivity RANGE, so by equality→sort→range it must stay a FETCH residual, not
  a leading key (leading with it fragments the index into intervals and defeats the sort). (2) A prior manual
  migration (`server/scripts/createModerationIndexes.js`) had already added `recipes {featured:-1,views:-1}`,
  `{createdAt:-1}`, `{userId:1}` and `ratings {recipeId:1,username:1}`, `{userId:1,recipeId:1}` to dev/prod — so
  two of the four paths were NOT actually unindexed. Net-new gaps, both confirmed COLLSCAN/blocking-SORT→IXSCAN:
    - **`GET /recipes` default browse** (SORTS.popular) — added `recipes {numTimesSaved:-1, views:-1, _id:-1}`
      (key order mirrors the sort exactly). BEFORE `SORT ← COLLSCAN`, docsExamined 12, in-memory sort. AFTER
      `FETCH ← IXSCAN`, docsExamined 5 (=limit), **no blocking sort**. Bonus: the mealTypes/diets/cuisine-filtered
      popular listings also ride it (filters become residuals) — sort eliminated there too.
    - **`GET /getReviews`** — added `ratings {recipeId:1, reviewCreatedAt:-1}` (filter=new) and
      `{recipeId:1, rating:-1}` (filter=top). BEFORE `SORT ← FETCH ← IXSCAN(recipeId_1_username_1)` — the recipeId
      MATCH was indexed but the sort was a blocking in-memory sort; docsExamined 10. AFTER `FETCH ← IXSCAN`,
      **no blocking sort**, docsExamined 6/8.
    - **`GET /getTrendingRecipes`** — already optimal via the migration's `featured_-1_views_-1`
      (`IXSCAN`, no sort, docsExamined = limit). No new index; backlog's "unindexed" was stale.
    - **`GET /recipes/random`** — left as-is by design: the `$match` is `status: $nin` (+ `userId: $ne`), both
      low-selectivity ranges, and `$sample` after a non-first-stage `$match` can't use the random-cursor
      optimization, so any index would examine ~all docs anyway for negligible gain.
  Multikey note: `mealTypes`/`nutritionLabels` are arrays — deliberately NOT indexed as leading keys here (each
  would be a separate multikey index, and they're residual filters on the popular walk). `title`/`cuisine` regex
  can't use a normal index (separate autocomplete fuzzy-fallback item; not regressed). Deferred siblings, both the
  same story, low-frequency so not added: the non-popular browse sorts (createdAt/servingPrice/totalTime — each
  needs its own `{sortKey, _id}` index) and `getSingleUserReviews` (userId-keyed, still blocking-sorts on
  `{userId:1,reviewCreatedAt:-1}`/`{userId:1,rating:-1}`). All three additions went into `ensureIndexes()` so they
  deploy with the code; `createIndex` is idempotent and the new names don't collide with the migration's.)**
- `[x]` **Perf: `/recipes/facets` runs 3 unfiltered `distinct()` = 3 full `recipes` scans per browse load**
  (`server/routes/recipes.js`, `distinct('cuisine'|'nutritionLabels'|'mealTypes')`). Called on every
  `/recipes` page load to build the filter UI. *(surfaced 2026-06-26 in the Performance sweep.)* **DONE (this PR).
  Chose the short-TTL in-process cache over a summary doc: a `distinct` with no predicate is a COLLSCAN that no
  index can serve, and a summary doc buys nothing here — a delete or a cuisine-edit-away can't be reasoned about
  incrementally (you can't know a value is gone everywhere without a rescan), so it would still need a full
  recompute on those paths, at the cost of extra invalidation surface and a persisted doc to keep consistent. The
  cache also preserves the exact all-statuses `distinct` semantics for free. New `server/util/facetsCache.js`: a
  5-min TTL cache with single-flight (one scan serves a burst of cold-cache requests) and a generation guard (a
  scan invalidated mid-flight returns to its caller but doesn't poison the cache). The route reads through it; the
  write paths that can introduce a NEW value — `addRecipe`/`editRecipe` — plus `deleteRecipe` call
  `invalidate()`, so a new cuisine/diet/mealType surfaces on the *next* load, not after the TTL. The rare bulk
  removers (account-delete cascade, admin status flips) ride the TTL backstop; a chip lingering for a briefly-empty
  cuisine is harmless and already possible today (the `distinct` is unfiltered by status, so hidden/pending recipes
  already contribute chips). Client tolerance is high regardless — the browse page already React-Query-caches this
  response for 10 min and only uses `cuisines` (to gray out empty filter chips; diets/mealTypes render from
  hardcoded lists).
  **Evidence (dev Mongo, `prepify-dev`; catalog is small so the plan is the proof, not the timing):**
    - BEFORE — `explain('executionStats')` on each `distinct` (empty query): winningPlan stage **COLLSCAN**,
      `totalDocsExamined = 12` (= full collection), `totalKeysExamined = 0` (no index possible). Three of these ran
      per `/recipes` load.
    - AFTER — live server, two back-to-back `GET /api/recipes/facets`: cold **0.223 s** (runs the three scans) →
      warm **0.0013 s** (served from cache, no DB round-trip; ~170×), identical payload.
    - Behaviour locked by tests: `__tests__/facetsCache.test.js` (compute-once-within-TTL, TTL expiry, invalidate,
      single-flight, mid-flight-invalidate guard) and two `recipes.test.js` cases (a warm cache hides a direct DB
      insert until busted; `POST /addRecipe` busts the cache so the new cuisine appears on the next load).
    - Gates: server Jest **705 pass**, root Vitest **550 pass / 2 skip** (untouched), `tsc --noEmit` clean.**
- `[x]` **Perf: recipe-page CLS ≈ 0.10 from the conditional controls block popping in above the hero** *(resolved won't-reserve in [#243](https://github.com/jclind/prepify/pull/243), C3: `RecipeControls` renders only for the recipe **owner** (`RecipeControls.tsx:52` `if (!isUsersRecipe) return null`), so the ≈0.10 was an owner-view measurement. The SEO-relevant logged-out / non-owner path is already fully CLS-reserved (action-bar skeletons, servings placeholder, ratings skeleton, `.sr-controls` `min-height:30px`). A speculative reserve can't know ownership until the fetch resolves, so it would regress the common path to fix the rarest view — per an explicit product call ("tailor to non-owners, don't reserve for the signed-in owner") the owner-only shift is left unreserved. No code change.)* —
  `RecipeControls` (`src/pages/SingleRecipe/SingleRecipe.tsx:296`) renders only after `currRecipe` resolves
  (`currRecipe && …`), with no reserved space, so on load it inserts above `header.hero` and pushes the hero +
  body + ingredient list + instructions down in one shift (measured: the dominant layout-shift source on the
  page, prod preview). Fix structurally by reserving the block's height during load (skeleton / `min-height`),
  **not** with image dimensions. ⚠ **Verified caveat:** the hero (`SingleRecipe.scss` `.hero-img img` is
  `width:100%; aspect-ratio:4/3`) and the 40 px ingredient thumbs already reserve their boxes via CSS, so
  adding HTML `width`/`height` to those `<img>`s gives **no** CLS benefit and empirically *doubled* page CLS
  (0.10 → 0.26, reproducible) — that experiment was reverted in the sweep PR. *(surfaced 2026-06-26 in the
  Performance sweep.)*
- `[x]` **Perf: `AuthContext` value object is recreated every render** (`src/context/AuthContext.tsx`, the
  `value` passed to `AuthContext.Provider`), so every `useAuth()` consumer (Navbar, SaveControl, ReportControl,
  forms, …) re-renders on any provider re-render. Wrap in `useMemo([user, isAdmin, …])`. Low *measured* impact
  today (TBT ≈ 0 across pages) — file as a scalability/correctness cleanup, not a hot fix. Pairs with memoizing
  the remaining list rows (`RecipeReview`, and `IngredientItem` — the latter sits in a `@hello-pangea/dnd` list,
  so verify DnD still works before memoizing). The `/recipes` grid card (`RecipeCard`) was memoized in the sweep.
  *(surfaced 2026-06-26 in the Performance sweep.)*
  — *(fixed in [#240](https://github.com/jclind/prepify/pull/240), F2: memoized `value` — but a bare `value` memo
  would no-op, so also `getAuth()`→`useMemo` and all 8 handlers `useCallback`'d for stable deps. Added a
  referential-stability regression test; runtime-verified the full auth lifecycle. The list-row memos
  (`RecipeReview`, `IngredientItem`) remain open follow-ups.)*
- `[x]` **Perf: `RecipeCard` memo is defeated on the Saved tab** (`src/pages/Account/SavedRecipes/SavedRecipes.tsx:138`)
  — *(fixed in [#237](https://github.com/jclind/prepify/pull/237), F3: wrapped `refreshAfterMutation` in `useCallback([queryClient, uid])` so the `onMutated` handler keeps a stable identity and `React.memo(RecipeCard)` holds on the Saved tab too. Verified live — 0 saved-card re-renders with the fix vs 54 without across 9 parent renders.)*
  `refreshAfterMutation` was a plain inline `() => {}` passed as `onMutated`, so its identity changed every parent
  render and `React.memo(RecipeCard)` always re-rendered every saved card. The memo lands correctly on the `/recipes`
  grid (no `onMutated`, stable `recipe` identities), but to realize it on the Saved tab too, wrap
  `refreshAfterMutation` in `useCallback`. One line; pairs with the `AuthContext`/list-row memo work above. Low
  measured impact (TBT ≈ 0). *(surfaced 2026-06-27 in the Performance sweep code review.)*
- `[x]` **Perf: Firebase Storage recipe images are served single-size with no `srcset`/resize pipeline** *(fixed in
  [#247](https://github.com/jclind/prepify/pull/247), I1: frontend emits a token-less WebP `srcset` (400/800/1600w)
  on the card thumb + SingleRecipe hero, derived from the stored URL by `src/util/recipeImageVariants.ts`; backend
  is the owner-gated Firebase Resize Images extension. **Ships inert** behind `VITE_IMAGE_VARIANTS_ENABLED` (default
  off) + a per-`<img>` fallback — owner installs/backfills/flips per `docs/IMAGE_PIPELINE.md`.)* — every
  `recipe.recipeImage` is a direct full-size Storage URL, so mobile downloads desktop-sized images (a contributor
  to the mobile LCP above). Structural: a Storage resize pipeline (or an image CDN) emitting width variants +
  `srcset`/`sizes` on the card/hero `<img>`s. The static Home hero is already a sized `.webp`. *(surfaced
  2026-06-26 in the Performance sweep.)*
- `[ ]` **Minor code-quality follow-ups from the code-quality sweep** — none are bugs; all low priority:
  (1) **`any` escape hatches** (~23, tsc is clean) are concentrated in react-select `styles` callbacks
  (`provided/state: any` across CuisineSelector/MealTypeSelector/DietSelector/ReviewFilters) and a handful of
  `catch (err: any)` blocks — tightening means `StylesConfig<Option, IsMulti>` generics + `err: unknown`
  narrowing; fiddly, deferred. (2) ~~**`asyncHandler` consistency**: `routes/ingredients.js` (`/parse`) and
  `routes/nutrition.js` (`/details`) use a bare `async (req,res)` with a complete internal try/catch instead of
  the `asyncHandler` wrapper every other route uses — functionally safe, just inconsistent.~~ *(fixed in
  [#232](https://github.com/jclind/prepify/pull/232), S5: both wrapped in `asyncHandler`; internal soft-fail
  try/catch kept — no behaviour change.)* (3) ~~**Doc drift**:
  `CLAUDE.md` still describes `src/context/RecipeContext.tsx` as "commented out", but the file has been deleted
  entirely — update the two references.~~ *(fixed in [#239](https://github.com/jclind/prepify/pull/239), F5: both
  references now say "removed".)* (4) ~~**Optional rename**: `src/util/validateIngredientQuantityStr.ts` now
  exports only `closestFraction` (a display formatter) — a rename to `formatQuantity.ts` would match its
  contents (3 import sites).~~ *(fixed in [#239](https://github.com/jclind/prepify/pull/239), F5: renamed to
  `formatQuantity.ts`, 4 importers repointed.)* Only part (1) (`any` escape hatches) remains open.
  *(surfaced 2026-06-27 in the code-quality & tests sweep.)*

## Testing

- `[x]` **Tests for the toast/alert system** — *covered in PR #168 (track 4-tests):* `src/test/toastSystem.test.tsx`
  mounts a real `<Toaster>` (every other suite mocks `react-hot-toast`) and locks the success/error/loading/blank
  shapes, the `role="status"` announcement, same-`id` de-dupe/update-in-place, dismiss-by-id removal, and the
  interactive SaveControl custom toast.
- `[~]` **Create-recipe tests** — Cypress (E2E) + Vitest (unit). *Substantial sweep added in PR #164 (track
  3d):* Vitest for the enrichment-timeout util, optimistic add / reconcile / soft-fail / retry / timeout,
  inline-edit re-enrich + timeout, drag-reorder + id-keyed status survival, summary-bar rollup + submit
  states, and servings/time validation; Cypress gained keyboard drag-reorder specs (ingredient + instruction)
  and the soft-fail spec was updated to the new retry UX. Remaining: cuisine/meal-type selector units
  (currently E2E-only) and broader E2E happy-path variants. **(verified 2026-06-26: `DietSelector` has a unit
  test (`DietSelector.test.tsx`) but the structurally-similar `CuisineSelector`/`MealTypeSelector` are mocked
  in `AddRecipe.test.tsx:67-75` with no standalone unit test — a focused, low-effort fill-in. Also note: any
  new `TimeInput` test should cover the edit-mode hydration bug logged under Bugs.)**
- `[x]` **Cypress: test autocomplete on the Recipes page** — *covered in PR #168 (track 4-tests):* `browse.cy.ts`
  now types a partial query and asserts the dropdown options, types a typo and asserts results surface **with** the
  "showing similar recipes" banner, asserts the banner is **absent** on a literal match, and clicks a result to
  navigate. (Server-side fuzzy fallback itself is endpoint-stubbed here; exercised live during verification.)
- `[x]` **Node 26 test-harness gaps — missing globals in the test sandbox** — **both fixed.** This dev
  machine runs **Node 26**, whose VM/sandbox no longer keeps some globals the test stacks assume:
  - **Server (Jest) — fixed in PR #161:** `server/__tests__/email-notifications.test.js` failed **7/22**
    with `ReferenceError: clearTimeout is not defined` from `superagent` (via supertest) → 5000ms timeouts.
    Root cause turned out subtler than a missing global: it's *present at setup time*, but the
    `throttles repeat alerts` test runs `jest.useFakeTimers()`→`jest.useRealTimers()`, and on Node 26 that
    restore leaves the global timers broken for **every subsequent test** in the file. Fixed by re-installing
    the canonical `node:timers` implementations **before each test** in `server/__tests__/setup.js`
    (`beforeEach`), so a prior fake-timer test can't leave them broken; a test that opts into fake timers
    still overrides them. Verified: email-notifications 22/22, full server suite 632/632.
  - **Client (Vitest) — fixed in PR #159:** the analogous `localStorage`/`sessionStorage`-undefined gap on
    Node ≥ 24 (`savedFilters` / `SingleRecipe`) — an in-memory Web Storage shim in `src/test/setup.ts` that
    probes usability and only installs when the real one is unusable.
  - *(Both are environment-induced, not product bugs — confirmed pre-existing on base; CI's older Node
    never tripped either. The guards are no-ops once the sandbox restores these globals. Surfaced during
    track 1c review, 2026-06-18.)*

- `[ ]` **Server Jest suite is flaky under CPU contention (~load-dependent)** — the full server suite
  (`cd server && npm test`, i.e. `jest --runInBand`) intermittently fails **one random test per run** while
  **every suite passes 100% in isolation**. Observed failing tests across runs were all different and all in
  DB-/auth-heavy suites: `auth setUsername (<3 chars)` → 404 (expected 400), `auth setUsername rename
  propagation`, `moderation-routes updatePhoto fail-closed` → wrong status, `admin/analytics recent actions`
  → 404 (expected 200), `reports queue` → 401 (expected 200). Repro rate was ~10–30% **only while the machine
  was under load** (the worktree's dev servers + concurrent jest runs); on an unloaded machine the suite went
  10/10 green. Diagnosis: not a product bug (zero source changes; the routes are correct) — it's **test-harness
  isolation under timing pressure**. Two contributing vectors: (1) each of the 30 suites spins up its **own**
  `MongoMemoryReplSet` (`server/__tests__/setup.js`), so under contention an operation can trip
  `serverSelectionTimeoutMS: 5000`; (2) fragile one-shot auth mocks — `admin.auth.mockReturnValueOnce(...)` /
  `verifyIdToken.mockResolvedValueOnce(...)` in `reviews.test.js`/`security.test.js` assume the *next*
  `admin.auth()` call is the intended request; a stray/async call (leaked fire-and-forget audit/email work)
  can consume the "once" and shift it onto the wrong request → spurious 401/wrong-uid. **CI impact is low**
  because CI runs `--runInBand` on a dedicated runner (one replSet at a time, minimal contention), but the
  baseline `npm test` *did* fail on a first cold run, so it can still red a PR occasionally. Recommended fix
  (structural): share a **single** in-memory Mongo across the suite via Jest `globalSetup`/`globalTeardown`
  with per-file collection cleanup (removes the per-file replSet churn — faster *and* far less contention), and
  replace the `*Once` auth overrides with scoped per-request mocks (e.g. set `extraClaims`/`__setClaims`
  deterministically, or a `withUser(uid)` helper that resets after the awaited request). *(surfaced 2026-06-26
  in the code-quality & tests sweep; characterized over ~30 full-suite runs. NOT introduced by the sweep —
  pre-existing on `development`.)*
- `[ ]` **E2E gap: no test submits a rating/review** — the Cypress suite reads reviews from fixtures
  everywhere (`recipe.cy.ts`, `smoke.cy.ts` stub `GET /api/getReviews`) but **never writes one** — there is no
  journey that opens the rate/review control, submits, and asserts the new review appears + the hero rating
  updates. Rating-average is a critical path (the sweep playbook calls it out: `util/recipeRating` +
  `server/routes/reviews.js`), and the server side is well unit-tested (`__tests__/reviews.test.js`), but the
  end-to-end write path is unverified. Add a `recipe.cy.ts` spec: logged-in user with `checkIfReviewed` → null,
  submit a rating+text, intercept the review POST, assert the optimistic row + updated `.hero-rating`. *(surfaced
  2026-06-27 in the code-quality & tests sweep E2E review.)*
- `[ ]` **E2E gap: no password-reset journey** — `auth.cy.ts` covers login + logout but not the
  forgot-password / reset flow. Lower priority (the reset email + link are Firebase-handled, so a true E2E is
  awkward), but the "request reset email" entry point (form validation + success/error toast) is app code that
  could be covered. Flag, don't necessarily automate the Firebase leg. *(surfaced 2026-06-27 in the
  code-quality & tests sweep E2E review.)*
- `[ ]` **Unit coverage for remaining untested utils** — the sweep added focused tests for the highest-value
  untested utils (`closestFraction`, `formatRating`, `nutrition` math, `hrMinToMin`/`minToHrMin`). **(reconciled
  2026-07-09: the headline `updateIngredients` gap is closed — R1 #248 added `src/test/updateIngredients.test.ts`
  (7 cases) and the dead-code block is gone; only the trivial formatters below remain.)** ~~Still
  untested: **`src/util/updateIngredients.ts`** (the notable one — ~80 lines of ingredient price/quantity
  merge logic with non-null assertions, on the add/edit-recipe path; also still carries a block of
  commented-out dead code at the top that should be removed when it's touched)~~, plus the small formatters
  `capitalize`, `formatPrice`, `formatDate`, `formatCompactCount`, `timeElapsedSince`, `reorder` (DnD reorder —
  already covered indirectly by `addRecipe.cy.ts`), `recipeLimits`, `invalidateSavedCaches`, `defaultAvatar`.
  Most are trivial; `updateIngredients` is the one worth a real test pass. *(surfaced 2026-06-27 in the
  code-quality & tests sweep coverage audit.)*

## Ideas / needs a decision

- `[ ]` **Friend system** — **post-1.0** (decided 2026-06-17). Backlog only; not in the 1.0 scope.
- `[ ]` **AI recipe search as a paid membership feature** — **post-1.0** (decided 2026-06-17). Future idea.
- `[ ]` **Fridge & freezer life on the create-recipe form** — **post-1.0** (decided 2026-06-17). The
  `fridgeLife`/`freezerLife` fields still exist in the data model (`src/types.ts:13-14`) but were
  removed from the create form; revisit re-adding them after launch.

---

## Resolved / verified done (recorded, not active)

- `[x]` **Local test suite fails on Node ≥24 (Web Storage shim)** — Node's experimental built-in
  `localStorage` shadowed jsdom's and crashed the `savedFilters`/`SingleRecipe` tests on any Node newer
  than CI's (pinned to 24). `src/test/setup.ts` now installs an in-memory Storage when the real one is
  unusable. PR #159.
- `[x]` **Sign-up button copy** — already reads "Create account" (`src/pages/Signup/Signup.tsx:110`).
- `[x]` **Bug reporting & viewing system** — shipped: `BugReportModal` + `/admin/bug-reports` queue +
  `bugReports` collection/route.
- `[x]` **Monitor images & comments for harmful content** — content moderation shipped (blocklist +
  OpenAI text + Google Vision image). See `docs/CONTENT_MODERATION.md`.
- `[x]` **Fix failing tests** *(2026-06-14)*.
- `[x]` **Fix the print-recipe page** *(2026-06-14)*.
- `[x]` **Migrate React env → Vite** *(2026-05-10)*.
