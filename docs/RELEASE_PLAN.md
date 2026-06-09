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
- `[ ]` **Broken-link & dead-route check** — click every nav item, footer link, and CTA; confirm no
  404s or dead `href="#"`. Check the "View All Release Notes" link in `ReleaseNotes.tsx:145`
  (`github.com/jclind/prepify/releases`) actually resolves. **(blocker)**
- `[ ]` **404 / not-found page** — confirm an unknown route renders a real 404, not a blank screen.
  **(blocker)**
- `[ ]` **Mobile pass** — walk the core flows (browse, view recipe, add recipe, auth) at phone width.
  **(blocker)**
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
- `[ ]` **Server input validation on write routes** — review `server/routes/*` (recipes, reviews,
  users) for validation of request bodies before they hit MongoDB. **(blocker)**
- `[ ]` **Rate limiting on the API** — public write endpoints (reviews, recipe creation) should have
  basic rate limiting to prevent abuse. **(nice-to-have)**
- `[ ]` **Tight CORS allowlist** — confirm `FRONTEND_URLS` on the server lists only the real
  production origin(s), not `*` or stale localhost. **(blocker)**
- `[ ]` **Dependency audit** — run `npm audit` for both root and `server/`, and the `dep-audit` skill
  for an upgrade triage. Resolve high/critical advisories. **(blocker for high/critical)**

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

_`/release-readiness` appends dated run summaries here._
