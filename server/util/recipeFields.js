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
]

// Editing a published recipe also writes the image and the server-/client-
// computed fields; drafts don't carry these.
const EDITABLE_RECIPE_FIELDS = [
  ...RECIPE_CONTENT_FIELDS,
  'recipeImage',
  'nutritionData',
  'nutritionLabels',
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

module.exports = { RECIPE_CONTENT_FIELDS, EDITABLE_RECIPE_FIELDS, CREATABLE_RECIPE_FIELDS, pickFields }
