import { RecipeDraftContent, RecipeDraftType } from 'types'
import AuthAPI from 'src/api/auth'
import { http } from 'src/api/http-common'

// Server-set `code` on the 409 returned when a user is at their draft cap
// (server/routes/drafts.js). createDraft lets this error propagate so callers
// can distinguish "at limit" from a generic save failure.
export const DRAFT_LIMIT_CODE = 'DRAFT_LIMIT'

// Server-set `code` on the 409 returned when updateDraft's `baseUpdatedAt`
// no longer matches the stored draft — another tab/session saved on top of it
// since the caller last fetched (server/routes/drafts.js). The response body
// also carries the server's current `draft` so the caller can reconcile.
export const DRAFT_CONFLICT_CODE = 'DRAFT_CONFLICT'

// Client for the recipe-draft endpoints (server/routes/drafts.js). Drafts are
// the autosaved, in-progress state of the create-recipe flow. The image is not
// part of a draft — see RecipeDraftContent / AddRecipe autosave.
class DraftAPIClass {
  async createDraft(content: RecipeDraftContent): Promise<RecipeDraftType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.post<RecipeDraftType>('api/drafts', content)
    return result.data
  }

  // `baseUpdatedAt` is the `updatedAt` of the version being edited from — the
  // server conditions the write on the stored draft still carrying that value
  // and 409s (DRAFT_CONFLICT_CODE) if another save has moved it since.
  async updateDraft(
    id: string,
    content: RecipeDraftContent,
    baseUpdatedAt: string
  ): Promise<RecipeDraftType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.put<RecipeDraftType>(`api/drafts/${id}`, {
      ...content,
      updatedAt: baseUpdatedAt,
    })
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
