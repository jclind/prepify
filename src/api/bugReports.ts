import {
  NewBugReportType,
  BugReportType,
  AdminBugReportsResponse,
  BugReportCategory,
  BugReportStatus,
} from 'types'
import { http } from 'src/api/http-common'

// Client for the bug-report endpoints (server/routes/bugReports.js). Submitting
// is open to anyone — logged-out included — so createBugReport does NOT gate on a
// uid (the request interceptor attaches a token when one exists). The queue +
// resolution calls are admin-only and the server enforces that via the `admin`
// custom claim.
class BugReportAPIClass {
  // Anyone can file a bug report. The Firebase token is attached automatically
  // when the user is signed in; otherwise the report is stored anonymously.
  async createBugReport(report: NewBugReportType): Promise<BugReportType> {
    const result = await http.post<BugReportType>('api/bug-reports', report)
    return result.data
  }

  // Admin: the bug-report queue, optionally filtered by status / category.
  async listBugReports(params?: {
    status?: BugReportStatus
    category?: BugReportCategory
    page?: number
    perPage?: number
  }): Promise<AdminBugReportsResponse> {
    const result = await http.get<AdminBugReportsResponse>(
      'api/admin/bug-reports',
      { params }
    )
    return result.data
  }

  // Admin: close a single bug report.
  async resolveBugReport(
    id: string,
    status: 'resolved' | 'dismissed'
  ): Promise<BugReportType> {
    const result = await http.patch<BugReportType>(
      `api/admin/bug-reports/${id}`,
      { status }
    )
    return result.data
  }

  // Admin: close many at once. Returns how many were actually updated
  // (already-closed ids in the batch are skipped server-side).
  async bulkResolve(
    ids: string[],
    status: 'resolved' | 'dismissed'
  ): Promise<{ updated: number }> {
    const result = await http.patch<{ updated: number }>(
      'api/admin/bug-reports/bulk',
      { ids, status }
    )
    return result.data
  }
}

const BugReportAPI = new BugReportAPIClass()

export default BugReportAPI
