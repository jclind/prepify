import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

/**
 * Shared save/unsave logic for a single recipe, used by both the browse grid
 * cards and the single-recipe page.
 *
 * Saved state for the whole session is resolved from ONE request — the user's
 * saved-id list cached under `['savedRecipeIds', uid]` — instead of one
 * `getSavedRecipe` request per rendered card.
 *
 * Toggling is a proper React Query optimistic mutation. The saved-id list is a
 * SHARED cache that other surfaces refetch constantly (`invalidateSavedCaches`,
 * window-focus, a newly mounted card) — and it runs at the app's default
 * staleTime (0), so those refetches fire all the time. The old hook hand-rolled
 * `setQueryData` with no protection, so a stale refetch resolving mid-write
 * overwrote the optimistic value AND, with no post-write reconciliation, the
 * bookmark stayed reverted even though the save had succeeded on the server —
 * the "saving is broken" symptom. The mutation guards both ends:
 *   - `onMutate` CANCELS in-flight refetches before the optimistic write, so a
 *     refetch already running at click time can't clobber it (prevents a flicker).
 *   - `onError` rolls back to the pre-write snapshot.
 *   - `onSettled` re-fetches the committed truth, so any clobber from a refetch
 *     that started AFTER onMutate (which cancel can't catch) self-heals instead
 *     of leaving a stuck bookmark. This is what actually fixes the reported bug.
 */
export const useSaveRecipe = (recipeId: string) => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()
  const queryKey = ['savedRecipeIds', uid]

  const { data: savedIds } = useQuery({
    queryKey,
    queryFn: () => RecipeAPI.getSavedRecipeIds(),
    enabled: !!uid,
  })

  const isSaved = !!savedIds?.includes(recipeId)

  const mutation = useMutation({
    mutationFn: (nextSaved: boolean) =>
      nextSaved
        ? RecipeAPI.saveRecipe(recipeId)
        : RecipeAPI.unsaveRecipe(recipeId),
    onMutate: async (nextSaved: boolean) => {
      // Cancel outgoing refetches so an in-flight (stale) saved-id list can't
      // resolve after this write and clobber the optimistic value.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? []
      const next = nextSaved
        ? [...previous, recipeId]
        : previous.filter(id => id !== recipeId)
      queryClient.setQueryData(queryKey, next)
      return { previous }
    },
    onError: (_err, _nextSaved, context) => {
      // Roll back to the snapshot taken before the optimistic write.
      if (context) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      // Reconcile with the committed server state once the write resolves. The
      // saved-id list runs with the app's default staleTime (0), so a card
      // mounting or a window-focus right AFTER onMutate can kick off a fresh
      // refetch that cancelQueries (which only cancels what's in flight AT mutate
      // time) can't catch. Re-fetching here means any such transient clobber
      // self-heals to the truth instead of leaving a stuck bookmark.
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Resolves true once the server write lands, false on failure (after rolling
  // back the optimistic cache). Never rejects, so fire-and-forget callers can't
  // leak an unhandled rejection; callers that need to refetch dependent caches
  // (collection counts, the saved grid) should await it and skip on false so
  // they don't refetch against a write that didn't happen.
  const toggle = async (): Promise<boolean> => {
    if (!uid) {
      toast('Please login to save recipes.', { duration: 6000 })
      return false
    }
    try {
      await mutation.mutateAsync(!isSaved)
      return true
    } catch {
      return false
    }
  }

  return { isSaved, toggle, isLoggedIn: !!uid }
}
