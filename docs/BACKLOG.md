# Prepify — Backlog

Triaged from Jesse's running notes (2026-06-17). This is the general backlog: bugs, UX polish,
a11y, tech debt, testing, and ideas. The beta→1.0 launch checklist lives separately in
[`RELEASE_PLAN.md`](./RELEASE_PLAN.md) — items here are **not** release blockers unless cross-referenced.

> **Verification pass 2026-06-26:** every open item below was re-checked against the current tree.
> Stale file/line citations were corrected, several claims were re-diagnosed (notably the edit-form
> NaN bug and the now-orphaned `RecipeThumbnail`), and a few items were closed (`/recipes` navbar
> search, Railway prod branch). New findings are folded inline and marked **(verified 2026-06-26)**.

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

- `[ ]` **`Received NaN for the \`value\` attribute` warning on Edit Recipe — root-caused; it's a real
  hydration bug, not cosmetic (verified 2026-06-26)** — re-diagnosed from source. The culprit is **not** the
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
- `[~]` **Data export omits saved-recipe content** — `exportMyData` now exports full recipes, drafts,
  ratings, and profile, but `savedRecipes` is still the raw reference array — `recipeId` + metadata
  (`collectionIds`/`savedAt`), no recipe bodies (`server/routes/auth.js:355`; verified 2026-06-26).
  Expand it to full saved-recipe content. *(partially addressed)*

## UX / visual polish

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
- `[ ]` **Autocomplete footer label can disagree with the rows shown** — the dropdown keeps the previous
  query's results visible during the debounce + refetch (`keepPreviousData`), but the "Search for …"
  footer reads the live input (`searchRecipeVal.trim()`), so mid-type it can say *Search for "chica"*
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
- `[ ]` **Add-recipe summary bar doesn't stay visible while scrolling the form** — the PR #164 fix uses
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
- `[ ]` **Add-recipe group labels render underwhelming** — the section labels you can insert between
  ingredients / instructions (the "Add Label" control) don't display the way they should on the create-recipe
  page. Refine their styling/placement, and check how they carry through to the recipe view. *(noted
  2026-06-18 after the track-3d smoke test; visual polish — fold into a future add-recipe pass, e.g. the
  Phase-4 QA sweep or the "Refactor the create-recipe page" tech-debt item.)*
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
- `[ ]` **Account nav sections UI** — improve the Saved / Ratings / etc. section navigation styling.
- `[x]` **`/u/:username` public profile visual polish** — **done (track 2e):** centered identity
  (avatar, @handle + share, divided Recipes/Saves/Made counts, "location · Lv N", achievement chips),
  image-first square recipe tiles with rating · time · cost + a bookmark save-count badge, richer
  `EmptyState`, and a working **"Load more"** (new paginated `GET /getPublicProfileRecipes`). Saves/Made
  now come from a server-side aggregate over *all* visible recipes (not just the shown batch). Verified
  live incl. a 15-recipe load-more click-through (12→15, button clears, no dupes).
- `[ ]` **"Change password" subhead is redundant/cluttered** — the `<h3 class='sr-subhead'>Change password</h3>`
  in `src/pages/Settings/sections/AccountSection.tsx:189` (shown only when `hasPasswordProvider`), inside the
  Settings → Account section. *(verified 2026-06-26: it's lowercase "Change password" in a Settings section,
  not a dedicated "Account & Security" page as previously worded.)*
- `[x]` **create-username page revamp** — **done (track 3e):** the page was redesigned into the shared
  soft-glass auth vocabulary alongside login/signup/forgot in **PR #131**, and the escape hatch (a
  "Cancel and log out" control wired to the auth signout, plus a guard that bounces users who already
  have a username) landed in **PR #98**. Reconciled + escape-hatch regression test added in **PR #162**.
  Page lives at `src/pages/CreateUsername/`. Username validation tightening is tracked separately under 3c.
