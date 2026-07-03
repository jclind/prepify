// Single source of truth for the recipe content fields a user supplies, shared
// by the draft routes and the recipe-edit whitelist so the two can't drift.
// Add a user-entered field here and it propagates to both: drafts won't
// silently drop it on autosave, and edits will accept it.
const RECIPE_CONTENT_FIELDS = [
  'title',
  'prepTime',
  'cookTime',
  'servings',
  'fridgeLife',
  'freezerLife',
  'description',
  'ingredients',
  'instructions',
  'cuisine',
  'mealTypes',
  // Author-selected diet/health tags (VEGAN, GLUTEN_FREE…). A user content field
  // so drafts persist it too; it used to be Edamam-computed and lived only in the
  // edit whitelist below.
  'nutritionLabels',
]

// Editing a published recipe also writes the image and the server-/client-
// computed fields; drafts don't carry these.
const EDITABLE_RECIPE_FIELDS = [
  ...RECIPE_CONTENT_FIELDS,
  'recipeImage',
  'nutritionData',
  'servingPrice',
  'totalTime',
]

// Creating a recipe additionally accepts the author snapshot and timestamps the
// client supplies. The server still stamps _id/userId, zeroes the social
// counters, and seeds the rating itself — so curation/moderation flags
// (`status`, `featured`) and any other unlisted key the client sends are
// ignored on create, exactly as the edit whitelist ignores them on update.
const CREATABLE_RECIPE_FIELDS = [
  ...EDITABLE_RECIPE_FIELDS,
  'authorUsername',
  'createdAt',
  'editedAt',
]

// The recipe fields safe to return on PUBLIC (unauthenticated / non-admin)
// responses. This is exactly the shape the client's `RecipeType` consumes; the
// internal moderation/curation stamps are deliberately excluded because no
// client reads them and they carry admin Firebase uids + curation metadata:
//   moderatedBy, moderatedAt, featuredBy, featuredAt, publishUpdatedBy, publishUpdatedAt
// A whitelist (not a blacklist of those six) so a future internal stamp added to
// the doc can't silently leak — it stays out of public responses until added
// here on purpose. Built on CREATABLE_RECIPE_FIELDS so new user-content fields
// propagate automatically, matching the drafts/edit whitelists above.
const PUBLIC_RECIPE_FIELDS = [
  '_id',
  ...CREATABLE_RECIPE_FIELDS,
  // Server-maintained stats/social counters + the curation flag the client renders.
  'rating',
  'views',
  'numTimesSaved',
  'numTimesMade',
  'featured',
  // Author uid — the recipe-detail client compares it to the signed-in user to
  // gate the owner-only Edit/Delete controls, so it must reach the detail response.
  'userId',
  // Moderation state — drives the owner's "held for review" notice (and the
  // admin controls); benign on a publicly-visible recipe, where it's 'published'.
  'status',
  // Only ever populated in-memory on the admin getRecipe path; absent otherwise.
  'automodClassifier',
]

// The lighter shape for recipe CARDS — the single projection shared by every
// public LIST surface: browse (`GET /recipes`), the home trending / For-You /
// random rows, and the public-profile tiles. A card renders only
// image/title/cuisine/time/price/rating/saves, and the For-You/random
// personalization scores on the tag arrays — none of it needs the heavy detail
// fields (ingredients/instructions/nutritionData/description) or the author uid /
// moderation state. An explicit lean whitelist (not the full public shape minus a
// few keys): cards stay small, and — like the detail whitelist — it structurally
// can't carry the internal moderation stamps to anonymous callers.
const PUBLIC_RECIPE_CARD_FIELDS = [
  '_id',
  'title',
  'recipeImage',
  'cuisine',
  'totalTime',
  'servingPrice',
  'rating',
  'mealTypes',
  'nutritionLabels',
  'numTimesSaved',
]

// Mongo inclusion projections derived from the whitelists above, for use as the
// `projection`/`.project()` argument on the public recipe reads.
const toProjection = (fields) => Object.fromEntries(fields.map((f) => [f, 1]))
const publicRecipeProjection = toProjection(PUBLIC_RECIPE_FIELDS)
const publicRecipeCardProjection = toProjection(PUBLIC_RECIPE_CARD_FIELDS)

// Copy only the whitelisted keys that are present in `body`. Absent keys are
// left out (callers merge via $set), so a field the client doesn't send is
// untouched rather than overwritten.
function pickFields(body, fields) {
  const out = {}
  for (const field of fields) {
    if (field in body) out[field] = body[field]
  }
  return out
}

module.exports = {
  RECIPE_CONTENT_FIELDS,
  EDITABLE_RECIPE_FIELDS,
  CREATABLE_RECIPE_FIELDS,
  PUBLIC_RECIPE_FIELDS,
  PUBLIC_RECIPE_CARD_FIELDS,
  publicRecipeProjection,
  publicRecipeCardProjection,
  pickFields,
}
