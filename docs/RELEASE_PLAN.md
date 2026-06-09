# Prepify — Beta → 1.0 Release Plan

Prepify has carried a **beta** label since early on. This doc is the single checklist for getting
to a real **1.0** release. It's meant to be a living document — run `/release-readiness` in Claude
Code anytime to re-audit the codebase and have the status markers below updated automatically.

## What "1.0" means for Prepify

The beta tag comes off when: the app has no obvious rough edges for a first-time visitor, no secret
or security footguns are shipping, and the legal/SEO basics a public site needs are in place. It does
**not** mean "feature complete" — 1.0 is about being trustworthy and presentable, not finished.

## Status legend

- `[ ]` — todo (not started)
- `[~]` — in progress / partial gap
- `[x]` — done
- `[?]` — needs a decision from you before it can be done

Each item has a **(blocker)** or **(nice-to-have)** tag so you can triage. Blockers must be resolved
before flipping the beta tag; nice-to-haves can ship in a 1.0.x.

---

## 🚧 Release blockers — the "drop beta" change

The beta label is **hardcoded in three places**, so removing it is a small coordinated refactor, not
a feature flag. Do these together:

- `[ ]` **Remove `-beta` from the footer** — `src/Components/Footer/Footer.tsx:16`
  renders `version {version}-beta`. Drop the `-beta` suffix. **(blocker)**
- `[?]` **Decide what happens to the "Beta" button** — `src/Components/Navbar/PrepifyLogo.tsx:17-18`
  is a `<button className='beta-tag'>Beta</button>` that opens the release-notes modal. Options:
  (a) remove it entirely, (b) repurpose it as a plain version chip / "Release notes" link. Pick one.
  **(blocker — needs decision)**
- `[ ]` **Set `isBeta = false`** — `src/Components/ReleaseNotes/ReleaseNotes.tsx:35`; this drives the
  `-beta` suffix at line 87. **(blocker)**
- `[~]` **Fix the stale release-notes mechanism** — `ReleaseNotes.tsx` has a hardcoded
  `RELEASE_DATE = '3/31/2023'` (line 34) and hardcoded `description` / `additions` arrays
  (lines 36-57). For a real release you need either (a) a real changelog flow (e.g. drive it from a
  `CHANGELOG.md` or GitHub Releases), or (b) at minimum, update the content to reflect the 1.0
  release before launch. **(blocker)**

> Tip: `grep -rn -iE "beta|isBeta" src` should return **zero** results before you ship (the SCSS
> class `beta-tag` can stay or be renamed depending on the button decision above).

---

## Section A — Product / UX polish

- `[ ]` **Beta tag fully removed** — see blockers above. **(blocker)**
- `[ ]` **Release notes refreshed** — see blockers above. **(blocker)**
- `[ ]` **Empty / error / loading states sweep** — every page that fetches data (Recipes, SingleRecipe,
  Account, Home) should have a sensible empty state, an error state, and a loading skeleton. Spot-check
  by loading with the API down. **(nice-to-have, but high-impact)**
- `[~]` **Broken-link & dead-route check** — click every nav item, footer link, and CTA; confirm no
  404s or dead `href="#"`. **Audit found:** the 404 page's "contact our support team" link points to
  `/` (home), not a support page — `src/pages/404/404.tsx:22` (`<Link to='/'>`). Repoint it to `/help`
  (note `/help` is itself login-gated — see Section D). Still to verify: the "View All Release Notes"
  link in `ReleaseNotes.tsx:145` (`github.com/jclind/prepify/releases`). **(blocker)**
- `[x]` **404 / not-found page** — a real designed 404 exists (`src/pages/404/404.tsx` — food-plate
  graphic, Return Home button) and renders correctly on an unknown route. *Copy nit:* the heading
  reads "Something went wrong!", which sounds like a crash rather than a missing page — consider
  "Page not found." **(blocker → done; copy tweak is nice-to-have)**
- `[~]` **Mobile pass** — runtime audit at 390px confirmed Home, Recipes browse, Single Recipe (incl.
  the Nutrition card) and the hamburger menu all render cleanly with **zero console errors**. Still to
  eyeball by hand: Add Recipe and Account/Settings flows. **(blocker)**
