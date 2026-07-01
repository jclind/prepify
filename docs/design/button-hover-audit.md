# Button hover audit

> Companion to [`button-system.md`](./button-system.md). That doc unified button
> **colour** (PR #210); this one audits the button **hover motion**, which was
> never standardized, and proposes one language to collapse it onto.
>
> **Status:** audit + candidate exploration. A temp `/button-hover-audit` page
> renders the drift and the candidates live for sign-off (added then removed
> in-branch, same as the `/icon-audit` / `/elevation-audit` precedent). Awaiting
> the owner's column pick before any migration.

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
share **one 150 ms `ease` timing token** and rely on the existing
`prefers-reduced-motion` block in `index.scss` (motion collapses to ~0, colour
stays), so reduced-motion is handled for free regardless of the pick.

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

## Recommendation

**B · Lift.** It's the least disruptive normalization — most buttons already lift,
so this mostly means agreeing on one distance (`-2px`), one shadow, and one timing,
then deleting the six one-off brightness values and the backwards `0.95`. It keeps
the app feeling responsive, reads as intentional, and the card lift (`-4px`) it
formalizes is already what RecipeCard does. A and C are live on the audit page for
direct comparison; the final call is the owner's.

Whichever wins, the migration is the same shape as the other `2-scss` tracks:
define `$hover-lift` / `$hover-timing` (+ any shadow) tokens in `helpers.scss`,
route buttons through the `.btn` base's already-declared `transform`/`box-shadow`
transition, delete the ~20 bespoke hover blocks, and drop every `transition: all`.
