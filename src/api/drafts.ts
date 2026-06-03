import { RecipeDraftContent, RecipeDraftType } from 'types'
import AuthAPI from 'src/api/auth'
import { http } from 'src/api/http-common'

// Server-set `code` on the 409 returned when a user is at their draft cap
// (server/routes/drafts.js). createDraft lets this error propagate so callers
// can distinguish "at limit" from a generic save failure.
export const DRAFT_LIMIT_CODE = 'DRAFT_LIMIT'

// Client for the recipe-draft endpoints (server/routes/drafts.js). Drafts are
// the autosaved, in-progress state of the create-recipe flow. The image is not
// part of a draft — see RecipeDraftContent / AddRecipe autosave.
class DraftAPIClass {
  async createDraft(content: RecipeDraftContent): Promise<RecipeDraftType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.post<RecipeDraftType>('api/drafts', content)
    return result.data
  }

  async updateDraft(
    id: string,
    content: RecipeDraftContent
  ): Promise<RecipeDraftType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.put<RecipeDraftType>(`api/drafts/${id}`, content)
    return result.data
  }

  async listDrafts(): Promise<RecipeDraftType[]> {
    if (!AuthAPI.getUID()) return []
    const result = await http.get<RecipeDraftType[]>('api/drafts')
    return result.data
  }

  async getDraft(id: string): Promise<RecipeDraftType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get<RecipeDraftType>(`api/drafts/${id}`)
    return result.data
  }

  async deleteDraft(id: string): Promise<void> {
    if (!AuthAPI.getUID()) return
    await http.delete(`api/drafts/${id}`)
  }
}

const DraftAPI = new DraftAPIClass()

export default DraftAPI
