# Button hover audit

> Companion to [`button-system.md`](./button-system.md). That doc unified button
> **colour** (PR #210); this one audits the button **hover motion**, which was
> never standardized, and proposes one language to collapse it onto.
>
> **Status:** ✅ implemented — **B · Lift** chosen and migrated. Hover motion is
> now tokenized in `helpers.scss` (`$hover-lift` / `$hover-lift-card` /
> `$hover-timing`) and every action button + card routes through it. The temp
> `/button-hover-audit` page (used for the pick) was removed in-branch, same as
> the `/icon-audit` / `/elevation-audit` precedent.

## Why

The `.btn` system gives every button one shape, colour, and a colour-only hover
(`background`/`border`/`color`, `0.15s ease`). But ~20 buttons layer **ad-hoc
motion** on top — lifts, brightness, scale — that never went through a system.
The result is that "how a button reacts to your cursor" is different depending on
which page you're on.

## The drift (what ships today)

| Effect family | Values found in the wild | Where |
|---|---|---|
| **Lift** (`translateY`) | `-1px`, `-2px`, `-3px`, `-4px` — no rule | Home CTA `-2` (Home.scss:226), About `-2` (About.scss:66), Saved filter `-1` (SavedRecipes.scss:37), Recipes sort `-2` +brand-shadow +icon *down* 2px (Recipes.scss:258), EmptyState `-1` (EmptyState.scss:64), HomeHero `-1` (HomeHero.scss:72), Drafts `-2`, PublicProfile `-2` |
| **Brightness** (`filter`) | `1.05`, `1.06`, `1.07`, `108%`, `110%` — and **`0.95` (darkens!)** | EmptyState 1.05, HomeHero 1.06, Recipes chip 1.07 (Recipes.scss:330), DraftBanner 108%, SummaryBar 110% (AddRecipeSummaryBar.scss:115), **FormStyles 0.95** (FormStyles.scss:229) — the auth submit gets *darker* on hover, the opposite of every other fill |
| **Scale** (`transform: scale`) | `1.03`, `1.04`, `1.08` | NavMenu 1.03, PublicProfile avatar 1.04 (PublicProfile.scss:241), RecipeCard image 1.08 |
| **Card lift** | `-3px`+elevation-4, `-4px`+elevation-4 | Home trending (Home.scss:80), RecipeCard (RecipeCard.scss:14) |
| **Timing** | `0.1s`, `0.12s`, `0.15s`, `0.16s`, `0.18s`, `0.2s`, `0.25s`, `0.3s`; `ease` / `linear` / `cubic-bezier`; several `transition: all` | app-wide |

**Headline problems:** (1) the same "rise on hover" idea exists at four distances;
(2) brightness has six magnitudes and one runs backwards; (3) timing is fragmented
and a few `transition: all` catch-alls animate whatever happens to change.

## Candidate hover languages

Three coherent options, each covering primary / outline / ghost / card. All three
share **one 150 ms `ease` timing token**. Under the existing
`prefers-reduced-motion` block in `index.scss`, the hover state still applies but
its transition *duration* collapses to ~0 — so the lift/colour snap in with no
animation, regardless of the pick. (The block zeroes durations, not the transforms
themselves; a 2px instant offset isn't animated motion.)

### A · Calm — colour only
Buttons never move; hover is a pure colour response (the current `.btn` baseline,
extended to *everything*). Motion is reserved for cards (shadow deepens, no lift).
Most restrained; zero layout movement; safest but least "alive."

### B · Lift — uniform rise + shadow *(recommended)*
Everything rises **one** amount and gains a shadow: buttons `translateY(-2px)` +
`$shadow-brand`, cards `translateY(-4px)` + `$elevation-4`, ghost stays flat (it
has no surface to lift). Plus the colour shift from A. This **codifies the most
common current pattern** (`-2px` is already the plurality), so it's the smallest
conceptual change from today while making it uniform. Tactile without being loud.

### C · Press — one brightness + click press
Fills brighten by a single `brightness(1.06)` on hover (replacing the six ad-hoc
values), and every button presses `translateY(1px)` on `:active`. Motion happens
on *click*, not hover — energetic and physical, no vertical drift. Closest in
spirit to the brightness-heavy surfaces (SummaryBar, HomeHero) but unified.

## Decision: B · Lift *(chosen 2026-07-01)*

The least disruptive normalization — most buttons already lifted, so it mostly
meant agreeing on one distance (`-2px`), one shadow, and one timing, then deleting
the six one-off brightness values and the backwards `0.95`. Keeps the app feeling
responsive, reads as intentional, and the card lift (`-4px`) it formalizes is
already what RecipeCard does.

## What shipped

**Tokens** (`helpers.scss`): `$hover-lift: -2px`, `$hover-lift-card: -4px`,
`$hover-timing: 0.15s ease` — one duration/easing for every hover property — plus
`$hover-brighten: brightness(1.06)`, the single canonical "lighten on hover" for
orange fills.

**System** (`index.scss`): the `.btn` base transition is retimed to `$hover-timing`
and now animates every hover property together; the surfaced variants
(`--primary`/`--outline`/`--danger`/`--danger-solid`) rise `$hover-lift` + gain a
shadow whose glow follows the fill — `$shadow-brand` for the orange primary,
`$shadow-danger` for the red danger variants, and neutral `$elevation-2` for the
colourless outline — while `--ghost` stays flat (no surface). `.load-more-btn`
gets the outline treatment.

**Orange fills lighten (not darken) on hover.** The colour half of the language:
every orange **fill** button applies the single `$hover-brighten` on hover instead
of swapping to a darker shade (the old mix of `$primary-hover` darkens, hardcoded
`#a52f0a`/`#f4501e`, and six ad-hoc `brightness()` magnitudes collapses to this one
value). Covers `.btn--primary`, `home-view-all`, `cook-suggestion-btn`,
`save-recipe-btn` (both saved/unsaved), EmptyState `__cta`, HomeCookSuggestion
`.primary`, AddRecipe `submit-btn`, DraftResumeBanner, Drafts publish, Recipes
`__btn--primary`, `about-btn-primary`, and the RecipeNotFound CTA. Outline/ghost
buttons keep their colour-only response; the backwards `0.95` darken on the auth
submit is gone (now teal glow `$shadow-teal`).

> **A11y note:** lightening reduces contrast, and the vivid `#ff5722` fill is only
> 3.16:1 on white *at rest* — i.e. these buttons already fail AA before hover. This
> change doesn't create a new pass→fail; the real fix is the deferred owner-owned
> brand-orange recolor (`$primary-accessible` becoming a true AA shade), after which
> `$hover-brighten` should be re-checked so hover doesn't dip a passing fill below AA.

**Cards** normalized to `$hover-lift-card` + `$elevation-4`: RecipeCard, Home
trending, SavedRecipes `collection-card`, UserRecipeThumbnail, Drafts, PublicProfile
tiles.

**`transition: all` dropped** (12 sites) → explicit property lists on the dense
row/pill controls (RecipeControls, IngredientList, InstructionItem, ListComponents,
AdminRecipeControls, the admin `.tab`/`.range` filter pills, AchievementsModal,
Recipes clear-control).

## Deliberately out of scope (kept bespoke)

- **Navbar internals** — the logo/hamburger `scale()` micro-animations and nav-link
  `brightness()` are a distinct navigation system (the button-system doc already
  scoped nav CTAs off the variants). Left alone.
- **Media zoom** — the `scale(1.04/1.08)` on the RecipeCard image and PublicProfile
  tile photo is an image affordance *inside* a card, not a button hover. Kept.
- **Selection state** — filter chips / segmented navs / toggle switches don't lift
  (they signal state, not an action). The admin `.tab`/`.range` pills only had their
  `transition: all` cleaned up; they stay flat.
- **Admin action buttons** stay flat (no lift), same boundary as the `$admin-*`
  palette track — only their `transition: all` was fixed.