- `[ ]` **`RecipeThumbnail` shows the broken-image glyph on a failed image load** — track 3b (PR #170) gave
  `RecipeCard` an `onError` fallback to the icon `RecipePlaceholder` (`imgError` state + `onError`), but
  `RecipeThumbnail` only swaps in the placeholder when `recipeImage` is *absent* — a present-but-broken URL
  still renders the browser's broken-image glyph there (`src/Components/RecipeThumbnail/RecipeThumbnail.tsx`,
  no `onError` on the `<img>`). **(verified 2026-06-26: `RecipeThumbnail` is now orphaned — no app code
  imports it; the only importer is its own test `src/test/RecipeThumbnail.test.tsx`. So the user-facing glyph
  no longer renders anywhere, and the real fix is to DELETE `RecipeThumbnail` + its test rather than patch it
  — see the unify item below.)** Low severity. *(surfaced 2026-06-23 in the track 3b code review.)*
- `[ ]` **Consolidate the bespoke pill buttons into a real `.btn` system** — `.btn` in `src/index.scss`
  only strips defaults (no visual style), so nearly every page re-implements its own orange/ghost pill:
  `home-btn` (`404.scss`), `pp-browse-btn` (`PublicProfile.scss`), `about-btn`/`about-btn-primary`/
  `about-btn-ghost` (`About.scss`), `search-recipes-btn`, the Recipes toolbar pills, HomeCookSuggestion
  `.primary`/`.ghost`, etc. — same shape, slightly different padding/weight/hover each time. Promote
  `.btn--primary` / `.btn--ghost` / `.btn--pill` variants and migrate the bespoke buttons onto them.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Unify `RecipeCard` and `RecipeThumbnail` — actually: delete `RecipeThumbnail` (verified 2026-06-26)** —
  the two are ~80% duplicate (image + price + rating/time meta; differ mostly in `<Link>` vs `<button>`,
  `AiFillStar` vs `AiOutlineStar`, and `skeletonColor` `#e6e6e6` vs `#d6d6d6`), but verification found
  `RecipeThumbnail` is **dead code** — only its own test imports it; the live card everywhere
  (`Recipes.tsx`, `SavedRecipes.tsx`) is `RecipeCard`. So this isn't a merge — it's "delete
  `RecipeThumbnail.tsx` + `src/test/RecipeThumbnail.test.tsx`" (and that closes the broken-image item above
  for free). Confirm no lazy/string-based import first. *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **One icon per concept (react-icons drift)** — the same concept is drawn from different icon sets:
  star = `AiFillStar` / `AiOutlineStar` / `BsStar(Fill)` / `FiStar`; close = `AiOutlineClose` / `FiX` /
  `IoClose`; bookmark = `Bs*` and `Bi*` outline/filled pairs; time = `CgTimer` and `AiOutlineClockCircle`.
  Pick one icon per concept and re-export from a single `src/Components/icons` module so callers can't drift.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Share one react-modal style config** — each modal repeats its own `customStyles`/overlay inline,
  and they disagree: `BugReportModal` uses `#fff` + `8px` radius while `ConfirmDeleteReviewModal` /
  `ReleaseNotes` use `#eeeeee` + `5px`. **(verified 2026-06-26: it's 7 inline copies, not 3 — also
  `ReportControl`, `RecipeControls`, `AchievementsModal`, and `HomeCookSuggestion`.)** Extract a shared
  `modalStyles` constant (content + overlay) and a thin wrapper so every dialog reads the same.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Codify the loading-state pattern (skeleton vs spinner)** — content grids use
  `react-loading-skeleton`, button actions use `TailSpin`, and several async waits show nothing; the choice
  is per-developer and `TailSpin` sizes vary (18–30px). Write down the rule (skeleton for content
  placeholders, spinner for discrete actions/auth) and align the outliers. *(surfaced 2026-06-25 in the
  design-consistency sweep.)*
- `[ ]` **Toast copy: consistent terminal punctuation + dedupe strings** — toasts disagree on trailing
  punctuation (`'Could not copy link'`, `'Could not update collections'`, `'Profile link copied'` have no
  period; most others end with `.`/`!`) and on phrasing (`'Profile link copied'` vs `'Profile link copied
  to clipboard'`). Pick one convention (terminal punctuation everywhere is the dominant pattern) and sweep
  the ~10 call sites; lift duplicated strings (`'Email already in use.'`, `'Password incorrect, please try
  again.'`, `'Image cannot be more than 5MB in size.'`) into shared constants. *(surfaced 2026-06-25 in the
  design-consistency sweep; continues the toast-punctuation fix started in track 4-qa.)*