- `[ ]` **Copy / typo review** — read every user-facing string once with fresh eyes. **(nice-to-have)**
- `[ ]` **Favicon, page titles, social/OG meta** — verify `index.html` + per-page titles
  (`react-helmet-async` is already a dependency) and an OG image for link previews. **(nice-to-have)**
- `[ ]` **Remove dev-only UI from production** — `@tanstack/react-query-devtools` is a devDependency;
  confirm the devtools panel is not rendered in the production build. **(blocker)**

---

## Section B — Security & secrets

> ⚠️ Reminder: **every `VITE_*` variable is compiled into the client bundle** and is publicly
> visible. Treat them as published, never as secret.

- `[ ]` **Audit every `VITE_*` var** — for each, confirm it's *safe to be public*. Firebase web config
  and Edamam app id/key are designed to be client-side (acceptable, but lock them down server-side —
  see below). **(blocker)**
- `[ ]` **Remove dead/dangerous client env vars** — `VITE_OPEN_AI_API_KEY` is defined in `.env` /
  `.env.example` but has **zero callers** (per CLAUDE.md). A live OpenAI key must never ship to the
  browser — remove it. `VITE_INGREDIENT_PARSER_URL` is also dead (parsing goes through the main
  server now). Remove both from `.env.example`. **(blocker)**
- `[ ]` **Rotate any key that ever sat in client code or git history** — if a real OpenAI/Edamam key
  was ever committed or bundled, rotate it. **(blocker if applicable)**
- `[ ]` **Lock down Edamam / Firebase usage server-side** — since the keys are public, restrict by
  HTTP referrer / allowed origins / usage quotas in the respective dashboards so a leaked key can't be
  abused. **(blocker)**
- `[ ]` **Firebase Auth + Storage rules review** — confirm Storage rules only let authenticated users
  write their own recipe images, and there are no permissive `allow read, write: if true` rules.
  **(blocker)**
- `[x]` **Server input validation & ownership on write routes** — re-verified 2026-06-09 against
  `server/routes/*`. The high-severity holes from `server-audit.md` are **closed**: `addRecipe` stamps
  `userId`/`_id` server-side and discards client values (`recipes.js:150-152`); `editRecipe` /
  `deleteRecipe` enforce `recipe.userId === req.uid` → 403 (`recipes.js:181,227`); ratings/reviews
  derive `username` from the verified token, not query params (`reviews.js:13,116`); `rating` is
  range-validated (`reviews.js:19-25`); search params are regex-escaped (`recipes.js:12`); save/unsave
  have dup-checks and a `$max[…,0]` floor; the previously-unprotected `addRecipeTag` route is gone.
  **(blocker → resolved)**
- `[ ]` **Rate limiting on the API** — public write endpoints (reviews, recipe creation) should have
  basic rate limiting to prevent abuse. **(nice-to-have)**
- `[~]` **Tight CORS allowlist** — mechanism is sound (`server/app.js`: allowlist built from
  `FRONTEND_URLS` + a `deploy-preview-*--prepify.netlify.app` regex + `credentials: true`, default
  `localhost:3000`). Just confirm the **production** `FRONTEND_URLS` value is the real origin(s) only.
  **(blocker)**
- `[ ]` **Dependency audit** — run `npm audit` for both root and `server/`, and the `dep-audit` skill
  for an upgrade triage. Resolve high/critical advisories. **(blocker for high/critical)**
- `[ ]` **Residual low-severity API issues** — surfaced by the audit, not release-blocking: (a)
  `getReviews` derives `isCurrentUser` from the `username` *query param* rather than the token
  (`reviews.js:165,183`) — cosmetic, since edit/delete are token-scoped; (b) `newReview` upserts with
  `$set` only, so a review doc created before any rating has no `rating` field (`reviews.js:75`); (c)
  `getSingleUserReviews` returns `recipeData: null` for deleted recipes with no signal
  (`reviews.js:216`). **(post-1.0)**

---

## Section C — Launch & legal

