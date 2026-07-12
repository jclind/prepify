# Assurance sweeps

Reusable prompts for full-coverage, "is everything actually in order?" passes over Prepify. Each
sweep is a self-contained brief you can hand to Claude Code (or run yourself) to audit one dimension
of the app end-to-end, fix the small stuff in place, and file the larger stuff to the backlog.

These are modelled on **track 4-qa** in [`../archive/RELEASE_GAMEPLAN.md`](../archive/RELEASE_GAMEPLAN.md) — the release
QA sweep that established this pattern (run on a stabilized app, structured pass, fix-small / file-large,
one PR with a checklist + before/after metrics).

## The sweeps

| Sweep | Audits | File |
|---|---|---|
| **Performance** | Lighthouse, bundle size/splitting, images, data-fetching waterfalls, render cost | [`performance.md`](performance.md) |
| **Security** | secrets, authN/authZ + IDOR, input validation, rate limits, CORS, Firebase rules, deps, XSS/PII | [`security.md`](security.md) |
| **Accessibility** | axe/Lighthouse a11y, keyboard, screen reader, ARIA correctness, contrast, zoom/motion | [`accessibility.md`](accessibility.md) |
| **Design consistency** | tokens (color/spacing/type), component reuse, states, responsive breakpoints, voice | [`design-consistency.md`](design-consistency.md) |
| **Code quality & tests** | coverage gaps, E2E journeys, flaky/skipped, types, dead code, error handling | [`code-quality.md`](code-quality.md) |

Related, already-built tooling: `/release-readiness` (audits the launch checklist in `RELEASE_PLAN.md`),
`/code-review` and `/security-review` (diff-scoped), and the **run-prepify** skill (headless driver).

## Run log

The **historical ledger** — what's been run, when, and the PR. For the **forward plan** (what to run next,
what can run in parallel, and the per-track status), see [`ROADMAP.md`](ROADMAP.md) — point Claude Code there
to continue the sweeps where the last session left off. Each sweep doc also carries a one-line `> Status:`
banner at the top. Update all three (this ledger, the roadmap Board, the banner) as the last step of a sweep
PR (method §7).

"Open follow-ups" are filed in [`../BACKLOG.md`](../BACKLOG.md) and intentionally outlive the sweep
(fix-small / file-large), so a sweep is never "all green" — it's "cheap wins shipped, tail filed."

| Sweep | Last run | PR | Cheap wins shipped | Open follow-ups |
|---|---|---|---|---|
| **Performance** | 2026-06-26 | #198 | image `loading`/`decoding` deferral (Home cards), `RecipeCard` memo + `decoding`, trending `staleTime` | 7 → all closed → [BACKLOG → Tech debt](../BACKLOG.md#tech-debt--process--infra): ~~route code-splitting~~ (shipped — `lazyRoute` in `App.tsx`; main payload 393→274 kB gz), ~~missing Mongo indexes~~, ~~`/recipes/facets` scans~~, ~~recipe-page CLS pop-in~~, ~~`AuthContext` memo~~, ~~image `srcset`~~, ~~Saved-tab card memo~~ (done — PRs #237/#240/#243/#247) |
| **Security** | 2026-06-26 | #197 | `madeRecipe` counter-inflation dedup; `reports` username→uid oracle closed; `addRating` per-user limiter; review-route type guards | 8 → all closed → [BACKLOG → Security](../BACKLOG.md#security): ~~revoke live OpenAI key on disk~~ (revoked 2026-07-03, operator action) (+ `RELEASE_PLAN.md` §B), ~~public `getRecipe` full-doc leak~~, ~~recipe numeric validation~~, ~~admin-takedown stale-username match~~, ~~reports breadth limiter~~, ~~two authed writes missing limiter~~, ~~`save` TOCTOU~~, ~~`firebase-admin` major bump (8 moderate transitive CVEs)~~ (done — PRs #228–#234) |
| **Accessibility** | 2026-06-25 | #179 (+#181, #184 contrast follow-ups) | ingredient-checklist role (recipe page 89→97); grey / teal / beta-tag / error-red contrast | 5 (3 resolved, 2 → owner) → [BACKLOG → Accessibility](../BACKLOG.md#accessibility): ~~autocomplete listbox + keyboard nav~~ (done — PR #201), ~~servings target-size~~ (done — PR #202), ~~account-heading route-map~~ (done — PR #200); `$primary-hover` AA-on-hover + brand orange (reverted to vivid) `[dropped]` 2026-07-01 → the owner's brand-orange recolor |
| **Design consistency** | 2026-06-25 | #180 (+#183, #185, #186, #192) | `$primary-hover` + `$surface-warm-border` tokens; radius scale, breakpoint tokens, admin import-wiring, decorative tint | ~10 → [BACKLOG → UX / visual polish](../BACKLOG.md#ux--visual-polish) + [Tech debt](../BACKLOG.md#tech-debt--process--infra): ~~pill `.btn` system~~ (done — PR #210), ~~delete `RecipeThumbnail`~~ (done — PR #199), ~~icon-per-concept~~ (done — PR #205; ~~single-family Lucide~~ done — PR #206), ~~modal style config~~ (done — PR #203), ~~loading-state pattern~~ (done — PR #213), ~~toast punctuation~~ (done — PR #207); ~~type scale~~ (done — PR #216), ~~elevation re-author~~ (done — PR #218), ~~danger-red token~~ (done — PR #208), ~~`$admin-*` palette~~ (done — PR #214), ~~`RecipeFormInput` dup~~ (done — PR #204), ~~button hover-motion + clickable consistency~~ (done — PR #220) |
| **Code quality & tests** | 2026-06-27 | #199 | dead-code removal (`RecipeThumbnail`, `getIndexById`, ~375 commented lines, dead `RecipeAI` route); silent delete-review failure → toast; +33 tests on untested critical-path utils | → [BACKLOG → Testing](../BACKLOG.md#testing): **server Jest flakiness under CPU contention** (pre-existing headline), E2E gaps (review-submit, password-reset), untested `updateIngredients`; → [Tech debt](../BACKLOG.md#tech-debt--process--infra): `any` cluster, `asyncHandler` consistency, `CLAUDE.md` `RecipeContext` drift, util rename |

