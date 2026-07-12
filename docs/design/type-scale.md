# Type scale

Prepify's text sizing had drifted: ~490 ad-hoc `font-size:` literals across ~60
stylesheets, ~80 distinct values, many a sub-pixel apart (`0.82` vs `0.85` vs
`0.875rem` for what is visually the same "small label"). This doc names a
**10-step modular scale** as the `$text-*` token group in `src/helpers.scss`, so a
size is a decision drawn from one ramp — not a number someone eyeballed in a
single file.

The steps are anchored on the values already in heaviest use, and the top half
(`$text-lg` → `$text-4xl`) is identical to Tailwind's default scale — these aren't
arbitrary numbers.

## The rules

1. **Use a `$text-*` step, never a raw `font-size` value.** That's the whole point
   — a new `font-size: 0.83rem` re-introduces the drift the scale exists to kill.
   Pick the step nearest the intent (see the usage notes per token below).
2. **The unit is `rem`, deliberately.** Every step is `rem`, so the whole scale
   honours the user's root font size — and a future "large text" / density mode is
   a single `<html>` font-size change away, with zero token edits. Don't re-introduce
   `px` for body text.
3. **Steps go by size, not by role.** Like `helpers.scss` already does for `$gray-*`
   and `$radius-*` (t-shirt/numeric scales), this is a *primitive* scale named by
   size. A future semantic layer (`$text-body`, `$text-h1`) could alias onto it, but
   isn't needed yet — don't pre-build it.
4. **Theming is a colour concern, not a size one — so this scale stays SCSS.** Dark
   mode and user-selectable themes swap *colours*, not font sizes, so the type scale
   gets no benefit from CSS custom properties. When theming lands post-1.0, the
   tokens that become runtime-swappable are the **colour** tokens; converting
   `$text-*` then is a trivial rename if one mechanism everywhere is wanted. (Filed
   in [`../BACKLOG.md`](../BACKLOG.md).)

## The tokens

```scss
$text-caption  // 0.72rem  11.5px  tiny meta: timestamps, counts, eyebrow labels
$text-fine     // 0.78rem  12.5px  small meta / dense secondary text
$text-sm       // 0.85rem  13.6px  small UI: pills, chips, helper text (most common)
$text-base     // 0.95rem  15.2px  default body / paragraph text
$text-md       // 1rem     16px    emphasized body, standard control text
$text-lg       // 1.125rem 18px    lead paragraphs, large controls
$text-xl       // 1.25rem  20px    card titles, sub-headings
$text-2xl      // 1.5rem   24px    section headings (h3)
$text-3xl      // 1.875rem 30px    page headings (h2)
$text-4xl      // 2.25rem  36px    hero / top-level headings (h1)
```

## Out of scope — left bespoke

Four families are intentionally **not** on this scale; they're sized for a context
the content ramp doesn't model:

- **`PrintableRecipe.scss`** — uses `pt` throughout. `pt` is the correct unit for a
  print stylesheet; it's a separate print scale.
- **`About.scss` `clamp()` headings** — the marketing page uses six fluid
  `clamp(min, vw, max)` headings. Fluid type is its own treatment; folding it onto
  fixed steps would flatten the responsive intent.
- **`404.scss` + PublicProfile display numerals** — the giant `404` glyph
  (`6`–`11.25rem`) and the profile avatar initial (`2.6rem`) are decorative display,
  not text on the ramp.
- **Icon-relative `em`** (and one `14px` in `ImagePicker`) — `em` sizes a glyph
  relative to its parent on purpose; it isn't a content size.

## Notes

- **Normalization happened — by design.** Of 491 in-scope uses, 218 (44%) land
  exactly on a step; 273 normalize onto the nearest one. The typical shift is
  ≤0.8px and the largest is 2.8px (a handful of rare display sizes like
  `1.7`/`2.0rem` converging on `$text-3xl`). The big body clusters collapse as
  intended: `0.82`/`0.85`/`0.875rem` → `$text-sm`, `0.9`/`0.95rem` → `$text-base`.
- **No unintended change — proven mechanically.** The migrated `.scss` was compiled
  to CSS on `development` vs. this branch; masking every `font-size` value and
  diffing the two leaves **zero** differences — i.e. nothing but font-size values
  moved, and every value in the output is a scale step or a documented out-of-scope
  literal.
- **Owner-approved against rendered glyphs.** The scale + every collapse was signed
  off on a temporary `/type-scale` before/after page (the same way the Lucide track
  used `/icon-audit`), removed before the PR.
- Fourth design-system doc, after [`icon-system.md`](icon-system.md),
  [`button-system.md`](button-system.md), and [`admin-palette.md`](admin-palette.md).
```
