import { QueryClient } from '@tanstack/react-query'

/**
 * Invalidate every cache touched by a save/unsave or collection-membership
 * change, so the saved tab, account counts, per-card bookmark state, and
 * collection covers/counts all refetch in one call.
 *
 * Centralizes the cache keys these mutations share — the saved page and the
 * SaveControl popover used to hand-roll overlapping `invalidateQueries` calls.
 * Page-specific bits (e.g. resetting the paged grid to page 0) stay at the call
 * site.
 */
export const invalidateSavedCaches = (
  queryClient: QueryClient,
  uid: string | null
) => {
  queryClient.invalidateQueries({ queryKey: ['collections'] })
  queryClient.invalidateQueries({ queryKey: ['account-counts', uid] })
  queryClient.invalidateQueries({ queryKey: ['savedRecipeIds', uid] })
  queryClient.invalidateQueries({ queryKey: ['saved-recipes'] })
}
