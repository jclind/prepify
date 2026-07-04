// Shared string/count bounds for recipe input. Enforced on the client (input
// caps + validation in AddRecipe) and mirrored server-side in
// server/util/recipeLimits.js — keep these two files in sync.
//
// The server's NUMERIC range bounds (times, servings, storage life, serving
// price) are intentionally NOT mirrored here: the client constrains those
// through stricter input-widget caps (ServingsInput 1–99, TimeInput 99h/59m)
// and serving price is derived, never typed — so validating them against a
// shared ceiling on the client would be dead code that never fires. The server
// owns those as defense-in-depth; see server/util/recipeLimits.js.
export const TITLE_MAX_LENGTH = 50
export const DESCRIPTION_MAX_LENGTH = 2000
export const INSTRUCTION_MAX_LENGTH = 1000
export const INGREDIENT_MAX_LENGTH = 200
export const MAX_INGREDIENTS = 50
export const MAX_INSTRUCTIONS = 50
