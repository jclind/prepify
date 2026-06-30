# Button system

Prepify uses **one pill `.btn` system** — a base reset class plus BEM-style
modifiers — so every action button shares one shape, one hover convention, and
one set of tokens. This doc is the convention; the code that implements it is the
`.btn` block in `src/index.scss`.

## The rules

1. **One base class: `.btn`.** It provides the reset (no native chrome), the
   layout (inline-flex, centered, icon gap), the default size, the **pill** shape
   (`$radius-pill`), the transition, and the disabled treatment. Every button in
   the app composes `.btn` with one color variant and (optionally) a size.
2. **Pill shape, app-wide.** Action buttons are pill-shaped (`border-radius:
   $radius-pill`). This finishes the migration the redesigned surfaces (Recipes,
   About, Home, EmptyState, PublicProfile, Account) already started; the older
   form/settings/recipe-detail surfaces move onto it.
3. **Color comes from a variant modifier, never inline.** Pick one of the five
   variants below. Each variant's hover is an explicit color/border change, not
   `filter: brightness()` or bare `opacity`. (A few KEEP-BESPOKE buttons sit on
   the base *without* a variant — the teal auth submit, the brand-orange
   suggestion CTA — and do use a `filter: brightness()` hover; the base `.btn`
   transition animates `filter`, so they ease like the rest.) The danger color is
   the single
   `$error-red` token (see [one-danger-red-token, #208]), and the focus ring stays
   on the global `button:focus-visible` rule in `index.scss` (the `s.outline()`
   mixin) — variants never re-declare focus.

## The anatomy

```scss
.btn { /* base: reset + inline-flex layout + md size + pill + transition + :disabled */ }

/* sizes (default = md, baked into .btn) */
.btn--sm     /* compact / inline / dense rows */
.btn--lg     /* hero CTAs */
.btn--block  /* width: 100% — the responsive mobile pattern */

/* color variants */
.btn--primary       /* orange fill, white text — the main CTA            */
.btn--outline       /* white fill, gray border, dark text                */
.btn--ghost         /* no fill/border, muted text — tertiary/text actions */
.btn--danger        /* outline red that inverts to a red fill on hover    */
.btn--danger-solid  /* solid red fill — destructive confirm              */

/* shape override */
.btn--icon   /* padding:0, fixed square, $radius-circle — icon-only buttons */
```

| Variant | Resting | Hover |
|---|---|---|
| `--primary` | `$primary` fill / white text | `$primary-hover` fill |
| `--outline` | white / `$gray-400` border / `$primary-text` | border → `$primary-text` |
| `--ghost` | transparent / `$secondary-text` | text → `$primary-text` |
| `--danger` | white / `$error-red` border + text | `$error-red` fill / white text |
| `--danger-solid` | `$error-red` fill / white text | `$error-red-hover` fill |

`--icon` composes with a color variant for its hover treatment (e.g. a circular
ghost icon button is `.btn .btn--icon .btn--ghost`).

## Out of scope (deliberately not `.btn`)

- **Selection controls** — filter chips, segmented navs, and the settings toggle
  switch are *selection state*, not actions. They keep their own classes (a future
  chip/toggle component), even though several are also pill-shaped.
- **Admin-surface button colors** — Admin / BugReports / Reports /
  AdminRecipeControls render on a hardcoded slate palette (`#1f2430`, `#d8dbe0`,
  `#374151`, `#16a34a`). Those belong to the separate `$admin-*` sub-palette
  `2-scss` track; this track does not recolor them.

## Migration note

The pre-system page classes (`.sr-btn-primary`, `.about-btn-primary`,
`.recipes-empty__btn`, `.form-action-btn`, `.submit-review-btn`, …) are replaced
by `.btn .btn--*` at the call site, deleting the duplicated rule blocks. Where a
class carries layout beyond the button itself, only the button-look declarations
move to the variant.
