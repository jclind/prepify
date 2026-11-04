import axios from 'axios'
import { getAuth } from 'firebase/auth'
import toast from 'react-hot-toast'
import { Sentry, sentryEnabled } from 'src/util/sentry'

// VITE_API_URL is a full origin, or the literal `same-origin`. Production uses
// `same-origin` so the browser calls prepifymeals.com/api/* and the site's
// Netlify Edge Function (netlify/edge-functions/api-proxy.ts) forwards it to
// Railway. Some networks' DNS blocks *.railway.app, and this way visitors only
// ever look up the site's own domain. It has to resolve to a full origin, not
// '', because most calls use relative `api/...` paths that would otherwise
// resolve against the current page path.
export function resolveApiBaseUrl(
  configured: string | undefined,
  origin: string
): string {
  if (configured === 'same-origin') return origin
  return configured || 'http://localhost:4000'
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL,
  window.location.origin
)

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

// A request that got no response at all: offline, the server down, or a
// network whose DNS or firewall blocks the site (some block *.railway.app,
// which is why the API is served from the site's own domain). Without a
// message the page just renders empty and looks broken. The fixed toast id
// keeps a page's worth of failed calls to one notice.
export const API_UNREACHABLE_TOAST_ID = 'api-unreachable'
export const API_UNREACHABLE_MESSAGE =
  'Could not reach Prepify. Check your connection, or try a different network.'
export const OFFLINE_MESSAGE =
  'You appear to be offline. Recipes will load once you reconnect.'

// Only a request axios actually sent counts. The response interceptor also
// receives failures from the request interceptor (say, a sign-in token that
// can't refresh), which never reached the network, so blaming the visitor's
// connection for those would be wrong.
export function isUnreachableError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response && error.code !== 'ERR_CANCELED'
}

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
    if (isUnreachableError(error)) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      toast.error(offline ? OFFLINE_MESSAGE : API_UNREACHABLE_MESSAGE, {
        id: API_UNREACHABLE_TOAST_ID,
        duration: 8000,
      })
    }
    // Report server faults (5xx) and network failures (no response) to Sentry
    // so silent backend breakage is visible without relying on a user report.
    // `kind: network` is what the "visitors can't reach the API" monitor counts,
    // so only those two go under it. A failure before the request was sent (the
    // request interceptor, like a token refresh) is reported as `request-setup`.
    // Cancelled requests and client-side 4xx are expected and stay out. The
    // rejection still propagates to callers unchanged.
    if (sentryEnabled) {
      const status = error.response?.status
      const unreachable = isUnreachableError(error)
      const kind =
        unreachable || (status !== undefined && status >= 500)
          ? 'network'
          : !axios.isAxiosError(error)
            ? 'request-setup'
            : null
      if (kind) {
        const method = error.config?.method?.toUpperCase() ?? 'REQUEST'
        const url = error.config?.url ?? 'unknown'
        Sentry.captureException(error, {
          tags: { kind, http_status: status ?? 'no-response' },
          extra: { method, url },
        })
      }
    }
    return Promise.reject(error)
  }
)
