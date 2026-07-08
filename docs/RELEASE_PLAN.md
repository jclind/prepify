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

- `[ ]` **Remove `-beta` from the footer** — (moved: the `-beta` suffix now lives in
  `src/Components/Footer/shared/LegalBar.tsx:16`, `v{version}-beta`, after the footer redesign — not
  `Footer.tsx`). Drop the `-beta` suffix. **(blocker)**
- `[ ]` **"Beta" button** — `src/Components/Navbar/PrepifyLogo.tsx:17-18` is a
  `<button className='beta-tag'>Beta</button>` that opens the release-notes modal. **Decision
  (2026-06-17):** remove it (option a), but **intentionally last** — flipping the whole beta tag off is
  Jesse's deliberate final/celebration step at cutover, not done piecemeal earlier. All three beta edits
  (footer suffix, this button, `isBeta`) ship together at the very end. **(blocker — scheduled for cutover)**
- `[ ]` **Set `isBeta = false`** — `src/Components/ReleaseNotes/ReleaseNotes.tsx:35`; this drives the
  `-beta` suffix at line 87. **(blocker)**
- `[~]` **Fix the stale release-notes mechanism** — **content refreshed (2026-06-23).** Replaced the
  stale `RELEASE_DATE = '3/31/2023'` and the 2023 profile-editing `description` / `additions` with real
  1.0 notes (additions + improvements + bug fixes reflecting the release work). Still mechanically
  hardcoded (not yet driven from a `CHANGELOG.md` / GitHub Releases — that's the option-(a) post-1.0
  improvement). **Two values remain a deliberate cutover step** (flagged in a code comment): confirm
  `RELEASE_DATE` to the actual ship date, and the `v{version}` chip resolves to `1.0.0` once
  `package.json` is bumped — both happen with the beta-tag flip. **(blocker → content done; date/version
  finalized at cutover)**

> Tip: `grep -rn -iE "beta|isBeta" src` should return **zero** results before you ship (the SCSS
> class `beta-tag` can stay or be renamed depending on the button decision above).

---

## Section A — Product / UX polish

