# High-Value Claude Code Prompts

Big, token-heavy prompts worth running when there's budget to spare. Compiled 2026-06-11
based on repo state: three finished-but-unmerged worktrees, open release-plan blockers.
Listed in priority order.

## 1. Land the merge backlog ⭐ top pick

Converts months of finished work into shipped code. Three rebases, six test-suite runs,
three reviews — wide but autonomous.

> Take the three unmerged worktrees (recipes-page-refresh, account-page-redesign including
> its P6 teardown of the redesign/ dir and /account-redesign route, and admin-service) and
> get them merged into development one at a time: rebase each onto latest development,
> resolve conflicts, run the full frontend + server test suites, run /code-review on each
> diff at high effort and fix what it finds, then open PRs. Note the worktrees were cut at
> different points so later rebases will conflict with earlier merges — handle that.

Tip: `/code-review ultra` on each PR runs the review in the cloud instead of burning
local tokens.

## 2. Release-blocker burn-down

> /release-readiness, then work through every remaining `[ ]` blocker in
> docs/RELEASE_PLAN.md that doesn't need a decision from me, on a branch, with tests.
> For `[?]` items, list the decisions at the end.

## 3. Empty/error/loading states sweep

Called out in RELEASE_PLAN.md Section A as high-impact. Token-heavy because it drives
the headless browser repeatedly via the run-prepify skill.

> Do the empty/error/loading states sweep from RELEASE_PLAN.md Section A: for every
> data-fetching page (Home, Recipes, SingleRecipe, Account, /u/:username), run the app
> with the API down and with empty data, screenshot each state, then implement sensible
> empty states, error states, and skeletons where missing. Add tests.

## 4. Full-codebase security + auth audit

> /security-review, then go deeper: audit the Express server end-to-end — every route's
> auth middleware coverage, the admin-claims checks, CORS config, rate limiting, input
> validation on recipe/review/report endpoints, and Firebase token handling. Cross-check
> against docs/server-audit.md for regressions. Write findings to docs/, fix the
> clear-cut ones.

## 5. Test-gap analysis with backfill

> Map every exported function/component in src/ and server/routes/ against the existing
> Vitest/Jest/Cypress suites, identify the riskiest untested paths (auth flows, ingredient
> parsing, serving-price calc, review CRUD), and write tests for the top 10 gaps.

## 6. Dependency + dead-code sweep

> /dep-audit, then apply the safe upgrades, and also remove the dead config CLAUDE.md
> flags (VITE_OPEN_AI_API_KEY, VITE_INGREDIENT_PARSER_URL) plus any unused
> exports/components you find. Tests must stay green.

## Not worth tokens right now

- **Mobile-nav redesign** — blocked on a human decision (picking one of the 10 variants
  on feat/mobile-nav-redesign), not on Claude doing work.
