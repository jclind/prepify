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
| 1a | Ratings/reviews bug | `[P]` | `worktree-feat+delete-review-star-rating-fix` / #150 |
| 1b | Save-recipe broken | `[ ]` | — |
| 1c | Account data (images, empty-flash) | `[ ]` | — |
| 1d | Serving-price bug | `[ ]` | — |
| 2a | Homepage redesign (design shipped; For You row in progress) | `[~]` | feat/homepage-redesign |
| 2b | Public Help/Contact page | `[ ]` | — |
| 2c | Single-recipe polish | `[ ]` | — |
| 2d | Recipes browse polish | `[ ]` | — |
| 2e | Account/profile polish | `[ ]` | — |
| 3a | a11y (focus-visible, chevron) | `[ ]` | — |
| 3b | Meta/SEO finish (favicon/OG/titles) | `[ ]` | — |
| 3c | Username validation + report-user | `[ ]` | — |
| 3d | Add-recipe UX | `[ ]` | — |
| 3e | create-username revamp | `[ ]` | — |
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
| **2a** Homepage redesign *(design shipped; feature work in progress)* | redesign live (`HomeHero → Trending → Browse by meal`). Remaining = features: **For You** personalized row (in progress), **"What should I cook?"** button (next) | `src/pages/Home/*`, `server/routes/recipes.js`, `server/util/forYou.js` |
| **2b** Public Help/Contact *(blocker)* | move route out of `PrivateRoute`, add a public link (footer/nav), refresh layout | `src/pages/Help/*`, **`App.tsx`**, Navbar link |
| **2c** Single-recipe polish | serving-price prominence, "You created this" mobile styling, stats row styling, `RecipeNotFound` visual, "Your Review" UI + rating-dropdown position | `src/pages/SingleRecipe/*` |
| **2d** Recipes browse polish | better no-results indicator, autocomplete redesign + autocorrect, drop search from the top-most navbar on /recipes | `src/pages/Recipes/*`, `SearchRecipesInput`, Navbar |
| **2e** Account/profile polish | account nav-sections UI, `/u/:username` visual polish | `src/pages/Account/*`, `PublicProfile/*` |

⚠️ **2b and 2d both touch Navbar/App.tsx** — run in different waves or merge 2b first.
⚠️ Don't run **2c concurrently with 1a** (same reviews surface).

## Phase 3 — Polish, a11y, meta, features (small parallel worktrees)

| Track | Work | Domain |
|---|---|---|
| **3a** a11y | `:focus-visible` only (no outline on mouse click); fix chevron animation shifting the focus outline | `src/Components/Navbar/*`, global styles |
| **3b** Meta/SEO finish | favicon, OG image for link previews, per-page `<title>`s | `index.html`, per-page Helmet |
| **3c** Features | username char-validation; report-a-user from profile *(admin; `ReportTargetType` currently only recipe/review)* | `server/routes/*`, `ReportControl`, `types.ts` |
| **3d** Add-recipe UX | optimistic ingredient add; ingredient-parser not-found timeout/exit; bottom bar overlapping footer | `src/pages/AddRecipe/*` |
| **3e** create-username | revamp the page + add a logout/escape hatch so users can't get stuck | `src/pages/CreateUsername/*` |

## Phase 4 — Loners & final passes (mostly serialized)

- **Sass `@import`→`@use` migration** — **alone**, after design merges; everyone rebases after. *(Rule 1)*
- **About page rewrite** — Jesse personally; isolated file, can happen in the background anytime.
- **Empty / error / loading-state sweep** + **broken-link click-through** + **copy/typo review** — needs
  a stable app, so do near the end.
- **Mobile hand-pass** (Add Recipe + Account/Settings flows) and **Lighthouse / perf**.
- **Code & architecture standard for Claude** (new conventions doc) + **post-refactor DB-migration check**.
- **Toast/alert tests**, **create-recipe Cypress+Vitest**, **Cypress autocomplete test** — fold into the
  relevant domain track when that track is touched, or batch here.

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
