# Prompt: Build the About / Privacy / Terms pages

This is a self-contained task brief for a fresh session. It assumes no prior
context beyond the repo. Paste it in (or open this file) and work from it.

## Goal

Replace the temporary stub for Prepify's three company/legal pages with real,
distinct, production-ready pages:

- **About** — `/about`
- **Privacy Policy** — `/privacy`
- **Terms of Service** — `/terms`

## Current state (what already exists)

A footer redesign wired these three routes to a single shared placeholder so the
links aren't dead. You are replacing that placeholder with real pages.

- **Stub component:** `src/pages/legal/LegalPlaceholder.tsx` (+ `.scss`) — renders
  a centered "This page is coming soon." block. Used by all three routes.
- **Routes:** in `src/App.tsx`, three public routes (`/about`, `/privacy`,
  `/terms`) each render `<Layout darkNavLinks={true}><LegalPlaceholder …/></Layout>`.
  They sit just above the `<Route path='/' element={<PrivateRoute />}>` block.
- **Footer links:** `src/Components/Footer/footerData.ts` → the `Company` column
  links to `/about`, `/privacy`, `/terms` (plus a `mailto:` Contact link).

## What to build

For each page, create a dedicated component following the repo's per-page
convention (one folder per page under `src/pages/`, e.g.
`src/pages/About/About.tsx` + `About.scss`). Then point the routes in `App.tsx`
at the new components and delete `src/pages/legal/LegalPlaceholder.{tsx,scss}`
(and remove its import) once nothing references it.

### Conventions to follow (match the existing codebase)

- **Document title:** use `Helmet` from `react-helmet-async`:
  `<Helmet><title>Prepify | About</title></Helmet>` (see `src/pages/Help/Help.tsx`).
- **Layout:** the route wraps the page in `<Layout darkNavLinks={true}>` — the
  page component itself must NOT render `<Layout>`/nav/footer.
- **Sticky footer:** the app uses a flexbox sticky-footer shell (`Layout.scss`
  → `.app-main { flex: 1 0 auto }`). The page's root element should set
  `flex: 1 0 auto` so the footer stays at the viewport bottom on short pages.
  Do NOT use `min-height: calc(100vh - $footer-height - …)` — that pattern was
  removed; the footer is content-driven now.
- **Nav offset:** the navbar is `position: absolute; top: 0`, so add top padding
  ≈ `s.$nav-height` to the page content (see `LegalPlaceholder.scss` for the
  exact pattern).
- **Styling tokens:** `@use '../../helpers.scss' as s;` then use `s.$primary`,
  `s.$primary-text`, `s.$secondary-text`, `s.$tertiary-text`, `s.$max-width`,
  `s.$nav-height`, `s.$font-family`. Primary brand color is `#ff5722`.
- **Content width:** constrain readable text to ~700–800px (`s.$recipe-body-max-width`
  is `800px`) centered, consistent with other content pages.

### Page content

**About (`/about`)** — marketing/storytelling, not legal:
- What Prepify is: a recipe site where every recipe ships with real per-serving
  **price** and **nutrition** data, so users can plan, shop, and cook with zero
  guesswork. (Mirror the footer tagline.)
- Why it exists / the problem it solves (cost + nutrition transparency).
- Key features: recipe creation, search/filter, ingredient parsing with nutrition,
  ratings/reviews, saved recipes.
- A short "who's behind it" line and a call-to-action (link to `/recipes` and
  `/signup`).

**Privacy Policy (`/privacy`)** and **Terms of Service (`/terms`)** — legal:
- ⚠️ These are legal documents. Generate reasonable, clearly-written boilerplate
  tailored to how Prepify actually works, but add a visible note that the content
  is a draft and should be reviewed by a qualified professional before relying on
  it. Do not present it as vetted legal advice.
- Tailor the Privacy Policy to the app's real data practices:
  - **Auth:** Firebase Authentication (email/password + Google sign-in).
  - **Data store:** MongoDB (user profiles, recipes, reviews/ratings).
  - **Images:** uploaded to Firebase Storage.
  - **Third parties:** Edamam and Spoonacular (nutrition/ingredient parsing),
    Google (auth), Firebase/Google Cloud (hosting/storage/analytics — note
    `VITE_FIREBASE_MEASUREMENT_ID` implies Analytics).
  - Cover: what's collected, how it's used, third-party processors, cookies/local
    storage, data retention, user rights (access/deletion), contact email
    (`JesseLindCS@gmail.com` for now — confirm the production support address).
- Terms of Service should cover: acceptance of terms, user accounts and
  responsibilities, user-generated content (recipes/reviews) and the license
  granted to Prepify, acceptable use, disclaimers (esp. **nutrition and price
  data are estimates, not medical or financial advice**), limitation of
  liability, termination, and changes to the terms. Include an effective date.

### Structure suggestion for the legal pages

Render a page title, an "Effective date" / "Last updated" line, then sectioned
content (`<h2>` per section). A shared layout component for Privacy + Terms (they
share chrome — title, updated date, prose container) is reasonable to avoid
duplication; About is different enough to stand alone.

## Acceptance criteria

- `/about`, `/privacy`, `/terms` each render a distinct, real page (no "coming
  soon" placeholder); titles set via Helmet.
- Footer Company links navigate to them; the footer sits correctly at the bottom
  on each (short-content) page.
- `LegalPlaceholder.{tsx,scss}` is deleted and no longer imported.
- `npx tsc --noEmit` is clean and `npm test` passes.
- Add a lightweight test (e.g. `src/test/LegalPages.test.tsx`) asserting each
  route renders its `<h1>` and the Privacy/Terms "review by a professional" note.
- Privacy/Terms carry a visible draft/disclaimer note.

## Out of scope

- Real social-media URLs and any change to the footer's social icons (still `#`
  placeholders) — separate task.
- Confirming/changing the production support email.
