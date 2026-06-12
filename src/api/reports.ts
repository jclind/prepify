import {
  NewReportType,
  ReportType,
  AdminReportsResponse,
  ReportStatus,
} from 'types'
import AuthAPI from 'src/api/auth'
import { http } from 'src/api/http-common'

// Server-set `code` on the 409 returned when the caller already has an open
// report for the same target (server/routes/reports.js). createReport lets this
// propagate so the UI can show "already reported" rather than a generic error.
export const ALREADY_REPORTED_CODE = 'ALREADY_REPORTED'

// Client for the reporting + moderation endpoints (server/routes/reports.js,
// plus the admin takedown endpoints on recipes/reviews). Reporting is open to
// any logged-in user; the queue + resolution + takedown calls are admin-only
// and the server enforces that via the `admin` custom claim.
class ReportAPIClass {
  // Any logged-in user can file a report.
  async createReport(report: NewReportType): Promise<ReportType | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.post<ReportType>('api/reports', report)
    return result.data
  }

  // Admin: the moderation queue, optionally filtered by status / target type.
  async listReports(params?: {
    status?: ReportStatus
    targetType?: 'recipe' | 'review'
    page?: number
    perPage?: number
  }): Promise<AdminReportsResponse> {
    const result = await http.get<AdminReportsResponse>('api/reports', {
      params,
    })
    return result.data
  }

  // Admin: close a report (does not itself take content down).
  async resolveReport(
    id: string,
    status: 'resolved' | 'dismissed'
  ): Promise<ReportType> {
    const result = await http.patch<ReportType>(`api/reports/${id}`, { status })
    return result.data
  }

  // Admin: soft-hide / restore a recipe.
  async setRecipeModeration(
    recipeId: string,
    status: 'hidden' | 'active'
  ): Promise<{ _id: string; status: string }> {
    const result = await http.patch<{ _id: string; status: string }>(
      `api/admin/recipes/${recipeId}/moderation`,
      { status }
    )
    return result.data
  }

  // Admin: take down / restore a review (keyed by username + recipeId).
  async setReviewModeration(
    recipeId: string,
    username: string,
    moderationHidden: boolean
  ): Promise<void> {
    await http.patch('api/admin/reviews/moderation', {
      recipeId,
      username,
      moderationHidden,
    })
  }
}

const ReportAPI = new ReportAPIClass()

export default ReportAPI