## Accessibility

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

- `[ ]` **Autocomplete dropdown isn't a valid ARIA listbox + has no keyboard nav** — the results render as
  `<ul role="listbox"><li><button role="option">…` (`SearchRecipesInput.tsx:176-185`): a plain `<li>`
  sits between the listbox and its options, an `option` shouldn't be a `<button>`, and there's no
  arrow-key navigation / `aria-activedescendant` — it's mouse-clickable buttons wearing listbox roles
  (the input's only `onKeyDown`, `:130-132`, handles Enter→submit, nothing else). **(verified 2026-06-26:
  also every `aria-selected` is hardcoded `'false'` at `:182`, so selection state isn't wired even if
  arrow-nav were added.)** Tab-reachable and fine for sighted/click users, so low severity. Fix: either drop
  the roles and treat it as a plain list of buttons, or implement real listbox keyboarding. *(surfaced
  2026-06-22 in the track 2d code review; the per-result `role="option"` on a button is the new markup from
  this track; re-confirmed in the 2026-06-25 accessibility sweep and again 2026-06-26.)*

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
- `[ ]` **Servings stepper input is below the 24px touch-target minimum** — the `.serv-input` in the
  Ingredients servings pill (`SingleRecipe.tsx`) trips Lighthouse `target-size`. A label was added in
  track 4-qa (`aria-label="Servings"`), but enlarging the tap target is a layout change to the pill.
  *(surfaced 2026-06-23, track 4-qa; re-confirmed 2026-06-25 in the accessibility sweep.)*
