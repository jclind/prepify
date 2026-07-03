// Shared bounds for recipe input. Enforced on the client (input caps +
// validation) and mirrored server-side in server/util/recipeLimits.js — keep
// the two files in sync.
export const TITLE_MAX_LENGTH = 50
export const DESCRIPTION_MAX_LENGTH = 2000
export const INSTRUCTION_MAX_LENGTH = 1000
export const INGREDIENT_MAX_LENGTH = 200
export const MAX_INGREDIENTS = 50
export const MAX_INSTRUCTIONS = 50

// Numeric bounds — the server enforces these as defense-in-depth in
// server/util/recipeLimits.js (validateRecipeBounds); mirrored here so the two
// files stay in sync. Times are whole minutes, storage life whole days,
// servingPrice whole US cents.
export const MAX_TIME_MINUTES = 60 * 24 * 14 // 20160 (two weeks)
export const MAX_STORAGE_DAYS = 365
export const MAX_SERVINGS = 1000
export const MAX_SERVING_PRICE_CENTS = 1_000_000 // $10,000 / serving
