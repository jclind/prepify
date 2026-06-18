# Feature Ideas — Prepify

Generated: 2026-06-14 (supersedes the 2026-05-14 audit)
Audit scope: `src/pages/`, `src/Components/`, `src/api/`, `src/context/`, `server/routes/`, `server/util/`, plus a sweep for placeholder / commented-out / "not yet" UI. Refactor-only items are excluded.

This is a fresh pass against the current code — every item below was re-verified, and anything that has since shipped was removed (see "Shipped since last audit" for the closed gaps).

---

## ✅ Shipped since last audit (closed gaps — no longer ideas)

The previous list's biggest holes are now done and live:

- **Edit recipe** — real `src/pages/EditRecipe/` page; recipes keep their `_id`, so saves/reviews/links survive an edit.
- **Public nutrition panel** — `NutritionData` is now imported and rendered in `SingleRecipe.tsx` (and `PrintableRecipe`).
- **Author byline + clickable profile** — recipe page shows a `by @username` author row, and public profiles exist at `/u/:username` (`src/pages/PublicProfile/`).
- **Meal-type filter on `/recipes`** — `mealTypes` is a first-class facet in `Recipes.tsx`, URL-synced.
- **"Your Recipes" tab** — `UserRecipes.tsx` is a real, paginated, sortable list backed by `RecipeAPI.getCreatedRecipes`.
- **`recipe-stats`** — views / saves / made counts are passed through and rendered.
- **Servings scaling** — `SingleRecipe.tsx` has +/− steppers that rescale ingredient quantities and persist the chosen serving size.
- **Empty states (partial)** — `HomeTrending` and `SavedRecipes` now render real "nothing here" copy instead of perpetual skeletons.
- **Gamification (partial)** — XP/levels + achievements engine (`server/util/gamification.js`: `first_save`, `collector`, `first_recipe`, `prolific`, `first_review`, `critic`) with an unlock toast and an Account rewards gallery.
- **Personalized "For You" row on Home** — content-based row inferred from the user's saves/makes/ratings (`HomeForYou` + `GET /api/getForYouRecipes` + `server/util/forYou.js`), hidden until personalized, capped at 4 to match Trending. Shipped via PR #153.
- **"What should I cook?" button** — taste-aware random pick in `HomeHero` (reuses the For You profile via `server/util/tasteContext.js`; uniform `$sample` fallback) revealed in a spotlight modal with a "Try another" re-roll (`HomeCookSuggestion` + `GET /api/recipes/random`). Shipped via PR #154.
- **Recipe collections / folders for saved recipes** — saved recipes can be grouped into named collections ("Weeknight dinners," etc.) over the saved list, turning it into a cookbook. Collection CRUD API + saves carry `collectionIds`. Shipped via PR #137.

Adjacent systems that also landed and reshape the roadmap: **drafts**, **admin moderation + audit log + analytics**, **report content**, **bug reporting**, a URL-routed **Settings** area (Profile / Account & Security / Privacy / Danger), and transactional **email** (currently moderation outcomes only).

---

## 🔴 Clearly Missing (expected in any recipe app)

