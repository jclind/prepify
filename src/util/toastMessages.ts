/**
 * Single source of truth for toast strings that were duplicated across files.
 * Keeping the repeats here stops them drifting apart again (the same rationale
 * behind src/util/modalStyles and the shared accountTabs map). One-off toast
 * strings stay inline at their call site — only cross-file repeats live here.
 *
 * Copy convention (see docs/sweeps — toast-punctuation track):
 *  - Errors: sentence case, end with a period; "Could not <verb> <object>.",
 *    append "Please try again." when the action is worth retrying.
 *  - Success: end with a period; reserve "!" for genuine milestones
 *    (Welcome to Prepify, achievement unlocks) — not routine confirmations.
 */

/** Generic fallback when there's nothing more specific to say. */
export const GENERIC_ERROR = 'Something went wrong. Please try again.'

// Account / auth — shared across the Settings sections.
export const EMAIL_IN_USE = 'Email already in use.'
export const PASSWORD_INCORRECT = 'Password incorrect, please try again.'

// Image upload — ProfileSection avatar + AddRecipe ImagePicker.
export const IMAGE_TOO_LARGE = 'Image cannot be more than 5MB in size.'

// Profile-link copy — PublicProfile + Account ProfileControls.
export const PROFILE_LINK_COPIED = 'Profile link copied.'
export const PROFILE_LINK_COPY_ERROR = 'Could not copy link.'

// Collections — AddToCollectionPopover + SavedRecipes.
export const COLLECTION_CREATE_ERROR = 'Could not create collection.'

// Recipe moderation — AdminRecipeControls + the Reports approve path.
export const RECIPE_APPROVED = 'Recipe approved and published.'
export const RECIPE_APPROVE_ERROR = 'Could not approve the recipe.'

// Admin report queue — identical mutation block in Reports + BugReports.
export const REPORTS_BULK_UPDATE_ERROR = 'Could not update the selected reports.'
export const REPORT_UPDATE_ERROR = 'Could not update the report.'
export const reportsBulkUpdated = (updated: number, status: string) =>
  `${updated} report${updated === 1 ? '' : 's'} ${status}.`
export const reportUpdated = (status: string) => `Report ${status}.`
