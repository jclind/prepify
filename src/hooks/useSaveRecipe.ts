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

  const toggle = () => {
    if (!uid) {
      toast('Please login to save recipes.', { duration: 6000 })
      return
    }
    const current = savedIds ?? []
    const next = isSaved
      ? current.filter(id => id !== recipeId)
      : [...current, recipeId]
    queryClient.setQueryData(queryKey, next) // optimistic
    const request = isSaved
      ? RecipeAPI.unsaveRecipe(recipeId)
      : RecipeAPI.saveRecipe(recipeId)
    // Roll back to the pre-toggle list if the server rejects it.
    request.catch(() => queryClient.setQueryData(queryKey, current))
  }

  return { isSaved, toggle, isLoggedIn: !!uid }
}
