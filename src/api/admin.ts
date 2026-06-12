import {
  AdminUsersResponse,
  AdminUserDetailType,
  UserStatus,
  AuditResponse,
  AuditAction,
  AuditTargetType,
} from 'types'
import { http } from 'src/api/http-common'

// Client for the P2 admin endpoints (server/routes/admin.js + the recipe
// feature/publish endpoints on server/routes/recipes.js). All calls are
// admin-only; the server enforces that via the `admin` custom claim.
class AdminAPIClass {
  // Search/list users for moderation. `query` is a username prefix, an email
  // (contains '@', resolved via Firebase), or an exact uid; empty lists all.
  async searchUsers(params?: {
    query?: string
    page?: number
    perPage?: number
  }): Promise<AdminUsersResponse> {
    const result = await http.get<AdminUsersResponse>('api/admin/users', {
      params,
    })
    return result.data
  }

  async getUser(uid: string): Promise<AdminUserDetailType> {
    const result = await http.get<AdminUserDetailType>(`api/admin/users/${uid}`)
    return result.data
  }

  // Set a user's moderation status. `reason` is stored for suspended/banned and
  // cleared on a return to active.
  async setUserStatus(
    uid: string,
    status: UserStatus,
    reason?: string
  ): Promise<{ uid: string; status: UserStatus }> {
    const result = await http.patch<{ uid: string; status: UserStatus }>(
      `api/admin/users/${uid}/status`,
      { status, reason }
    )
    return result.data
  }

  // Curate the home trending row.
  async setRecipeFeatured(
    recipeId: string,
    featured: boolean
  ): Promise<{ _id: string; featured: boolean }> {
    const result = await http.patch<{ _id: string; featured: boolean }>(
      `api/admin/recipes/${recipeId}/feature`,
      { featured }
    )
    return result.data
  }

  // De-publish / re-publish a recipe (distinct from a moderation takedown).
  async setRecipePublished(
    recipeId: string,
    published: boolean
  ): Promise<{ _id: string; status: string }> {
    const result = await http.patch<{ _id: string; status: string }>(
      `api/admin/recipes/${recipeId}/publish`,
      { published }
    )
    return result.data
  }

  // The moderation audit trail, newest first; optionally filtered.
  async listAudit(params?: {
    action?: AuditAction
    targetType?: AuditTargetType
    actorUid?: string
    page?: number
    perPage?: number
  }): Promise<AuditResponse> {
    const result = await http.get<AuditResponse>('api/admin/audit', { params })
    return result.data
  }
}

const AdminAPI = new AdminAPIClass()

export default AdminAPI