- `[ ]` **`$primary-hover` token (`#e74e1d`) fails WCAG AA on hover** — the design-tokens track added
  `$primary-hover: #e74e1d` (`helpers.scss`) and points several **white-on-fill button hovers** at it
  (`Home.scss:175`, `SingleRecipe.scss:659`, `RecipeNotFound.scss:87`) plus a **text** hover
  (`Footer.scss:72`). White on `#e74e1d` is only **3.81:1** and `#e74e1d` as text on white ~3.8:1 — both
  under 4.5:1, so these controls drop below AA *while hovered* (axe/Lighthouse scan the default state, so it
  doesn't show in the per-page scores). The base fills are fine; only the hover regresses. Fix: darken
  `$primary-hover` to an AA-passing shade (e.g. `≤ #c5421a`, white-on-it 5.04 — or reuse `$primary-accessible
  #bf360c`). NB the a11y brand pass already side-stepped this on the recipe Save button (`SingleRecipe.scss`
  uses a literal `#a52f0a` hover with a comment, *not* `$primary-hover`). *(surfaced 2026-06-25 while merging
  the brand-contrast PR #184 over the design-tokens track.)*

## Features

- `[ ]` **Press `/` to focus search** — global keyboard shortcut to bring up search. No handler exists today.
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
- `[ ]` **Account tab heading duplicates SegmentedNav's route map** — the visually-hidden per-tab `<h2>`
  in `Account.tsx` (added for heading-order in the a11y sweep) derives its label from an inline
  `location.pathname.includes(...)` chain that re-encodes the four account route strings
  (`saved-recipes`/`ratings`/`your-recipes`/`drafts`) already defined in
  `src/pages/Account/components/SegmentedNav.tsx`. Low severity — the SR headings are intentionally
  fuller than the short tab labels, so they can't just reuse the labels — but if a tab's route is
  renamed in SegmentedNav, this heading silently goes stale. Fix: derive both from a single
  route→label source. *(surfaced 2026-06-25 in the accessibility-sweep code review, PR #179; not worth
  blocking the merge.)*
- `[ ]` **One-off rating-aggregate reconciliation** — stored `recipes.rating` aggregates can drift from
  the actual `ratings` docs (confirmed live: *Homemade Granola* stored `5/4.6` vs true `4/4.5`). Likely
  legacy/pre-recompute data or a past silent best-effort failure. Write a script (alongside
  `server/scripts/`) that loops every recipe and runs `recomputeRecipeRating(db, recipeId)`
  (`server/util/recipeRating.js`) to reconcile the whole catalog in one pass. *(surfaced by track 1a /
  PR #150, which only self-heals a recipe when someone next rates it.)*
- `[ ]` **Harden `deleteAccount`'s rating recompute** — the per-recipe recompute after an account delete
  is best-effort/post-commit and only `console.error`s on failure (`server/routes/auth.js:454-461`),
  so a silent failure can re-introduce aggregate drift. The set of recipes is correct
  (`distinct('recipeId', { userId: uid })` at `:396` → `reviewedRecipeIds`, and the loop skips the deleted
  user's own recipes); only the failure mode is silent. Consider a periodic reconciliation job (pairs with
  the item above) or alerting on recompute failure. *(low priority; lines re-verified 2026-06-26)*
- `[ ]` **Autocomplete fuzzy fallback is an O(n) scan + in-process ranking** — when exact matches <
  `AUTOCOMPLETE_LIMIT = 8` (`server/routes/recipes.js:191`), the `/api/searchAutoCompleteRecipes` handler
  pulls up to `FUZZY_CANDIDATE_CAP = 1000` (`:204`) `{_id, title}` docs (only the `RECIPE_VISIBLE` filter
  narrows them — no title text index; `server/db.js` recipes indexes are `{userId, createdAt}` only) and runs
  `titleScore` (windowed Levenshtein) over each (`server/routes/recipes.js:223-237`,
  `server/util/recipeTitleMatch.js`).
  Negligible at the current catalog size and correctly skipped when exact ≥ 8, but it grows linearly with
  the recipe count on a hot path. Revisit with a Mongo text index / Atlas Search before the catalog gets
  large. *(surfaced 2026-06-22 in the track 2d code review — shipped intentionally as the simplest
  typo-tolerant fallback.)*
- `[ ]` **`'/recipes'` route hardcoded across nav + page** — the search-suppression check
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
  *(See the 2026-06-23 4-sass status-log entry in `RELEASE_GAMEPLAN.md`.)*
- `[ ]` **Recipe images aren't keyed by uid in Storage** — uploads go to `recipeImages/{imageFile.name}`
  (`src/api/recipes.ts:188`), keyed by the raw filename rather than the owner's uid. (`storage.rules:27-32`
  auth-gates the path but can't scope to the owner — contrast the uid-scoped `profilePhotos/{userId}` at
  `:15-21`; verified 2026-06-26.) Two consequences:
  (a) two users uploading `photo.jpg` collide/overwrite, and (b) the Storage rules can't scope writes to
  the owner, so `storage.rules` can only auth-gate that path (any signed-in user could overwrite/delete
  any recipe image). Re-key to e.g. `recipeImages/{uid}/{uuid}` (and tighten the rule to
  `request.auth.uid == uid`) for collision-safety + per-owner write scoping. Low severity (writes are
  auth-gated and the server is the source of truth), but worth doing. *(surfaced 2026-06-23 writing the
  Storage rules, PR #177.)*
- `[x]` **Point Railway at the production branch** — **done (2026-06-26, per the dev/prod env-split work):**
  Railway now runs two services — a prod service deploying the `release` branch (→ prepify-prod Mongo +
  prepify-9b974 Firebase, `FRONTEND_URLS` = the prepifymeals.com origins, CORS verified live) and a dev
  service deploying `development` (→ prepify-dev infra). *(Branch selection is a Railway-dashboard setting, so
  not visible in-repo; `docs/RELEASE_GAMEPLAN.md` still lists it as open and should be reconciled too.)*
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
- `[ ]` **JSON-LD recipe title/description isn't `</script>`-escaped** — `SingleRecipe.tsx` interpolates
  user-supplied recipe `title`/`description` into a `<script type="application/ld+json">{JSON.stringify(...)}</script>`
  block, and `JSON.stringify` does not escape `<` / `</`. **Not exploitable today** — this is a CSR app, so
  react-helmet-async sets the JSON as a text node via React (not string serialization), and `</script>` in
  `textContent` isn't parsed as a tag. But it **becomes a real injection vector the moment any server-side
  prerendering is added** (see the prerender item above). Escape `<`/`</` in the JSON-LD payload before/when
  prerendering lands. *(surfaced 2026-06-23 in the track 3b code review.)*
- `[ ]` **Brand-asset script comment drift** — minor cleanup left after track 3b (PR #170): the header
  comment in `scripts/generate-brand-assets.mjs:6` lists `Montserrat-{Bold,SemiBold,Italic}.ttf` but the code
  actually loads `Montserrat-MediumItalic.ttf` at `:28` (code correct, comment stale on the `Italic` entry).
  **(verified 2026-06-26: the "dead `hero.jpg` (~1.1 MB)" half is already resolved — the file no longer exists
  on disk; only `hero.webp` remains and `HomeHero.tsx:10` references it. So this item is now just the one-line
  comment fix.)** *(surfaced 2026-06-23 in the Wave 4 Part 1 verification.)*
- `[ ]` **Post-6-phase-refactor DB check** — confirm no existing database records need updating/migrating
  after the refactor. *(2026-06-26: the tooling exists — `server/scripts/inventory-collections.js` (the DB
  inventory utility from commit 85c0208), plus the `backfillRatingUserIds.js` / `backfillServingPrice.js`
  backfills. This remains a manual run-and-confirm task; nothing in-repo proves it's been done.)*
- `[ ]` **Establish a code & architecture standard for Claude** — write a conventions doc so generated
  code stays consistent (likely an addition to `CLAUDE.md` or a new `CONVENTIONS.md`).
- `[ ]` **Refactor the create-recipe page**.
- `[ ]` **Refactor the account page**.
- `[x]` **Ingredient parser: handle "not found"** — *done in PR #164 (track 3d; PR open).* A client-side
  `withTimeout` (12s) races the enrichment request so a hung/"not found" lookup no longer sticks the UI; on
  timeout the row is kept, flagged errored with a retry, and a toast surfaces. Applied to both add and
  inline-edit paths.
- `[~]` **Promote the remaining hardcoded design values into `helpers.scss` tokens** — the
  design-consistency sweep (2026-06-25) applied the two pixel-identical cheap wins from the
  [2026-06-13 audit](./DESIGN_CONSISTENCY_AUDIT_2026-06-13.md): `$primary-hover` (`#e74e1d`, was hardcoded
  in 5 spots + a Footer local var) and `$surface-warm-border` (`#ece2d6`, 11 spots across 8 files). The
  remaining systemic scales need design sign-off because they touch many files / pixels:
    - **Type scale** — **520** raw `font-size:` literals across ~60 distinct values (verified 2026-06-26;
      0.8/0.82/0.84/0.85/0.875… all coexist), and **no `$fs-*` tokens exist yet**. A real scale *normalizes*
      those to a handful of steps, so it is **not** a pixel-identical repoint — it is a deliberate
      normalization pass needing design sign-off. Define a small ramp (e.g. `$fs-sm`/`$fs-base`/`$fs-lg`/…)
      and snap each size to its nearest step.
    - `[x]` **Radius scale** — DONE 2026-06-25 (PR `style/radius-scale-tokens`). `$radius-xs..4xl` +
      `$radius-pill`/`$radius-circle` now in `helpers.scss`; `$border-radius` aliases `$radius-lg`. ~200
      value-identical repoints across 32 `s`-importing files (compiled CSS byte-identical). **Remaining:**
      off-scale one-offs (5/7/9/11/13/18px) need ±1px normalization (design call), and the token-less admin
      files (`Admin/*`, `AdminRecipeControls`, `SavedFilterBar`) keep raw radii pending the import-wiring item
      below.
    - **Elevation/shadow scale** — partly done 2026-06-25: the two shadows that recur verbatim are now
      `$shadow-soft` (warm card resting, ×8) and `$shadow-chip` (price/floating chips, ×3). **Remaining:** of
      **75** total `box-shadow:` declarations, ~**52** are still distinct raw literals (verified 2026-06-26)
      — nearly all unique, needing a re-authored scale (`$shadow-card`/`-hover`/`-glow-primary`), e.g. the
      avatar-glow `rgba(255,87,34,0.18)` repeated in Account + PublicProfile (audit F5) — a re-author, not a
      pixel-identical repoint.
    - `[x]` **Breakpoint tokens/mixin** — DONE 2026-06-25 (PR `style/breakpoint-tokens`). Added an 8-tier
      `$bp-xs..4xl` scale + `$bp-nav`/`$bp-nav-up` and `below()`/`above()`/`between()` mixins; migrated all 69
      width queries. The recurring content breakpoints converged to tiers (7 approved small shifts ≤30px:
      350→375, 420/460/480→450, 550→560, 650→640, 880→900); tuned one-offs (recipe page 700/720/820,
      isolated 500/520, Home 850/851 boundary pair) and the DesktopNav 860/1000/1080/1240 cascade pass
      literal px to the mixins and keep their exact values. **Remaining (design call):** converge those
      deliberately-bespoke one-offs into the scale if/when their layouts are retuned.
  *(surfaced 2026-06-25 in the design-consistency sweep; cheap wins + radius/recurring-shadow scales applied,
  type scale + full elevation re-author deferred.)*
- `[~]` **Collapse near-duplicate brand shades to one value**
    - `[x]` **Decorative tint** — DONE (PR #192): `$primary-tint: #ff8a5c` collapses the avatar/XP gradient
      stops (`Account.scss` ×2) + the `RecipePlaceholder` icon `#ff8a65`. Purely decorative, so independent
      of the contrast work; only compiled change was the imperceptible `#ff8a65`→`#ff8a5c`.
    - **Remaining — owned by the brand-orange recolor:** the Drafts hover `#f4501e` and the accessible
      hovers `#a52f0a` / `#006065` are entangled with the in-flux orange-CTA contrast story (the a11y sweep
      reverted `$primary-accessible` back to vivid `#ff5722`). Resolve them as part of that recolor, not as a
      blind dedupe. *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **One danger-red token** — three reds mean the same thing: `$error-red` (the token — **now
  `#c5303f`** after the a11y pass, plus a new `$error-red-hover #b02a37`; `helpers.scss:43-44`), local
  `$danger #d23f31` (`SingleRecipe.scss:13`), and `#d64545` (`ReportControl.scss` ×7, `AdminRecipeControls.scss:87`,
  `Reports.scss:307`). Consolidate onto the token. *(audit F6; surfaced 2026-06-25; `$error-red` value
  corrected from the stale `#dc3545` on 2026-06-26.)*
- `[~]` **Name the admin/“cool” sub-palette and wire the token-less files into `helpers.scss`** — Admin +
  moderation surfaces hardcode a Tailwind-ish slate/blue palette (`#3b82f6`/`#2563eb` action blue exists
  nowhere in the brand) and several files `@use` nothing at all (audit F1/F2).
    - `[x]` **Import-wiring + value-identical repoints** — DONE 2026-06-25 (PR `style/admin-token-wiring`).
      Added `@use helpers as s` to the 10 token-less files that had a value-identical win and repointed their
      radii (radius scale) and `#fff`/`#ffffff` → `$white` (compiled CSS byte-identical). The bespoke admin
      palette in those files was deliberately left raw.
    - **Remaining (the brand decision):** define a documented `$admin-*` token group for the slate/blue/
      green/amber/red ramps and migrate the literals so the warm/cool split is a decision, not 200+ loose
      hexes. Five files stay fully token-less because they hold *only* bespoke-palette values
      (`RecipePlaceholder`, `ClassifierNote`, `AccountStatusBanner`, `DefaultAvatar`,
      `AddRecipe/ListComponents/Item`) — they get wired when the `$admin-*` group lands.
  *(surfaced 2026-06-25 in the design-consistency sweep; import-wiring applied, palette naming deferred.)*
- `[ ]` **`RecipeFormInput` duplicates the shared `FormInput`** — AddRecipe ships its own ~85%-identical
  input/textarea (`RecipeFormInput`/`RecipeFormTextArea`) instead of the shared `Components/Form/FormInput`,
  and Settings/BugReport use raw `<input>`/`<textarea>`/`<select>`. Converge on one input primitive.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Perf: no route-level code-splitting — the whole app ships in one ~1.19 MB / 372 kB-gzip JS chunk**
  — `npm run build` warns the main chunk is >500 kB; `src/App.tsx` statically imports every page (zero
  `React.lazy`/dynamic `import()` anywhere), and `vite.config.ts` has no `manualChunks`/visualizer. This is
  **the biggest lever for mobile**: against a prod preview, mobile Performance is 56–68 with LCP 7.8–10.7 s and
  FCP 3.3–3.9 s while **TBT ≈ 0** — i.e. the bottleneck is downloading/parsing the one bundle, not main-thread
  work. Desktop is fine (89–97). Fix: lazy-load the heavy/rare routes (Admin/* ≈ 5 pages, AddRecipe/EditRecipe
  + the ingredient parser + DnD, SingleRecipe) behind `Suspense`; add `manualChunks` + `rollup-plugin-visualizer`
  to inspect. Needs `App.tsx` route changes + a verification pass → not a blind fix. *(surfaced 2026-06-26 in the
  Performance sweep; before/after Lighthouse in the sweep PR.)*
- `[ ]` **Perf: hot read paths have no supporting MongoDB indexes** — `server/db.js` `ensureIndexes()` creates
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
- `[ ]` **Perf: `/recipes/facets` runs 3 unfiltered `distinct()` = 3 full `recipes` scans per browse load**
  (`server/routes/recipes.js:167-181`, `distinct('cuisine'|'nutritionLabels'|'mealTypes')`). Called on every
  `/recipes` page load to build the filter UI. Cache the result (short TTL) or maintain a small summary doc
  (`{_id:'facets', cuisines, diets, mealTypes}`) refreshed on recipe insert/update. *(surfaced 2026-06-26 in the
  Performance sweep.)*
- `[ ]` **Perf: recipe-page CLS ≈ 0.10 from the conditional controls block popping in above the hero** —
  `RecipeControls` (`src/pages/SingleRecipe/SingleRecipe.tsx:296`) renders only after `currRecipe` resolves
  (`currRecipe && …`), with no reserved space, so on load it inserts above `header.hero` and pushes the hero +
  body + ingredient list + instructions down in one shift (measured: the dominant layout-shift source on the
  page, prod preview). Fix structurally by reserving the block's height during load (skeleton / `min-height`),
  **not** with image dimensions. ⚠ **Verified caveat:** the hero (`SingleRecipe.scss` `.hero-img img` is
  `width:100%; aspect-ratio:4/3`) and the 40 px ingredient thumbs already reserve their boxes via CSS, so
  adding HTML `width`/`height` to those `<img>`s gives **no** CLS benefit and empirically *doubled* page CLS
  (0.10 → 0.26, reproducible) — that experiment was reverted in the sweep PR. *(surfaced 2026-06-26 in the
  Performance sweep.)*
- `[ ]` **Perf: `AuthContext` value object is recreated every render** (`src/context/AuthContext.tsx`, the
  `value` passed to `AuthContext.Provider`), so every `useAuth()` consumer (Navbar, SaveControl, ReportControl,
  forms, …) re-renders on any provider re-render. Wrap in `useMemo([user, isAdmin, …])`. Low *measured* impact
  today (TBT ≈ 0 across pages) — file as a scalability/correctness cleanup, not a hot fix. Pairs with memoizing
  the remaining list rows (`RecipeReview`, and `IngredientItem` — the latter sits in a `@hello-pangea/dnd` list,
  so verify DnD still works before memoizing). The `/recipes` grid card (`RecipeCard`) was memoized in the sweep.
  *(surfaced 2026-06-26 in the Performance sweep.)*
- `[ ]` **Perf: Firebase Storage recipe images are served single-size with no `srcset`/resize pipeline** — every
  `recipe.recipeImage` is a direct full-size Storage URL, so mobile downloads desktop-sized images (a contributor
  to the mobile LCP above). Structural: a Storage resize pipeline (or an image CDN) emitting width variants +
  `srcset`/`sizes` on the card/hero `<img>`s. The static Home hero is already a sized `.webp`. *(surfaced
  2026-06-26 in the Performance sweep.)*

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
