import axios from 'axios'

/**
 * Pull a user-facing message out of a failed request. Prefers the server's own
 * reason — e.g. a 422 moderation block sends
 * `{ error: "…flagged by our automated moderation system…", code: 'CONTENT_BLOCKED' }`
 * — so the UI shows that instead of axios's generic "Request failed with status
 * code 422". Falls back to a thrown Error's message, then the provided default.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const serverMsg = (error.response?.data as { error?: string } | undefined)
      ?.error
    if (serverMsg) return serverMsg
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
