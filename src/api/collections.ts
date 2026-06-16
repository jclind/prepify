import { http } from 'src/api/http-common'
import AuthAPI from 'src/api/auth'
import { RecipeCollection } from 'types'

// Client for the saved-recipe collections API. Collections are folders layered
// over the master saved list; a recipe's membership is set in one call via
// setRecipeCollections (which auto-saves a not-yet-saved recipe server-side).
const CollectionsAPI = {
  async list(): Promise<RecipeCollection[]> {
    if (!AuthAPI.getUID()) return []
    const result = await http.get('api/collections')
    return result.data
  },

  async create(name: string): Promise<RecipeCollection> {
    const result = await http.post('api/collections', { name })
    return result.data
  },

  async rename(id: string, name: string): Promise<{ id: string; name: string }> {
    const result = await http.patch(`api/collections/${id}`, { name })
    return result.data
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await http.delete(`api/collections/${id}`)
    return result.data
  },

  // Set which collections a recipe belongs to. Unknown ids are dropped
  // server-side; an empty array clears membership (the recipe stays saved).
  async setRecipeCollections(
    recipeId: string,
    collectionIds: string[]
  ): Promise<{ recipeId: string; collectionIds: string[]; saved: boolean }> {
    const result = await http.patch(`api/recipes/${recipeId}/collections`, {
      collectionIds,
    })
    return result.data
  },
}

export default CollectionsAPI
