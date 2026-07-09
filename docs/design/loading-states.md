# Loading states

Prepify shows **two kinds of loading UI**, each with **one role, one colour token,
and one flash-guard**. This doc is the convention; the code that implements it is
`src/util/loadingStyles.ts` (tokens) and `src/hooks/useDelayedLoading.ts` (the guard).

## The two roles

| UI | Library | Use it for |
|---|---|---|
| **Skeleton** | `react-loading-skeleton` (`Skeleton`) | **Content placeholders** with a known shape — recipe cards, list rows, a page body. Preserves layout (no CLS) and previews structure. |
| **Spinner** | `react-loader-spinner` (`TailSpin`) | **Indeterminate in-place actions** — a button that's submitting/toggling, and the route-level "the whole view is loading" fallback where a skeleton would be overkill. |

Rule of thumb: **if you know the shape of what's coming, draw it as a skeleton; if
you're just saying "working…", spin.**

## Colour tokens

One grey for every skeleton, one neutral-dark for every page/section spinner. Both
are SCSS tokens re-exported as JS through `src/util/loadingStyles.ts`, so the
stylesheet stays the single source — never hardcode a hex per file.

```ts
import { skeletonBase, spinnerColor } from 'src/util/loadingStyles'
// <Skeleton baseColor={skeletonBase} />            ← every skeleton
// <TailSpin color={spinnerColor} />                ← page / section / neutral-button spinner
```

| Token | Value | Used by |
|---|---|---|
| `skeletonBase` | `$gray-400` (`#d6d6d6`) | every `Skeleton`'s `baseColor` |
| `spinnerColor` | `$primary-text` (`#303841`) | page/section spinners + spinners on a **light/neutral** button |
| *(literal)* `'white'` | — | spinners sitting on a **coloured** button (primary orange, danger red) |

The only choice when you add a spinner: **is it on a coloured button?** Yes → `color='white'`.
No (page, section, or a light/outlined button) → `color={spinnerColor}`. Nothing else.

> **Caveat — mind the spinner's *actual* backdrop, not the button's.** A spinner
> rendered inside a translucent-white scrim (the review controls' `.btn-overlay`,
> `rgba(255,255,255,0.5)`) sits on a *light* tint, not the coloured button beneath
> it — so it takes the **dark** `spinnerColor`, not `white`. The "coloured button →
> white" rule is for a spinner that *replaces* the label directly on the solid fill
> (Login / Signup). Check what pixel is behind the spinner strokes.

## The flash-guard (`useDelayedLoading`)

A skeleton that renders for one frame and snaps away — because the API answered from
cache in <100 ms — reads as a flicker, not a load. `useDelayedLoading(loading)`
returns `true` only once `loading` has held for ~220 ms, so a fast resolve fills in
content directly and only a genuinely slow load ever paints a skeleton.

> **Skeletons are delay-gated by default. Spinners are not.**

Spinners stay instant on purpose: a button the user just clicked must acknowledge the
click immediately — a 220 ms dead beat there reads as an unresponsive button.

### The one trap: keep the real `loading` as the gate

When you add the guard, the still-loading branch must stay owned by the **real**
`isLoading`, with the delayed flag only choosing *skeleton vs. hold* inside it.
Otherwise a fast load falls straight through to the **empty state**, and you've traded
a skeleton flash for an empty-state flash:

```tsx
// ✅ correct — empty state can't flash; the container reserves height from frame 1
if (isLoading) return (
  <Grid className={showSkeleton ? '' : 'sk-hold'}>
    <Skeletons />
  </Grid>
)
if (isError) return <LoadError />        // error copy + retry — NOT the empty state
if (items.length === 0) return <EmptyState />
return <Grid>{items.map(...)}</Grid>

// ❌ wrong — fast load skips the skeleton AND lands on the empty state for a frame
if (showSkeleton) return <Skeletons />
if (items.length === 0) return <EmptyState />
```

### Error is not empty

`isError` and "zero items" are different states and must render different copy.
A failed fetch routed into the empty state tells a user with data that they have
none ("No Recipes Saved Yet" on a flaky connection). Every fetch-backed section
needs three terminal states: content, **empty** ("nothing here yet" + CTA), and
**error** ("Couldn't load … Please try again." — reuse `EmptyState` with an
alert icon and a `Try again` action wired to the query's `refetch`, or the
sections' inline error copy where a full empty-state panel would be heavy, as on
Home). `usePaginatedLoadMore` exposes `isError`/`refetch` for exactly this —
branch on it *before* the empty state, as the account tabs do.

