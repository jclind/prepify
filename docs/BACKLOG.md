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

- `[ ]` **`Received NaN for the \`value\` attribute` console warning on the Edit Recipe form** — React
  dev warning observed while editing an existing recipe (`/recipes/:id/edit`); a numeric input renders
  with `value={NaN}` for a render or two before the recipe data settles. No user-visible effect (form
  fills and saves correctly) — cosmetic console noise only. Likely a numeric field on the edit form
  (servings / prep-cook time / fridge-freezer life) or the summary bar's est-per-serving math computing
  before its inputs are populated; coerce/guard the value (`Number.isNaN(x) ? '' : x`). Discovered during
  the author-selected diet-labels smoke test (2026-06-24); not seen on the create form, only edit. **(nice-to-have)**
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
  while the list still shows `chic` matches. Cosmetic, self-corrects on fetch.
  (`SearchRecipesInput.tsx:205` + `:124-146`). *(surfaced 2026-06-22 in the track 2d code review.)*
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
- `[ ]` **Drop search from the topmost navbar on /recipes** — for the new navbar, the recipes page
  shouldn't carry search in the top-most bar. *(noted 2026-06-10)*
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
- `[ ]` **"Change Password" title is redundant/cluttered** — in Account & Security settings.
- `[x]` **create-username page revamp** — **done (track 3e):** the page was redesigned into the shared
  soft-glass auth vocabulary alongside login/signup/forgot in **PR #131**, and the escape hatch (a
  "Cancel and log out" control wired to the auth signout, plus a guard that bounces users who already
  have a username) landed in **PR #98**. Reconciled + escape-hatch regression test added in **PR #162**.
  Page lives at `src/pages/CreateUsername/`. Username validation tightening is tracked separately under 3c.
