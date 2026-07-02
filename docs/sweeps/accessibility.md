# Accessibility sweep

> **Status:** Run 2026-06-25 (PR #179, contrast follow-ups #181/#184). Cheap wins shipped (ingredient-checklist
> role → recipe page 89→97; grey/teal/beta-tag/error-red contrast). **5 follow-ups filed — 3 resolved, 2 moved
> to the owner** in [`../BACKLOG.md`](../BACKLOG.md#accessibility): ~~autocomplete listbox + keyboard nav~~ (done — PR #201),
> ~~servings target-size~~ (done — PR #202), ~~account-heading route-map~~ (done — PR #200); `$primary-hover`
> AA-on-hover + brand orange (reverted to vivid `#ff5722`) are `[dropped]` off the sweep board (2026-07-01) —
> both belong to the owner's brand-orange/logo recolor. Re-run after that recolor lands.
> **Wave-3 re-verify (2026-07-02):** structural fixes confirmed intact by per-track verification; Lighthouse
> a11y re-measured at **96–97 orange routes / 100 off-orange** — exactly the documented owner-gated state,
> no regression from the Wave-1/2 merges. *(See the [run log](README.md#run-log).)*

Deep WCAG 2.1 AA pass over every Prepify page, logged-out **and** logged-in: automated (Lighthouse +
axe), keyboard, screen-reader semantics, ARIA correctness, contrast, and zoom/motion. This goes beyond
the cheap a11y wins in track 4-qa — it's the thorough audit.

> Read [`README.md`](README.md) first (esp. §3 — driving a logged-in session). Some open a11y items are
> already filed in [`../BACKLOG.md`](../BACKLOG.md) → Accessibility; start by reconciling against those.

## Kickoff

```
/worktree-create a11y sweep — axe, keyboard, screen reader, ARIA, contrast

Read docs/sweeps/accessibility.md and docs/sweeps/README.md. Run the app and do a structured WCAG AA pass
on every page (logged-out + logged-in). Fix small, safe a11y wins (labels, names, alt, roles that don't
need CSS changes); file layout/contrast/refactor items to docs/BACKLOG.md → Accessibility. Open a PR with
before/after Lighthouse a11y scores per page.
```

## The pass

1. **Automated baseline.** Lighthouse `accessibility` + `axe-core` on every route: Home, Recipes, single
   recipe, public profile, about/privacy/terms/help, login/signup/forgot, 404, and the logged-in Account
   (+ tabs) / Settings (all 4 sections) / Add Recipe. Record per-page scores. *(Track 4-qa already took the
   recipe page 80 → 89; the remainder — ingredient `<li role="checkbox">`, recipe-nav contrast,
   servings-input target-size — are in the backlog. Confirm them and look for what the cheap pass missed.)*
2. **Keyboard.** Tab through every page: logical focus order, **visible** focus ring everywhere (track 3a
   moved rings to `:focus-visible` — verify no element lost its ring), no keyboard traps, modals
   (react-modal) trap + restore focus and close on Esc, the mobile nav menu is operable and returns focus to
   its trigger, and every interactive control (cards, the ingredient check-off, star rating, dropdowns) is
   reachable and activatable with Enter/Space. Add a skip-to-content link if missing.
3. **Screen-reader semantics.** One `<h1>` per page and a sane heading hierarchy (no skipped levels);
   landmarks (`<nav>/<main>/<footer>`, `<main>` present once); **alt text** on every meaningful image
   (recipe images, avatars) and `alt=""`/`aria-hidden` on decorative ones (the SVG icons); accessible names
   on all buttons/links (icon-only buttons need `aria-label`); and `aria-live` for async UI — toasts
   (`react-hot-toast`), inline form validation, "Load more" results, save/rating state changes.
4. **ARIA correctness.** Roles only on elements that allow them and only when native semantics won't do.
   Known offenders to verify/fix: the ingredient list `<li role="checkbox">` (invalid — breaks the list;
   move the role to an inner element) and the autocomplete dropdown's `<ul role="listbox"><li><button
   role="option">` (a `<li>` between listbox and options + no arrow-key nav / `aria-activedescendant` —
   both in BACKLOG). Check `aria-checked`/`aria-expanded`/`aria-current` reflect real state.
5. **Contrast.** WCAG AA (4.5:1 text / 3:1 large + UI). Lighthouse flags the recipe-nav `.dnav__cta--signup`
   and `.dnav__link-label` on the solid nav — these are **brand colors**, so propose a token-level fix and
   file it (don't recolor blind). The `.beta-tag` is also low-contrast but is **deliberately deferred** to
   the Phase-5 beta-tag cutover — leave it.
6. **Forms.** Every input has an associated `<label>` (or `aria-label` — e.g. the servings input got one in
   4-qa); required fields are programmatically marked; validation errors are associated with their field
   (`aria-describedby`) and announced; the file-upload and dropdowns are labelled.
7. **Zoom, reflow, motion.** 200% browser zoom and 320px-wide reflow without loss of content/function;
   `prefers-reduced-motion` honored for the nav condense, the star-hover, and any transitions; target sizes
   ≥24×24 (the servings stepper input is under — backlog).

## Tooling & where to look

- Lighthouse (`--only-categories=accessibility`) + `@axe-core/playwright` driven through a copy of
  `.claude/skills/run-prepify/driver.mjs`. Parse the failing `auditRefs` to get exact node snippets.
- Real screen-reader spot-checks (VoiceOver on macOS) for the critical flows: browse → recipe → save,
  and Add Recipe.
- Hot spots: `src/Components/Navbar/*`, `src/Components/StarRating/StarRating.tsx`,
  `src/Components/SearchRecipesInput/SearchRecipesInput.tsx`, `src/pages/SingleRecipe/SingleRecipe.tsx`,
  `src/index.scss` (focus/outline mixins).

## Deliverable

A PR with a per-page before/after a11y-score table, the cheap wins applied (names, labels, alt, valid
roles that don't need CSS), and backlog entries for everything structural (contrast tokens, the role
refactors, target-size). Note which pages were screen-reader spot-checked vs automated-only.
