# High-Value Claude Code Prompts

Big, token-heavy prompts worth running when there's budget to spare. Refreshed 2026-06-24.
Listed in priority order.

> **What changed since 2026-06-11:** the old top pick ("land the merge backlog") shipped
> (#174–#177) and is removed. The `docs/sweeps/` playbooks (added 2026-06-23) are now the top
> pick because they're built for exactly this and have never been run. SEO structured data is
> implemented (`buildRecipeJsonLd.ts`), so SEO dropped to a small item. The dead-config /
> Edamam-key cleanup is folded into a single external-API hardening item.

## 1. Run the unexecuted sweeps ⭐ top pick

The five `docs/sweeps/*.md` files are ready-to-run playbooks that have **never been executed**.
Each is written for the worktree + `run-prepify` headless-browser flow, one PR per sweep — i.e.
purpose-built for "no need to skimp." The scoping work is already done, so this is the most value
per prompt.

> Run the docs/sweeps/ playbooks one at a time (start with security.md, then performance.md,
> accessibility.md, code-quality.md, design-consistency.md). For each: spin up a worktree, follow
> the sweep's method (read-and-report first, fix only clearly-safe ones, file the rest to
> BACKLOG.md), use the run-prepify skill to verify in the browser, run the relevant test suites,
> and open one PR per sweep.

Tip: these are independent — run them across separate end-of-week sessions to keep each context fresh.

## 2. Release-blocker burn-down

17 open `[ ]` items in RELEASE_PLAN.md, none currently needing a decision — mostly polish + verification.

> /release-readiness, then work through every remaining `[ ]` item in docs/RELEASE_PLAN.md that
> doesn't need a decision from me, on a branch, with tests. List anything that does need a decision
> at the end.

Note: the empty/error/loading states sweep (old item #3) lives in RELEASE_PLAN §A and is covered here.

## 3. Full multi-agent bug hunt

The canonical token-heavy "spend for confidence" workflow. Adversarial verification kills the
plausible-but-wrong findings that make broad bug hunts noisy.

> ultracode — Do a comprehensive bug hunt across the codebase using a multi-agent workflow: fan
> out finders across each subsystem (auth middleware, recipe CRUD, ingredient parsing,
> serving-price calc, content moderation, gamification, drafts/autosave, saved-recipes), then
> adversarially verify every finding with independent skeptics so I only get confirmed bugs. Write
> confirmed findings to docs/ with repro steps; fix the clear-cut ones on a branch with tests.

Tip: the leading "ultracode" opts into the multi-agent orchestration.

## 4. External-API hardening (Edamam / Spoonacular / Firebase)

Confirmed open: the Edamam app id/key ship in the client bundle (`src/api/recipes.ts:406`,
RELEASE_PLAN §B.3). Spoonacular is already server-proxied (`server/routes/ingredients.js`) — mirror
that pattern for Edamam. Also sweeps up the dead config flags CLAUDE.md once listed.

> Lock down external API usage: proxy the Edamam nutrition call through the Express server (mirror
> the Spoonacular ingredient-parse proxy in server/routes/ingredients.js) so the keys leave the
> client bundle, add caching/dedupe where calls repeat, and audit every VITE_* env var for public
> safety (remove any dead ones). Branch + tests.

## 5. Test-suite *quality* audit (not coverage)

~130 test files already exist; the gap is meaningfulness, not count.

> Audit the existing Vitest/Jest/Cypress suites for quality, not coverage: find tests that pass
> trivially or assert nothing meaningful, flaky tests, and high-risk paths (auth, ingredient
> parsing, serving-price, review/rating CRUD, moderation) whose tests don't actually exercise the
> failure modes. Strengthen the worst offenders and add the missing edge cases.

## 6. API contract three-way reconciliation

> Reconcile docs/API_CONTRACT.md against the actual server/routes/ handlers and the src/api/ client
> modules. Find drift in params, response shapes, status/error codes, and auth requirements across
> all three. Write a diff report to docs/ and fix the clear mismatches.

## 7. End-to-end user-journey simulation

Token-heavy because it drives the headless browser repeatedly through real flows that unit tests miss.

> Using the run-prepify skill, drive a full end-to-end journey in the headless browser — signup →
> create a recipe (image + nutrition) → rate → save → report → admin-moderate → delete — with the
> API both up and down, screenshotting every step. Flag any broken/ugly state and fix what you find.

## 8. SEO finish + social previews

JSON-LD already exists (`src/pages/SingleRecipe/buildRecipeJsonLd.ts`); two gaps remain.

> Add a test that validates the Recipe JSON-LD from buildRecipeJsonLd.ts against Google's Rich
> Results required fields, then lay out options for social-link previews (the SPA serves generic
> index.html to non-JS crawlers — RELEASE_PLAN §C): prerender vs. accept the generic card for 1.0.
> Recommend one.

## 9. Docs reconciliation

~6,400 lines of docs (REFACTOR_NOTES alone is 1,405). Cheap insurance against acting on stale audits.

> Reconcile the docs/ folder against current code: mark stale sections, reconcile the audit docs
> (server-audit, SECURITY_AUDIT, DATA_INTEGRITY_AUDIT) against what's actually been fixed, and flag
> anything contradicted by the code. Don't delete — annotate.

## Not worth tokens right now

- **Mobile-nav redesign** — blocked on a human decision (picking one of the variants on
  feat/mobile-nav-redesign), not on Claude doing work.
