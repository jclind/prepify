# High-Value Claude Code Prompts

Big, token-heavy prompts worth running when there's budget to spare. Refreshed 2026-07-08.
Listed in priority order.

> **What changed since 2026-06-25:** the old top pick ("run the unexecuted sweeps") shipped — the
> `docs/sweeps/` playbooks all ran to completion (PRs #179–#224), so it's removed. The Edamam-key
> external-API-hardening item is removed too: the nutrition call is now server-proxied (#182). The
> release-blocker count is corrected (~17 → ~11 open, most now owner-gated). The SEO item's JSON-LD
> output-escaping half shipped (convention **C3**), leaving the validation test + social-preview
> decision. The stale mobile-nav footer note is dropped (it shipped in #108). Remaining items
> re-ranked/renumbered 1–7.
>
> **Update 2026-07-08:** the "API contract three-way reconciliation" item (was #4) shipped as
> [#262](https://github.com/jclind/prepify/pull/262) — `docs/API_CONTRACT.md` was regenerated
> server-truth-first from all 73 routes + `/health`, and the two clear client mismatches it found were
> fixed (`editReview` query-string encoding; `getReviews` dead `username` param). The remaining
> non-blocking drift was filed to [`BACKLOG.md`](./BACKLOG.md). Item removed; #5–#7 renumbered to #4–#6.

## 1. Release-blocker burn-down ⭐ top pick

~11 open `[ ]` items in RELEASE_PLAN.md — most now owner-gated (need a decision from me); the rest
polish + verification.

> /release-readiness, then work through every remaining `[ ]` item in docs/RELEASE_PLAN.md that
> doesn't need a decision from me, on a branch, with tests. List anything that does need a decision
> at the end.

Note: the empty/error/loading states sweep (old item #3) lives in RELEASE_PLAN §A and is covered here.

## 2. Full multi-agent bug hunt

The canonical token-heavy "spend for confidence" workflow. Adversarial verification kills the
plausible-but-wrong findings that make broad bug hunts noisy.

> ultracode — Do a comprehensive bug hunt across the codebase using a multi-agent workflow: fan
> out finders across each subsystem (auth middleware, recipe CRUD, ingredient parsing,
> serving-price calc, content moderation, gamification, drafts/autosave, saved-recipes), then
> adversarially verify every finding with independent skeptics so I only get confirmed bugs. Write
> confirmed findings to docs/ with repro steps; fix the clear-cut ones on a branch with tests.

Tip: the leading "ultracode" opts into the multi-agent orchestration.

## 3. Test-suite *quality* audit (not coverage)

~130 test files already exist; the gap is meaningfulness, not count.

> Audit the existing Vitest/Jest/Cypress suites for quality, not coverage: find tests that pass
> trivially or assert nothing meaningful, flaky tests, and high-risk paths (auth, ingredient
> parsing, serving-price, review/rating CRUD, moderation) whose tests don't actually exercise the
> failure modes. Strengthen the worst offenders and add the missing edge cases.

## 4. End-to-end user-journey simulation

Token-heavy because it drives the headless browser repeatedly through real flows that unit tests miss.

> Using the run-prepify skill, drive a full end-to-end journey in the headless browser — signup →
> create a recipe (image + nutrition) → rate → save → report → admin-moderate → delete — with the
> API both up and down, screenshotting every step. Flag any broken/ugly state and fix what you find.

## 5. SEO finish + social previews

JSON-LD already exists (`src/pages/SingleRecipe/buildRecipeJsonLd.ts`) and its output escaping is now
hardened (convention **C3**, shipped) — ✅ that half is done. Two gaps remain.

> Add a test that validates the Recipe JSON-LD from buildRecipeJsonLd.ts against Google's Rich
> Results required fields, then lay out options for social-link previews (the SPA serves generic
> index.html to non-JS crawlers — RELEASE_PLAN §C): prerender vs. accept the generic card for 1.0.
> Recommend one.

## 6. Docs reconciliation

~6,400 lines of docs (REFACTOR_NOTES alone is 1,405). Cheap insurance against acting on stale audits.

> Reconcile the docs/ folder against current code: mark stale sections, reconcile the audit docs
> (server-audit, SECURITY_AUDIT, DATA_INTEGRITY_AUDIT) against what's actually been fixed, and flag
> anything contradicted by the code. Don't delete — annotate.
