import axios from 'axios'
import { getAuth } from 'firebase/auth'
import toast from 'react-hot-toast'
import { Sentry, sentryEnabled } from 'src/util/sentry'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-type': 'application/json',
  },
})

// The most recent Firebase ID token, cached synchronously as a side effect of
// the request interceptor below. `getIdToken()` is async and won't reliably
// resolve during page unload, so the draft-autosave keepalive flush
// (src/api/drafts.ts) reads this cached value synchronously to authenticate its
// fetch. Firebase tokens live ~1h, so a token cached from any recent request is
// still valid for the flush.
let cachedIdToken: string | null = null

// The last token the interceptor attached, or null if no authenticated request
// has gone out yet this session. Used only by the unload keepalive flush.
export function getCachedIdToken(): string | null {
  return cachedIdToken
}

// Proactively populate the token cache so the unload flush has a token even if
// no authenticated request has happened yet (e.g. the user types and closes the
// tab within the autosave debounce window). Best-effort and non-throwing.
export async function warmIdToken(): Promise<void> {
  try {
    const user = getAuth().currentUser
    if (user) cachedIdToken = await user.getIdToken()
  } catch {
    // getAuth() throws when no Firebase app is initialized (e.g. in tests);
    // warming is best-effort, so swallow it.
  }
}

http.interceptors.request.use(async config => {
  const auth = getAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    cachedIdToken = token
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Surface a clear message when a suspended/banned account is blocked from a
// write (server requireActive returns 403 with a machine code). Without this,
// every gated action would just fail with a generic error. The rejection still
// propagates so callers can handle it too.
http.interceptors.response.use(
  response => response,
  error => {
    const data = error.response?.data
    if (data?.code === 'ACCOUNT_SUSPENDED' || data?.code === 'ACCOUNT_BANNED') {
      const base =
        data.code === 'ACCOUNT_BANNED'
          ? 'Your account has been banned.'
          : 'Your account is suspended.'
      toast.error(data.reason ? `${base} ${data.reason}` : base)
    }
    // Report server faults (5xx) and network failures (no response) to Sentry
    // so silent backend breakage is visible without relying on a user report.
    // Client-side 4xx are expected validation/auth outcomes and stay out of the
    // error stream. The rejection still propagates to callers unchanged.
    if (sentryEnabled) {
      const status = error.response?.status
      if (!status || status >= 500) {
        const method = error.config?.method?.toUpperCase() ?? 'REQUEST'
        const url = error.config?.url ?? 'unknown'
        Sentry.captureException(error, {
          tags: { kind: 'network', http_status: status ?? 'no-response' },
          extra: { method, url },
        })
      }
    }
    return Promise.reject(error)
  }
)
