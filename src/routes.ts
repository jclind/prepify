// Central route-path constants — the source of truth for route strings shared
// across the nav/footer/browse surface, so renaming a route can't silently drift
// those copies out of sync: consumers resolve through TypeScript, not a bare
// literal.
//
// Scope note: migration is intentionally partial. The account sub-routes below are
// fully centralized (every consumer points here). RECIPES_PATH covers only the
// nav/footer/browse surface touched by this change — other `'/recipes'` links
// (Home, About, PublicProfile, SingleRecipe, SavedRecipes, UserRatings, …) still
// use the inline literal and will migrate as their files are next touched. Until
// then this const is authoritative for its consumers, NOT for every `/recipes`
// reference app-wide.

/** The browse/catalog page. Referenced here by the navbar link, the two navbar
 *  search-suppression checks (`pathname === RECIPES_PATH`), the footer, and the
 *  Recipes page's own "browse all" reset — see the scope note above re: the
 *  `'/recipes'` literals elsewhere not yet routed through this const. */
export const RECIPES_PATH = '/recipes'

// Account sub-routes. `accountTabs` (src/pages/Account/components/accountTabs.tsx)
// consumes these for its tab `to` fields, and the app-wide nav links (DesktopBar,
// DesktopAccountMenu, the footer, and DraftResumeBanner) point at the same
// constants — so the account-page tab strip and the global nav can't drift apart.
export const ACCOUNT_SAVED_RECIPES_PATH = '/account/saved-recipes'
export const ACCOUNT_RATINGS_PATH = '/account/ratings'
export const ACCOUNT_YOUR_RECIPES_PATH = '/account/your-recipes'
export const ACCOUNT_DRAFTS_PATH = '/account/drafts'
