# Prepify — Backlog

Triaged from Jesse's running notes (2026-06-17). This is the general backlog: bugs, UX polish,
a11y, tech debt, testing, and ideas. The beta→1.0 launch checklist lives separately in
[`RELEASE_PLAN.md`](./RELEASE_PLAN.md) — items here are **not** release blockers unless cross-referenced.

Legend: `[ ]` todo · `[~]` partial · `[x]` done · `[?]` needs a decision.

## Idea capture & triage workflow

Keep two stages separate so ideas never get lost to friction:

1. **Capture (Obsidian):** jot every idea into the running Obsidian note — one idea per line,
   dated, append-only. Don't categorize or polish; just get it out of your head. This is the
   low-friction inbox, available on phone and off-branch.
2. **Triage (here):** when the note builds up, hand the dump to Claude. Each item gets sorted
   into the right section below (or `RELEASE_PLAN.md` / `FEATURE_IDEAS.md`), code-touching items
   get verified, and you get back an annotated copy marking where each one landed
   (`→ BACKLOG#Section · date`). Then clear the Obsidian note back to empty.

The triage date stamped on items is the date they were filed here, not when they were thought of.

---

## Bugs

- `[ ]` **Deleting a review leaves the star rating behind** — there's no way to remove just a star
  rating; you can only delete the review text. `deleteReview` blanks `reviewText`/`reviewLastUpdated`
  but leaves the `rating` field on the doc (`server/routes/reviews.js:163`). Add a "remove rating"
  path and have review deletion optionally clear the rating too. *(verified)*
- `[ ]` **Save-recipe functionality is broken** — needs a fix and test coverage.
- `[ ]` **Account "Ratings" list renders inaccurately** — recipe images aren't loading for rated recipes.
- `[ ]` **Rating aggregate went *down* after a 5-star** — observed the average drop when adding a
  5-star rating; investigate `recomputeRecipeRating`.
- `[ ]` **Serving price looks wrong** — recipe serving pricing appears miscalculated; audit
  `src/util/calculateServingPrice.ts` against real data.
- `[ ]` **"Your Recipes" flashes an empty state** — the account section shows "no recipes" briefly
  before the user's recipes propagate. Gate the empty state on load completion.
- `[~]` **Data export omits saved-recipe content** — `exportMyData` now exports full recipes, drafts,
  ratings, and profile, but `savedRecipes` is still an array of IDs only (`server/routes/auth.js:323`).
  Expand it to full saved-recipe content. *(partially addressed)*

## UX / visual polish

- `[ ]` **Better "no results found" on the Recipes page** — current indicator is weak.
- `[ ]` **Optimistic ingredient add** — when adding an ingredient, show it in the list immediately
  instead of waiting for the parse/nutrition request to return.
- `[ ]` **Search autocomplete "autocorrect" is weak** — fuzzy matching on recipe search autocomplete
  needs improvement.
- `[ ]` **"You created this recipe" — mobile styling** — slightly off on the single-recipe page.
- `[ ]` **Recipe stats styling** — consider dropping the rating from the stats row (it already shows
  right below) and centering the remaining three stats.
- `[ ]` **Add-recipe bottom bar overlaps the footer** — scrolling to the bottom of the add-recipe page,
  the sticky bottom bar hides the footer. *(minor)*
- `[ ]` **Single-recipe "no recipe found" looks bad** — improve the visual of `RecipeNotFound`.
- `[ ]` **Drop search from the topmost navbar on /recipes** — for the new navbar, the recipes page
  shouldn't carry search in the top-most bar. *(noted 2026-06-10)*
- `[ ]` **Serving price not prominent enough** — surface it more clearly on the single-recipe page.
- `[ ]` **Review UI needs work** — the "Your Review" UI is poor, and the rating dropdown (shown once
  you give a rating) isn't positioned where it should be.
- `[ ]` **Account nav sections UI** — improve the Saved / Ratings / etc. section navigation styling.
- `[ ]` **`/u/:username` public profile visual polish** — minor visual updates.
- `[ ]` **"Change Password" title is redundant/cluttered** — in Account & Security settings.
- `[ ]` **create-username page revamp** — re-evaluate the page, and add a logout (or escape hatch) so a
  user can't get stuck on it. Page lives at `src/pages/CreateUsername/`.

## Accessibility

- `[ ]` **Stop focus outline on mouse button clicks** — keep it for keyboard nav only
  (`:focus-visible`).
- `[ ]` **Desktop navbar account chevron animation shifts the focus outline** — the chevron animation
  moves the focus outline; decouple them.

## Features

- `[ ]` **Press `/` to focus search** — global keyboard shortcut to bring up search. No handler exists today.
- `[ ]` **Report a *user* from their profile page** *(admin)* — `ReportTargetType` is only
  `'recipe' | 'review'` (`src/types.ts:188`); add a user-report flow. *(verified missing)*
- `[ ]` **Double-check report-recipe styling in the controls element** *(admin)*.
- `[ ]` **Username validation: disallow certain characters** — tighten the allowed character set.

## Tech debt / process / infra

- `[ ]` **Migrate Sass `@import` → `@use`** — build emits Sass `@import` deprecation warnings
  (pre-existing; Sass 1.x warns `@import` is going away in 3.x). Cosmetic now, worth migrating.
- `[ ]` **Point Railway at the production branch** — currently not deploying from production.
- `[ ]` **Post-6-phase-refactor DB check** — confirm no existing database records need updating/migrating
  after the refactor.
- `[ ]` **Establish a code & architecture standard for Claude** — write a conventions doc so generated
  code stays consistent (likely an addition to `CLAUDE.md` or a new `CONVENTIONS.md`).
- `[ ]` **Refactor the create-recipe page**.
- `[ ]` **Refactor the account page**.
- `[ ]` **Ingredient parser: handle "not found"** — on a parser miss, add an exit/timeout instead of
  hanging.

## Testing

- `[ ]` **Tests for the toast/alert system** — newly implemented `react-hot-toast` is untested.
- `[ ]` **Create-recipe tests** — Cypress (E2E) + Vitest (unit).
- `[ ]` **Cypress: test autocomplete on the Recipes page**.

## Ideas / needs a decision

- `[ ]` **Friend system** — **post-1.0** (decided 2026-06-17). Backlog only; not in the 1.0 scope.
- `[ ]` **AI recipe search as a paid membership feature** — **post-1.0** (decided 2026-06-17). Future idea.
- `[ ]` **Fridge & freezer life on the create-recipe form** — **post-1.0** (decided 2026-06-17). The
  `fridgeLife`/`freezerLife` fields still exist in the data model (`src/types.ts:13-14`) but were
  removed from the create form; revisit re-adding them after launch.

---

## Resolved / verified done (recorded, not active)

- `[x]` **Sign-up button copy** — already reads "Create account" (`src/pages/Signup/Signup.tsx:110`).
- `[x]` **Bug reporting & viewing system** — shipped: `BugReportModal` + `/admin/bug-reports` queue +
  `bugReports` collection/route.
- `[x]` **Monitor images & comments for harmful content** — content moderation shipped (blocklist +
  OpenAI text + Google Vision image). See `docs/CONTENT_MODERATION.md`.
- `[x]` **Fix failing tests** *(2026-06-14)*.
- `[x]` **Fix the print-recipe page** *(2026-06-14)*.
- `[x]` **Migrate React env → Vite** *(2026-05-10)*.