### Reserve the height — don't blank then grow (`sk-hold`)

The guard introduces a ~220 ms window where `isLoading` is true but `showSkeleton`
is still false. If you render *nothing* in that window (`{showSkeleton && <Skeletons/>}`),
the container is 0-height until the skeleton appears — then it **grows on appear**,
shoving everything below it down. That counts as layout shift just like the real
content would (measured CLS 0.21 on Home before this fix; 0.0002 after).

So **render the skeletons whenever `isLoading`** — so their container reserves its
full height from the first frame — and let the delay only decide *visibility*. The
global `.sk-hold { visibility: hidden }` utility keeps the layout box while the guard
window holds (nothing painted, no flash), then releases:

```tsx
<ul className={`ing-list ${loading && !showSkeleton ? 'sk-hold' : ''}`}>
  {loading ? <RowSkeletons /> : items.map(renderRow)}
</ul>
```

`visibility` (not `display: none`) is the point: the box still occupies space. This
only removes the *grow-on-appear* shift — a skeleton with a **fixed item count** that
under/over-shoots the real count still shifts on the skeleton→content swap (the known
residual; keep the count close, but don't data-fit it per record).

### The trailing-`<br>` trap — `inline` for sized single skeletons

`react-loading-skeleton` appends a `<br>` after every skeleton **unless you pass
`inline`**. That `<br>` adds a line-box (~1 line of the inherited `line-height`,
roughly 16–19 px) to the skeleton's wrapper. Wherever that wrapper's height drives a
parent — a button in a flex row, the servings pill in a flex `.sec-head`, a stat in a
grid cell — the parent silently grows by that ~19 px and, if it's `align-items:center`,
re-centres its other children. This bit the SingleRecipe action bar (62 px tall buttons
that should be 43), the servings pill (57→ pushed the "Ingredients" heading down), and
the price line.

**Rule: any single-line skeleton with an explicit `width`/`height` gets `inline`.** It
drops the `<br>` so the wrapper height equals the skeleton, and the skeleton stays on
its own line via its *parent's* layout (block/flex/grid), not the `<br>`.

```tsx
<Skeleton inline width={107} height={43} borderRadius={12} baseColor={skeletonBase} />
```

Two cases keep the `<br>` (don't add `inline`):

1. **Multi-line `count={n}` skeletons** (a 2-line title, review body) — the `<br>` is
   what stacks the lines; `inline` would lay them out side-by-side. Cap the container's
   height if its over-reservation matters.
2. **A bare block parent that stacks two+ skeletons via the `<br>`** (e.g. the search
   autocomplete `.ac-skeleton__body`, which has no flex/grid of its own). Either give
   the parent `flex-direction: column` first, then `inline`, or leave it.

When the class must land on the react-loading-skeleton **wrapper** (the flex item, for
the buttons/pill) rather than the bar, use `containerClassName` + `inline`, and keep the
wrapper's `line-height: 0` as a belt-and-suspenders against any stray line box.

Full-fill image skeletons (`height='100%'` / a `position:absolute` `className`) don't
take `inline` — they fill via CSS and their `<br>` is clipped by the container anyway.

### Where it's applied

Every passive data-fetch skeleton goes through the guard: the **Account** sub-pages
(Saved / Ratings / Your Recipes / Drafts), the **PublicProfile** (`/u/:username`), the
**Recipes** results grid, the **Home** rows (Trending, Browse by meal), the
**SingleRecipe** body, and the **reviews** list. The grid/row skeletons that the guard
would otherwise blank-then-grow (Home rows, SingleRecipe body, **all four Account
sub-pages**, **PublicProfile**) use `.sk-hold` to reserve height through the guard window
(above) instead of an early-return blank frame. Account skeletons **self-mirror their
loaded component** — `UserRecipeThumbnail` /
`SingleReview` / `RecipeCard` / `DraftCard` / `CollectionCard` each render their own
`loading` variant — so the skeleton and the real card are the same height by construction.
**PublicProfile** does the same with an in-file `ProfileSkeleton` (centered identity header)
+ `PpTileSkeleton` (square-media recipe tile) mirroring the real `.pp-head` / `.pp-tile`
markup. The Saved tab also reserves its **collections row** (`CollectionCard loading`) so
collections don't pop in and shove the grid down, and `SingleReview` reserves the **2-line
review text** (a `.sr-text--skeleton` keeping the real line-height) — the row's tallest
part, which an earlier thumb-only skeleton left unreserved.

> **Match the row's tallest part, inside the real element.** The fix for both
> `SingleReview` and the PublicProfile header was the same: render each skeleton bar
> *inside* the real wrapper (`.sr-title`, `.sr-text`, `.pp-handle`, `b`/`span`) so it
> inherits that element's font-size/line-height — the line-box that actually sets the
> row height. A free-floating bar with a fixed pixel height reserves a different line
> than the real text and the content below it jumps on load. Where a row's height is
> driven by its tallest child (a 52px avatar, a 2-line review body), the skeleton must
> reserve *that* child, not just the short ones.

### Deliberate exceptions (skeleton shown immediately)

A few skeletons are *not* delay-gated, each for a reason — don't "fix" them:

| Site | Why it stays immediate |
|---|---|
| `SearchRecipesInput` | The query is already `useDebounce`d and uses `keepPreviousData`, so it shows prior results (not a skeleton) between keystrokes; the skeleton only paints on the very first search, where immediate feedback is wanted. |
| `IngredientItem` | Per-row enrichment (image/price) is genuinely indeterminate per item; the inline placeholder should appear at once. |
| `HomeCookSuggestion` | Mutation-driven (the user clicks the dice / "Try another") — the skeleton *is* the action's feedback, so it should be instant. |
| `DesktopBar` | The nav's auth-resolve skeleton paints once on app boot; there's no cache-hit fast path to protect against, and a delay would blank the nav on first paint. |
| `HomeForYou` | **No skeleton at all** — pop-in. The row often resolves to empty (the server returns `[]` until the user has enough signal), so a skeleton would reserve space it then takes back — the home page's main layout jump. It renders nothing until real picks arrive, then fades in (`.home-section--pop-in`). Don't add a skeleton here. |

## How to…

**…add a loading state:** pick the role (skeleton for known shape, spinner for an
action). Pull the colour from `src/util/loadingStyles`. For a skeleton, wrap the
loading flag in `useDelayedLoading` and keep the real flag as the branch gate (above).
Pass `inline` on any sized single-line `Skeleton` (the trailing-`<br>` trap, above), and
reserve its container with `.sk-hold` if the guard window would otherwise blank-then-grow.

**…tune the delay:** `useDelayedLoading(loading, ms)` takes an optional delay
(default 220 ms). Change it at the call site, not by forking the hook.

**…test a delay-gated skeleton:** the skeleton no longer appears synchronously —
`await` it (`findBy…` / `waitFor`). A fast-resolve "no-flash" assertion can resolve
the mock immediately and assert the skeleton never mounted (see
`src/test/AccountSections.loading.test.tsx`).

## History

- **This PR** (2026-06-29) — CLS / skeleton-fidelity pass on top of the token work:
  rebuilt the skeletons to match real markup (SingleRecipe servings pill, price line,
  ingredient thumbs, Save/Rate/Print row, and a page-level Ratings & Reviews block via
  the shared `ReviewCardSkeleton`; Home meal rows sized to the responsive thumb);
  added the `.sk-hold` reserve-space technique so the guard window no longer grows on
  appear (Home 0.21 → 0.0002, SingleRecipe 0.27 → 0.02 measured CLS). Image tiles
  (hero, cards, ingredient thumbs) hold a skeleton until `onLoad` then fade in to kill
  top-down paint. Swept `inline` onto every sized single-line skeleton to drop
  react-loading-skeleton's trailing `<br>` (the line-box that was inflating wrapper
  heights — see the trap above); reserved `.sr-controls` so the report kebab appearing
  on load no longer drops the whole page ~11 px. Converted **PublicProfile**
  (`/u/:username`) from a whole-view `TailSpin` to a self-mirroring header + tile-grid
  skeleton (`sk-hold`; measured CLS 0.0002).
- **This PR** (2026-06-29) — codified the pattern: single `loadingStyles` token module
  (collapsed 9 per-file `skeletonColor` consts in two greys → `skeletonBase`; unified
  the scattered page/section/neutral-button spinner colours onto `spinnerColor`, and
  the on-coloured-button spinners onto the `white` literal — leaving the two review
  controls whose spinner sits on the translucent-white `.btn-overlay` on the dark
  `spinnerColor`, per the caveat above); promoted `useDelayedLoading` from `pages/Account/` to
  `src/hooks/` and rolled it out to the Recipes grid, Home rows, SingleRecipe, and the
  reviews list; documented the four immediate-skeleton exceptions.