- `[ ]` **Privacy Policy page** — required once you collect accounts / personal data via Firebase Auth.
  **(blocker)**
- `[ ]` **Terms of Service page** — for user-generated content (recipes, reviews) you want ToS.
  **(blocker)**
- `[ ]` **Analytics / cookie disclosure** — if Firebase Analytics (`VITE_FIREBASE_MEASUREMENT_ID`) is
  active, disclose it; add a cookie/consent notice if targeting EU users. **(blocker if analytics on)**
- `[ ]` **SEO basics** — per-page `<title>`/meta via `react-helmet-async`, a `robots.txt`, and a
  `sitemap.xml` (even a static one). Confirm recipe pages are crawlable. **(nice-to-have, high-value)**
- `[ ]` **Production domain + HTTPS** — confirm the real domain is configured on Firebase Hosting and
  the API origin, with valid certs. **(blocker)**
- `[ ]` **Support / contact path** — a way for users to report issues (Formspree is already a
  dependency — wire a contact form, or list an email). **(nice-to-have)**
- `[ ]` **Error tracking decision** — decide whether to add basic error tracking (e.g. Sentry) before
  or after 1.0. Out of the current scope, but flag the call. **(needs decision)**
- `[ ]` **Performance / Lighthouse pass** — run Lighthouse on the prod build; address obvious image-size
  and bundle-size wins. **(nice-to-have)**
- `[ ]` **README cleanup** — the README still has placeholder `your-username` clone URLs and generic
  setup steps; tidy before the repo is public-facing. **(nice-to-have)**

---

## Section D — Larger UX / redesign work

Chunky design efforts that are bigger than a single checkbox. Tag each as **(blocker)** if it gates
1.0, **(post-1.0)** if it's backlog, or leave `[?]` until you've decided.

- `[ ]` **Footer Overhaul** — **(blocker)**
  - **Now:** `src/Components/Footer/Footer.tsx` renders a single centered column with just three
    things — a hardcoded `JesseLindCS@gmail.com`, a `© <year> || Made with React.js` line, and
    `version {version}-beta`. No nav links, no Privacy/Terms links, no social, no sitemap. Styling is
    a minimal flex column in `Footer.scss` (fixed `$footer-height`, centered). It's rendered globally
    via `src/Components/Layout/Layout.tsx:26`. It's effectively an untouched placeholder.
  - **Goal:** A proper redesign — replace the placeholder with a richer, multi-column footer
    featuring grouped navigation links and real site data (e.g. Browse/Recipes, Account, Legal
    [Privacy/Terms], contact, social), and a version chip that isn't "-beta".
  - **Touches:** `src/Components/Footer/Footer.tsx`, `src/Components/Footer/Footer.scss`
    (rendered from `Layout.tsx`).
  - **Folds in two release blockers** — this work naturally absorbs: (1) removing the `-beta` suffix
    (`Footer.tsx:16`, see blockers section), and (2) adding the Privacy/Terms links that Section C
    requires. If you do the overhaul before 1.0, do those here rather than twice.

- `[ ]` **Mobile Nav Bar redesign** — **(blocker)**
  - **Now:** `src/Components/Navbar/Navbar.tsx` toggles a `hamburger-react` button (`navOpen` state)
    that simply shows/hides the *same* desktop `nav-links` via a `.nav-content.show` CSS class — there's
    no purpose-built mobile menu, just the desktop links reflowed. `Navbar.scss` is already ~8 KB.
    Logged-out users see recipes/login/signup; logged-in users get an account dropdown holding Help +
    logout.
  - **Audit (2026-06-09):** functional — the menu opens to a clean full-screen overlay
    (Recipes/Login/Signup) with no console errors. This is discretionary polish, **not** a bug fix.
  - **Goal:** _(fill in)_ — a dedicated mobile nav (e.g. full-screen / slide-in panel, larger tap
    targets, clearer hierarchy) rather than the reflowed desktop links.
  - **Touches:** `src/Components/Navbar/Navbar.tsx`, `src/Components/Navbar/Navbar.scss`, and
    `src/Components/Navbar/PrepifyLogo.tsx` (where the `Beta` button decision also lives).

