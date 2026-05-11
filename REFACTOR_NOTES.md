# Refactor Notes

Issues flagged during refactor phases that require a decision or future action.

---

## Phase 2-B: Pre-existing tsc errors surfaced by index.jsx → index.tsx rename

**Date:** 2026-05-10

Running `tsc --noEmit` after the Phase 2-B rename reveals two pre-existing type errors:

1. `src/App.tsx:41` — JSX children prop mismatch (`ReactElement` expected, multiple children provided). Unrelated to Phase 2-B; existed before any changes.

2. `src/index.tsx:7` — `HTMLElement | null` passed where `Container` is expected (strict null check on `document.getElementById('root')`). This code error existed in `src/index.jsx` but was silently ignored by tsc because `.jsx` files are not type-checked without `allowJs: true`. The rename to `.tsx` makes it visible to tsc.

**Action needed (not in scope for Phase 2-B):** Fix both errors in a future pass. The `index.tsx` fix is a one-liner (`!` non-null assertion or a null guard). The `App.tsx` fix requires investigating the router/children structure.
