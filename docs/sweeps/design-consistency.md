# Design consistency sweep

> **Status:** Run 2026-06-25 (PR #180, token follow-ups #183/#185/#186/#192). Cheap wins shipped
> (`$primary-hover` + `$surface-warm-border` tokens; radius scale, breakpoint tokens, admin import-wiring,
> decorative tint). **~10 follow-ups open** in [`../BACKLOG.md`](../BACKLOG.md#ux--visual-polish) +
> [Tech debt](../BACKLOG.md#tech-debt--process--infra): pill `.btn` system, delete `RecipeThumbnail`,
> ~~icon-per-concept~~ (done — PR #205; ~~single-family Lucide~~ done — PR #206), ~~modal style config~~ (done — PR #203),
> ~~loading-state pattern~~ (done — PR #213), ~~toast punctuation~~ (done — PR #207); type scale, elevation
> re-author, ~~danger-red token~~ (done — PR #208), `$admin-*` palette, ~~`RecipeFormInput` dup~~ (done — PR #204). *(See the [run log](README.md#run-log).)*

Full-coverage visual/UX consistency audit: are colors, spacing, typography, radii, shadows, components,
states, and copy voice drawn from a shared system — or has each page drifted? Catch the drift, unify the
cheap cases (point a stray hex at the token), file the systemic ones.

> Read [`README.md`](README.md) first. Runs best **after** the Sass `@import`→`@use` migration (already
> merged) so shared partials are the single source of truth. This is a visual sweep — screenshots are the
> primary evidence.

## Kickoff

```
/worktree-create design sweep — tokens, component reuse, states, responsive, voice

Read docs/sweeps/design-consistency.md and docs/sweeps/README.md. Run the app, screenshot the key pages at
desktop + mobile (logged-out + logged-in), and do a structured consistency pass. Unify cheap drift (stray
hex/px → token); file systemic refactors to docs/BACKLOG.md (UX / visual polish). PR with before/after
screenshots of anything changed. Polish only — no redesign.
```

## The pass

1. **Design tokens.** Inventory the SCSS variables/maps/mixins (the shared partials under `src/` that
   `@use` exposes — colors, spacing scale, type scale, radii, shadows, breakpoints). Then grep the codebase
   for **hardcoded** values that bypass them: raw hex (`#ff5722` is the brand orange, the teal beta accent),
   pixel spacing/radii, `rgba()` shadows, font sizes. Each hardcoded value that has a token equivalent is a
   cheap fix; a *missing* token (a one-off color used in 3 places) is a "promote to token" backlog item.
2. **Color palette.** Confirm one brand orange, one accent, a consistent neutral ramp, and consistent
   semantic colors (success/error/warning — cross-check the toast styles). Flag near-duplicates
   (`#ff5722` vs `#ff5621` vs `#f60`) that should collapse to one token.
3. **Typography.** One type scale and weight set; headings consistent across pages (the `h1`/`h2` sizes on
   About vs Privacy vs Account); button text and labels use a consistent size/weight/letter-spacing; no
   ad-hoc `font-size` literals.
4. **Component reuse.** Are shared primitives actually reused, or re-implemented per page? Check: buttons
   (`.btn` + variants vs bespoke `<button>` styles — e.g. the About CTAs, the `home-btn`, the
   `pp-browse-btn`), cards, the `Form`/`FormInput` components, modals (react-modal config), empty states
   (recipe empty, profile empty, 404, profile-not-found — same visual language?), and the
   `RecipeCard` vs `RecipeThumbnail` overlap. Note duplication to consolidate.
5. **States.** For each interactive component, are hover / focus-visible / active / disabled / loading /
   empty / error styled consistently? *Loading resolved (PR #213):* one convention — skeleton for known-shape
   content, `TailSpin` for discrete actions — with single colour tokens (`src/util/loadingStyles`), a
   `useDelayedLoading` flash-guard, and a `.sk-hold` reserve-height utility; see
   [`../design/loading-states.md`](../design/loading-states.md). Remaining check is per-context: empty/error
   states still share a layout + tone.
6. **Iconography.** *Resolved (PR #205 + #206):* the app is now one house family (Lucide) behind one import
   boundary (`src/Components/icons`), enforced by a Vitest guard — see [`../design/icon-system.md`](../design/icon-system.md).
   Remaining check is per-context: sizes consistent within a context, and a new concept gets a semantic export
   in that module rather than a direct `react-icons/*` import.
7. **Responsive.** One set of breakpoints (the nav flips at ~725px — is that value shared or repeated?);
   no ad-hoc media queries; the master-detail Settings, the Account tabs, Add Recipe, and the recipe grid
   all reflow consistently. Screenshot at 390 / 768 / 1280 and compare alignment, gutters, and card sizing.
8. **Copy voice.** Consistency of tone (the "zero guesswork" / budget-friendly voice), heading case (Title
   Case vs sentence case — pick one for buttons, one for headings, apply uniformly), and toast punctuation
   (some end with a period, some don't — 4-qa fixed one; sweep the rest). Don't rewrite intentional authored
   prose (the About page is Jesse's voice by design).

## Tooling & where to look

- Screenshots: `.claude/skills/run-prepify/driver.mjs` and the `shotVariants.mjs` / `shot_scroll.mjs`
  helpers — capture every key page at 390/768/1280, logged-out and logged-in.
- Grep for drift: hex (`grep -rniE "#[0-9a-f]{3,6}" src --include=*.scss`), px literals, `font-size:`,
  `box-shadow:`, and compare against the token partials.
- Hot spots: the shared SCSS partials, `src/Components/` (Form, buttons, cards, modals), `src/index.scss`.

## Deliverable

A PR with: an inventory of the token system + the top drift offenders, the cheap unifications applied
(stray value → token) with before/after screenshots, and backlog items for systemic work (promote a
one-off to a token, consolidate `RecipeCard`/`RecipeThumbnail`, unify a state pattern). Pixel-identical
rendering for anything you "just" re-pointed at a token — verify with a screenshot diff.
