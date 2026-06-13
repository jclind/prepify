// Server-side bounds for recipe input. Mirrors src/util/recipeLimits.ts — keep
// the two files in sync. This is the authoritative, defense-in-depth check:
// the client enforces the same limits, but never trust the client.
const TITLE_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 2000
const INSTRUCTION_MAX_LENGTH = 1000
const MAX_INGREDIENTS = 50
const MAX_INSTRUCTIONS = 50

// Fields a recipe must carry to be created or edited. Shared by both routes so
// the requirement can't drift between create and edit.
const REQUIRED_RECIPE_FIELDS = ['title', 'ingredients', 'instructions', 'mealTypes']

// Returns an error string when a required field is missing/empty, or null when
// all are present. An array field counts as missing when empty.
function validateRequiredRecipeFields(body) {
  const missing = REQUIRED_RECIPE_FIELDS.filter(f => {
    const val = body[f]
    return val == null || val === '' || (Array.isArray(val) && val.length === 0)
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
  if (Array.isArray(body.ingredients) && body.ingredients.length > MAX_INGREDIENTS) {
    return `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
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
  return null
}

module.exports = {
  validateRequiredRecipeFields,
  validateRecipeBounds,
  DESCRIPTION_MAX_LENGTH,
}
