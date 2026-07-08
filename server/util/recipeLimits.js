// Server-side bounds for recipe input. The string/count limits below mirror
// src/util/recipeLimits.ts — keep those two in sync. The numeric range bounds
// are server-only: the client constrains those through stricter input-widget
// caps, so they aren't mirrored client-side. Either way this is the
// authoritative, defense-in-depth check: never trust the client.
const TITLE_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 2000
const INSTRUCTION_MAX_LENGTH = 1000
const INGREDIENT_MAX_LENGTH = 200
const MAX_INGREDIENTS = 50
const MAX_INSTRUCTIONS = 50

// Numeric bounds. Recipes carry a handful of user-entered numbers. The client UI
// already constrains them (TimeInput caps hours ≤ 99 / minutes ≤ 59, etc.), but a
// hand-crafted request can send anything — a string, NaN, Infinity, a negative, or
// an absurdly large value that skews sorts/aggregates — so clamp type AND range
// here too. Times are whole minutes: the client's max prep+cook is ~12000 min, so a
// shared two-week ceiling covers legitimate long cures/ferments while rejecting
// garbage. Storage life is in whole days. servingPrice is in US cents but is
// derived (rounded) rather than typed, so it's bounded and non-negative but not
// integer-pinned — see the `integer: false` note on NUMERIC_RECIPE_FIELDS below.
const MAX_TIME_MINUTES = 60 * 24 * 14 // 20160 (two weeks)
const MAX_STORAGE_DAYS = 365
const MAX_SERVINGS = 1000
const MAX_SERVING_PRICE_CENTS = 1_000_000 // $10,000 / serving

// Per-field numeric spec, checked by validateRecipeBounds. `min`/`max` are
// inclusive; `integer: true` additionally requires a whole number. Every numeric
// field is OPTIONAL at this layer — absent or explicitly null skips the check
// (required-field presence is validated separately). servingPrice is derived
// (rounded cents) so it isn't integer-pinned, just non-negative and bounded.
const NUMERIC_RECIPE_FIELDS = {
  prepTime: { min: 0, max: MAX_TIME_MINUTES, integer: true, label: 'Prep time' },
  cookTime: { min: 0, max: MAX_TIME_MINUTES, integer: true, label: 'Cook time' },
  totalTime: { min: 0, max: MAX_TIME_MINUTES, integer: true, label: 'Total time' },
  servings: { min: 1, max: MAX_SERVINGS, integer: true, label: 'Servings' },
  fridgeLife: { min: 0, max: MAX_STORAGE_DAYS, integer: true, label: 'Fridge life' },
  freezerLife: { min: 0, max: MAX_STORAGE_DAYS, integer: true, label: 'Freezer life' },
  servingPrice: { min: 0, max: MAX_SERVING_PRICE_CENTS, integer: false, label: 'Serving price' },
}

// Returns an error string when `value` violates `spec`, or null when it's in
// bounds. Callers only invoke this for present, non-null values.
function validateNumericField(value, spec) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${spec.label} must be a number`
  }
  if (spec.integer && !Number.isInteger(value)) {
    return `${spec.label} must be a whole number`
  }
  if (value < spec.min || value > spec.max) {
    return `${spec.label} must be between ${spec.min} and ${spec.max}`
  }
  return null
}

// Fields a recipe must carry to be created or edited. Shared by both routes so
// the requirement can't drift between create and edit.
const REQUIRED_RECIPE_FIELDS = ['title', 'ingredients', 'instructions', 'mealTypes']

// Returns an error string when a required field is missing/empty, or null when
// all are present. An array field counts as missing when empty.
function validateRequiredRecipeFields(body) {
  const missing = REQUIRED_RECIPE_FIELDS.filter(f => {
    const val = body[f]
    // A whitespace-only string (e.g. an all-spaces title) is not `''`, so guard
    // it here too — defence-in-depth behind the client's trimmed-title check, so
    // the server can't persist a blank-looking required field on its own.
    return (
      val == null ||
      (typeof val === 'string' && val.trim() === '') ||
      (Array.isArray(val) && val.length === 0)
    )
  })
  return missing.length > 0
    ? `Missing required fields: ${missing.join(', ')}`
    : null
}

// Returns an error string when `body` violates a bound, or null when it's within
// limits. Only checks fields that are present — required-field presence is
// validated separately by the route.
function validateRecipeBounds(body) {
  if (typeof body.title === 'string' && body.title.length > TITLE_MAX_LENGTH) {
    return `Title cannot exceed ${TITLE_MAX_LENGTH} characters`
  }
  if (
    typeof body.description === 'string' &&
    body.description.length > DESCRIPTION_MAX_LENGTH
  ) {
    return `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
  }
  if (Array.isArray(body.ingredients)) {
    if (body.ingredients.length > MAX_INGREDIENTS) {
      return `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
    }
    // Per-element cap (mirrors the per-instruction one below): a small ingredient
    // array whose individual raw lines are huge is just as abusive as a long one.
    // The ingredient union nests the user's typed line under parsedIngredient;
    // only check it when that string is present, consistent with the rest of this
    // function (label rows and un-parsed entries simply have nothing to check).
    const ingredientTooLong = body.ingredients.some(
      ing =>
        ing &&
        ing.parsedIngredient &&
        typeof ing.parsedIngredient.originalIngredientString === 'string' &&
        ing.parsedIngredient.originalIngredientString.length > INGREDIENT_MAX_LENGTH
    )
    if (ingredientTooLong) {
      return `An ingredient cannot exceed ${INGREDIENT_MAX_LENGTH} characters`
    }
  }
  if (Array.isArray(body.instructions)) {
    if (body.instructions.length > MAX_INSTRUCTIONS) {
      return `A recipe cannot have more than ${MAX_INSTRUCTIONS} instructions`
    }
    const tooLong = body.instructions.some(
      instr =>
        instr &&
        typeof instr.content === 'string' &&
        instr.content.length > INSTRUCTION_MAX_LENGTH
    )
    if (tooLong) {
      return `An instruction cannot exceed ${INSTRUCTION_MAX_LENGTH} characters`
    }
  }
  // Numeric type + range clamps. Skip fields that are absent or null (all are
  // optional here) — only validate the ones the client actually sent.
  for (const [field, spec] of Object.entries(NUMERIC_RECIPE_FIELDS)) {
    if (body[field] == null) continue
    const numericError = validateNumericField(body[field], spec)
    if (numericError) return numericError
  }
  return null
}

module.exports = {
  validateRequiredRecipeFields,
  validateRecipeBounds,
  DESCRIPTION_MAX_LENGTH,
  INGREDIENT_MAX_LENGTH,
  MAX_TIME_MINUTES,
  MAX_STORAGE_DAYS,
  MAX_SERVINGS,
  MAX_SERVING_PRICE_CENTS,
}
