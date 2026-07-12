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

// Creating a recipe carries no extra client-supplied fields beyond the editable
// set. The server stamps _id/userId, the createdAt/editedAt timestamps, zeroes
// the social counters, seeds the rating itself, and derives `authorUsername`
// from the caller's req.uid→username mapping — so the client can't dictate a
// recipe's creation time (createdAt drives the "Newest"/"Oldest" browse sort, so
// a forged/skewed client clock could otherwise pin a recipe to the top of
// Newest) NOR forge the displayed author.
//
// `authorUsername` USED to be here, but it was persisted verbatim and never
// checked against the caller — letting a user publish a recipe attributed to
// someone else's handle (audit M3, author impersonation). It's now server-
// derived at write time (routes/recipes.js addRecipe) and is NOT client-
// writable, so CREATABLE == EDITABLE. Curation/moderation flags (`status`,
// `featured`) and any other unlisted key the client sends are ignored on create,
// exactly as the edit whitelist ignores them on update.
const CREATABLE_RECIPE_FIELDS = [...EDITABLE_RECIPE_FIELDS]

// The internal moderation/curation stamps an admin action writes onto a recipe.
// They carry admin Firebase uids + curation metadata that no client reads, so
// they must never reach a non-admin caller. Named here as the single source of
// truth for both the public whitelist below (which structurally excludes them)
// and the owner-export exclusion (which keeps the full authored body but strips
// exactly these) — so the two can't drift.
const RECIPE_INTERNAL_STAMPS = [
  'moderatedBy',
  'moderatedAt',
  'featuredBy',
  'featuredAt',
  'publishUpdatedBy',
  'publishUpdatedAt',
]

// The recipe fields safe to return on PUBLIC (unauthenticated / non-admin)
// responses. This is exactly the shape the client's `RecipeType` consumes; the
// internal moderation/curation stamps (RECIPE_INTERNAL_STAMPS) are deliberately
// excluded because no client reads them and they carry admin Firebase uids.
// A whitelist (not a blacklist of those stamps) so a future internal stamp added
// to the doc can't silently leak — it stays out of public responses until added
// here on purpose. Built on CREATABLE_RECIPE_FIELDS so new user-content fields
// propagate automatically, matching the drafts/edit whitelists above.
const PUBLIC_RECIPE_FIELDS = [
  '_id',
  ...CREATABLE_RECIPE_FIELDS,
  // Server-derived author handle (stamped from req.uid at create — audit M3).
  // Not client-writable (dropped from CREATABLE above), but public: the recipe
  // card/detail displays it, so it must reach public responses.
  'authorUsername',
  // Server-stamped timestamps the client renders (formerly client-supplied, now
  // authoritative on the server — see CREATABLE_RECIPE_FIELDS).
  'createdAt',
  'editedAt',
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

// An EXCLUSION projection ({ field: 0 }) that drops only the internal admin
// stamps, leaving every other (user-authored) field intact. Used for the
// owner's export of their OWN recipes/drafts, where — unlike a public read — the
// full high-fidelity body is wanted, just not the admin-uid moderation metadata.
const recipeInternalStampsExclusion = Object.fromEntries(
  RECIPE_INTERNAL_STAMPS.map((f) => [f, 0])
)

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
  RECIPE_INTERNAL_STAMPS,
  publicRecipeProjection,
  publicRecipeCardProjection,
  recipeInternalStampsExclusion,
  pickFields,
}
