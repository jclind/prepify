---
name: run-prepify
description: Run, launch, start, serve, or screenshot the Prepify recipe app (React client on :3000 + Express API on :4000) and drive it in a headless browser to verify a change works. Use for "run the app", "screenshot a recipe page", "check it renders", "smoke test the frontend".
---

# Run Prepify

Prepify is a two-service web app: a Vite/React client (port **3000**) talking to
an Express/MongoDB API (port **4000**). "Running it" headless means: start both
services, then drive a headless Chromium against the client and screenshot the
result. `chromium-cli` isn't available here, so the harness is a small
`playwright-core` driver committed next to this skill:
**`.claude/skills/run-prepify/driver.mjs`**.

All paths below are relative to the repo root.

## Prerequisites

The driver is isolated from the app's own dependencies — it has its own
`package.json`. Install it once and pull the browser binary (cached globally,
so this is a one-time download):

```bash
cd .claude/skills/run-prepify
npm install                       # installs playwright-core into the skill dir
npx playwright install chromium   # downloads Chromium to ~/.cache (shared cache)
```

The app itself needs its deps and env files (see the app `.env` / `server/.env`
in CLAUDE.md — Firebase, Edamam, `MONGO_URI`). Without them the pages render but
data fetches fail, so check `console --errors` is clean (the driver prints them).

```bash
npm install            # repo root — client deps
(cd server && npm install)
```

## Run (agent path) — drive it and screenshot

Make sure both services are up (see "Start the services" below), then:

```bash
cd .claude/skills/run-prepify

# Home page → screenshots/page.png
node driver.mjs /

# A recipe page, waiting for the Nutrition card → screenshots/recipe.png
SHOT=recipe.png node driver.mjs /recipes/65302e782ea38768dea80749 "Nutrition"
```

`node driver.mjs [urlPath] [waitText]`. It navigates `CLIENT_URL` (default
`http://localhost:3000`) + `urlPath`, optionally waits for `waitText`, writes a
full-page screenshot to `screenshots/$SHOT` (default `page.png`), and prints the
page title, the `<h1>`, and **any console/page errors**. A rendered shell with
500'd fetches still screenshots — always read the `errors:` line.

**Look at the screenshot** (`Read` the PNG). Blank or an error page = not running.

To drive a specific interaction (click, fill, assert), copy `driver.mjs` and add
Playwright calls — it's plain `playwright-core`. Notes:
- **React controlled inputs:** use `locator.fill()` / `.type()`, not
  `el.value=…` (that skips React's `onChange`).
- Wait on the element you need (`waitForSelector` / `getByText`), not `sleep` —
  Vite compiles routes on first hit, so the first `nav` can take ~10s.

## Start the services

These are the project's standard dev commands (root `package.json` →
`start` runs Vite on 3000; `server/package.json` → `dev` runs nodemon on 4000).
Run each in the background and poll the port — don't `sleep`:

```bash
npm start &                       # client on :3000
(cd server && npm run dev &)      # API on :4000
timeout 60 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
timeout 60 bash -c 'until curl -sf http://localhost:4000/health >/dev/null; do sleep 1; done'
```

Confirm both are up before driving:

```bash
curl -s -o /dev/null -w "client :3000 -> %{http_code}\n" http://localhost:3000   # 200
curl -s -o /dev/null -w "server :4000 -> %{http_code}\n" http://localhost:4000/health  # 200
```

Stop with `pkill -f vite` and `pkill -f nodemon` before relaunching, or the next
start hits `EADDRINUSE`.

> Verified during authoring against services that were already running on
> 3000/4000; the curl probes and the full driver path were run here. If you
> cold-start, the env files are the most likely thing to bite (see Prerequisites).

## Finding a recipe id

Recipe routes are `/recipes/:recipeId`. Pull a real id from the API:

```bash
curl -s "http://localhost:4000/api/recipes?limit=1" | head -c 300
# e.g. 65302e782ea38768dea80749  ("Homemade Granola")
```

## Driving a signed-in flow (auth-gated pages)

Anything behind login (`/add-recipe`, `/account/**`) needs a real Firebase
session, not just a page load. The app exposes the same bridge Cypress uses:

- Build with `VITE_CYPRESS=true` in `.env` (a Vite dev server needs a restart —
  not just HMR — to pick up a *new* env var; kill the port and re-run
  `npm start -- --port <n>`). This attaches `window.__cy_signIn__(customToken)`
  in `src/client/db.ts`.
- Mint the custom token with `firebase-admin` (already a root/`server`
  dependency) against the dev project's service account
  (`server/.env`'s `FIREBASE_SERVICE_ACCOUNT`) — `getAuth().createCustomToken(uid)`.
  Do this **in the same script that drives the browser**, and never `console.log`
  the token/ID token — printing a live credential to the transcript gets
  blocked by the permission classifier. Keep mint → sign-in → drive in one
  process.
- Sign in: `page.goto('/')` first (mounts the bridge) →
  `page.waitForFunction(() => !!window.__cy_signIn__)` →
  `page.evaluate(t => window.__cy_signIn__(t), token)` →
  wait for `.dnav__create` (desktop nav's "Create Recipe" button) to confirm
  the auth state landed → then `page.goto()` wherever you actually need.
- **Use the fixture uid `test-cypress-user`**, not an arbitrary uid. A brand
  new uid has no username yet and the app redirects to `/create-username`
  instead of rendering the page you wanted (cost 15 minutes to discover this
  the first time). `test-cypress-user` already has a username + is what
  `cypress/support/commands.ts`'s `cy.login()` uses, so it's a stable,
  pre-provisioned dev-Firebase identity.
- **Two "tabs" of the same user** = two `page`s from one `browser.newContext()`
  (not two contexts) — Firebase persists the session in that context's
  storage, so signing in once on `pageA` authenticates `pageB`/`pageC` too.
  This is the pattern for concurrency/multi-tab bugs (e.g. the B5 draft-PUT
  guard): drive the real UI in each page rather than curling the API — the
  bug (and the fix) lives in the browser-side hook, not just the route.
- Clean up scratch data you create through the real UI when you can (e.g. the
  Drafts page's per-card `aria-label='Delete draft'` button) rather than
  leaving debris in the shared dev fixture account.

## Run (human path)

`npm start` opens the client at http://localhost:3000 in your browser; the API
must also be running (`cd server && npm run dev`). Useless headless — use the
driver above instead.

## Test

```bash
npm test                  # Vitest (frontend) — see vite.config.ts
(cd server && npm test)   # Jest (backend)
```

## Gotchas

- **No `chromium-cli`** in this environment — that's why there's a `driver.mjs`.
  It launches with `--no-sandbox` (required as root/in containers).
- **`playwright-core` `npx playwright install` prints an `@playwright/test`
  banner** and exits 0 — harmless; the browser still downloads to the shared
  `~/.cache/ms-playwright` (on macOS `~/Library/Caches/ms-playwright`).
- **Recipe page `<title>` is empty** while the document title catches up; assert
  on the `<h1>` (recipe name) or `waitText` instead.
- **Driver deps/screenshots are gitignored** — `node_modules/` and
  `screenshots/` under the skill dir are not committed; only `driver.mjs`,
  `package.json`, and this file are.

## Troubleshooting

- `Executable doesn't exist … ms-playwright` → run `npx playwright install
  chromium` from `.claude/skills/run-prepify`.
- Driver hangs/times out on `goto` → a service is down; re-check the two curl
  probes above.
- Screenshot renders but `errors:` lists failed fetches → app `.env` /
  `server/.env` missing or Mongo unreachable; the UI shell renders without data.
