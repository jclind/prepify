# Code quality & test sweep

> **Status:** _Run 2026-06-27 — PR #199 (`[P]`)._ Dead code removed, a silent delete-review failure fixed,
> +33 tests on untested critical-path utils; all suites green. Headline follow-up: **server Jest flakiness
> under CPU contention** (pre-existing) → [BACKLOG → Testing](../BACKLOG.md#testing). *(See the [run log](README.md#run-log).)*

Full-coverage health check of the codebase itself: test coverage on the critical paths, E2E journey
coverage, flaky/skipped tests, type safety, dead code, and error handling. The "is the codebase in
good shape under the hood?" pass.

> Read [`README.md`](README.md) first. This sweep is mostly static analysis + running the suites; it
> needs the app only for the E2E (Cypress) leg.

## Kickoff

```
/worktree-create code-quality sweep — coverage, E2E, types, dead code, error handling

Read docs/sweeps/code-quality.md and docs/sweeps/README.md. Audit test coverage (Vitest + Jest), E2E
journeys (Cypress), type safety, dead code, and error handling. Add small high-value tests, remove clearly
dead code, tighten obvious types; file larger gaps to docs/BACKLOG.md (Testing / Tech debt). Keep all
suites green. Open a PR with a coverage summary.
```

## The pass

1. **Unit/integration coverage.** Run Vitest with coverage (`npx vitest run --coverage`) and Jest in
   `server/` (`cd server && npm test -- --coverage`). Don't chase a number — find **critical-path gaps**:
   auth (`AuthContext`, token attach/refresh), save-recipe, serving-price math
   (`src/util/calculateServingPrice.ts`), ingredient-quantity validation, rating average
   (`util/recipeRating` + `server/routes/reviews.js`), and the authz checks on mutating server routes. Add
   focused tests where a regression would be expensive; note bigger gaps for the backlog.
2. **E2E journeys.** Review the Cypress specs (`cypress/e2e/`: auth, addRecipe, browse, recipe,
   reportUser, smoke) against the real critical journeys: sign-up → create username → add recipe → view it;
   browse → filter → open → save → rate; password reset; report. Flag any critical journey with no E2E. The
   harness mocks Firebase via `__cy_signIn__` + a minted custom token and intercepts the API with
   fixtures — keep that pattern.
3. **Flaky / skipped / slow.** There are 2 skipped frontend tests — confirm they're intentionally skipped
   (and why), not quietly broken. Look for time/order-dependent tests, real-network calls that should be
   mocked, and any spec that's a known flake. Note slow suites.
4. **Type safety.** `npx tsc --noEmit` must be clean (it is). Then hunt the soft spots: `any` /
   `as unknown as` / `@ts-ignore` / `@ts-expect-error`, untyped API responses (do `src/api/*` return typed
   shapes that match `src/types.ts`?), and non-null assertions (`!`) on values that can actually be null.
   Tighten the cheap ones; file the rest.
5. **Dead / commented code.** The repo carries intentional dead code — `RecipeContext` (commented out,
   migrated to `RecipeAPI`) and the `RecipeAI` route (commented in `App.tsx`). Decide per item: delete if
   truly abandoned, or leave a one-line note on why it stays. Also: unused exports/imports, unreachable
   branches, leftover `console.log`, and orphaned files. (Don't delete something load-bearing because it
   "looks" dead — verify no importer first.)
6. **Error handling.** Confirm the Sentry boundary (`AppErrorFallback`) covers the app and that async
   failures surface as user-facing states, not silent catches or unhandled rejections. Server: every route
   is wrapped in `asyncHandler` (verify) and the error middleware returns sane status codes without leaking
   stack traces in prod. Each data fetch on the client has a loading + error + empty branch (the 4-qa sweep
   verified the UI side — this checks the code paths behind them).
7. **Lint/format & conventions.** Run the linter/formatter if configured; flag inconsistent patterns
   (mixed import styles, the `src/`/`types` aliases used unevenly, naming drift). Don't reformat the world
   in this PR — note systemic issues.

## Tooling & where to look

- `npx vitest run --coverage`, `cd server && npm test`, `npx cypress run` (or `open`), `npx tsc --noEmit`.
- Dead-code/typing greps: `grep -rn "any\|@ts-ignore\|@ts-expect-error\|console.log\|TODO\|FIXME" src server --include=*.ts --include=*.tsx | grep -v test`.
- Config: `vite.config.ts` (Vitest), `server/jest.config.js`, `cypress.config.ts`, `tsconfig.json`.

## Deliverable

A PR with: a coverage summary (front + back) calling out the critical-path gaps, any small high-value
tests added, dead code removed (with proof it was unused) or annotated, and backlog items for the larger
gaps (missing E2E journeys, modules needing tests, a typing cleanup). All suites green, tsc clean, build
passing.
