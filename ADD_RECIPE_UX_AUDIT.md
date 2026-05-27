# Add Recipe — Functional & Visual (UX) Audit

Generated: 2026-05-27
Auditor: Claude Code
Scope: The Add Recipe flow end-to-end — page, field components, ingredient/instruction
sub-flows, error/feedback paths, and styling.
Companion doc: `ADD_RECIPE_AUDIT.md` (code/correctness audit). This one covers the
**experience**: how the flow behaves visually and functionally, and the reusable
principles to carry into other flows.

---

## Summary

The flow is functionally solid after the recent hardening (server-generated `_id` +
navigation, double-submit guard, soft-fail enrichment, instruction re-indexing). The
remaining gaps are about **feedback consistency and visual/semantic polish**, not
correctness. Three things stand out:

1. The app already standardizes on `react-hot-toast` (wired globally in `src/App.tsx:42`,
   used by Signup / ForgotPassword / CreateUsername), but this flow uses ad-hoc inline
   messages — one of which (`.submit-error`) has **no CSS rule at all** and renders as
   unstyled text.
2. There is **no success confirmation** — a successful create navigates away silently.
3. The soft-fail enrichment notice is rendered with the **red `.error` alert style** for
   what is semantically a non-blocking warning.

| Severity | Count |
|---|---|
| High | 3 |
| Medium | 4 |
| Low | 4 |

---

## 1. Flow walkthrough (current behavior)

**Layout & entry.** Single centered card (`max-width: 800px`, inner column `500px`), one
stacked section per field with a bold `h2` label. Uniform `.input-field` padding gives a
predictable rhythm. SEO `<Helmet>` tags present.

**Live validation.** `validate()` runs on every keystroke via `useEffect`
(`AddRecipe.tsx:93`) but only toggles `isFormValid`, which drives the submit button's
`valid`/`invalid` color. Per-field error messages are not shown until the user clicks
submit (`validate(true)`).

**Submit.** Guarded against double-fire (`if (addRecipeLoading) return` + `disabled`).
Shows a top `LoadingBar` and swaps the button label for a spinner. Three outcomes:
- success → `navigate('/recipes/:id')`
- `AUTH_ERROR` sentinel → inline "session expired" message
- `null` → inline generic "Failed to create recipe" message

If invalid on submit, the form scrolls back to top and renders field errors (red box +
warning icon).

**Ingredients.** Type a string → parse + enrich. Soft-fail: the ingredient is always
added; on enrichment failure a warning appears and the item falls back to a basket icon.
Localized spinner in the input. Items are click-to-edit, removable, and reorderable (DnD
behind a Reorder/Done toggle). Group labels supported.

**Instructions.** Same container pattern; numbered steps re-index correctly on removal.
Labels + reorder supported.

**Image.** File picker with client-side square-crop preview drawn on a canvas. Overlaid
remove button.

---

## 2. What's done well — principles to carry forward

Codify and reuse these in the other flows:

1. **Soft-fail on non-critical enrichment.** A failed nutrition/image lookup never blocks
   the core action; the user keeps moving and gets a non-fatal heads-up.
   *Principle: degrade secondary data, never gate the primary task on it.*
2. **Double-submit protection at two layers** — a state guard (`if (loading) return`) and a
   `disabled` attribute.
   *Principle: guard in-flight async actions in both the handler and the control.*
3. **Distinct error classes, not one generic failure** — session expiry is messaged
   differently from a generic server failure.
   *Principle: discriminate recoverable vs. terminal errors and tell the user which lever
   to pull.*
4. **Optimistic, reversible item management** — add/edit/remove/reorder happen inline with
   immediate feedback and per-item undo.
   *Principle: inline CRUD with per-item affordances beats modal round-trips.*
5. **Consistent input primitive** — `RecipeFormInput` is reused everywhere with
   `onEnter`/`onBlur`/`characterLimit` hooks.
   *Principle: one configurable field component, not bespoke inputs per section.*
6. **Loading granularity** — a top progress bar for the multi-step submit plus localized
   spinners for per-item async.
   *Principle: match the loading indicator's scope to the operation's scope.*