- `[ ]` **`RecipeThumbnail` shows the broken-image glyph on a failed image load** — track 3b (PR #170) gave
  `RecipeCard` an `onError` fallback to the icon `RecipePlaceholder`, but `RecipeThumbnail` only swaps in the
  placeholder when `recipeImage` is *absent* — a present-but-broken URL still renders the browser's
  broken-image glyph there (`src/Components/RecipeThumbnail/RecipeThumbnail.tsx`). Mirror RecipeCard: add a
  `useState` + `onError` that flips to `<RecipePlaceholder />`. Low severity (thumbnails are a secondary
  surface and seeded data all has images). *(surfaced 2026-06-23 in the track 3b code review.)*
- `[ ]` **Consolidate the bespoke pill buttons into a real `.btn` system** — `.btn` in `src/index.scss`
  only strips defaults (no visual style), so nearly every page re-implements its own orange/ghost pill:
  `home-btn` (`404.scss`), `pp-browse-btn` (`PublicProfile.scss`), `about-btn`/`about-btn-primary`/
  `about-btn-ghost` (`About.scss`), `search-recipes-btn`, the Recipes toolbar pills, HomeCookSuggestion
  `.primary`/`.ghost`, etc. — same shape, slightly different padding/weight/hover each time. Promote
  `.btn--primary` / `.btn--ghost` / `.btn--pill` variants and migrate the bespoke buttons onto them.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Unify `RecipeCard` and `RecipeThumbnail`** — ~80% duplicate (image + price + rating/time meta);
  they differ mostly in `<Link>` vs `<button>` wrapper and `AiFillStar` vs `AiOutlineStar`. Same data, two
  components, two loading-skeleton implementations. Merge into one card with a layout/interaction variant.
  *(surfaced 2026-06-25 in the design-consistency sweep; pairs with the RecipeThumbnail broken-image item above.)*
- `[ ]` **One icon per concept (react-icons drift)** — the same concept is drawn from different icon sets:
  star = `AiFillStar` / `AiOutlineStar` / `BsStar(Fill)` / `FiStar`; close = `AiOutlineClose` / `FiX` /
  `IoClose`; bookmark = `Bs*` and `Bi*` outline/filled pairs; time = `CgTimer` and `AiOutlineClockCircle`.
  Pick one icon per concept and re-export from a single `src/Components/icons` module so callers can't drift.
  *(surfaced 2026-06-25 in the design-consistency sweep.)*
- `[ ]` **Share one react-modal style config** — each modal repeats its own `customStyles`/overlay inline,
  and they disagree: `BugReportModal` uses `#fff` + `8px` radius while `ConfirmDeleteReviewModal` /
  `ReleaseNotes` use `#eeeeee` + `5px`. Extract a shared `modalStyles` constant (content + overlay) and a
  thin wrapper so every dialog reads the same. *(surfaced 2026-06-25 in the design-consistency sweep.)*
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
  `<ul role="listbox"><li><button role="option">…` (`SearchRecipesInput.tsx:153-162`): a plain `<li>`
  sits between the listbox and its options, an `option` shouldn't be a `<button>`, and there's no
  arrow-key navigation / `aria-activedescendant` — it's mouse-clickable buttons wearing listbox roles.
  Tab-reachable and fine for sighted/click users, so low severity. Fix: either drop the roles and treat it
  as a plain list of buttons, or implement real listbox keyboarding. *(surfaced 2026-06-22 in the track 2d
  code review; the per-result `role="option"` on a button is the new markup from this track.)*

- `[x]` **Ingredient checklist `<li role="checkbox">` is an invalid ARIA role + breaks the list** —
  **done (accessibility sweep, 2026-06-25):** the checkbox role + keyboard handler moved onto an inner
  `<div role="checkbox">`, leaving each `<li>` plain (`SingleRecipe.tsx` `renderIngredient`). `.ing`
  styling stayed on the now-inner element, so the 2-column grid is visually unchanged (verified by
  screenshot). Clears Lighthouse `aria-allowed-role` + `list`; recipe page **89 → 97**. Keyboard toggle
  (Enter/Space → `aria-checked`) re-verified.
- `[ ]` **Text + brand colors fail WCAG AA contrast (token-level decision)** — the widest remaining a11y
  gap. Two token families, both needing a design call (not a blind QA recolor), confirmed across Home,
  Recipes, single-recipe, profile, about/privacy/help, auth, and the logged-in Account/Settings:
  - **Muted-grey body/meta text** `#979ba0` (and `#8a8f99` on `.bug-report-trigger`) lands at **2.4:1 on
    `#eeeeee`** and **2.79:1 on `#ffffff`** — well under 4.5:1. Used pervasively: section subtitles
    (`.home-section-header p`, Recipes `header p`), `.author-text`, `.effective-date`, `.pp-name`,
    `.pp-counts span`, `.hr-count`, recipe-card meta (time/cuisine/rating `.count`/`.recipe-card__cuisine`),
    `.price-line`, `.footer-copy`/`.footer-version`, `.about-nutrition-label`, the meal-plan `.m-l` labels,
    and `.acct-meta`/`.acct-bio-empty`/`.settings-navlabel`/`.banner-sub` when logged in. A single token
    bump (e.g. `#979ba0`→~`#6b7280`, ≈4.6:1 on white) clears the bulk of the per-page `color-contrast`
    flags at once — it's the one change that moves every page off ~96.
  - **Brand colors as text/CTAs**: orange `#ff5722` (`.see-all`, `.dnav__link-label`/`.dnav__cta--signup`
    on the solid nav, `.cook-suggestion-btn`, `.about-eyebrow`/`.about-btn-primary`/`.about-card-price`,
    `.save-control__trigger`, `.price-line strong`, `.pp-lvl`, meal-col headers) at **2.7–3.2:1**, and teal
    `#00adb5` (`.eyebrow` on the recipe page, the `.form-action-btn` login/signup buttons at white-on-teal
    **2.74:1**). These are the identity palette — adjusting them (or pairing a darker on-light variant) is a
    brand decision. Propose tokenizing an accessible "on-light" orange/teal rather than recoloring inline.
  - *(The `.beta-tag` `#eeeeee`-on-`#00adb5` is also flagged but is intentionally left for the Phase-5
    beta-tag cutover — leave it.)* *(Original `.dnav__*` entry surfaced 2026-06-23 in track 4-qa; broadened
    to the full token inventory 2026-06-25 in the accessibility sweep.)*
- `[ ]` **Autocomplete dropdown isn't a valid ARIA listbox + has no keyboard nav** — re-confirmed in the
  2026-06-25 accessibility sweep, still as filed above (the `<ul role="listbox"><li><button role="option">`
  shape + no arrow-key/`aria-activedescendant`). Tab-reachable and operable by mouse/Enter, so left for the
  listbox refactor rather than a sweep polish edit. See the dedicated entry earlier in this section.
- `[ ]` **Servings stepper input is below the 24px touch-target minimum** — the `.serv-input` in the
  Ingredients servings pill (`SingleRecipe.tsx`) trips Lighthouse `target-size`. A label was added in
  track 4-qa (`aria-label="Servings"`), but enlarging the tap target is a layout change to the pill.
  *(surfaced 2026-06-23, track 4-qa; re-confirmed 2026-06-25 in the accessibility sweep.)*

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
  is best-effort/post-commit and only `console.error`s on failure (`server/routes/auth.js` ~L447-454),
  so a silent failure can re-introduce aggregate drift. The set of recipes is correct
  (`distinct('recipeId', { userId })` covers rating-only docs); only the failure mode is silent. Consider
  a periodic reconciliation job (pairs with the item above) or alerting on recompute failure. *(low priority)*
- `[ ]` **Autocomplete fuzzy fallback is an O(n) scan + in-process ranking** — when exact matches < 8, the
  `/api/searchAutoCompleteRecipes` handler pulls up to `FUZZY_CANDIDATE_CAP = 1000` `{_id, title}` docs
  (only the visibility filter narrows them — no title text index) and runs `titleScore` (windowed
  Levenshtein) over each (`server/routes/recipes.js:227-236`, `server/util/recipeTitleMatch.js`).
  Negligible at the current catalog size and correctly skipped when exact ≥ 8, but it grows linearly with
  the recipe count on a hot path. Revisit with a Mongo text index / Atlas Search before the catalog gets
  large. *(surfaced 2026-06-22 in the track 2d code review — shipped intentionally as the simplest
  typo-tolerant fallback.)*
- `[ ]` **`'/recipes'` route hardcoded in two nav components** — the search-suppression check
  (`pathname !== '/recipes'`) is copy-pasted into `DesktopBar.tsx:47` and `NavMenu.tsx:20`, and
  `Recipes.tsx`'s `browseAll` re-issues the same filter-resetting setters as `clearFilters`. A route
  rename would silently break suppression in two places with no compile error. Extract a shared
  `RECIPES_PATH` const (or a small hook) and have `browseAll` call `clearFilters`.
  *(surfaced 2026-06-22 in the track 2d code review.)*
- `[x]` **Migrate Sass `@import` → `@use`** — **already done in `cb2ac81` (2026-05-09), reconciled
  2026-06-23.** Converted all 36 component/page stylesheets from `@import 'helpers.scss'` to
  `@use 'helpers.scss' as s` and namespaced every var/mixin under `s.`. This predates the release gameplan
  (created 2026-06-17), so the open box was stale, not pending work. Verified: `npm run build` emits **zero**
  Sass deprecation warnings and all 73 `.scss` compile clean. The only remaining `@import` is the plain CSS
  `@import url('…Montserrat…')` font load in `src/index.scss` — not a Sass partial import, not deprecated.
  *(See the 2026-06-23 4-sass status-log entry in `RELEASE_GAMEPLAN.md`.)*
- `[ ]` **Recipe images aren't keyed by uid in Storage** — uploads go to `recipeImages/{imageFile.name}`
  (`src/api/recipes.ts:189`), keyed by the raw filename rather than the owner's uid. Two consequences:
  (a) two users uploading `photo.jpg` collide/overwrite, and (b) the Storage rules can't scope writes to
  the owner, so `storage.rules` can only auth-gate that path (any signed-in user could overwrite/delete
  any recipe image). Re-key to e.g. `recipeImages/{uid}/{uuid}` (and tighten the rule to
  `request.auth.uid == uid`) for collision-safety + per-owner write scoping. Low severity (writes are
  auth-gated and the server is the source of truth), but worth doing. *(surfaced 2026-06-23 writing the
  Storage rules, PR #177.)*
- `[ ]` **Point Railway at the production branch** — currently not deploying from production.
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
- `[ ]` **Brand-asset script comment drift + dead hero source** — minor cleanup left after track 3b (PR #170):
  the header comment in `scripts/generate-brand-assets.mjs` lists `Montserrat-{Bold,SemiBold,Italic}.ttf` but
  the code actually loads `Montserrat-MediumItalic.ttf` (code correct, comment stale); and
  `public/images/home-images/hero.jpg` (~1.1 MB) is no longer referenced after the WebP swap (`hero.webp`) —
  safe to delete unless kept as source. *(surfaced 2026-06-23 in the Wave 4 Part 1 verification.)*
- `[ ]` **Post-6-phase-refactor DB check** — confirm no existing database records need updating/migrating
  after the refactor.
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
    - **Type scale** — ~520 raw `font-size:` literals across ~50 distinct values (0.8/0.82/0.84/0.85/0.875…
      all coexist). A real scale *normalizes* those to a handful of steps, so it is **not** a pixel-identical
      repoint — it is a deliberate normalization pass needing design sign-off. Define a small ramp (e.g.
      `$fs-sm`/`$fs-base`/`$fs-lg`/…) and snap each size to its nearest step.
    - `[x]` **Radius scale** — DONE 2026-06-25 (PR `style/radius-scale-tokens`). `$radius-xs..4xl` +
      `$radius-pill`/`$radius-circle` now in `helpers.scss`; `$border-radius` aliases `$radius-lg`. ~200
      value-identical repoints across 32 `s`-importing files (compiled CSS byte-identical). **Remaining:**
      off-scale one-offs (5/7/9/11/13/18px) need ±1px normalization (design call), and the token-less admin
      files (`Admin/*`, `AdminRecipeControls`, `SavedFilterBar`) keep raw radii pending the import-wiring item
      below.
    - **Elevation/shadow scale** — partly done 2026-06-25: the two shadows that recur verbatim are now
      `$shadow-soft` (warm card resting, ×8) and `$shadow-chip` (price/floating chips, ×3). **Remaining:** the
      ~40 other `box-shadow`s are nearly all unique and need a re-authored scale (`$shadow-card`/`-hover`/
      `-glow-primary`), e.g. the avatar-glow `rgba(255,87,34,0.18)` repeated in Account + PublicProfile
      (audit F5) — a re-author, not a pixel-identical repoint.
    - **Breakpoint tokens/mixin** — no shared breakpoints; ~77 ad-hoc media queries repeat 725px (navbar
      flip), 768px, 600px, 560px, 640px… Add a `$bp-*` set or a `respond-to()` mixin and converge.
  *(surfaced 2026-06-25 in the design-consistency sweep; cheap wins + radius/recurring-shadow scales applied,
  type scale + full elevation re-author deferred.)*
- `[ ]` **Collapse near-duplicate brand shades to one value** — now that `$primary-hover` exists, the
  Drafts primary-button hover `#f4501e` (`Drafts.scss:138`) should point at it, and the avatar/XP gradient
  stops `#ff8a5c` (`Account.scss:163,186`) vs `#ff8a65` (`RecipePlaceholder.scss:13`) should collapse to a
  single `$primary-tint` token. Each is a (tiny) visible pixel change, so it's a brand-color call, not a
  blind repoint. *(surfaced 2026-06-25 in the design-consistency sweep; left out of the repoint-only PR by
  decision.)*
- `[ ]` **One danger-red token** — three reds mean the same thing: `$error-red #dc3545` (token), local
  `$danger #d23f31` (`SingleRecipe.scss`), and `#d64545` (`ReportControl`/`Reports`). Consolidate onto the
  token. *(audit F6; surfaced 2026-06-25 in the design-consistency sweep.)*
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
  (currently E2E-only) and broader E2E happy-path variants.
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
