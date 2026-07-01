# Elevation / shadows

Prepify's drop shadows had drifted: ~40 ad-hoc `box-shadow:` literals across ~30
stylesheets, with no shared system. Resting cards alone used both `.06` and `.08`
alpha over three different `y`/`blur` pairs; the raised/hover/dropdown tier spanned
six visually-interchangeable values (`0 10px 26px` → `0 14px 30px`); and the tint
was a mix of pure black, a slate `rgb(48,56,65)`, a warm `rgb(40,30,20)`, and
`$admin-slate-900`. This doc names a **6-step elevation ramp** as the `$elevation-*`
token group in `src/helpers.scss`, so a shadow is a decision drawn from one ramp —
a *height*, not a number someone eyeballed in a single file.

## The rules

1. **Use an `$elevation-*` step, never a raw `box-shadow` value.** That's the whole
   point — a new `box-shadow: 0 5px 15px rgba(0,0,0,.1)` re-introduces the drift the
   ramp exists to kill. Pick the step nearest the surface's height (see the usage
   notes per token below).
2. **Steps read as height, not role.** Like `$gray-*` and `$radius-*`, this is a
   *primitive* scale: `1` barely lifts a surface, `6` floats a full-screen overlay.
   A surface's shadow should go up a step when it's raised (a card that lifts on
   hover goes `$elevation-3` → `$elevation-4`), so resting/hover pairs read as one
   consistent lift across the app.
3. **One tint across the ramp.** Every step is `rgba($primary-text, …)` — the brand
   text slate `rgb(48,56,65)` — not pure black. A single cool tint makes every
   raised surface feel part of the same material; don't hand-roll a black or warm
   shadow alongside these.
4. **Glows are emphasis, not height — keep them separate.** The brand-tinted
   `$shadow-brand*` / `$shadow-teal` tokens signal a CTA, not elevation. Don't fold
   them into the neutral ramp, and don't reach for the ramp when you want an accent
   glow.
5. **Theming is a colour concern, so this stays SCSS.** Like the type scale, the
   ramp gets no benefit from CSS custom properties until theming lands — and even
   then it's the *colour* half (`$primary-text`) that becomes runtime-swappable, not
   the geometry. Leave the ramp as Sass tokens.

## The tokens

The neutral elevation ramp — one slate tint, rising by height:

| Token | Value | Use |
|---|---|---|
| `$elevation-1` | `0 1px 3px rgba($primary-text, .14)` | hairline — toggle knobs, faint insets |
| `$elevation-2` | `0 2px 8px rgba($primary-text, .12)` | small — sticky nav, badges, price chips |
| `$elevation-3` | `0 6px 18px rgba($primary-text, .10)` | resting cards — RecipeCard, Home cards, recipe panels |
| `$elevation-4` | `0 12px 28px rgba($primary-text, .14)` | raised — card hovers, dropdowns, popovers |
| `$elevation-5` | `0 18px 50px rgba($primary-text, .22)` | modals / dialogs |
| `$elevation-6` | `0 24px 60px rgba($primary-text, .40)` | full-screen overlay backdrop |

The colored brand "glow" shadows — accent shadows tinted to the brand hue, used on
CTAs. Kept separate from the neutral ramp:

| Token | Value | Use |
|---|---|---|
| `$shadow-brand` | `0 8px 20px rgba($primary, .18)` | primary CTA hover glow |
| `$shadow-brand-strong` | `0 6px 16px rgba($primary, .28)` | stronger CTA glow (draft publish) |
| `$shadow-teal` | `0 8px 18px rgba($secondary, .30)` | teal auth-submit glow |

## Out of scope — left bespoke

Four shadows are directional or multi-layer, where the ramp's geometry would be
wrong. They stay as raw literals (not on the ramp):

- **The two-layer add-ingredient bar** (`src/index.scss`) — a Stripe-style stacked
  shadow (`… -2px, … -3px`) that reads as a floating toolbar; a single-layer ramp
  step can't reproduce it.
- **The horizontal off-canvas drawer** (`Recipes.scss`, `-8px 0 30px …`) — casts
  sideways, not down.
- **The two upward sticky-bar shadows** (`AccountStatusBanner`, `AddRecipeSummaryBar`,
  `0 -2px/-3px …`) — bottom-anchored bars that cast *up* onto the page.

**Focus rings** (`box-shadow: 0 0 0 3px …`) also use `box-shadow`, but they're focus
indicators, not elevation — a separate concern, left for a later a11y pass (they
pair loosely with the `$primary-hover` accessibility work). The two `0 0 0 1px`
border-via-shadow uses (selected-state ring, hairline card border) are likewise
outlines, not elevation, and stay put.

## Notes

- **Migration (2026-07-01).** 37 distinct old shadow values collapsed onto the 9
  tokens; ~51 declarations across 28 files were repointed. Two mappings were
  value-identical exact matches (the teal auth glow, the draft-publish brand glow);
  the rest normalize onto the nearest step — the same intentional, documented
  collapse the type scale and admin palette made. This retired the interim
  `$card-box-shadow` / `$shadow-soft` / `$shadow-chip` tokens (added as a stopgap
  while this re-author was deferred) and the local `$soft-shadow` in `SingleRecipe`.
- **Verification.** The compiled-CSS diff vs `development` showed the non-shadow CSS
  **byte-identical** — only `box-shadow` declarations changed — and a headless pass
  across home / recipes / recipe-detail / about / profile (+ a card hover) confirmed
  the shadows read cohesively with no surface looking heavier or flatter than
  intended.
- **The one visible shift** is the tint: ~30 previously pure-black shadows now cast
  the slate tint, and a handful of surfaces snap a step (e.g. the ultra-soft warm
  account cards move from `0 4px 14px /.05` onto `$elevation-3`, unifying "resting
  card" to one height). All subtle and intentional.
