// Shared bounds for recipe input. Enforced on the client (input caps +
// validation) and mirrored server-side in server/util/recipeLimits.js — keep
// the two files in sync.
export const TITLE_MAX_LENGTH = 50
export const DESCRIPTION_MAX_LENGTH = 2000
export const INSTRUCTION_MAX_LENGTH = 1000
export const MAX_INGREDIENTS = 50
export const MAX_INSTRUCTIONS = 50
