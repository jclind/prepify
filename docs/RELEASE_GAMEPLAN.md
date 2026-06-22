# Prepify — Release Gameplan (Here → Polished 1.0)

A phased, parallelism-aware path to a polished 1.0. Companion to:
- [`RELEASE_PLAN.md`](./RELEASE_PLAN.md) — the beta→1.0 blocker checklist (source of truth for "done").
- [`BACKLOG.md`](./BACKLOG.md) — bugs / polish / a11y / tech debt / post-1.0 ideas.

Everything is coded with Claude across **git worktrees**. The point of this doc is to say what can run
**in parallel** without merge collisions, and what must be **serialized**.

_Created 2026-06-17._

---

## Locked decisions (2026-06-17)

- **Beta tag** — remove it **last**, as a deliberate celebration step at cutover. All three beta edits
  (footer `-beta` suffix in `LegalBar.tsx:16`, the `Beta` button in `PrepifyLogo.tsx:17`, and
  `isBeta = true` in `ReleaseNotes.tsx:35`) ship **together at the very end** — not piecemeal earlier.
- **Firebase Analytics / cookie notice** — **deferred / undecided.** Revisit before cutover; if analytics
  stays on at launch, the disclosure becomes a blocker.
- **Friend system** — **post-1.0.**
- **AI recipe search (paid membership)** — **post-1.0.**
- **Fridge/freezer fields on the create form** — **post-1.0.**

## What's already done (reconciled — don't re-do)

Footer overhaul, mobile-nav redesign, Privacy + Terms pages, SEO basics (robots/sitemap/helmet),
API rate limiting, dev-tools gating, content moderation (text + image), bug-reporting system.
So the **remaining design blockers are just: Homepage redesign, public Help/Contact page, About
rewrite, and (at the very end) dropping the beta tag.**

---

## 📋 Track Board — "where are we?"

This is the dashboard. Point each session here ("where are we in the gameplan?"). Status is
**self-verified against git** — Claude cross-checks `git branch -a` / `gh pr list` against these boxes
and flags any drift, so a stale box gets caught rather than trusted.

Status: `[ ]` not started · `[~]` in a worktree · `[P]` PR open · `[x]` merged to `development`.
**When a track merges, flip its box here AND its underlying item in `BACKLOG.md`/`RELEASE_PLAN.md` in the
same commit.**

| Track | Title | Status | Branch / PR |
|---|---|---|---|
| 0a | Repo/secrets hygiene | `[x]` | #151 ✅ |
| 0c | Infra (Jesse, dashboards) | `[ ]` | n/a |
| 1a | Ratings/reviews bug | `[x]` | #150 ✅ |
| 1b | Save-recipe broken | `[x]` | #157 ✅ |
| 1c | Account data (images, empty-flash) | `[x]` | #156 ✅ |
| 1d | Serving-price bug | `[x]` | #152 ✅ |
| 2a | Homepage redesign (design + For You row + "What should I cook?") | `[x]` | #153 + #154 ✅ |
| 2b | Public Help/Contact page | `[x]` | #158 ✅ |
| 2c | Single-recipe polish | `[x]` | #160 ✅ |
| 2d | Recipes browse polish | `[ ]` | — |
| 2e | Account/profile polish | `[P]` | #165 |
| 3a | a11y (focus-visible, chevron) | `[x]` | #163 ✅ |
| 3b | Meta/SEO finish (favicon/OG/titles) | `[ ]` | — |
| 3c | Username validation + report-user | `[ ]` | — |
| 3d | Add-recipe UX | `[P]` | #164 |
| 3e | create-username revamp | `[x]` | #131 + #98 (+ #162 reconcile/test) ✅ |
| 4-sass | Sass `@import`→`@use` (LONER) | `[ ]` | — |
| 4-about | About rewrite (Jesse) | `[ ]` | — |
| 4-qa | Empty/error sweep + links + copy + mobile + Lighthouse | `[ ]` | — |
| 5 | Cutover (beta off + 1.0.0 + deploy) | `[ ]` | — |

_Doc ownership: this board owns **progress**; `RELEASE_PLAN.md` owns **launch acceptance** (audited by
`/release-readiness`); `BACKLOG.md` owns **scope**. Keep status in one place per concern to avoid drift._

---

## The 3 parallelism rules

1. **The Sass `@import`→`@use` migration is a loner.** It rewrites nearly every `.scss` file, so it
   collides with *every* design/polish worktree. Run it **alone**, in a quiet window, after the design
   work has merged; then rebase anything still open. Never concurrent with design work.
2. **`src/App.tsx` is a chokepoint** (routes). Only one in-flight worktree should add routes at a time,
   or accept a trivial merge on each.
3. **`src/Components/Navbar/*` and the reviews subsystem are mini-chokepoints** — several items touch
   each. Assign each to a *single* worktree and merge it before starting polish that builds on it.

**Concurrency budget:** ~2–4 worktrees at once for one reviewer. Beyond that, *you* become the
bottleneck. Merge the small/fast tracks frequently so long-lived design branches rebase against a moving
`development` rather than diverging.

---

## Phase 0 — Housekeeping & infra (fast; fully parallel)

All isolated files — safe to run together.

| Track | Work | Files / where |
|---|---|---|
| **0a** Repo/secrets hygiene | Remove dead `VITE_OPEN_AI_API_KEY` + `VITE_INGREDIENT_PARSER_URL` from `.env.example`; README `your-username` cleanup; dep-audit triage (3 high root / 3 high server) | `.env.example`, `README.md`, `package.json`, `server/package.json` |
| **0b** Plan reconcile | (done 2026-06-17) flipped footer / mobile-nav / Privacy / Terms / SEO / rate-limit / devtools markers | `RELEASE_PLAN.md` |
| **0c** Infra — **Jesse, no worktree** | Railway → production branch; set prod env vars; dashboard key lockdown (Edamam/Firebase referrer + quotas); Firebase Storage rules review; production domain + HTTPS | external dashboards |

## Phase 1 — Bug squash (4 parallel worktrees; isolated subsystems)

