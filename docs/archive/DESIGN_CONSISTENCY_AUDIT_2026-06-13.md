# Design Consistency Audit — 2026-06-13

Scope: visual/design consistency across the recently redesigned/added surfaces —
Home, Recipes (RecipeCard), Single Recipe, Account, Public Profile, Admin
(Analytics/Reports/Audit/Users + moderation controls), Footer, Desktop Nav,
Legal pages, Settings.

Method: static review of all 63 SCSS files against the shared token file
`src/helpers.scss`. No code changes were made — this is findings + recommendations.

---

## TL;DR

The individual pages each look polished, but **three separate color systems now
coexist** and a large share of the new surfaces never reference the shared token
file at all. The biggest risk isn't any single page — it's that "the orange" and
"the gray" and "the card" are each defined many times with slightly different
values, so future changes (rebrand, dark mode, a11y contrast fixes) require
hunting down dozens of hardcoded hex literals instead of editing one token.

Priority order:
1. **F1 — Three coexisting palettes** (legacy / warm-cream / cool-admin). _High._
2. **F2 — 13 files bypass `helpers.scss` entirely.** _High._
3. **F3 — Primary-hover color is un-tokenized and applied inconsistently.** _Med._
4. **F4 — Card `border-radius` drift (10/14/16/20px + a local `$soft-radius`).** _Med._
5. **F5 — Box-shadow is ad-hoc almost everywhere (31 inline vs 2 token uses).** _Med._
6. **F6 — Local "token islands" re-declare global concepts.** _Low._
7. **F7 — Warm-family cohesion is genuinely good** (keep it — see positives). _Info._

---

## Baseline: the shared token system (`src/helpers.scss`)

- Brand: `$primary #ff5722` (orange), `$secondary #00adb5` (teal).
- Text: `$primary-text #303841`, `$secondary-text #595f66`, `$tertiary-text #979ba0`.
- Surfaces: `$primary-background #eeeeee` (body), grays `$gray-50…$gray-600`.
- Status: `$success-green`, `$error-red`, `$warning-amber` (+ alert tints).
- Shape: `$border-radius 10px`, `$card-box-shadow`, `$max-width 1400px`.

This file is the intended single source of truth. The findings below are all
deviations from it.

---

## F1 — Three coexisting color systems  *(High)*

The redesigned surfaces fall into three palettes that don't share values:

