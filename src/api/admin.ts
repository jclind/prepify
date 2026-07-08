import {
  AdminUsersResponse,
  AdminUserDetailType,
  UserStatus,
  AuditResponse,
  AuditAction,
  AuditTargetType,
  AnalyticsResponse,
  IngredientMissType,
  IngredientMissesResponse,
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

  // Read-only ingredient-enrichment telemetry (N6): strings that missed
  // enrichment or enriched to an implausible price. `type` filters to one event
  // kind; omitted lists both. Sorted server-side by count desc.
  async listIngredientMisses(params?: {
    type?: IngredientMissType
    page?: number
    perPage?: number
  }): Promise<IngredientMissesResponse> {
    const result = await http.get<IngredientMissesResponse>(
      'api/admin/ingredients',
      { params }
    )
    return result.data
  }

  // Overview metrics for the admin dashboard. `days` bounds the over-time series
  // (server clamps to 7–90).
  async getAnalytics(params?: { days?: number }): Promise<AnalyticsResponse> {
    const result = await http.get<AnalyticsResponse>('api/admin/analytics', {
      params,
    })
    return result.data
  }

  // Clear an automated hold: restore a pending_review recipe to active AND dismiss
  // its open automod report in one server-side action. The hold reason itself is
  // carried inline on the admin GET /getRecipe (recipe.automodClassifier). Errors
  // if the recipe isn't currently pending review.
  async approveRecipe(
    recipeId: string
  ): Promise<{ _id: string; status: string }> {
    const result = await http.patch<{ _id: string; status: string }>(
      `api/admin/recipes/${recipeId}/approve`
    )
    return result.data
  }
}

const AdminAPI = new AdminAPIClass()

export default AdminAPI