| Track | Bug(s) | Domain |
|---|---|---|
| **1a** Ratings/reviews | Delete-review leaves the star rating (`reviews.js:163` only blanks text); add a remove-rating path. Also "rating average dropped on a 5-star" | `server/routes/reviews.js`, `util/recipeRating` |
| **1b** Save | Save-recipe broken — fix + tests | save / `userRecipeData` |
| **1c** Account data | Ratings-list recipe images not loading; "Your Recipes" flashes empty before load | `src/pages/Account/*` |
| **1d** Pricing | Serving-price miscalculation | `src/util/calculateServingPrice.ts` |

⚠️ **Merge 1a before** the single-recipe review-UI polish in Phase 2 (2c).

## Phase 2 — Design / redesign (page-isolated worktrees)

| Track | Work | Domain |
|---|---|---|
| **2a** Homepage redesign *(complete)* | redesign live (`HomeHero → Trending → Browse by meal`) + both feature items shipped: **For You** personalized row (#153) and **"What should I cook?"** spotlight-modal button (#154) | `src/pages/Home/*`, `server/routes/recipes.js`, `server/util/forYou.js`, `server/util/tasteContext.js` |
| **2b** Public Help/Contact *(blocker)* | move route out of `PrivateRoute`, add a public link (footer/nav), refresh layout | `src/pages/Help/*`, **`App.tsx`**, Navbar link |
| **2c** Single-recipe polish | serving-price prominence, "You created this" mobile styling, stats row styling, `RecipeNotFound` visual, "Your Review" UI + rating-dropdown position | `src/pages/SingleRecipe/*` |
| **2d** Recipes browse polish | better no-results indicator, autocomplete redesign + autocorrect, drop search from the top-most navbar on /recipes | `src/pages/Recipes/*`, `SearchRecipesInput`, Navbar |
| **2e** Account/profile polish | account nav-sections UI, `/u/:username` visual polish | `src/pages/Account/*`, `PublicProfile/*` |

⚠️ **2b and 2d both touch Navbar/App.tsx** — run in different waves or merge 2b first.
⚠️ Don't run **2c concurrently with 1a** (same reviews surface).

## Phase 3 — Polish, a11y, meta, features (small parallel worktrees)

| Track | Work | Domain |
|---|---|---|
| **3a** a11y | `:focus-visible` only (no outline on mouse click); fix chevron animation shifting the focus outline *(merged #163 ✅ — global rule + every component-local `s.outline()` ring swept site-wide; input/textarea focus affordances left on `:focus`)* | `src/index.scss` + component SCSS site-wide, `src/Components/Navbar/*` |
| **3b** Meta/SEO finish | favicon, OG image for link previews, per-page `<title>`s | `index.html`, per-page Helmet |
| **3c** Features | username char-validation; report-a-user from profile *(admin; `ReportTargetType` currently only recipe/review)*; show report controls to logged-out users with a login prompt (recipe + reviews); surface the recipe rating up top (near the title) | `server/routes/*`, `ReportControl`, `types.ts`, `src/pages/SingleRecipe/*` |
| **3d** Add-recipe UX | optimistic ingredient add; ingredient-parser not-found timeout/exit; bottom bar overlapping footer | `src/pages/AddRecipe/*` |
| **3e** create-username | revamp the page + add a logout/escape hatch so users can't get stuck | `src/pages/CreateUsername/*` |

## Phase 4 — Loners & final passes (mostly serialized)

- **Sass `@import`→`@use` migration** — **alone**, after design merges; everyone rebases after. *(Rule 1)*
- **About page rewrite** — Jesse personally; isolated file, can happen in the background anytime.
- **Empty / error / loading-state sweep** + **broken-link click-through** + **copy/typo review** — needs
  a stable app, so do near the end.
- **Mobile hand-pass** (Add Recipe + Account/Settings flows) and **Lighthouse / perf**.
- **Code & architecture standard for Claude** (new conventions doc) + **post-refactor DB-migration check**.
- **Toast/alert tests**, **create-recipe Cypress+Vitest** *(largely done in 3d / PR #164 — see Backlog →
  Testing)*, **Cypress autocomplete test** — fold into the relevant domain track when that track is touched,
  or batch here.

## Phase 5 — Cutover

Follow the light checklist in `RELEASE_PLAN.md` → "Release-day cutover":
1. All blockers `[x]`.
2. Bump `package.json` version → `1.0.0`.
3. **Drop the beta tag** — the three edits, together. *(the celebration move)*
4. Refresh release-notes content for 1.0 + tag a GitHub Release.
5. Deploy FE (Firebase Hosting) + BE (Railway) with prod env vars set first.
6. Smoke-test prod (home → recipe → sign in → create recipe → review).
7. Watch logs/analytics for the first hours.

---

## Suggested first wave (zero file overlap)

Kick these four off together — a mix of quick wins and the big rock:

- **0a** repo/secrets hygiene
- **1a** ratings/reviews bug
- **1d** serving-price bug
- **2a** homepage redesign

When **0a/1a/1d** merge, start the next wave: **2b** (Help, takes the App.tsx route slot), **2c**
(single-recipe — now that 1a is in), **2e** (account/profile). Hold **2d** until **2b** merges
(shared Navbar). Save the Sass migration for last.

---

## Suggested second wave (Wave 2 — zero file overlap)

Wave 1 is fully merged. Kick these four off together; their domains don't touch:

- **1b** Save-recipe bug — save / `userRecipeData` (server route + save action)
- **1c** Account-data bug — `src/pages/Account/*` (rated-recipe images + "Your Recipes" empty-flash)
- **2b** Public Help/Contact *(blocker)* — Navbar link + `Footer/footerData.ts` (route is **already public**;
  remaining gap is link visibility + layout refresh, so likely **no `App.tsx` change**)
- **2c** Single-recipe polish — `src/pages/SingleRecipe/*` (now unblocked: 1a is merged)

**Ordering / holds for Wave 3:**
- **2e** (account/profile polish) waits for **1c** — both live in `Account/*`; land the bug fix, then polish on top.
- **2d** (recipes browse) waits for **2b** — shared Navbar. 2b owns the Navbar link this wave.
- One caveat to watch: if **1b**'s fix reaches into the SingleRecipe save button, it brushes **2c**. 2c's
  scope (price prominence, stats row, RecipeNotFound, Your-Review UI) avoids the save control, so keep 1b's
  client change on the save button/`RecipeThumbnail` side and there's no collision.

After this wave: **Wave 3** = 2d + 2e + the Phase-3 smalls (3a a11y, 3b meta/SEO, 3c username/report-user,
3d add-recipe UX, 3e create-username). Then Phase 4 loners (Sass migration alone, About, QA sweep) → cutover.

---

## Suggested third wave (Wave 3)

Wave 2 is fully merged and verified. Wave 3 has **7 candidate tracks**, but two chokepoints (Navbar and
PublicProfile) and the ~2–4-worktree budget mean they can't all run at once. Split into two parts plus a
late finishing pass. **Paste-ready prompts for Part 1 are in the Wave 3 appendix below;** regenerate
Part 2's prompts once Part 1 merges (the board will have moved).

### Part 1 — kick off together (zero file overlap)

- **2e** Account/profile polish — `src/pages/Account/*` (in-page `SegmentedNav`) + `src/pages/PublicProfile/*`.
  *Unblocked: 1c merged.* Owns **PublicProfile** this part.
- **3a** a11y — global `:focus-visible` (`src/index.scss`) + `src/Components/Navbar/*` (chevron/focus).
  Owns **Navbar** this part. **Merged (#163 ✅)** — global rule + component-local `s.outline()` rings swept
  site-wide; chevron decoupled from the ring via a clip box. 2d rebases on the merged Navbar.
- **3d** Add-recipe UX — `src/pages/AddRecipe/*` (optimistic ingredient add, parser not-found timeout,
  sticky bar overlapping footer). Fully isolated.
- ~~**3e** create-username revamp — `src/pages/CreateUsername/*` (+ logout/escape hatch). Fully isolated.~~
  **Already merged** (PR #131 redesign + PR #98 escape hatch) — predates this board; nothing to start.

No App.tsx route additions in Part 1 (3e's route already exists). The two "account navs" are different
components: 2e owns the in-page `Account/components/SegmentedNav`; 3a owns the Navbar account dropdown.

### Part 2 — after Part 1 merges (rebase onto the chokepoint owners)

- **2d** Recipes browse polish — `src/pages/Recipes/*`, `SearchRecipesInput`, **Navbar** (no-results
  indicator, autocomplete redesign, drop search from the top-most navbar on /recipes). **Waits for 3a**
  (shared Navbar) — rebase after 3a merges.
- **3c** Username validation + report-user — `server/routes/*`, `ReportControl`, `types.ts`
  (`ReportTargetType` is `'recipe' | 'review'` only, `types.ts:188`), admin queue (`src/pages/Admin/Reports/`),
  **plus the two items deferred out of 2c** (logged-out report controls w/ login prompt; surface the rating
  up top near the title — `src/pages/SingleRecipe/*`). **Waits for 2e** — it adds a report control to the
  now-polished PublicProfile.

### Finishing pass (late, not concurrent with page edits)

- **3b** Meta/SEO finish — `index.html` + per-page Helmet (favicon, OG image, per-page `<title>`s). Per-page
  Helmet collides with any page being actively edited, and 2c already deferred per-page OG here. Run it
  **after** 2d/3c stabilize their pages — fold into the Phase-4 QA sweep.

**Ordering / holds for Phase 4+:**
- The **Sass `@import`→`@use` migration is NOT in Wave 3** — it's the loner (Rule 1): runs alone after *all*
  design/polish merges, then everything open rebases.
- Beta tag stays untouched until the Phase-5 cutover (the celebration step).

---

## Status log

Append a one-liner when a track changes state (started / PR / merged). Keeps session handoffs honest.

- _2026-06-17_ — Gameplan created; Track Board added. First wave defined (0a / 1a / 1d / 2a). Nothing
  started yet.
- _2026-06-17_ — **0a Repo/secrets hygiene → merged** (PR #151). Removed dead `VITE_OPEN_AI_API_KEY` +
  `VITE_INGREDIENT_PARSER_URL` from `.env.example` (+ CLAUDE.md notes); README `your-username` →
  `jclind/prepify` + setup refresh; `npm audit` non-breaking fixes cleared **all high advisories** (root
  + server). Residual moderates need major bumps (firebase-admin 13→14, jest) — deferred. CI green;
  worktree/branch pruned.
- _2026-06-17_ — **1a → PR open (#150):** delete-review now keeps the rating +
  new `DELETE /removeRating` + orphan cleanup; recompute on every rating change + UI refresh. Bug 2
  ("avg dropped on a 5-star") root-caused = stale stored aggregate corrected on recompute (math is
  correct); confirmed by a live authed smoke test. Two follow-ups filed in `BACKLOG.md` → Tech debt:
  one-off catalog-wide aggregate reconciliation + harden `deleteAccount`'s best-effort recompute.
- _2026-06-17_ — **2a For You row → merged** (PR #153). Content-based personalized Home row inferred from
  saves/makes/ratings (`HomeForYou` + `GET /api/getForYouRecipes` + `server/util/forYou.js`);
  hide-until-personalized, capped at 4 to match Trending.
- _2026-06-17_ — **2a "What should I cook?" button → merged** (PR #154) — **Track 2a complete.** Taste-aware
  random pick (reuses the For You profile via the extracted `server/util/tasteContext.js`; uniform `$sample`
  fallback) revealed in a spotlight modal with a "Try another" re-roll (`HomeCookSuggestion` +
  `GET /api/recipes/random`). Fallback prefers unseen recipes, only resurfacing seen ones once the whole
  catalog is exhausted.
- _2026-06-17_ — **1a → merged** (PR #150) and **1d → merged** (PR #152). **Wave 1 (0a / 1a / 1d / 2a)
  complete; no PRs open.** 1d corrected the serving-price calc + added regression tests. Board reconciled
  against git (1a `[P]`→`[x]`, 1d `[ ]`→`[x]`; backlog bug markers flipped). Residual from 1a — the
  one-off catalog-wide aggregate reconciliation — stays open in Tech debt (not a blocker).
- _2026-06-18_ — **Wave 2 defined** (see "Suggested second wave"): **1b** save bug, **1c** account-data bug,
  **2b** Help/Contact (App.tsx route slot), **2c** single-recipe polish. Zero file overlap. Holds **2e**
  behind 1c (both `Account/*`) and **2d** behind 2b (shared Navbar).
- _2026-06-18_ — **1b → PR open (#157).** Root-caused the "save is broken" report to `useSaveRecipe`'s
  hand-rolled optimistic write: the shared `['savedRecipeIds']` cache runs at the default staleTime (0),
  so a stale refetch (window-focus / sibling card / `invalidateSavedCaches`) resolving mid-write overwrote
  the optimistic value — and with no post-write reconciliation the bookmark stayed reverted even though the
  server save had succeeded. Rewrote the toggle as a proper React Query optimistic mutation
  (`onMutate` cancel+snapshot, `onError` rollback, `onSettled` reconcile). Client change confined to the
  hook — `SaveControl`/`SingleRecipe`/`api` untouched (keeps clear of 2c). Tests: new Vitest suite for the
  hook (optimistic, rollback, and a reconcile-after-clobber guard that fails on the old hook) + extended
  server Jest with `GET /getSavedRecipeIds` shape + save/unsave round-trip. tsc + build clean.
- _2026-06-18_ — **1b → merged** (PR #157, all CI green incl. Cypress). Board reconciled (1b `[P]`→`[x]`;
  backlog bug marker flipped). Client change confined to `useSaveRecipe` (SaveControl/SingleRecipe/api
  untouched), so no collision with 2c. The `recipe.cy.ts` save E2E gained a stateful saved-ids stub so it
  exercises the new post-write reconciliation. Worktree/branch pruned after merge.
- _2026-06-18_ — **2c Single-recipe polish → merged** (PR #160, all CI green incl. Cypress). Shipped:
  per-serving price as a prominent price-tag tile (replaces rating tile → time/servings/price row);
  Report demoted from the CTA row to a quiet bottom-of-page link (logged-in non-owners); owner-banner
  mobile stats now an equal-width divided strip; `RecipeNotFound` redesigned **+ 404 routing fixed**
  (map 404→null in the queryFn so it renders instantly, no ~7s retry, without overriding retry config);
  "Your review" restyled as an eyebrow label + teal-accented card; ingredient rows made keyboard-operable
  (`role=checkbox`); schema.org/Recipe **JSON-LD** added. Verified via live authed smoke test (rate →
  review → "Your review" card, with full cleanup). Per-page OG tags **deferred to 3b/3c** (static
  `index.html` `og:*` defaults can't be deduped by react-helmet-async). Two follow-ups filed → **Track 3c**:
  show report controls to logged-out users (login prompt); surface rating up top near the title. Backlog
  single-recipe items flipped; worktree/branch pruned after merge.
- _2026-06-18_ — **1c Account data → merged** (PR #156, all CI green incl. Cypress). Two bugs, both
  reproduced first: (A) account "Ratings" thumbnails were blank because `GET /getSingleUserReviews?returnRecipeData=true`
  attached the recipe only as a nested `recipeData` object while `UserRatings.tsx` reads flat
  `recipeImage`/`recipeTitle` — server now denormalizes those onto each review (kept `recipeData` for admin),
  **verified live** against a throwaway DB; (B) the "Your Recipes" / "Ratings" lists flashed their empty
  state for one frame on a fast load (react-query settles before the effect populates list state) — gated
  the grid/list on the resolved payload, guarded by `EmptyState`-mount-spy tests. Board 1c `[ ]`→`[x]`;
  backlog items flipped. **Unblocks Track 2e** (account/profile polish on top of the fix). Also folded a
  live-confirmed pagination edge case into Backlog (Load-More count vs hidden-recipe visibility filter).
- _2026-06-18_ — **2b Public Help/Contact → merged** (PR #158, blocker cleared). Un-gated the footer Help
  link (removed `auth: 'in'` in `footerData.ts`) so logged-out visitors can find it; `/help` was already a
  public route (no `App.tsx` change); redesigned the page for a public audience (progressive-disclosure
  topic chooser + `mailto:` fallback). Navbar left untouched so Track 2d owns the nav link cleanly.
  RELEASE_PLAN Help/Contact blocker flipped `[x]`. *(Entry added 2026-06-18 during the Wave 2 verification
  pass — the merge had been reflected on the Track Board but never logged here.)*
- _2026-06-18_ — **Wave 2 verification pass.** Audited all four Wave 2 tracks (1b/#157, 1c/#156, 2b/#158,
  2c/#160) against their kickoff briefs (code + tests) and live-smoke-tested the user-facing outcomes as
  admin: save persists across reload (1b), account-ratings thumbnail loads + remove-rating cleanup (1c/1a),
  logged-out `/help` reachable + footer-linked (2b), price tile + RecipeNotFound redesign (2c). All briefs
  fully delivered; deferrals (3c report-controls/rating-up-top, 3b/3c OG tags, Load-More pagination) all
  tracked open. Fixed status-log drift (this 2b entry) + a stale "PR #158 open" in RELEASE_PLAN; filed a
  nested-`<button>` a11y nit on the account Ratings list to Backlog.
- _2026-06-18_ — **Test-harness (Node 26) fixes → merged.** Two environment-only gaps that don't reproduce
  on CI's older Node but block local runs: client `localStorage`/`sessionStorage` undefined on Node ≥ 24
  (PR #159 — in-memory Web Storage shim) and server `clearTimeout is not defined` from superagent after a
  fake-timer test on Node 26 (PR #161 — re-install `node:timers` per test). Test-only; no product code. Not
  numbered tracks — logged in Backlog → Testing.
- _2026-06-18_ — **Wave 3 defined** (see "Suggested third wave"). Split the 7 Phase-2/3 tracks across two
  parts + a late finishing pass to respect the Navbar (3a↔2d) and PublicProfile (2e↔3c) chokepoints.
  **Part 1** (run now, zero overlap): **2e** account/profile, **3a** a11y, **3d** add-recipe UX, **3e**
  create-username. **Part 2** (after Part 1 merges): **2d** recipes browse (rebases on 3a's Navbar), **3c**
  username-validation + report-user (rebases on 2e's PublicProfile; also carries the two 2c deferrals).
  **3b** meta/SEO held as a finishing pass. Part-1 kickoff prompts added to the appendix below.
- _2026-06-18_ — **3a a11y → merged** (PR #163, all CI green incl. Cypress). Two focus-outline issues:
  (A) the focus ring showed on mouse/touch clicks — switched the global `button`/`a` rule (`src/index.scss`)
  **and every component-local `@include s.outline()` ring** from `:focus` to `:focus-visible`, so it shows
  for keyboard nav only; input/textarea affordances (border/box-shadow/background) deliberately left on
  `:focus` so clicking into a field still highlights it; (B) the desktop account-menu chevron rotation
  dragged the button's `outline:auto` ring (Blink expands `auto` outlines to wrap transformed-descendant
  ink overflow) — wrapped the caret in a fixed-size `overflow:hidden` clip box with an inner rotating
  `<svg>` (`DesktopAccountMenu.tsx` + `DesktopNav.scss`). Also dropped a stray `background:red` debug
  leftover on the star-rating focus state. Verified live (mouse click → no ring, Tab → ring; chevron clip
  box stable at the 45° worst case). Board 3a `[P]`→`[x]`; backlog Accessibility items flipped.
  **Unblocks 2d** (rebases on the merged Navbar). Worktree/branch pruned after merge.
- _2026-06-18_ — **3d Add-recipe UX → PR open** (PR #164, into `development`). Delivered all three brief
  items under `src/pages/AddRecipe/*`: (1) **optimistic ingredient add** — parse locally + show the row
  instantly, reconcile price/image on response, keep + flag errored rows with a retry; (2) **enrichment
  timeout** — a client-side `withTimeout` (12s) races the parse so a hung/"not found" lookup can't stick the
  UI (toast + errored row + retry), applied to both add and inline-edit; (3) **sticky bar / footer** — bar
  switched from `position: fixed` to `sticky` (+`margin-top: auto`) so it releases at page end above the
  footer; per-row enrichment status is keyed by id, so it survives reorders. Two follow-up polish fixes also
  landed in the PR after a live smoke test: the footer's global top-margin showing as a gap below the
  released bar (cancelled on this page via `:has`), and the cuisine/course dropdowns opening behind the bar
  (menu z-index 50→60). Plus a comprehensive **test sweep** (Backlog → Testing): Vitest for the timeout util /
  optimistic-add / inline-edit / drag-reorder + id-keyed-status / summary-bar / servings+time validation, and
  **Cypress keyboard drag-reorder** specs (the only reliable automated DnD path — mouse-drag stays manual;
  gesture pre-verified in a real browser). Verified end-to-end via a live authed smoke test (create→publish,
  all inputs incl. validation edge cases + an XSS-escape check) with full cleanup of the test account/recipes.
  **Filed one follow-up → Backlog (UX/visual polish):** add-recipe group-label rendering needs a refinement —
  a candidate for the Phase-4 QA pass or the create-recipe refactor. Board 3d `[ ]`→`[P]`; backlog
  add-recipe items + create-recipe-tests flipped.
- _2026-06-22_ — **2e Account/profile polish → PR open (#165).** Branch
  `worktree-feat+account-sections-public-profile`. Account tabs redesigned: "Your Recipes" dashboard tiles
  (views/saves/made + compact counts), "Ratings" compact avatar rows (clamped review text), "Drafts"
  vertical cards, and grid/spacing alignment across tabs. Public profile (`/u/:username`) reworked: centered
  identity, divided Recipes/Saves/Made counts, achievement chips, image-first square tiles with
  rating · time · cost + a bookmark save-count, richer `EmptyState`, share button. Added a working **"Load
  more"** — new paginated `GET /getPublicProfileRecipes` (the profile endpoint was capped at 12 with no
  pagination) — and moved Saves/Made onto a **server-side aggregate** over all visible recipes (was a
  misleading sum of the shown batch). Also **fixed** the pre-existing nested-`<button>` a11y nit on the
  Ratings list (row is now a keyboard-operable `<div role="button">`). A **high-effort `/code-review`** ran;
  fixes applied: idempotent page-map accumulation (no duplicate-append on refetch), negative-page clamp +
  `_id` sort tiebreaker, restored image fallbacks, shared `formatCompactCount`/`formatPrice` utils, deleted
  dead `selectCustomStyles.ts`. Throwaway `/preview` seeder removed; merged `development` (adopted the shared
  `s.outline()` focus ring on the recipe card). **Verified:** prod build green; Vitest 452 pass/2 skip; Jest
  644 pass; **full Cypress e2e suite green** (16 pass/1 pending); **live load-more click-through 12→15**
  (button clears, no dupes) against a seeded >12-recipe user. **Cypress was never machine-blocked** — a
  worktree config mismatch: the test-mode app addressed `:4003` (worktree `.env`) while the intercepts
  target `:4000`; pinned `VITE_API_URL=:4000` in `.env.test` (no-op in CI). **Still open:** the "Account nav
  sections UI" (SegmentedNav rail styling) sub-item; two low-severity review items (paged endpoint re-counts
  every page; username→uid lookup duplicated across the two endpoints).

---

## Appendix — Wave 1 kickoff prompts

Paste-ready briefs for `/worktree-create`. Each is self-contained for a **cold** session (no prior
context). These four have **zero file overlap** — run them simultaneously. Regenerate later waves on
demand once the board moves.

### Track 0a · Repo & secrets hygiene

```
/worktree-create repo and secrets hygiene for release

Read docs/RELEASE_GAMEPLAN.md (track 0a) and docs/RELEASE_PLAN.md (Section B + README item) for context. This is a release-hygiene cleanup — isolated, non-design files only.

Do:
1. Remove the two dead client env vars from .env.example: VITE_OPEN_AI_API_KEY and VITE_INGREDIENT_PARSER_URL. Confirm zero callers first (`grep -rn` in src/). Remove their CLAUDE.md notes too if they describe them as "remove before production".
2. README.md: replace the placeholder `your-username` clone URL (line ~24) with the real repo (jclind/prepify) and give the setup steps a quick once-over.
3. Run `npm audit` at root and in server/. Apply ONLY safe, non-breaking fixes for the high-severity advisories (patch/minor bumps that don't change major versions). Do NOT run `npm audit fix --force` or bump any major. For anything that needs a major bump or is otherwise risky, leave it and write a short note in the PR description instead.

Guardrails: don't touch any source under src/ beyond grep verification; don't touch the beta tag; keep `npm test` (frontend) and `cd server && npm test` green; `npm run build` must pass. Use a conventional-commit message. When green, open a PR into development and report the audit residual.
```

### Track 1a · Ratings/reviews bug

```
/worktree-create fix delete-review leaves star rating

Read docs/RELEASE_GAMEPLAN.md (track 1a) and docs/BACKLOG.md ("Bugs"). Two related ratings bugs in the reviews subsystem.

Bug 1 (verified): deleting a review leaves the star rating behind. `server/routes/reviews.js` DELETE /deleteReview only blanks reviewText/reviewLastUpdated and leaves the `rating` field intact, and there's no way to remove just a star rating. Add the ability to remove a rating: a "remove rating" path on the API, and have review deletion offer to clear the rating too (decide the cleanest UX — likely: deleting a review keeps the rating, but expose a separate "remove rating" control). After removing a rating, the recipe aggregate must be recomputed (see util/recipeRating `recomputeRecipeRating`) and the ratings doc cleaned up consistently (don't leave an orphan doc with neither text nor rating — delete it).

Bug 2 (investigate): the rating average was observed to DROP after adding a 5-star. Trace recomputeRecipeRating + the addRating upsert (reviews.js POST /addRating) and confirm the aggregate math; fix if reproducible. If you can't reproduce, document what you checked.

Guardrails: stay within the reviews/ratings subsystem (server/routes/reviews.js, util/recipeRating, src/pages/SingleRecipe/DataSections/RatingsAndReviews/*, relevant api/recipes.ts methods). Do NOT redesign the review UI (that's a separate track) — minimal UI for the new control is fine. Add/extend tests (server Jest + frontend Vitest). Keep all tests green, tsc clean, build passing. Open a PR into development when green.
```

### Track 1d · Serving-price bug

```
/worktree-create fix recipe serving price calculation

Read docs/RELEASE_GAMEPLAN.md (track 1d) and docs/BACKLOG.md ("Bugs": serving price looks wrong). The recipe serving/serving-price appears miscalculated.

Do: audit src/util/calculateServingPrice.ts against real recipe data — trace how per-ingredient cost, quantity/unit conversion, and servings combine into the displayed price. Find and fix the discrepancy. Add Vitest unit tests covering the cases you find (especially unit conversions and edge quantities) so it can't regress.

Guardrails: scope to src/util/calculateServingPrice.ts and its direct callers/tests. Don't restyle the single-recipe page (price *prominence* is a separate polish track). Keep frontend tests green, tsc clean, build passing. Open a PR into development when green, and in the PR description show a before/after for a concrete recipe so the fix is reviewable.
```

### Track 2a · Homepage features (redesign already shipped)

The visual redesign shipped earlier (`e1539c3`): Home is `HomeHero → Trending → Browse by meal → View
all`. Remaining 2a work is **feature**, not design, sourced from `docs/FEATURE_IDEAS.md`:

1. **Personalized "For You" row** *(in progress, `feat/homepage-redesign`)* — a content-based row inferred
   from the user's saves/makes/ratings. Server: `GET /api/getForYouRecipes` (`verifyToken`) + pure scoring
   helper `server/util/forYou.js`. Client: `HomeForYou` (gated on auth, hides until personalized) reusing the
   extracted `HomeRecipeCard`. Decisions: hide-until-personalized, fresh each visit (shuffle top tier),
   balanced cuisine/meal/diet scoring with community quality as tie-breaker.
2. **"What should I cook?" button** *(next)* — one `HomeHero` button that picks a random on-taste recipe.

Guardrails for these: stay within `src/pages/Home/*` + `src/api/recipes.ts` + `server/routes/recipes.js` +
`server/util/forYou.js`. Don't touch the beta tag. Keep tests green, tsc clean, build passing. PR into
development when green.

---

## Appendix — Wave 2 kickoff prompts

Paste-ready briefs for `/worktree-create`. Each is self-contained for a **cold** session (no prior
context). These four have **zero file overlap** — run them simultaneously.

### Track 1b · Save-recipe bug

```
/worktree-create fix broken save-recipe functionality

Read docs/RELEASE_GAMEPLAN.md (track 1b) and docs/BACKLOG.md ("Bugs": save-recipe broken). Saving a recipe is reported broken — first REPRODUCE, then fix.

The save flow (current wiring, verify before changing):
- Client hook: src/hooks/useSaveRecipe.ts — optimistic toggle over a React Query cache keyed ['savedRecipeIds', uid].
- Client API: src/api/recipes.ts — RecipeAPI.saveRecipe() (POST /api/recipes/:id/save), unsaveRecipe() (DELETE /api/recipes/:id/save), getSavedRecipeIds() (GET /api/getSavedRecipeIds).
- UI: src/Components/AddToCollection/SaveControl.tsx (the save button + collections control; 'button' variant on the single-recipe action row, 'icon' variant on cards).
- Server: server/routes/recipes.js — POST /recipes/:id/save and DELETE /recipes/:id/save, both writing the userRecipeData.savedRecipes array ({ recipeId, dateSaved }).

Do: reproduce the breakage (run the app, sign in, try to save/unsave from both a recipe card and the single-recipe page), find the root cause across the hook → API → server chain (watch for: cache key/ shape mismatch, optimistic-update rollback, auth/token, the request path or method, and the saved-array read/write), and fix it. Add/extend tests — server Jest for the save/unsave routes, Vitest for useSaveRecipe (optimistic update + rollback on failure).

Guardrails: scope to the save subsystem listed above. Keep your client change on the SaveControl / hook / api side — do NOT restyle the single-recipe page (single-recipe polish is a separate concurrent track 2c; stay out of SingleRecipe layout). Don't touch the beta tag. Keep frontend + server tests green, tsc clean, build passing. Open a PR into development when green, and in the PR description note exactly how the bug reproduced and what fixed it.
```

### Track 1c · Account-data bug (rated-recipe images + empty-flash)

```
/worktree-create fix account ratings images and your-recipes empty flash

Read docs/RELEASE_GAMEPLAN.md (track 1c) and docs/BACKLOG.md ("Bugs"). Two account-page data issues — REPRODUCE each before fixing; one may already be handled.

Bug A (verified): the account "Ratings" list shows rated recipes but the recipe images aren't loading. Render site is src/pages/Account/UserRatings/UserRatings.tsx (image comes from review?.recipeImage). Data comes from RecipeAPI.getSingleUserReviews() (src/api/recipes.ts) → server reviews route. Trace whether recipeImage is missing/empty in the API response (server side) or just mis-rendered (client side), and fix at the right layer. If the field isn't populated server-side, join/populate it from the recipe doc.

Bug B (verify repro first — may already be fixed): "Your Recipes" reportedly flashes a "no recipes" empty state before the user's recipes load. The component is src/pages/Account/UserRecipes/UserRecipes.tsx, which already uses a useDelayedLoading guard — so confirm whether the flash still reproduces. If it does, gate the empty state strictly on load-completion. If it does NOT reproduce, don't force a change: document in the PR that it's already handled and flip the backlog item with that note.

Do: fix Bug A; verify+fix-or-document Bug B. Add coverage where it makes sense (Vitest for the rendering/loading logic; server test if you change the reviews payload).

Guardrails: scope to src/pages/Account/* and the specific reviews API/route feeding the ratings list. Do NOT restyle account navigation or sections — account/profile visual polish is a separate later track (2e). Don't touch the beta tag. Keep tests green, tsc clean, build passing. Open a PR into development when green; in the PR description state how each bug reproduced (or that B didn't).
```

### Track 2b · Public Help/Contact page (blocker)

```
/worktree-create make help contact page publicly reachable

Read docs/RELEASE_GAMEPLAN.md (track 2b) and docs/RELEASE_PLAN.md (Help/Contact is a launch blocker). The Help page exists (src/pages/Help/Help.tsx, a contact form) but isn't properly reachable by logged-out users.

Current state (verify, then close the gaps):
- Route: src/App.tsx (~L199-206) already registers /help as a PUBLIC route (NOT inside PrivateRoute) — so the route is likely fine; confirm a signed-out user can load /help directly.
- Footer link: src/Components/Footer/footerData.ts (~L32) has { label: 'Help', to: '/help', auth: 'in' } — auth:'in' means it ONLY shows to signed-in users. That's the core bug: a logged-out user has no link to Help. Make it publicly visible.
- Nav: there's no direct navbar link to Help. Decide whether a public entry point belongs in the nav too (footer may be enough — keep it tasteful).

Do: ensure a logged-out visitor can both reach /help directly AND find a link to it (footer at minimum). Refresh the Help page layout/copy so it's presentable for a public audience (it's a 1.0 blocker page). If App.tsx already has it public, you likely won't need to touch App.tsx at all.

Guardrails: you MAY touch the Navbar to add a public link — note that track 2d will also touch the Navbar later, so keep your Navbar change minimal and self-contained. Scope: src/pages/Help/*, src/Components/Footer/*, Navbar link, and App.tsx only if the route genuinely isn't public. Don't touch the beta tag. Keep tests green, tsc clean, build passing. Open a PR into development when green; in the PR, confirm with a signed-out check that Help is reachable + linked.
```

### Track 2c · Single-recipe polish

```
/worktree-create polish the single recipe page

Read docs/RELEASE_GAMEPLAN.md (track 2c) and docs/BACKLOG.md ("UX / visual polish" — the single-recipe items). Visual/UX polish on the single-recipe page. NOTE: track 1a (ratings) already merged, so the "Remove rating" control already exists — build on it, don't rebuild it.

Polish items (all on src/pages/SingleRecipe/*):
1. Serving-price prominence — the price line (SingleRecipe.tsx ~L361-369: "$X total / $X per serving") isn't prominent enough; surface it more clearly.
2. Stats row (SingleRecipe.tsx ~L262-288, the .action-bar > .meta row of time / servings / rating) — consider dropping the rating from this row (it already shows right below) and centering the remaining three... wait, three stats minus rating = time + servings; re-evaluate and lay it out cleanly/centered.
3. "You created this recipe" mobile styling — RecipeControls.tsx (~L105-110, the .who span shown to the owner) is slightly off on mobile; fix it.
4. RecipeNotFound visual — src/pages/SingleRecipe/RecipeNotFound/RecipeNotFound.tsx looks bad; improve it (it already links to /help).
5. "Your Review" UI + rating-dropdown position — the DataSections/RatingsAndReviews/* area: the "Your Review" UI is weak, and the rating dropdown shown after you give a rating (Ratings/Ratings.tsx) isn't positioned where it should be. Improve both.

Do: tighten these without changing data/behavior. Keep it visual — no API or route changes.

Guardrails: scope STRICTLY to src/pages/SingleRecipe/* (incl. DataSections/RatingsAndReviews/* and its scss). Do NOT change the save control / SaveControl (track 1b is concurrently in that area) and do NOT change ratings server logic or the remove-rating behavior from 1a — styling/placement only. Don't touch the beta tag. Keep tests green, tsc clean, build passing. Open a PR into development when green; screenshot before/after (desktop + mobile widths) in the PR.
```

---

## Appendix — Wave 3 kickoff prompts

Paste-ready briefs for `/worktree-create`. Each is self-contained for a **cold** session (no prior
context). See "Suggested third wave" above for the batching rationale.

### Part 1 — run these four now (zero file overlap)

These four have **zero file overlap** — run them simultaneously. 2e owns PublicProfile and 3a owns the
Navbar for this part; Part 2 (2d, 3c) rebases on top of them after they merge.

#### Track 2e · Account/profile polish

```
/worktree-create polish account sections + public profile

Read docs/RELEASE_GAMEPLAN.md (track 2e — now unblocked since 1c merged) and docs/BACKLOG.md ("UX / visual polish": account nav sections UI + /u/:username public profile polish). Visual polish only — no data/behavior/route changes.

Two areas:
1. Account section navigation — the IN-PAGE Saved / Ratings / Your Recipes / Drafts nav on the Account page. Component: src/pages/Account/components/SegmentedNav.tsx (+ src/pages/Account/Account.scss). Improve its styling/affordance. NOTE: this is the in-page account nav, NOT the Navbar account dropdown (that's track 3a — stay OUT of src/Components/Navbar/*).
2. Public profile /u/:username — src/pages/PublicProfile/PublicProfile.tsx (+ .scss), route App.tsx:104. Minor visual polish so it's presentable for a public audience.

Build on the 1c fixes already in Account/* — do NOT revert the empty-state gates or the ratings-thumbnail rendering in UserRatings/UserRecipes.

Guardrails: scope STRICTLY to src/pages/Account/* and src/pages/PublicProfile/*. Do NOT touch src/Components/Navbar/* (3a), SingleRecipe, or any server route. A later track 3c will add a "report this user" control to PublicProfile — keep your changes structural/visual so that lands cleanly on top. Don't touch the beta tag. Keep tests green, tsc clean, build passing. Open a PR into development when green; screenshot before/after (desktop + mobile) for both areas.
```

#### Track 3a · a11y (focus-visible + navbar chevron)

```
/worktree-create a11y focus-visible + navbar chevron

Read docs/RELEASE_GAMEPLAN.md (track 3a) and docs/BACKLOG.md ("Accessibility"). Two focus-outline issues.

1. Focus outline on mouse clicks — interactive elements show the keyboard focus ring even on mouse/touch click. Switch to :focus-visible so the outline shows for KEYBOARD nav only. Mostly a global-styles change (src/index.scss) plus any component that hardcodes a :focus outline. Do NOT remove focus indication for keyboard users (that's an a11y regression) — only suppress it for pointer interactions.
2. Desktop navbar account chevron animation shifts the focus outline — the account-menu chevron animation (src/Components/Navbar/desktop/DesktopAccountMenu.tsx) moves the focus outline as it animates; decouple them (animate an inner element, or keep the transform off the outlined box).

Guardrails: this worktree OWNS src/Components/Navbar/* for this wave — track 2d will rebase its navbar change after you merge, so keep your navbar edit minimal and focused on the chevron/focus issue. Scope: src/index.scss (global focus styles) + src/Components/Navbar/*. Don't touch the beta tag or App.tsx. Keep tests green, tsc clean, build passing. Open a PR into development when green; in the PR, note how you verified keyboard focus still shows but a mouse click doesn't.
```

#### Track 3d · Add-recipe UX

```
/worktree-create add-recipe page UX fixes

Read docs/RELEASE_GAMEPLAN.md (track 3d) and docs/BACKLOG.md ("UX / visual polish" + "Tech debt" add-recipe items). Three add-recipe UX issues, all under src/pages/AddRecipe/*.

1. Optimistic ingredient add — adding an ingredient currently waits for the parse/nutrition request before showing it. Show it in the list IMMEDIATELY (optimistic), reconcile when the response returns, and handle failure (remove it or mark it errored). Entry points: src/pages/AddRecipe/Ingredients/IngredientsInput.tsx + IngredientsContainer.
2. Ingredient parser "not found" — on a parser miss the request can hang; add a timeout / exit path so the UI doesn't get stuck (toast or inline error, then let the user proceed/retry).
3. Sticky bottom bar overlaps the footer — AddRecipeSummaryBar is position:fixed; bottom:0 (AddRecipeSummaryBar.scss) and hides the footer at the bottom of the page. Fix so the footer is reachable (bottom spacer/padding on the form, or release the bar at page end).

Guardrails: scope STRICTLY to src/pages/AddRecipe/*. Don't touch the beta tag, Navbar, or App.tsx. Add/extend Vitest where the optimistic/timeout logic is testable. Keep tests green, tsc clean, build passing. Open a PR into development when green; screenshot the sticky-bar/footer fix (desktop + mobile).
```

#### Track 3e · create-username revamp

> **⚠️ SUPERSEDED — do not run.** This work already shipped before the board existed: the soft-glass
> redesign in **PR #131** and the logout/escape hatch + page guard in **PR #98** (both merged to
> `development`). The board (track 3e) and `BACKLOG.md` are reconciled to `[x]`. Prompt kept for history.

```
/worktree-create revamp create-username page + escape hatch

Read docs/RELEASE_GAMEPLAN.md (track 3e) and docs/BACKLOG.md ("UX / visual polish": create-username page revamp). Page: src/pages/CreateUsername/CreateUsername.tsx (+ .scss); route /create-username is already registered (App.tsx:222 — do NOT add a route).

Do:
1. Revamp the page visually to match the auth-page vocabulary (it's shown right after signup, before a username exists).
2. CRITICAL: add a logout / escape hatch so a user can't get permanently stuck here (today there's no way out if they don't want to pick a username yet). A "Log out" control is the minimum — wire it to the existing auth signout.
3. Keep the username creation flow working as-is. Do NOT change the username validation rules here — character-set tightening is a separate track (3c).

Guardrails: scope to src/pages/CreateUsername/* + the auth signout hook you reuse for logout. Don't touch the beta tag or App.tsx routes. Keep tests green, tsc clean, build passing. Open a PR into development when green; confirm the escape hatch (a signed-in user without a username can log out).
```

### Part 2 — hold until Part 1 merges (regenerate full prompts then)

Don't start these until their Part-1 chokepoint owner is merged; then rebase and generate cold-session
prompts the same way (the board will have moved).

- **2d** Recipes browse polish — `src/pages/Recipes/*`, `SearchRecipesInput`, **Navbar**. Better no-results
  indicator, autocomplete redesign + autocorrect, drop search from the top-most navbar on /recipes.
  **Holds behind 3a** (shared Navbar).
- **3c** Username validation + report-user — `server/routes/*`, `ReportControl`, `types.ts`
  (`ReportTargetType` only `'recipe' | 'review'`, `types.ts:188`), admin queue (`src/pages/Admin/Reports/`),
  **plus the two 2c deferrals**: show report controls to logged-out users w/ a login prompt, and surface the
  recipe rating up top near the title (`src/pages/SingleRecipe/*`). Also the "double-check report-recipe
  styling" nit. **Holds behind 2e** (shared PublicProfile — adds the report-a-user control there).

### Finishing pass (late)

- **3b** Meta/SEO finish — `index.html` + per-page Helmet (favicon, OG image for link previews, per-page
  `<title>`s). Collides with any page being edited; run **after** 2d/3c stabilize, folded into the Phase-4
  QA sweep. (2c deferred its per-page OG tags here.)