- `[ ]` **Beta tag fully removed** — see blockers above. **(blocker)**
- `[ ]` **Release notes refreshed** — see blockers above. **(blocker)**
- `[~]` **Empty / error / loading states sweep** — **loading states done (PR #213, 2026-06-30):** one
  codified pattern (`loadingStyles` tokens, `useDelayedLoading` flash-guard, self-mirroring skeletons,
  `docs/design/loading-states.md`) swept across the app; measured CLS Home 0.21→0.0002, SingleRecipe
  0.27→0.02; PublicProfile converted off its whole-view spinner. **Still open:** the empty-state and
  error-state halves — spot-check every fetching page (Recipes, SingleRecipe, Account, Home) with the
  API down. **(nice-to-have, but high-impact)**
- `[x]` **Broken-link & dead-route check** — **done (track 4-qa, PR #174 ✅):** crawled every nav/footer/
  in-page link across 24 internal routes — **0 dead routes, 404s, or `#` placeholders** — and confirmed
  logged-out vs logged-in link visibility is correct. The earlier **2026-06-09** fix (the 404's "contact
  our support team" link → `/help`, `src/pages/404/404.tsx`) holds, and the "View All Release Notes" link
  (`ReleaseNotes.tsx:145` → `github.com/jclind/prepify/releases`) resolves 200. **(blocker → done)**
- `[x]` **404 / not-found page** — a real designed 404 exists (`src/pages/404/404.tsx` — food-plate
  graphic, Return Home button) and renders correctly on an unknown route. The copy nit (heading read
  "Something went wrong!", which sounded like a crash) was **fixed → "Page not found"** in track 4-qa
  (PR #174). **(blocker → done)**
- `[x]` **Mobile pass** — **done (track 4-qa, PR #174 ✅):** the earlier 390px audit (Home, Recipes browse,
  Single Recipe, hamburger — zero console errors) plus the remaining hand-walk of **Add Recipe + Account +
  all four Settings sections** logged-in at 390px — **no horizontal overflow, no console errors**, tap
  targets ok. No layout fixes needed. **(blocker → done)**
- `[x]` **Copy / typo review** — **done (track 4-qa, PR #174 ✅):** proofread headings, empty states,
  buttons, toasts, and the legal/help/about copy site-wide. Only fix needed: the avatar size-limit toast
  `5mb` → `5MB`. *(Two typos live in MongoDB recipe **data** — "Egg Friend Rice", a granola "Tt's" — not
  code; out of scope for a code change.)* **(nice-to-have)**
- `[~]` **Accessibility (WCAG 2.1 AA) sweep — structural + most contrast done; brand orange reverted to vivid
  (owner call)** *(PRs #179 structural, #181 grey, #184 brand+nav+beta; 2026-06-25)*. Structured axe-core +
  Lighthouse audit of **every** page, logged-out **and** logged-in (Account tabs / all 4 Settings sections /
  Add Recipe via the Cypress token bridge), plus keyboard + a11y-tree spot-checks. Structural wins (#179):
  hamburger accessible name, StarRating `nested-interactive`, ingredient `<li role=checkbox>` → inner
  `<div>`, Add-Recipe button-name + react-select labels, heading order, RecipeCard label-in-name, auth-page
  `<main>` landmarks, skip-to-content link, global `prefers-reduced-motion`; modals verified for focus-trap
  + Esc + restore. Contrast: muted-grey token (#181), brand **teal**, the **beta-tag** recolour, and the
  shared **`$error-red`** all shipped AA (#184); #184 briefly reached Lighthouse a11y **100 on all 22
  routes.** **Then the brand ORANGE was reverted to the vivid `#ff5722` at the owner's request** (the AA
  `#bf360c` read too "brown") — so the orange logo/CTAs/accents re-fail AA and **Lighthouse a11y is back to
  ~96–97 on the routes that use orange** (the rest stay 100). The token plumbing is intact, so restoring AA
  is a one-line flip pending a brand-colour decision (shade exploration filed in `BACKLOG.md → Accessibility`).
  *(SR checks were programmatic, headless — no live VoiceOver in CI.)* *(Wave-3 re-measure, 2026-07-02:
  Lighthouse a11y **holds at exactly the documented state** — 96–97 on the orange routes (home/recipes/
  recipe/about), **100** off-orange (login) — no a11y regression from the ~20 Wave-1/2 sweep merges. The
  three brand-orange tracks were formally moved off the sweep board to `[dropped]` (2026-07-01) — they
  belong to the owner's brand-orange/logo recolor; the post-recolor a11y re-run stays gated on that.)*
  **(structural done; brand-orange contrast parked on an owner brand decision)**
- `[x]` **Favicon, page titles, social/OG meta** — **verified done (Wave-3 re-sweep, 2026-07-02):**
  full favicon set wired in `index.html:19-21` (`favicon.ico` + 16/32 PNGs + `apple-touch-icon`, all
  present in `public/`); per-page titles via `react-helmet-async` (`HelmetProvider` in `App.tsx`, §C SEO
  basics); OG/Twitter meta + branded 1200×630 OG card shipped in track 3b (PR #170). The SPA
  social-crawler limitation is tracked as its own §C item. **(nice-to-have → done)**
- `[x]` **Remove dev-only UI from production** — `@tanstack/react-query-devtools` is a devDependency;
  confirmed gated behind `process.env.NODE_ENV !== 'production'` in `src/index.tsx:23-25`, so the panel
  is not rendered in the production build. **(blocker → done)**

---

## Section B — Security & secrets

> ⚠️ Reminder: **every `VITE_*` variable is compiled into the client bundle** and is publicly
> visible. Treat them as published, never as secret.

- `[x]` **Audit every `VITE_*` var** — **done (2026-06-25).** Audited every `VITE_*` in `.env.example`:
  all are either the Firebase web config (designed to be public, referrer-restricted — see below) or
  `VITE_API_URL`/`VITE_CYPRESS`/`VITE_SENTRY_DSN` (non-secret). The only genuinely sensitive pair, the
  Edamam app id/key, was **removed from the client entirely** by the server-proxy (PR #182) — no secret
  `VITE_*` ships in the bundle. **(blocker → done)**
- `[x]` **Remove dead/dangerous client env vars** *(done — PR #151, 2026-06-17)* — `VITE_OPEN_AI_API_KEY` is defined in `.env` /
  `.env.example` but has **zero callers** (per CLAUDE.md). A live OpenAI key must never ship to the
  browser — remove it. `VITE_INGREDIENT_PARSER_URL` is also dead (parsing goes through the main
  server now). Remove both from `.env.example`. **(blocker)**
- `[x]` **Rotate any key that ever sat in client code or git history** — **resolved by decision
  (2026-06-25).** The Edamam app id/key were bundle-public before PR #182. **Jesse's call: do NOT
  rotate them** — Prepify intends to migrate off Edamam entirely (see BACKLOG → Tech debt), so rotating
  a soon-to-be-retired key isn't worth it. The old `VITE_OPEN_AI_API_KEY` was never wired to a live
  call (removed in PR #151). Firebase web key is public-by-design + referrer-locked. **(blocker → waived)**
- `[x]` **Revoke the live OpenAI `sk-` key still on disk in the local `.env`** — **reopened by the Security
  sweep (2026-06-26).** PR #151 removed `VITE_OPEN_AI_API_KEY` from the committed `.env.example` (the two
  `[x]` items above), but the **actual gitignored `.env` still carries a live, full-access
  `VITE_OPEN_AI_API_KEY = sk-…`** (`.env:9`). It is **dead** (zero `src/` callers → Vite does not bundle it)
  and **never committed** (`git log -S` clean), so it is not an active leak — but unlike the waived Edamam
  keys, this is a current, full-access credential sitting in plaintext, so the "never wired → don't rotate"
  reasoning doesn't apply. **Rotate/revoke it and delete the line.** While there, drop the now-dead
  `SPOONACULAR_API_KEY` from `server/.env` (the v2 parser is key-free). Operator action on local files — no
  PR. See BACKLOG → Security. *(Re-checked 2026-07-02, Wave-3 re-sweep: both keys are **still on disk** —
  `VITE_OPEN_AI_API_KEY` in `.env`, `SPOONACULAR_API_KEY` in `server/.env`. Still open, still Jesse's
  operator action.)* *(**Resolved 2026-07-08 audit:** both keys are now **gone from disk** — `grep` finds
  no `VITE_OPEN_AI_API_KEY` in `.env` (which still holds the 6 real dev Firebase keys, so it's a populated
  file, not an empty one) and no `SPOONACULAR_API_KEY` in `server/.env`. The plaintext-on-disk exposure is
  cleared; provider-side key revocation is an operator step not verifiable from the repo.)* **(launch-gating
  hygiene → on-disk exposure cleared)**
- `[x]` **Lock down Edamam / Firebase usage server-side** — **done (2026-06-25).** Firebase **web API key
  is HTTP-referrer-restricted** — verified live that `prepifymeals.com`, `www.prepifymeals.com`, and
  `localhost:3000` are allowed while an empty referer is blocked (so prod + local dev work; a lifted key
  is useless off-domain). **Google Vision API key locked down** (API-restricted, done by Jesse).
  **Edamam: now server-proxied (PR #182, merged)** — `POST /api/nutrition/details` (server/routes/nutrition.js)
  holds the keys server-side; `VITE_EDAMAM_APP_ID/KEY` no longer ship in the client bundle, so referrer
  locking is moot. `EDAMAM_APP_ID`/`EDAMAM_APP_KEY` **set on Railway** (Jesse, 2026-06-25; re-confirmed set on
  the new **prod** Railway service after the dev/prod env-split, 2026-06-26). **(blocker → done)**
- `[x]` **Firebase Auth + Storage rules review** — **done + verified live (2026-06-24, PR #177).**
  `storage.rules` (wired via `firebase.json`) replaced the open bucket — public read, but writes require
  auth + a 5MB cap + `image/*`; `profilePhotos/{uid}` enforces ownership; `recipeImages/{filename}` is
  auth-gated (path isn't uid-keyed — backlog follow-up); all other paths denied. No `allow ... if true`.
  **Deployed** via `firebase deploy --only storage` (rules compiled + released to `firebase.storage`).
  **Smoke-tested against the live rules: 7/7 checks passed** — own-profile upload allowed, other-user
  profile denied, recipe image allowed, oversized/non-image/forbidden-path/unauthenticated all denied
  (test data cleaned up). Production domain confirmed in Firebase Auth → Authorized domains. Firestore is
  unused (data in MongoDB), so its rules are intentionally not configured. **(blocker → done)**
- `[x]` **Server input validation & ownership on write routes** — re-verified 2026-06-09 against
  `server/routes/*`. The high-severity holes from `server-audit.md` are **closed**: `addRecipe` stamps
  `userId`/`_id` server-side and discards client values (`recipes.js:150-152`); `editRecipe` /
  `deleteRecipe` enforce `recipe.userId === req.uid` → 403 (`recipes.js:181,227`); ratings/reviews
  derive `username` from the verified token, not query params (`reviews.js:13,116`); `rating` is
  range-validated (`reviews.js:19-25`); search params are regex-escaped (`recipes.js:12`); save/unsave
  have dup-checks and a `$max[…,0]` floor; the previously-unprotected `addRecipeTag` route is gone.
  **(blocker → resolved)**
- `[x]` **Rate limiting on the API** — implemented: `server/middleware/writeLimiter.js` (+ per-surface
  user limiters / `makeUserLimiter`) guards write endpoints, with `helmet()` applied in `server/app.js:55`.
  Covered by `server/__tests__/writeLimiter.test.js`. **(nice-to-have → done)**
- `[x]` **Tight CORS allowlist** — **done + verified live (2026-06-26).** Mechanism was already sound
  (`server/app.js`: allowlist built from `FRONTEND_URLS` + a `deploy-preview-*--prepify.netlify.app` regex +
  `credentials: true`, default `localhost:3000`). The dev/prod env-split set the **production** Railway
  service's `FRONTEND_URLS` to the real origins only (`https://prepifymeals.com,https://www.prepifymeals.com`)
  and verified live that those origins are allowed while `localhost` / an arbitrary origin are denied.
  **(blocker → done)**
- `[x]` **Dependency audit** — run `npm audit` for both root and `server/`, and the `dep-audit` skill
  for an upgrade triage. Resolve high/critical advisories. **All high advisories resolved via PR #151**
  (2026-06-17, non-breaking lockfile-only bumps: vite, launch-editor, @grpc/grpc-js, form-data,
  protobufjs, tmp) — high/critical blocker cleared. Residual moderates (re-audited 2026-06-25: root prod 0, server prod 8 moderate) require
  **major** bumps (firebase-admin 13→14, jest major) and are deferred to a dedicated upgrade pass.
  *(Re-audited 2026-07-02, Wave-3 re-sweep: **root prod 0, server prod 8 moderate — unchanged**; one new
  dev-only high — `undici` ≤7.27.2 via `jsdom`, test env only — fixed in-range lockfile-only in the
  Wave-3 PR, Vitest re-run green.)* *(**Re-audited 2026-07-08:** the residual server moderates are now
  **0** too — the **firebase-admin 13→14** major bump (PR #234 / S7) cleared the transitive chain in both
  trees; `npm audit --omit=dev` reports **0 vulnerabilities at root AND in `server/`**. A temporary `uuid`
  override in both `package.json`s is the last dep-hygiene TODO — remove it once `@google-cloud/storage`
  ships a patched-uuid release.)* **(blocker for high/critical — cleared; all prod advisories now 0)**
- `[ ]` **Residual low-severity API issues** — surfaced by the audit, not release-blocking: (a)
  `getReviews` derives `isCurrentUser` from the `username` *query param* rather than the token
  (`reviews.js:165,183`) — cosmetic, since edit/delete are token-scoped; (b) `newReview` upserts with
  `$set` only, so a review doc created before any rating has no `rating` field (`reviews.js:75`); (c)
  `getSingleUserReviews` returns `recipeData: null` for deleted recipes with no signal
  (`reviews.js:216`). **(post-1.0)**

---

## Section C — Launch & legal

- `[x]` **Rewrite the About page (personally)** — **done (Jesse, 2026-06-26).** The placeholder/AI-drafted
  copy was rewritten personally and signed off by the owner. Verified live at `/about` (2026-06-26): real,
  specific product voice — transparency pitch (price + nutrition from real ingredients), a Plan→Shop→Cook
  walkthrough, and the "Built for the way you cook" feature grid; renders with zero console errors.
  **Owner: Jesse (was do-not-delegate).** **(blocker → done)**
- `[x]` **Privacy Policy page** — real page exists (`src/pages/Privacy/Privacy.tsx`) and is routed at
  `/privacy` (`src/App.tsx:122`). **(blocker → done)**
- `[x]` **Terms of Service page** — real page exists (`src/pages/Terms/Terms.tsx`) and is routed at
  `/terms` (`src/App.tsx:130`). **(blocker → done)**
- `[x]` **Analytics / cookie disclosure** — **resolved as "off" (2026-06-23).** Firebase Analytics was
  never actually running — `getAnalytics()` was never called; only a dead `measurementId` sat in the
  Firebase config. Decision: **do not enable** Firebase Analytics for 1.0 (GA4 is cookie-based and would
  force a consent banner + Privacy Policy update for no real benefit at launch — Sentry covers errors and
  the first-party admin analytics dashboard covers product metrics, both cookie-free). Removed the dead
  `measurementId` from `src/client/db.ts` + the `VITE_FIREBASE_MEASUREMENT_ID` env var (`.env.example`,
  `.env.test`, CLAUDE.md) + the stale `firebase/analytics` test mock, so no cookie/consent notice is
  required. If usage analytics is wanted post-1.0, prefer a cookieless tool (Plausible / Fathom /
  Cloudflare Web Analytics) to stay banner-free. **(was: blocker if analytics on → resolved, off)**
- `[x]` **SEO basics** — `public/robots.txt` (allow-all) and a static `public/sitemap.xml`
  (prepifymeals.com URLs) are present, and `react-helmet-async` is wired (`HelmetProvider` in
  `src/App.tsx:60`, per-page titles e.g. SingleRecipe). Recipe pages are crawlable. **(nice-to-have → done)**
- `[ ]` **Social link previews need prerendering (SPA limitation)** — track 3b (PR #170) added
  per-route OG/Twitter tags (recipes, profiles, single recipe) + a branded 1200×630 OG card
  (`src/util/seo.ts`, `src/pages/**/Helmet`), and strips the static `index.html` fallbacks on JS boot
  so React 19 doesn't emit duplicate tags. **But this is a client-rendered SPA:** non-JS social
  crawlers (Facebook, Slack, iMessage, LinkedIn) only ever read the served `index.html`, so **every
  shared link shows the generic site card**, not the per-recipe/per-profile preview. Googlebot renders
  JS, so per-route titles/canonical/description still help search indexing — only the social preview is
  affected. **Revisit before launch:** either add prerendering for crawler user-agents (prerender.io,
  react-snap, or Netlify/Cloudflare prerender) or consciously accept the generic card for 1.0.
  **(nice-to-have)**
- `[x]` **Production domain + HTTPS** — **done (2026-06-26).** `prepifymeals.com` is fully live: DNS points
  at Netlify (the frontend host) with a valid HTTPS cert, `www` 301→apex, and the production API origin
  (`prepify-production-63a6.up.railway.app`) serves `/health` → 200 over valid SSL. **(blocker → done)**
- `[x]` **Support / contact path** — **done, reconciled 2026-07-02 (was stale — shipped in PR #158):**
  `/help` is a public Formspree contact form (redesigned for logged-out users, footer link un-gated —
  see the §D Help/Contact item), and the in-app "Report a bug" form (footer, open to logged-out users)
  feeds the `/admin/bug-reports` queue with email alerts (`ADMIN_NOTIFY_EMAIL`). **(nice-to-have → done)**
- `[x]` **Error tracking (Sentry) — wired + prod env vars set (2026-06-26)** — Sentry error monitoring
  is implemented frontend + backend (env-gated; no DSN ⇒ no-ops). Also shipped: an in-app "Report a
  bug" form (footer, open to logged-out users) → `bugReports` collection → `/admin/bug-reports` queue.
  **Production env vars confirmed set (2026-06-26):**
  - **Backend (Railway, prod service):** `SENTRY_DSN` ✅ set.
  - **Frontend build env (Netlify Production context):** `VITE_SENTRY_DSN` ✅ set (compiled into the bundle,
    so it must be — and is — set before `npm run build`).
  - **Backend (Railway, prod service):** `ADMIN_NOTIFY_EMAIL` + `RESEND_API_KEY` ✅ set, so new bug-report
    alerts are emailed.
  DSNs are public (safe to ship in the client bundle). No DB migration — `bugReports` indexes
  auto-build at startup. **(was: needs decision → done; prod env vars now set)**
- `[x]` **Content moderation (text) — wired + prod env vars set (2026-06-26)** — write-time text
  moderation is implemented (PR #138; blocklist + OpenAI Moderation API). Env-gated: with no key the
  curated blocklist still fires, but the OpenAI layer no-ops to "clean".
  **Production env vars confirmed set on the prod Railway service (2026-06-26):**
  - **Backend (Railway):** `OPENAI_API_KEY` ✅ set (server-side only; the moderation endpoint
    is free). **Never expose to the client** — it must not be a `VITE_*` var.
  - **Backend (Railway):** `MODERATION_ENABLED` = `true` ✅ set (master kill switch; `false` disables the
    OpenAI layer even when a key is set).
  - **Backend (Railway, optional):** `MODERATION_HIGH_THRESHOLD` / `MODERATION_MEDIUM_THRESHOLD` —
    override the default score cutoffs (0.85 / 0.5). Leave unset for defaults.
  No DB migration. See `docs/CONTENT_MODERATION.md`.
- `[x]` **Content moderation (images) — wired + prod env var set (2026-06-26)** — write-time image
  moderation (recipe images + profile photos) via Google Cloud Vision SafeSearch, reusing the same
  pipeline as the text layer. Env-gated: with no key the image layer no-ops (text moderation is
  unaffected). Live-smoke-tested 2026-06-15. **Production env var confirmed set (2026-06-26):**
  - **Backend (Railway):** `GOOGLE_VISION_API_KEY` ✅ set (a server-side Cloud Vision API key; the Vision
    API must be enabled + billing active on the `prepify-9b974` GCP project). **Never expose to the
    client** — server-side only, not a `VITE_*` var. Absent ⇒ the image layer silently no-ops.
  - **Backend (Railway, optional):** `MODERATION_IMAGE_HIGH` / `MODERATION_IMAGE_MEDIUM` — override the
    default SafeSearch likelihood cutoffs (`VERY_LIKELY` / `LIKELY`). Leave unset for defaults.
  Shares the `MODERATION_ENABLED` master switch. No DB migration. See `docs/CONTENT_MODERATION.md`.
- `[x]` **Performance / Lighthouse pass** — **done (track 4-qa, PR #174 ✅):** Lighthouse on the prod
  preview build (desktop) — **Home 97/96/100/100**, **recipe 88/89/100/100** (perf/a11y/best-practices/seo);
  recipe a11y **80 → 89** from the cheap a11y wins. The bundle-size win (>500 kB single chunk → route-level
  code-splitting) is real but structural — **filed to `BACKLOG.md`** (Tech debt) rather than done here.
  *(A11y was taken further in the dedicated WCAG AA sweep — recipe **89 → 97**, every page to 96–97; see
  the Accessibility item in Section A + PR #179.)* *(Wave-3 re-measure vs prod preview, 2026-07-02:
  desktop Home **94**, recipe **92** (was 88); mobile P 65–70, LCP 7.6–12.1 s, TBT ≤50 ms — still
  download-bound on the one 1.17 MB/363 kB-gz chunk, so route code-splitting stays the biggest filed
  lever; CLS Home **0** (the #213 skeleton work holds), recipe 0.088, recipes 0.105 — the last is the
  two already-filed #213 follow-ups (recipes-footer FOUT + grid image pop-in). BP 100 everywhere; SEO
  100 except `/login` 91 — missing meta description, pre-existing nit.)* **(nice-to-have)**
- `[x]` **README cleanup** *(done — PR #151, 2026-06-17)* — replaced the placeholder `your-username`
  clone URL with `jclind/prepify` and refreshed setup steps for the two-service architecture.
  **(nice-to-have)**

---

## Section D — Larger UX / redesign work

Chunky design efforts that are bigger than a single checkbox. Tag each as **(blocker)** if it gates
1.0, **(post-1.0)** if it's backlog, or leave `[?]` until you've decided.

- `[x]` **Footer Overhaul** — **(blocker → done)**
  - **Shipped:** the placeholder single-column footer was replaced with a multi-column layout —
    `src/Components/Footer/shared/FooterColumns.tsx` (grouped nav: Browse, Account, Legal), a
    `LegalBar.tsx` (copyright + version chip), and a `Wordmark.tsx`, driven by
    `src/Components/Footer/footerData.ts` (auth-aware links; Privacy `/privacy` + Terms `/terms`
    present). Rendered globally via `Layout.tsx`.
  - **Remaining nit (tracked elsewhere):** the version chip still reads `v{version}-beta`
    (`LegalBar.tsx:16`). Dropping `-beta` is intentionally deferred to the very end of the release as
    a celebration move — see the beta-tag blocker in the blockers section.

- `[x]` **Mobile Nav Bar redesign** — **(blocker → done; merged via PR #108)**
  - **Done (merged to `development`):** replaced the reflowed-desktop-links
    overlay with a purpose-built mobile menu — a full-screen panel with a subtle brand gradient,
    frosted cards grouping the nav (Browse / Create / Account), an in-menu recipe search, larger
    tap-target rows with icons + active-route highlighting, an account card (avatar + username +
    email + logout when signed in; prominent Login/Signup CTAs when signed out), backdrop blur,
    body-scroll lock, Esc-to-close, and safe-area padding. Desktop nav is unchanged. Built under
    `src/Components/Navbar/menu/`; the legacy `.nav-content` overlay is disabled below 725px.
  - **Note:** the in-menu search reuses the shared `SearchRecipesInput` autocomplete as-is — its
    visual overhaul is split out as its own item below.
  - **Touches:** `src/Components/Navbar/Navbar.tsx`, `src/Components/Navbar/Navbar.scss`,
    `src/Components/Navbar/menu/*`, and `src/Components/Navbar/PrepifyLogo.tsx` (where the `Beta`
    button decision also lives).

- `[ ]` **Search autocomplete redesign** — **(nice-to-have)**
  - **Now:** `src/Components/SearchRecipesInput/SearchRecipesInput.tsx` (+ `.scss`) is shared by the
    Home hero and the new mobile nav menu. Its autocomplete dropdown renders recipe result cards
    (thumbnail, cook time, servings, rating) in an absolutely-positioned panel below the input.
  - **Goal:** _(planned for a dedicated session)_ — overhaul the autocomplete designs across the app
    (home hero + in-menu): rethink the dropdown styling/layout and result-card design, add proper
    empty / loading / no-results states, and improve how it floats inside the mobile menu (it
    currently overlays the nav cards as a plain white box — wants a card-style treatment matching the
    menu).
  - **Touches:** `src/Components/SearchRecipesInput/SearchRecipesInput.tsx` (+ `.scss`) and its
    usages (Home hero, `src/Components/Navbar/menu/`).
  - Gates nothing for 1.0 — tracked here so it isn't lost.

- `[ ]` **Ratings & Reviews area overhaul** — **(blocker)**
  - **Now:** the ratings/reviews experience on the single-recipe page is functional but rough
    ("scuffed") — the rating summary/breakdown, the "your review" vs the public list, and the
    add/edit/delete review affordances need a visual + interaction pass to match the current design
    vocabulary. (The pill `.btn` sweep, 2026-06-29, restyled the buttons in this area onto the shared
    system but did **not** touch the layout/UX — that's this item.)
  - **Goal:** _(dedicated session)_ redesign the ratings + reviews UI end-to-end — summary/breakdown,
    your-review card, add/edit/delete flow, and empty/loading states.
  - **Touches:** `src/pages/SingleRecipe/DataSections/RatingsAndReviews/*` (+ `.scss` — `RatingsAndReviews`,
    `Ratings`, `Reviews/` incl. `AddReview`, `RecipeReview`, `ReviewsList`, `EditingReviewOptions`,
    `ConfirmDeleteReviewModal`), and likely `server/routes/reviews.js` if the data shape changes.
  - **Fold-ins (2026-07-08 note triage):** reviewer **avatars** on review cards — `/getReviews` carries no
    photo today; batch-resolve the deduped reviewer uids via `getAuth().getUsers()` (tolerate failures like
    `publicProfile.js`) + `DefaultAvatar` fallback (write-up in BACKLOG Features). Also absorb the
    reviewer-name → `/u/:username` link if roadmap track **N4** hasn't shipped it first (rule 8b there).
  - **Why a blocker:** owner wants this looking right before dropping beta (filed 2026-06-29).

- `[x]` **Homepage redesign** — **(design shipped)**
  - **Shipped:** the redesign landed earlier (`e1539c3`) — Home is now `HomeHero → Trending → Browse by
    meal → View all recipes`, fully responsive with empty/loading states. The "sparse Home" wording here
    was pre-redesign and is now stale.
  - **Remaining Home work** was feature, not design — tracked from `docs/FEATURE_IDEAS.md`, now all shipped:
    - `[x]` **Personalized "For You" row** — content-based row inferred from saves/makes/ratings
      (`HomeForYou` + `GET /api/getForYouRecipes`). Merged via **PR #153**.
    - `[x]` **"What should I cook?" button** — taste-aware random pick from `HomeHero`, revealed in a
      spotlight modal with "Try another" (`HomeCookSuggestion` + `GET /api/recipes/random`). Merged via
      **PR #154**.
  - **Touches:** `src/pages/Home/*` (`Home.tsx`, `HomeForYou.tsx`, `HomeRecipeCard.tsx`,
    `HomeCookSuggestion.tsx`), `src/api/recipes.ts`, `server/routes/recipes.js`,
    `server/util/forYou.js`, `server/util/tasteContext.js`.

- `[x]` **Help / Contact Support page** — **(blocker → done, PR #158)**
  - **Was:** `/help` (`src/pages/Help/Help.tsx`, a Formspree form) was already public (the route had
    been moved out of `PrivateRoute`), but **every link to it was hidden from logged-out users** — the
    footer link was tagged `auth: 'in'`, so a locked-out visitor had no way to reach support.
  - **Done (PR #158):** un-gated the footer Help link; redesigned the page for a public audience —
    soft-glass card matching the auth pages, progressive disclosure (topic chips → compact email +
    message form, optional subject), email fallback, improved success state, a11y (aria-live / pressed).
    Verified logged-out + signed-in (email pre-fill), runtime-verified, and high-effort reviewed.
  - **Touches:** `src/pages/Help/Help.tsx` (+ `Help.scss`), `src/Components/Footer/footerData.ts`
    (link un-gate). `App.tsx` not touched — route was already public.

- `[ ]` **Data-integrity pass** — **(post-1.0)**
  - **Now:** several collections reference each other by mutable/denormalized fields rather than the
    stable `uid` — chiefly `ratings`/`reports` keyed by `username`, recipe deletes that orphan other
    users' ratings, and multi-collection writes (delete-account cascade, username rename) that aren't
    atomic. The settings overhaul shipped tactical patches (rename now propagates to
    `ratings`/`reports`) but not the root causes.
  - **Goal:** key `ratings` by `userId` (+ backfill), cascade-delete ratings on recipe delete, and
    wrap the multi-collection writes in transactions. Sequenced D1 → D2 → D3.
  - **Full writeup:** `docs/DATA_INTEGRITY_AUDIT.md`.
  - **Touches:** `server/routes/reviews.js`, `server/routes/auth.js`, `server/routes/recipes.js`,
    `server/routes/publicProfile.js`, `server/db.js`, + a one-off backfill migration.

---

## Release-day cutover (light)

Infra/deploy is intentionally out of scope for this plan, but here's the minimal ordered checklist for
the actual flip. Deploy is **Netlify** frontend + Railway backend (Firebase is Auth + Storage only,
**not** Hosting; CI in `.github/workflows/test.yml` runs tests but does not deploy).

> **Infra status (2026-06-26):** the pre-cutover infra is **complete + verified** — the dev/prod split is
> done (separate prepify-prod/dev Mongo clusters, `prepify-9b974`/`prepify-dev-58579` Firebase projects, two
> Railway services, Netlify env contexts), **all prod env vars are set** (Railway prod service + Netlify
> Production `VITE_SENTRY_DSN`), CORS/`FRONTEND_URLS` is prod-origins-only, and `prepifymeals.com` is live
> with valid HTTPS. Deploy is now **branch-based**: merging `development`→`release` triggers the prod Netlify
> build + the prod Railway service. So step 5 below is "merge to `release`," not a manual env-var-then-build.
> The only thing gating cutover is the deliberate beta-flip (held until you say go) + the About-page rewrite.

1. `[ ]` All blockers above are `[x]`.
2. `[ ]` Bump `version` in `package.json` to `1.0.0`.
3. `[ ]` Flip the beta tag off (the three edits in the blockers section).
4. `[ ]` Update release-notes content for 1.0 and tag a GitHub Release.
5. `[ ]` Deploy by merging `development`→`release` (prod env vars are already set — see Infra status above).
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

### 2026-06-17 — audit run
- Blockers remaining: 12 (beta tag still live in 3 places; About rewrite; analytics disclosure; prod
  domain/HTTPS; key lockdown/rotation; Firebase rules; high-sev dep advisories; Footer/Home/Help/Mobile-nav
  redesigns; broken-link verify).
- Changes since last run: flipped 5 items to `[x]` — ReactQueryDevtools (now gated behind
  `NODE_ENV !== 'production'`), API rate limiting (`writeLimiter` + helmet), Privacy page (`/privacy`),
  Terms page (`/terms`), SEO basics (robots.txt + sitemap.xml + helmet). Noted the footer `-beta` moved
  to `LegalBar.tsx:16` after the footer redesign.
- Highlights: beta tag still live in 3 files (`LegalBar.tsx:16`, `ReleaseNotes.tsx:35` `isBeta = true`,
  `:87`); `RELEASE_DATE` still stale `3/31/2023`; `VITE_OPEN_AI_API_KEY` + `VITE_INGREDIENT_PARSER_URL`
  still in `.env.example` with zero `src` callers; README still has `your-username` placeholder; npm
  audit: root 3 high / server 3 high.

### 2026-06-25 — accessibility (WCAG 2.1 AA) sweep
Deep a11y pass over every page, logged-out + logged-in, via axe-core + Lighthouse (logged-in routes driven
through the Cypress custom-token bridge) plus keyboard / a11y-tree spot-checks. PR **#179**.
- **Scores moved:** Lighthouse a11y now **96–97 on every page** — logged-out +0→+8 (single recipe 89 → 97),
  logged-in +4→+12 (Add Recipe 84 → 96). Flipped the Section A **Accessibility** item to `[~]` (sweep done,
  contrast remainder filed).
- **Cheap wins shipped:** hamburger accessible name, StarRating `nested-interactive`, ingredient
  `<li role=checkbox>` → inner `<div>`, Add-Recipe button-name + react-select labels, heading order,
  RecipeCard label-in-name, auth-page `<main>` landmarks, skip-to-content link, global
  `prefers-reduced-motion`. tsc clean · 516 Vitest pass · build clean.
- **Remaining (filed to `BACKLOG.md` → Accessibility):** the only site-wide flag left is `color-contrast`
  — muted-grey body-text token `#979ba0` (2.4–2.8:1) + brand orange/teal CTAs (2.7–3.2:1), a token-level
  design decision. Autocomplete-listbox refactor + servings target-size re-confirmed. `.beta-tag` contrast
  left for the Phase-5 cutover.

### 2026-06-25 — readiness audit run
- Blockers remaining: 12, but clustered — the 3 beta-flip edits (deliberately held for cutover), the
  release-notes date/version (also cutover), 4 code/infra items (Edamam key lockdown, VITE_* safety
  sign-off, prod CORS value, prod domain+HTTPS), and 2 owner-gated (About rewrite — Jesse; key rotation
  — only if applicable).
- Changes since last run (2026-06-17): none flipped here, but two things measurably improved —
  `RELEASE_DATE` is no longer the stale `3/31/2023` (now `6/23/2026` in `ReleaseNotes.tsx:36`; content
  refreshed 2026-06-23), and the dependency posture improved further (root prod advisories 3 high → **0**;
  server prod **8 moderate**, 0 high/critical — down from 25). (Separately, PR #179 landed the WCAG AA
  sweep — see its own log entry above.)
- Highlights: beta tag still live in exactly the 3 expected places (`LegalBar.tsx:16` `v{version}-beta`,
  `ReleaseNotes.tsx:37` `isBeta = true`, `:103` suffix) — all intentional, held for the cutover flip.
  Dead env vars confirmed gone from `.env.example`/`src`. README placeholder gone. ReactQueryDevtools
  confirmed gated behind `NODE_ENV !== 'production'`. All `VITE_*` vars in `.env.example` are present and
  used; none are secrets. The one genuinely code-actionable blocker is the **Edamam key lockdown** — proxy
  `getRecipeNutrition` through the Express server so `VITE_EDAMAM_APP_ID/KEY` leave the client bundle
  (mirrors the Spoonacular proxy); doing so also closes the "audit every VITE_* var" item.

### 2026-06-25 — a11y contrast: muted-grey token (PR #181, merged)
Follow-up to the WCAG AA sweep. Darkened the muted body/meta text token `$tertiary-text` `#979ba0` →
`#666c75` (~93 usages) and tokenised three hardcoded `#8a8f99` report-trigger greys onto it. Clears every
muted-grey `color-contrast` flag site-wide (axe failures roughly halve per page). **Lighthouse a11y
unchanged (~96)** — the binary `color-contrast` audit still trips on the remaining brand colours and on the
`.beta-tag` present on every page. Remaining contrast work is now just the **brand palette** (in progress —
accessible `#bf360c`/`#00787e` variants on the failing selectors) and the **beta-tag**; the latter pins the
score until the Phase-5 cutover, at which point a11y ~100 lands automatically. See BACKLOG → Accessibility.

### 2026-06-25 — a11y contrast closed: brand + nav-logo + beta-tag → Lighthouse a11y 100 (PR #184)
Follow-up to #181. Added accessible on-light brand tokens (`$primary-accessible #bf360c`,
`$secondary-accessible #00787e`) and swapped the ~25 failing brand selectors (nav CTA + solid-nav accents,
home see-all/meal/cook-modal, recipe eyebrow/price/cost/save buttons, about eyebrows/CTAs, profile level,
auth buttons, search drawer + chips, and logged-in Account seg / Settings active nav / Drafts / Add-Recipe
section labels / empty-state CTAs). Then, per owner call, also closed the two "deferred" tails: the
**nav-logo** wordmark now uses the on-light orange on any light nav surface (desktop `.nav--solid` + a new
`.nav--dark-links` class for the mobile bar — Lighthouse a11y emulates mobile), and the **beta-tag** was
recoloured to white-on-`#00787e` (5.27:1). Recolouring the beta-tag **unpinned the binary `color-contrast`
audit**. Finally darkened the shared `$error-red` token `#dc3545`→`#c5303f` (text 5.43/4.68/5.14,
white-on-fill 5.43; alerts untouched — own token), clearing the last route. **Lighthouse a11y is now 100 on
all 22 routes** (12 logged-out + 10 logged-in). tsc + 516 Vitest + build green. See BACKLOG → Accessibility.

### 2026-06-25 — Edamam lockdown resolved (post-readiness)
The one code-actionable blocker called out in the readiness run above is done.
- **Edamam server proxy shipped + deployed** — PR #182 merged; `POST /api/nutrition/details` holds the
  keys server-side; `VITE_EDAMAM_*` removed from the bundle. `EDAMAM_APP_ID`/`KEY` set on Railway (Jesse).
  Flipped §B "Lock down Edamam", "Audit every VITE_* var" → `[x]`.
- **Key rotation waived by decision** — Jesse won't rotate the formerly-public Edamam keys because Prepify
  plans to migrate off Edamam (filed to BACKLOG → Tech debt). §B "Rotate any key…" → `[x]` (waived).
- Net: the only open security *blocker* left in Section B is confirming the production `FRONTEND_URLS`
  CORS value (tracked `[~]`); the dependency-audit and residual-API items are non-blocking.

### 2026-06-25 — ui: lighter page backdrop + brand orange reverted to vivid (owner call)
Two changes after the a11y contrast work: (1) lifted the page backdrop `body` to a softer `#f5f5f5` via a
new `$page-bg` token (the `#eeeeee` fill token is unchanged); (2) per owner decision, reverted the brand
**orange** from the AA `#bf360c` back to the vivid `#ff5722` (`$primary-accessible`) — it read too "brown."
This intentionally re-fails AA on the orange logo/CTAs/accents and drops Lighthouse a11y to ~96–97 on the
orange routes (rest stay 100); teal/beta/error-red/grey AA fixes are kept. Token plumbing intact → restoring
AA later is a one-line flip; shade exploration filed in BACKLOG → Accessibility.

### 2026-06-26 — dev/prod env-split reconcile (infra blockers closed)
Reconciled the plan against the completed dev/prod environment split (Mongo + Firebase + Railway + Netlify),
with the manual dashboard steps confirmed by Jesse.
- **Flipped to `[x]`:** §B **Tight CORS allowlist** (prod `FRONTEND_URLS` = prepifymeals.com origins only,
  verified live) and §C **Production domain + HTTPS** (`prepifymeals.com` live, DNS → Netlify, valid certs,
  `www` 301→apex; prod API `/health` 200 over SSL) — both were the last open infra blockers.
- **Prod env vars confirmed set (2026-06-26):** on the new prod Railway service — `SENTRY_DSN`,
  `OPENAI_API_KEY`, `MODERATION_ENABLED`, `GOOGLE_VISION_API_KEY`, `EDAMAM_APP_ID/KEY`, `ADMIN_NOTIFY_EMAIL`,
  `RESEND_API_KEY`; and `VITE_SENTRY_DSN` on the Netlify **Production** context. Updated the Sentry + both
  moderation items from "env vars are a launch step" to "env vars set."
- **Deploy model:** now branch-based — merging `development`→`release` builds the prod Netlify site + prod
  Railway service. Cutover step 5 updated accordingly; frontend host corrected from "Firebase Hosting" to
  **Netlify** (Firebase = Auth + Storage only) site-wide.
- **Remaining release blockers:** only the held beta-flip (3 edits + release date/version, deliberate
  cutover step) — the owner-only **About-page rewrite** (§C) was completed + signed off 2026-06-26, so the
  beta-flip is now the *last* thing gating 1.0. **Open infra TODO (non-blocking):** ~~rotate the exposed
  `Cluster0` Mongo `jesse` password~~ ✅ done 2026-06-26.

### 2026-07-02 — Wave-3 re-sweep & verify (sweeps ROADMAP Wave 3)
Full verification pass over the ~20 merged Wave-1/2 sweep PRs plus fresh baselines, run from
`worktree-feat+wave3-resweep`.
- **Every prior sweep track verified intact:** 20 per-track verifiers (PRs #179–#220) all returned
  *confirmed* against current `development` (`568fe52`); 11 cross-cutting drift hunts (type scale,
  elevation, icons, colour, motion, modals, toasts, loading, radius, dead code, doc consistency) — 7 fully
  clean, and the tail was small + fixed in the Wave-3 PR: the admin `SavedFilterBar` hexes PR #214 missed
  (→ `$admin-*` tokens), 8 raw `rgba(255,87,34,…)` orange washes (→ `rgba($primary,…)`, compiled-CSS
  byte-identical except one documented near-dupe normalize), and stale done-markers across
  BACKLOG / run-log / sweep banners.
- **Gates re-run green:** `tsc` clean · Vitest **545 pass/2 skip** · build passing (1.17 MB / 363 kB gz,
  slightly down vs the #198 baseline) · server Jest **697/697** (no flake).
- **Audits:** root prod **0**, server prod **8 moderate** (unchanged — the known firebase-admin
  transitives); one new dev-only high (`undici` via `jsdom`) fixed in-range, lockfile-only.
- **Lighthouse (prod preview):** a11y **96–97 orange routes / 100 off-orange** — exactly the documented
  owner-gated state, no regression; perf same download-bound class as #198 (mobile 65–70, TBT ≈ 0 —
  code-splitting remains the biggest lever); CLS Home 0 (the #213 skeleton work holds). One nit: `/login`
  lacks a meta description (SEO 91).
- **§A/§C reconciled** (this entry's edits): favicon/titles/OG → `[x]`; support/contact path → `[x]`
  (was stale — shipped in PR #158); empty/error/loading states → `[~]` (loading half done via #213);
  a11y + performance rows annotated with the re-measures; §B rows annotated (OpenAI key **still on
  disk** — operator action; dependency re-audit).
- **Still owner-gated:** the brand-orange recolor (and the post-recolor a11y re-run) + the deliberate
  beta-flip cutover steps.

### 2026-07-08 — readiness audit run (post backlog burn-down)
- **Blockers remaining: unchanged in count, but two security items closed.** The only true release
  blockers are still the deliberately-held **beta-flip** (3 edits: `LegalBar.tsx:16` `v{version}-beta`,
  `ReleaseNotes.tsx:14` `isBeta = true`, `:80` suffix — all confirmed still live, held for cutover) +
  the release-date/version finalize, and the **§D Ratings & Reviews overhaul** (owner design blocker,
  untouched by the backlog sweep). All are owner-gated.
- **Changes since 2026-07-02 (two flips to `[x]`):**
  - **§B Dependency audit `[~]`→`[x]`:** server prod advisories **8 moderate → 0** via the firebase-admin
    13→14 bump (PR #234 / S7). Both trees now `npm audit --omit=dev` = **0**. (Standing dep TODO: remove the
    temporary `uuid` override in both `package.json`s once `@google-cloud/storage` ships a patched release.)
  - **§B OpenAI-key-on-disk `[ ]`→`[x]`:** the live `VITE_OPEN_AI_API_KEY` (`.env`) and dead
    `SPOONACULAR_API_KEY` (`server/.env`) are **no longer on disk** (grep-confirmed; `.env` still holds the
    real dev Firebase keys, so it's populated, not wiped). Plaintext-on-disk exposure cleared; provider-side
    revocation is an unverifiable-from-repo operator step.
- **Reconfirmed unchanged:** beta tag live in the 3 expected files; `RELEASE_DATE = '6/23/2026'` (not stale);
  ReactQueryDevtools gated behind `NODE_ENV !== 'production'` (`src/index.tsx:30`); no dead `VITE_*` vars in
  `.env.example`/`src`; `public/robots.txt` + `public/sitemap.xml` present.
- **Context:** the full parallel backlog board (S1–S7 / F / C / I / R tracks) drained since the last audit —
  S1–S5 hardened the server write/validation surface (reinforcing the already-`[x]` input-validation + rate-
  limiting items), S7 cleared the dep advisories above. The C1-tail select-uniformity fix and the I2
  recipe-image migration script (owner tooling) also landed; none touched a release blocker.
- **Manual/owner items still open (unchanged, not automatable):** empty/error-state sweep (`[~]`, loading
  half done), social-crawler prerendering (`[ ]`, nice-to-have), brand-orange a11y contrast (`[~]`, owner
  brand decision), Ratings & Reviews overhaul (`[ ]`, blocker), Search-autocomplete redesign (`[ ]`,
  nice-to-have), data-integrity pass (`[ ]`, post-1.0).

_`/release-readiness` appends dated run summaries here._