7. **Guard before mutating loading state** (the `IngredientsInput` fix).
   *Principle: validate preconditions before flipping UI state you'd have to unwind.*

---

## 3. Improvements — prioritized

Each is framed as a reusable principle plus the specific instance here.

### High

#### [HIGH] Inconsistent + partly unstyled feedback channel
- **Where:** `AddRecipe.tsx:255` (`<p className='submit-error'>`), `IngredientsInput.tsx:72`.
  `.submit-error` has no CSS rule anywhere → renders as unstyled default text. The app
  standard is `react-hot-toast` (`src/App.tsx:42`).
- **Principle:** Pick one feedback system per app and use it everywhere.
- **Fix direction:** Route submit success/failure and session-expiry through toast, or at
  minimum give `.submit-error` a real style consistent with `.error`.

#### [HIGH] No success confirmation
- **Where:** `AddRecipe.tsx:131-132` — success navigates away silently.
- **Principle:** Confirm completion of a creative/destructive action, even when navigating.
- **Fix direction:** Fire a success toast ("Recipe published!") that survives the route
  change to `/recipes/:id`.

#### [HIGH] Warning styled as an error
- **Where:** `IngredientsInput.tsx:73` uses the red `.error` alert for the enrichment notice.
- **Principle:** Visual severity must match semantic severity (error = red/blocking,
  warning = amber/non-blocking, info = neutral).
- **Fix direction:** Add a `.warning` style and use it for soft-fail notices.

### Medium

#### [MEDIUM] Stale field errors after a failed submit
- **Where:** `AddRecipe.tsx:93-106` — errors are only recomputed on submit (`validate(true)`),
  not as the user fixes fields, so a corrected field keeps its red error until the next
  submit click.
- **Principle:** Once errors are shown, validate reactively so they clear as the user fixes
  them.

#### [MEDIUM] No length/count caps beyond title
- **Where:** description, ingredient count, instruction count, and step length are unbounded
  (front and back).
- **Principle:** Every free-text / list input needs a sane max, enforced client- and
  server-side.

#### [MEDIUM] Accessibility gaps
- **Where:** field errors aren't linked to inputs (`aria-describedby`); the submit error
  isn't an `aria-live` region; the disabled submit button has no disabled visual state
  (only `cursor`).
- **Principle:** Errors should be programmatically associated and announced; disabled
  controls must look disabled.

#### [MEDIUM] No image validation
- **Where:** `ImagePicker.tsx` — `accept="image/*"` only; no size/type/dimension guard
  before upload.
- **Principle:** Validate file inputs (size, type) before kicking off an upload.

### Low

#### [LOW] Wrong placeholder copy
- **Where:** `MealTypeSelector.tsx:76` placeholder reads "Select a cuisine…" (copy-paste
  bug, user-visible).

#### [LOW] Dead `errors.cookTime` UI
- **Where:** `AddRecipe.tsx:211` — `cookTime` is never validated; the branch is unreachable.

#### [LOW] Redundant cuisine placeholder
- **Where:** `CuisineSelector.tsx` has both a dummy `'-'` option and a `placeholder`.

#### [LOW] No empty-input feedback on Add Ingredient
- **Where:** `IngredientsInput.tsx:29` — clicking Add with a blank field silently no-ops; a
  disabled-add or subtle shake would close the loop.

---

## Reusable flow-design checklist (distilled)

Apply to every new flow/example:

- [ ] **One feedback system** (toast) for success, recoverable error, terminal error.
- [ ] **Confirm success explicitly**, including across navigation.
- [ ] **Severity matches style** — error/warning/info are visually distinct.
- [ ] **Reactive validation** — errors clear as fields are fixed, not just on submit.
- [ ] **Double-submit guard** in both handler and control; disabled controls look disabled.
- [ ] **Soft-fail secondary data**; never block the primary action on enrichment.
- [ ] **Localized vs. global loading** matches operation scope.
- [ ] **Inputs are bounded** (length/count) on client and server.
- [ ] **Accessible errors** — `aria-describedby` + `aria-live`.
- [ ] **Validate file inputs** before upload.
- [ ] **Reuse the shared input primitive**; no bespoke fields.
