# SCSS conventions

A living note of the styling conventions this codebase leans on, so choices are
decisions on the record rather than things you reverse-engineer from the SCSS.
It starts small; add sections as patterns get pinned down.

Tokens live in `src/helpers.scss`; the shared button system lives in
`src/index.scss` (`.btn` + `--primary/--outline/--ghost/--danger/--danger-solid`).

---

## Hover & motion

There are **two** hover languages, on purpose. The dividing line is simple:

> **Content lifts. Chrome doesn't.**

### 1. The Lift system — content on a page

Everything a user acts on *within the page* — `.btn` variants, cards, tiles —
shares one motion language:

- One timing token: **`$hover-timing` (0.15s ease)**, easing every animated
  property together.
- Surfaced buttons rise **`$hover-lift` (−2px)** and gain a fill-matched glow
  (`$shadow-brand` / `$shadow-teal` / `$shadow-danger`); cards rise the larger
  **`$hover-lift-card` (−4px)**.
- Orange fills **lighten** on hover by the single **`$hover-brighten`
  (brightness 1.06)** — never darken (the one documented exception is
  `.btn--danger-solid`, which darkens because a red destructive fill going
  *brighter* reads wrong).
- `.btn--ghost` is deliberately the flat member: colour → ink only, no lift.

The lift metaphor is "this surface rises off the page toward you." It only makes
sense for elements that sit *on* the page.

### 2. The chrome dialect — the navbar & footer

The navbar (desktop bar + mobile menu) and the footer are **chrome**: fixed
frame around the page, not content on it. They are their own component family
for a real reason — their colours theme with the surface (the bar is light text
over the Home hero photo, dark text once solid), driven by `--dnav-*` /
`--menu-*` custom props. That is why nav CTAs stay off the `.btn` variant
classes.

Chrome has its own, deliberately narrower hover language:

- One timing token: **`$nav-timing` (0.12s ease)** — snappier than page content,
  applied across the whole nav + footer surface. No `linear`, no one-off
  durations, and **nothing snaps** (every property a hover changes is in the
  transition list).
- Feedback is **colour / fill / opacity only. Chrome never lifts.** A −2px lift
  on a control embedded in a fixed bar reads twitchy and fights the bar's
  solidity. The nav's button-analogues (Sign up, Create) share the system's
  brighten magnitude and timing philosophy but stay flat.

So: don't reach for `$hover-lift` or `translateY` inside the nav or footer. If a
nav control needs more presence, give it colour/fill, not motion.

### Which do I use?

| You're styling… | Use |
| --- | --- |
| A button/card/tile in the page body | the Lift system (`.btn` / `$hover-timing` / `$hover-lift`) |
| Anything in the navbar or footer | the chrome dialect (`$nav-timing`, flat) |

### Outlines: lift, except in a compact toolbar

`.btn--outline` (grey border → ink text, **lift**) is the neutral secondary —
Cancel, Print, Save, Add rating. It lifts like any content button, and it never
hovers to a brand colour (a *Cancel* turning orange reads wrong).

Some surfaces also have **bespoke outline pills** — a warm/neutral border that
hovers **border+text → brand orange** — for edit/utility actions: the recipe
owner's *Edit*, the account *Edit profile*, the `/recipes` *Filters* and *Sort*.
Two rules keep them coherent:

1. **An outline lifts to match its neighbours.** A standalone outline sitting
   next to controls that lift — owner *Edit* beside *Delete*, account *Edit
   profile* beside the lifting icon buttons, the drawer *Reset* beside *Apply* —
   lifts too. It shouldn't be the one flat control in a lifting row.
2. **A compact toolbar is a flat exception** — the same reasoning as nav chrome.
   The `/recipes` *Filters* + *Sort* pills are a dense control strip; a −2px lift
   on a 44px pill in a toolbar reads twitchy, so they stay flat. They still
   share one hover (orange border+text) and one **resting** border
   (grey `$gray-400`).

The Settings outlines (`.sr-btn-outline`) are a deliberate teal-hover accent —
their own consistent set, documented as an exception, not part of the orange
lane.

---

## Radii

Corner radii come from the `$radius-*` scale — `$radius-xs 4 · $radius-sm 6 ·
$radius-md 8 · $radius-lg 10 · $radius-xl 12 · … · $radius-pill 999px` (the alias
`$border-radius` is `$radius-lg`). **No off-scale literals** — a stray `7px` or
`10px` one-off should snap to the nearest step. Primary CTAs are pills
(`$radius-pill`); small square icon buttons land around `$radius-md`.

## Focus rings

**One focus ring, everywhere:** the shared **`@include outline()`** — the blue
`#4d90fe`, `outline-style: auto` ring — on every focusable control, shown for
keyboard focus only (`:focus-visible`). It's provided globally for `<button>`
and `<a>` in `index.scss`; a bespoke control includes the mixin directly. Never
`outline: none` without a `:focus-visible` restore, and don't hand-roll a
coloured ring (an orange 2px ring on a card is drift, not a variant). Use
`outline-offset` when a control needs the ring inset (a row) or nudged out (a
tile).

### The field-focus glow is a separate signal — `@include focus-glow()`

Text inputs, textareas, and the Settings controls also cast a soft **coloured
halo** while focused (paired with a `border-color` shift) — the `box-shadow: 0 0
0 3px rgba(accent, …)` you see on a focused field. That is **not** the a11y
`outline()` ring: `outline()` is the blue `outline-style: auto` ring, the glow is
a coloured `box-shadow`. They usually coexist — the glow most often sits on
`:focus` / `:focus-within` (so it shows on click too), while `outline()` handles
`:focus-visible`. But on a few fields (the textarea, the `md` input, the signup
checkbox) the glow *is* the `:focus-visible` indicator, doubling as the keyboard
focus ring (WCAG 2.4.7) where a bespoke control drops `outline`. Both are
legitimate.

The glow comes from **`@include focus-glow($color, $opacity)`** in `helpers.scss`.
The geometry (`0 0 0 3px`) is fixed — the mixin *is* the one definition — while
the tint follows the field's accent: teal `$secondary` at `0.15` is the default
(`@include s.focus-glow;`), with `$primary` (the `/recipes` search), `$error-red`
(invalid), and a success green (valid) as the branded/validation variants. **Don't
hand-roll `box-shadow: 0 0 0 3px …` on a focused field** — reach for the mixin so
the spread stays single-sourced. Opacity still varies slightly per surface
(`0.12`–`0.25`); that spread is preserved, not yet normalised.

---

## To document later

- Colour tokens (`$primary` vs `$primary-accessible`, the teal pair) and the
  pending brand-orange recolor.
