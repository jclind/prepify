# Admin sub-palette

Prepify's customer-facing UI is **warm** — orange brand, cream/grey neutrals
(`$gray-*` run warm: `#eeeeee`/`#d6d6d6`/…). The **admin / moderation console** is
deliberately **cool**: a Tailwind-derived slate/blue system that reads as a
separate "tool" surface, not a brand page. This doc names that palette as the
`$admin-*` token group in `src/helpers.scss` so the warm/cool split is a decision,
not ~200 loose hexes scattered across the admin stylesheets.

## The rules

1. **Admin surfaces use `$admin-*`, not the brand tokens.** The console's greys are
   *cool* and its status hues are the *dense Tailwind set*, both distinct from the
   warm brand. Don't reach for `$gray-*`, `$primary*`, or the brand `$alert-*`
   triplets inside the admin console — they're a different temperature and will
   look out of place. The only brand tokens admin reuses are the truly-shared ones:
   `$white`, `$error-red` (inline-error/danger text in `ReportControl`), and
   `$tertiary-text`.
2. **Neutrals are a scale; statuses are semantic.** Mirrors how `helpers.scss`
   already splits `$gray-*` (scale) from `$alert-*` (role). Use the slate step that
   matches the contrast tier you need; use the status group that matches the
   *meaning* (approved / pending / open / hidden), never the raw hue.
3. **Status colour carries meaning — keep the mapping.** green = approved/resolved,
   indigo = pending/review/general, amber = open/featured/suspended, red =
   hidden/banned/rejected, purple = automod. A status pill is a `*-bg` + `*-text`
   pair (some add `*-border`/`*-fill`).
4. **Warm outliers are NOT admin.** A few warm, brand-orange-ish values live in
   files this group touches but belong to the *brand*, so they're named under
   `$primary-*`, not `$admin-*`: the no-photo `RecipePlaceholder` gradient
   (`$primary-wash` → `$primary-wash-deep`) and the account-restriction banner text
   (`$primary-deep`). Shadows (`rgba(0,0,0,…)`) are left raw for the elevation
   re-author track to own.

## The tokens

Cool neutral spine — text hierarchy → surfaces → borders:

```scss
$admin-slate-900  // #111827  headings, stat values (max contrast)
$admin-slate-700  // #374151  body text, neutral-pill text
$admin-slate-600  // #4b5563  secondary / default control text
$admin-slate-500  // #6b7280  muted labels, meta, section eyebrows
$admin-slate-400  // #9ca3af  hints, timestamps (AA floor on white)
$admin-slate-300  // #d8dbe0  default input/button border
$admin-slate-200  // #e5e7eb  card borders, inert pill bg, row separators
$admin-slate-100  // #f3f4f6  neutral surface, count-badge bg
$admin-slate-50   // #f9fafb  lightest surface (bulk bar, page bg)
$admin-chrome     // #1f2430  dark sidebar + active tab/toggle fill
$admin-on-chrome  // #b9bec9  nav-link text on the dark chrome
```

Interactive:

```scss
$admin-action     // #3b82f6  active nav, badge, focus ring
$admin-link       // #2563eb  hyperlinks
```

Status groups (`-bg` + `-text` [+ `-border`/`-fill`]):

```scss
// approved / resolved (green)
$admin-ok-bg #dcfce7 · $admin-ok-text #166534 · $admin-ok-fill #16a34a · $admin-ok-fill-hover #15803d
// pending / review / general (indigo)
$admin-info-bg #e0e7ff · $admin-info-text #3730a3
// open / featured / suspended (amber)
$admin-warn-bg #fef3c7 · $admin-warn-text #b45309 · $admin-warn-text-dk #92400e · $admin-warn-border #fcd34d · $admin-warn-fill #d97706
// hidden / banned / rejected (red — distinct from brand $error-red)
$admin-danger-bg #fee2e2 · $admin-danger-text #b91c1c · $admin-danger-text-dk #7f1d1d · $admin-danger-border #fca5a5 · $admin-danger-fill #dc2626
// automod / special categories (purple)
$admin-automod-bg #faf7ff · $admin-automod-border #c7b3e6 · $admin-automod-text #6b21a8 · $admin-automod-label-bg #ede4fb
$admin-review-bg #fae8ff · $admin-review-text #86198f
```

Classification accents — report-type / bug-category chips. A separate axis from
status (they label *what kind* of item it is, not its state), so the green/amber
variants get their own tokens rather than borrowing `$admin-ok-*` / `$admin-warn-*`
— re-tuning a status hue must not silently shift a category chip. They currently
mirror those hues. The indigo "general" base and purple "review" category
legitimately reuse `$admin-info-*` / `$admin-review-*` per their documented
general / special-category meanings.

```scss
$admin-cat-green-bg #dcfce7 · $admin-cat-green-text #166534  // report .user, bug .idea
$admin-cat-amber-bg #fef3c7 · $admin-cat-amber-text #92400e  // bug .confusing
```

## Notes

- **Normalization happened.** The migration collapsed ~16 near-duplicate values
  onto scale steps (e.g. `#d1d5db`→`$admin-slate-300`, `#eef0f2`/`#e7e9ee`/`#e2e8f0`
  →`$admin-slate-200`, `#f1f5f9`/`#f1f2f4`→`$admin-slate-100`, `#991b1b`→
  `$admin-danger-text`, `#4338ca`→`$admin-info-text`). The shifts are
  sub-perceptible and intentional — the point of the scale.
- **Files on this palette:** `AdminLayout`, `Analytics`, `Audit`, `BugReports`,
  `Ingredients` (`src/pages/Admin/Ingredients/Ingredients.scss`), `Reports`,
  `Users` (admin pages); `AdminRecipeControls`, `ReportControl`,
  `BugReportModal`, `ClassifierNote`, `AccountStatusBanner`, `RecipePlaceholder`
  (admin/moderation components). `DefaultAvatar` and `AddRecipe/ListComponents/Item`
  hold no colour literals (colours set inline / pure layout), so they stay raw.
- Third design-system doc, after [`icon-system.md`](icon-system.md) and
  [`button-system.md`](button-system.md).
```