- `[ ]` **Homepage redesign** — **(blocker)**
  - **Now:** `src/pages/Home/Home.tsx` is sparse — it renders only `<HomeHero />` and
    `<TrendingRecipes />`. No value-prop sections, feature highlights, or rich link/data blocks.
  - **Goal:** _(fill in)_ — a richer landing page with more sections, links, and website data
    (value prop, featured/seasonal content, etc.).
  - **Touches:** `src/pages/Home/Home.tsx`, `src/pages/Home/HomeHero/HomeHero.tsx` (+ `.scss`), and
    likely `src/Components/TrendingRecipes/`.

- `[ ]` **Help / Contact Support page** — **(blocker)**
  - **Now:** the page already exists — `src/pages/Help/Help.tsx` (routed `/help`) is a Formspree form
    (category / title / description). **But it's gated:** the route sits inside the `PrivateRoute`
    block (`src/App.tsx:130`), so it requires login, and it's only linked from the logged-in account
    dropdown (`src/Components/Navbar/Navbar.tsx:127`). A logged-out visitor can't reach support at all.
  - **Goal:** _(fill in)_ — redesign as a proper *public* contact/support page: make it reachable when
    logged out (move the route out of `PrivateRoute`, add a public link — e.g. from the new footer) and
    refresh the layout.
  - **Touches:** `src/pages/Help/Help.tsx` (+ `Help.scss`), the route in `src/App.tsx:130`, and the
    nav link in `src/Components/Navbar/Navbar.tsx:127`.

---

## Release-day cutover (light)

Infra/deploy is intentionally out of scope for this plan, but here's the minimal ordered checklist for
the actual flip. Deploy is currently manual (Firebase Hosting frontend + Railway backend; CI in
`.github/workflows/test.yml` runs tests but does not deploy).

1. `[ ]` All blockers above are `[x]`.
2. `[ ]` Bump `version` in `package.json` to `1.0.0`.
3. `[ ]` Flip the beta tag off (the three edits in the blockers section).
4. `[ ]` Update release-notes content for 1.0 and tag a GitHub Release.
5. `[ ]` Deploy frontend (`npm run build` → Firebase Hosting) and backend (Railway).
6. `[ ]` Smoke-test production: load home, view a recipe, sign in, create a recipe, leave a review.
7. `[ ]` Watch logs/analytics for the first hours.

---

## Audit log

### 2026-06-09 — full release audit (static + runtime)
Four-pass audit: reconciled the dated audit docs, read the server security surface, and drove the live
app (desktop + mobile) via the run-prepify skill.

- **Security — big win.** Nearly every high-severity finding in `server-audit.md` (May) is now
  **closed**: ownership checks on recipe edit/delete, token-derived usernames on ratings/reviews,
  regex escaping, save/unsave guards, and removal of the unprotected `addRecipeTag` route. Section B's
  "input validation & ownership" item flipped to `[x]`. Only three low-severity, non-blocking API
  nits remain (recorded as a post-1.0 item).
- **Runtime — clean.** Home, Recipes, Single Recipe, Login, Signup, Forgot-Password, and 404 all
  render with **zero console errors**, desktop and at 390px mobile (incl. the Nutrition card and the
  hamburger menu). No runtime breakage found.
- **New product findings:** (1) 404 page's "contact our support team" link points to `/` not `/help`
  (`404.tsx:22`); (2) 404 heading copy "Something went wrong!" reads as a crash, not a missing page.
- **Confirmed known blockers:** beta tag visible (logo badge + footer `version 2.6.3-beta`); `/help`
  redirects to `/login` when logged out (support unreachable — Section D item).
- **Not a bug (verified):** mobile single-recipe initially looked blank in a full-page screenshot but
  all sections render correctly on-screen — a capture artifact. Mobile nav works.
- **Data note (not code):** a recipe titled "Egg Friend Rice" looks like a typo in user content.
- Scope was release-blocking only; pure code-quality stays in `REFACTOR.md` / `PATTERN_AUDIT.md`.

_`/release-readiness` appends dated run summaries here._
