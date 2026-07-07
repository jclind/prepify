// Central route-path constants. The single source of truth for route strings that
// appear in more than one place — nav links, redirects, and the `pathname === …`
// search-suppression checks — so renaming a route can't silently drift copies out
// of sync: every consumer resolves through TypeScript instead of a bare literal.
//
// Scope note: only route strings duplicated across files live here. Single-use
// route literals stay inline at their one call site (nothing to drift from).

/** The browse/catalog page. Referenced by the navbar link, the two navbar
 *  search-suppression checks (`pathname === RECIPES_PATH`), and the Recipes
 *  page's own "browse all" reset. */
export const RECIPES_PATH = '/recipes'

// Account sub-routes. `accountTabs` (src/pages/Account/components/accountTabs.tsx)
// consumes these for its tab `to` fields, and the app-wide nav links (DesktopBar,
// DesktopAccountMenu, the footer, and DraftResumeBanner) point at the same
// constants — so the account-page tab strip and the global nav can't drift apart.
export const ACCOUNT_SAVED_RECIPES_PATH = '/account/saved-recipes'
export const ACCOUNT_RATINGS_PATH = '/account/ratings'
export const ACCOUNT_YOUR_RECIPES_PATH = '/account/your-recipes'
export const ACCOUNT_DRAFTS_PATH = '/account/drafts'
