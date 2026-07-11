import { RecipeDraftContent, RecipeDraftType } from 'types'
import AuthAPI from 'src/api/auth'
import {
  API_BASE_URL,
  getCachedIdToken,
  http,
  warmIdToken,
} from 'src/api/http-common'

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

  // Warm the cached ID token so a later unload flush can authenticate even if no
  // autosave request has gone out yet. Best-effort; safe to call repeatedly.
  warmAuth(): void {
    if (!AuthAPI.getUID()) return
    void warmIdToken()
  }

  // Synchronous, fire-and-forget draft save for page unload (beforeunload /
  // pagehide). An async axios request won't reliably complete while the page is
  // being torn down, so this uses `fetch(..., { keepalive: true })`, which the
  // browser guarantees to run to completion in the background. It mirrors the
  // normal autosave contract: PUT /drafts/:id (echoing the `baseUpdatedAt`
  // concurrency precondition the server requires) for an existing draft, or
  // POST /drafts to create one. The Bearer token is read synchronously from the
  // cache the axios interceptor maintains (see http-common). Returns false
  // without firing when no token is available (signed out, or no request has
  // ever warmed the cache).
  flushDraftKeepalive(
    id: string | null,
    content: RecipeDraftContent,
    baseUpdatedAt: string
  ): boolean {
    if (!AuthAPI.getUID()) return false
    const token = getCachedIdToken()
    if (!token) return false
    const url = id
      ? `${API_BASE_URL}/api/drafts/${id}`
      : `${API_BASE_URL}/api/drafts`
    const body = id ? { ...content, updatedAt: baseUpdatedAt } : content
    fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      // The page is unloading; there's nothing to recover to and no UI left to
      // surface an error on.
    })
    return true
  }
}

const DraftAPI = new DraftAPIClass()

export default DraftAPI
