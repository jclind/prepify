// Re-export RecipeAPI methods as a hook for components that prefer hook-style access.
// Components may also import RecipeAPI directly — both patterns are valid.
import RecipeAPI from 'features/recipes/api/recipes'

export function useRecipes() {
  return RecipeAPI
}