> **Wave-3 re-sweep (2026-07-02):** all five baselines re-run and every Wave-1/2 track verified intact on
> current `development` — see each sweep's `> Status:` banner for its re-verify line and the
> [ROADMAP Wave-3 status-log entry](ROADMAP.md#status-log) for the full pass.

> **The sweep board is now fully closed** (Wave 3 / PR #222); the live board is now
> [`../BACKLOG_ROADMAP.md`](../BACKLOG_ROADMAP.md).

## The shared method (applies to every sweep)

1. **Isolate.** Run in a fresh worktree off the latest `development` so the sweep can fix-as-it-goes
   without colliding with feature work: `/worktree-create <sweep> — <one-line goal>`. The worktree-create
   skill imports env files and boots the client + server on free ports (never 3000/4000).
2. **Run the app.** Use the **run-prepify** skill. The headless harness lives at
   `.claude/skills/run-prepify/driver.mjs` (plain `playwright-core`); copy it for click/fill/assert flows.
   Always read the `errors:` line — a rendered shell with 500'd fetches still screenshots.
3. **Drive logged-in flows when needed.** The app exposes a Firebase custom-token bridge
   (`window.__cy_signIn__`) **only** when built with `VITE_CYPRESS=true` (see `src/client/db.ts`). To drive
   a real authenticated session headlessly: add `VITE_CYPRESS=true` to a `.env` the dev server loads, mint a
   custom token with `firebase-admin` + the `FIREBASE_SERVICE_ACCOUNT` from `server/.env` (mirror
   `cypress.config.ts`'s `mintCustomToken`; silence the dotenv banner so the token isn't polluted), then
   `page.evaluate(t => window.__cy_signIn__(t), token)`. Revert the flag and remove the mint script before
   committing. *(Note: `.env.test` has fake Firebase config + points at :4000 — don't sign in against it.)*
4. **Pass structurally.** Work the numbered areas in the sweep doc. For each finding, decide: small + safe
   → fix here; larger/riskier → file to [`../BACKLOG.md`](../BACKLOG.md) under the right section with a
   file ref + a "surfaced YYYY-MM-DD in the <sweep> sweep" note.
5. **Keep the gates green.** `npx tsc --noEmit`, `npm test` (Vitest), `npm run build`; `cd server && npm test`
   (Jest) for backend changes. Don't touch the **beta tag** — that's the Phase-5 cutover.
6. **Ship one PR** into `development` with a short checklist of what was checked, before/after metrics where
   they exist, and links to any backlog items filed.
7. **Update the trackers.** As the last step, refresh (a) this sweep's row in the [Run log](#run-log) above,
   (b) its track on the [`ROADMAP.md`](ROADMAP.md) Board (and append a Status-log entry there), and (c) the
   `> Status:` banner at the top of the sweep doc — date, PR, cheap wins, open follow-ups. File any newly
   surfaced deferrals as roadmap Wave-2/3 tracks so the next reader can continue without re-deriving state.

## Guardrails common to all sweeps

- **Polish, not redesign.** Small, safe, surgical fixes. Anything that needs CSS re-pointing, a layout
  change, a brand-color decision, or a refactor goes to the backlog — don't do it blind.
- **Report faithfully.** If something is broken and you didn't fix it, say so and file it. Don't mark a
  sweep "clean" because the cheap wins are done — list what remains.
- **Don't weaken anything to make a check pass** (especially in the security sweep).
- Convert relative dates to absolute when filing backlog items.