- **Share recipe button on the recipe page** — `SingleRecipe.tsx` has Save / Rate / Made / Print actions but still no Share. (Public *profiles* got a share affordance during the profile work; the recipe page itself didn't.) A `navigator.share` (mobile) + `navigator.clipboard.writeText` fallback slots directly into the existing actions row.
- **Display `fridgeLife` / `freezerLife`** — both are still collected in `AddRecipe.tsx` (and carried through drafts and the API payload) but a grep across `src/pages/SingleRecipe/` finds zero readers. Users enter "5 days in fridge / 30 in freezer" and viewers never see it. One `RecipeDataElement`/stat row each.
- **Shopping list / grocery export** — ingredient checkboxes are still local component state that doesn't persist or aggregate. No "add to list," no clipboard copy, no cross-recipe combine for a weekly shop. Table-stakes vs. AllRecipes / NYT Cooking.
- **Recipe structured data (JSON-LD)** — `grep` finds no `application/ld+json` / `schema.org` anywhere. A recipe site lives and dies on Google's Recipe rich results (ratings, time, calories in search). Emitting a `Recipe` schema block on `SingleRecipe` is high-SEO-leverage and the data (name, image, ingredients, instructions, nutrition, aggregateRating, times) already exists on `RecipeType`.

---

## 🟡 Sparse or Half-Built

- **Step-by-step cook mode (interactive instructions)** — `SingleRecipe.tsx` still renders each step as static `<li className='step'>`. No per-step checked state, no "keep screen awake," no big-text cooking view. Classic recipe-app feature, still scaffolding-only.
- **Hardcoded release notes** — `ReleaseNotes.tsx` still has `RELEASE_DATE = '3/31/2023'` and hand-edited `additions` literals. It's been partially touched but is fundamentally a stale, manually-maintained modal. Drive it from a small static JSON (or a `releases` collection), or retire the modal.
- **Review reactions / "helpful" votes** — the old like/dislike UI was removed wholesale, so there's now *no* reaction signal on reviews at all. A single "Helpful (n)" vote is the lighter, less-flamewar-prone version and gives the review sort something meaningful to rank by. `[needs API]` (`POST /reviews/:id/helpful`)
- **Quick-time filter ("Under 15 / 30 / 60 min")** — `/recipes` has a "Quickest" *sort* but no time *filter*. A `maxTime` query param + a chip row is far more useful for "I have 20 minutes, feed me." `[reuses RecipeFilters + getAllRecipes query]`
- **Error + retry states** — empty states landed, but a *failed* fetch on Trending / Saved / UserRatings still falls back to skeletons-or-empty with no "Something went wrong — Try again." A shared `<ErrorState onRetry>` would close the loop the empty-state work started.

---

## 🟢 Nice-to-Have / Engagement Features

- **Search-history dropdown** — `SearchRecipesInput` still shows nothing on focus until you type. Surfacing the last ~5 searches from localStorage on focus is essentially one component change.
- **Substitute-ingredient suggestions** — on hover/tap of an ingredient, show 1–3 common swaps ("no buttermilk → milk + lemon"). Could lean on Spoonacular via the existing `/api/ingredients/parse` infra.
- **Time-based cooking streaks** — gamification today is count-based achievements. Adding "cooked 4 recipes this week" / "3 new cuisines this month" streaks (from the `datesMade` data the server already keeps) gives a recurring reason to come back, distinct from the one-shot badges.

---

## 💡 Fun / Social / Delight

- **"Made it!" photo upload + visual reviews** — `MadeRecipeBtn` already records every cook; letting users optionally attach a photo turns text reviews into a gallery of real attempts. `[reuses the Firebase Storage upload flow]` `[needs API]` (extend the `madeRecipe` body + `GET /recipes/:id/made-photos`)
- **Follow other cooks + a "from people you follow" feed** — now that public profiles exist (`/u/:username`), follows are the natural social layer: a feed of new recipes from cooks whose food you like. `[needs API]` (follows + feed query)
- **Dark mode / appearance settings** — the new Settings area has Profile / Account / Privacy / Danger but no Appearance tab, and there's no theme toggle anywhere (`grep` finds no `darkMode`/`theme`). A light/dark/system toggle is an expected, low-risk polish item.
- **User-facing notifications** — email exists but only for moderation outcomes. In-app or email notifications for engagement (someone reviewed your recipe, you leveled up, a followed cook posted) would tie the gamification + social work together. `[reuses server/util/email.js + a notifications collection]`

---

## Quick wins, ranked by effort

Lowest-friction first:

1. **Display `fridgeLife` / `freezerLife`** on the recipe page — data already stored, one stat row each.
2. **Share button** on `SingleRecipe` — `navigator.share` + clipboard fallback into the existing actions row.
3. **Search-history dropdown** — localStorage + the existing focus handler.
4. **Recipe JSON-LD** — serialize existing `RecipeType` fields into a `<script type="application/ld+json">`; outsized SEO payoff.
5. **Quick-time (`maxTime`) filter** — mirror the existing meal-type facet plumbing.
6. **Error + retry states** — one shared component dropped into the three fetch sites.

The highest user-impact gap is **cook mode** (the one core recipe-app interaction still missing), followed by **shopping list**, which is the biggest "every competitor has this, we don't" hole.
