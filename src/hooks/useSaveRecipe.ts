import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

/**
 * Shared save/unsave logic for a single recipe, used by both the browse grid
 * cards and the single-recipe page.
 *
 * Saved state for the whole session is resolved from ONE request — the user's
 * saved-id list cached under `['savedRecipeIds', uid]` — instead of one
 * `getSavedRecipe` request per rendered card. Toggling writes that cache
 * optimistically and rolls back if the request fails.
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
    const current = savedIds ?? []
    const next = isSaved
      ? current.filter(id => id !== recipeId)
      : [...current, recipeId]
    queryClient.setQueryData(queryKey, next) // optimistic
    const request = isSaved
      ? RecipeAPI.unsaveRecipe(recipeId)
      : RecipeAPI.saveRecipe(recipeId)
    try {
      await request
      return true
    } catch {
      queryClient.setQueryData(queryKey, current) // roll back on failure
      return false
    }
  }

  return { isSaved, toggle, isLoggedIn: !!uid }
}
