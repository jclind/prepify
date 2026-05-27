// Server-side bounds for recipe input. Mirrors src/util/recipeLimits.ts — keep
// the two files in sync. This is the authoritative, defense-in-depth check:
// the client enforces the same limits, but never trust the client.
const TITLE_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 2000
const INSTRUCTION_MAX_LENGTH = 1000
const MAX_INGREDIENTS = 50
const MAX_INSTRUCTIONS = 50

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
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  INSTRUCTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
  validateRecipeBounds,
}
