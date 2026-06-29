# Icon system

Prepify uses **one icon family** behind **one import boundary**, enforced by a test.
This doc is the convention; the code that implements it is `src/Components/icons/index.ts`.

## The rules

1. **House family: Lucide** (`react-icons/lu`). Every icon in the app is a Lucide
   glyph, so the whole UI shares one stroke weight, grid, and corner radius. Lucide
   is the maintained successor to Feather and ships 1500+ icons (it's already the
   food/avatar set).
2. **One import boundary.** App code imports icons **only** from `src/Components/icons`,
   never from `react-icons/*` directly. A Vitest guard
   (`src/test/icons-single-source.test.ts`) fails the build on any direct
   `react-icons/*` import outside the `src/Components/icons/` folder.
3. **One concept, one name.** Each UI concept is exported under a semantic,
   set-agnostic name (`CloseIcon`, `SearchIcon`, `BookmarkIcon`) — never the raw
   library name. A concept can't drift across families because there's one line that
   defines its glyph.

## Exceptions (the only non-Lucide icons)

Lucide ships **no brand logos**, so the two Google marks are documented exceptions:

| Concept | Source | Why |
|---|---|---|
| `GoogleColorIcon` | `react-icons/fc` (`FcGoogle`) | The multicolor Google "G" — the Continue-with-Google button needs the branded color mark. |
| `GoogleIcon` | `react-icons/si` (`SiGoogle`) | The mono Google "G" for inline/text contexts. |

Any future exception (a payment mark, a social logo) goes here and gets a row in this
table. If it's not a brand asset, it should be a Lucide glyph.

## Filled vs. outline

Lucide is an **outline** system. The rule for when something fills:

> **Outline by default. Fill marks a persistent ON state (saved, rated) — never a
> hover effect, and never on a stateless icon. Hover changes the button's chrome,
> not its icon.**

So a bookmark fills when the recipe is **saved**, a star fills when the user has
**rated** — and the Save / Rate / Print action buttons all behave identically on
hover (the icon doesn't move; only the button background/border responds). This is
why `PrintRecipeBtn` and the AddRecipe form-error warning are always outline: they
have no ON state, so there's nothing to fill. Emphasis there comes from **color and
size** (the error is the outline triangle in error-red), the Lucide way.

A filled variant is the **same Lucide glyph** rendered with `fill="currentColor"`, so
the outline↔filled transition swaps fill, never glyph shape:

```ts
export const StarFilledIcon: IconType = props =>
  React.createElement(LuStar, { fill: 'currentColor', ...props })
```

Today: `StarFilledIcon` (rated) / `BookmarkFilledIcon` (saved). Only add a filled
variant for a real ON state, and only if the glyph fills cleanly (the printer and
warning triangle fill into a shapeless blob — don't).

## How to…

**…use an icon:** `import { SearchIcon } from 'src/Components/icons'` and render
`<SearchIcon />`. They take all `react-icons` props (`size`, `className`, `color`, …).

**…change a concept's glyph:** edit its one line in `src/Components/icons/index.ts`.
Every call site updates with it. Pick the Lucide name from <https://lucide.dev/icons>
(note `react-icons/lu` uses Lucide's current names — `CircleAlert`, not `AlertCircle`).

**…add a new concept:** add one `Lu… as XxxIcon` line (keep the block alphabetical by
concept name). If Lucide genuinely lacks it, prefer the closest Lucide glyph; only
reach for another family if it's a brand asset, and then add an exception row above.

**…add a filled variant:** only if it fills cleanly — add a `fill="currentColor"`
wrapper like the star/bookmark examples.

## History

- **PR #205** (2026-06-29) — established the single-source module + guard: collapsed
  react-icons drift to one glyph per concept (94 concepts, 58 call sites migrated).
- **This PR** (2026-06-29) — single house family: remapped every concept to Lucide,
  collapsing the remaining 10-family mix (AntDesign / BoxIcons / Bootstrap / Ionicons /
  Material / Tabler / Feather / …) to one stroke weight. Filled variants moved to the
  `fill="currentColor"` convention; `PrinterFilledIcon` and `AlertTriangleFilledIcon`
  dropped (fill read as a blob); 2 brand exceptions documented. 92 concepts.