| Palette | Where | Characteristic colors |
|---|---|---|
| **Legacy tokens** | global chrome, Recipes, forms | `$primary` orange, `$secondary` teal, `$gray-*`, `#eeeeee` body |
| **Warm cream** | Account, Public Profile, Home, AchievementsModal | `#fff` cards on cream borders `#ece2d6` / `#e3d9ca` / `#f0e8dd` / `#efe6db` / `#efe6da` / `#fdf3ec`; orange→`#ff8a5c` gradients |
| **Cool admin** | Admin/*, ReportControl, SavedFilterBar, AdminRecipeControls, AccountStatusBanner | Tailwind slate/gray `#374151 #6b7280 #9ca3af #111827 #e5e7eb #d1d5db #d8dbe0`; dark nav `#1f2430`; **blue** accent `#3b82f6 / #2563eb` |

The cool-admin palette is the most divergent: it introduces a **blue** action
color (`#3b82f6`, `#2563eb`) that exists nowhere in the brand. Admin is staff-only
so this is defensible as a deliberate "tool" skin — but it should be a *named,
documented* sub-theme, not 200+ loose hex literals. Right now Admin/Analytics,
Reports, Audit, and Users each re-spell the same grays independently.

Representative refs: `src/pages/Admin/Analytics/Analytics.scss` (33 hex literals),
`src/pages/Admin/Reports/Reports.scss`, `src/pages/Account/Account.scss:27-28,163,186`,
`src/pages/PublicProfile/PublicProfile.scss:47`.

**Recommendation:** Add three token groups to `helpers.scss` (or a new
`_tokens.scss`): `$surface-warm-border`, `$surface-warm-tint`, the orange
gradient stops, and an `admin-*` group (`$admin-bg`, `$admin-surface`,
`$admin-ink-*`, `$admin-accent`). Replace literals with these. Even if the three
palettes stay visually distinct, they should each resolve to a small named set.

---

## F2 — 13 SCSS files never import the token file  *(High)*

These files contain zero `@use helpers` and hardcode everything:

```
src/Components/SavedFilters/SavedFilterBar.scss
src/Components/ReportControl/ReportControl.scss
src/Components/AdminRecipeControls/AdminRecipeControls.scss
src/Components/AccountStatusBanner/AccountStatusBanner.scss
src/Components/Layout/Layout.scss
src/pages/Admin/AdminLayout.scss
src/pages/Admin/Audit/Audit.scss
src/pages/Admin/Users/Users.scss
src/pages/Admin/Analytics/Analytics.scss
src/pages/Admin/Reports/Reports.scss
src/pages/Account/SavedRecipes/SavedRecipes.scss
src/pages/AddRecipe/ListComponents/Item.scss
src/pages/SingleRecipe/PrintableRecipe/PrintableRecipe.scss
```

(PrintableRecipe is fine — print needs literal black/white. The rest are not.)

These are exactly the admin/moderation surfaces from F1, which is why that
palette drifted: there was no token to reach for. **Recommendation:** have each
`@use '...helpers.scss' as s;` and consume the tokens (existing + new admin
group).

---

## F3 — Primary-hover color un-tokenized and inconsistent  *(Med)*

The darkened-orange hover `#e74e1d` is hardcoded in 3 places and named locally in
a 4th:

- `src/Components/Footer/Footer.scss:9` → `$primary-hover: #e74e1d;` (local var)
- `src/pages/Home/Home.scss:175` → `&:hover { background: #e74e1d; ... }`
- `src/pages/SingleRecipe/SingleRecipe.scss:173,625` → `background: #e74e1d;`

Meanwhile `src/pages/PublicProfile/PublicProfile.scss:37` darkens the *same*
primary button with `filter: brightness(1.05)` instead — so the identical CTA
hovers differently depending on the page. **Recommendation:** add
`$primary-hover: #e74e1d;` to `helpers.scss` and use it everywhere; pick one
technique (solid token vs filter) for primary-button hover.

---

## F4 — Card border-radius drift  *(Med)*

`$border-radius` token = **10px**, but cards across the new pages use 14/16/20px,
and `border-radius: 10px` is *also* re-typed inline 16 times instead of using the
token. Card radii observed:

- Home: recipe card `14px`, meal column `16px`, pill `999px` (`Home.scss:60,102,169`)
- Account: head `20px`, inner cards `14px`/`16px`/`12px` (`Account.scss:29,127,251,395,398`)
- Public Profile: head `20px` (`PublicProfile.scss:48`)
- Single Recipe: local `$soft-radius: 16px` + inline `10px/12px/5px/9px` (`SingleRecipe.scss:11,278,288,574`)
- RecipeCard: `14px` (`RecipeCard.scss:6`)

So "a card" is variously 12/14/16/20px with no rule. **Recommendation:** define a
small radius scale — e.g. `$radius-sm: 10px`, `$radius-md: 14px`,
`$radius-lg: 20px`, `$radius-pill: 999px` — and map each surface onto one. The 16
inline `10px`s should all become `$radius-sm`.

---

## F5 — Box-shadow is ad-hoc  *(Med)*

`$card-box-shadow` token exists but is used **2 times**; there are **31 inline
`box-shadow`** declarations with hand-tuned rgba/offset values (e.g.
`rgba(0,0,0,0.06) 0px 6px 18px`, `0 4px 14px rgba(0,0,0,0.05)`,
`0 8px 22px rgba(255,87,34,0.18)`). Several are near-duplicates that differ only
in the third decimal. **Recommendation:** add an elevation scale
(`$shadow-card`, `$shadow-card-hover`, `$shadow-glow-primary`) and replace the
inline values. The warm avatar-glow `rgba(255,87,34,0.18)` is repeated verbatim in
Account and PublicProfile — a clear token candidate.

---

## F6 — Local "token islands"  *(Low)*

Several files declare their own private vars for global concepts, which is how
drift starts:

- `SingleRecipe.scss:10-13` — `$soft-border`, `$soft-radius`, `$soft-shadow`, `$danger #d23f31`
- `Footer.scss:7-9` — `$footer-surface #ffffff`, `$footer-border #e6e6e6`, `$primary-hover`

Note `$danger #d23f31` (SingleRecipe) vs `$error-red #dc3545` (token) vs `#d64545`
(ReportControl/Reports) — **three different "danger reds"** for the same intent.
Consolidate to one token. `$footer-border #e6e6e6` is just `$gray-300`.

---

## F7 — What's already consistent (keep it)  *(Info / positive)*

- **Warm-family headers are deliberately aligned:** `Account .acct-head` and
  `PublicProfile .pp-head` share `#fff` + `1px solid #ece2d6` + `border-radius:20px`
  + `box-shadow:0 4px 14px rgba(0,0,0,0.05)` + the avatar glow. This is the right
  instinct — it just needs to be expressed as shared tokens rather than copied hex.
- **Typography** is consistent: everything inherits Montserrat + `letter-spacing:
  0.05em` from `index.scss`, and the global `h2/h3/h4` scale is respected.
- **SCSS scoping discipline is good:** new pages prefix classes (`acct-`, `pp-`,
  `sr-`, `home-`) and avoid the unscoped global `nav {}` trap by using
  `div role="navigation"`. Keep this convention.
- **Status/alert colors** correctly use the shared `.error/.warning/.success`
  tints from `index.scss`.

---

## Suggested remediation order

1. **Tokenize the cheap wins first** (low risk, high leverage): `$primary-hover`,
   the danger red, the avatar-glow shadow, `$footer-border → $gray-300`.
2. **Add radius + elevation scales** (F4, F5) and sweep inline `10px` / shadows.
3. **Introduce a named `admin-*` token group** and wire the 13 token-less files
   into `helpers.scss` (F2), then replace Admin literals (F1).
4. **Document the three intended palettes** in this file or CLAUDE.md so the
   warm/cool split is a decision, not an accident.

None of this changes the rendered design — it's a refactor toward single-source
tokens so the look stays consistent as the app evolves. Estimated: items 1–2 are
small, item 3 is the bulk of the work (Admin surfaces).
