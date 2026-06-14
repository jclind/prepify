import axios from 'axios'
import { getAuth } from 'firebase/auth'
import toast from 'react-hot-toast'
import { Sentry, sentryEnabled } from 'src/util/sentry'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: {
    'Content-type': 'application/json',
  },
})

http.interceptors.request.use(async config => {
  const auth = getAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
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

export const nutrition = axios.create({
  baseURL: 'https://api.edamam.com/api',
  headers: {
    'Content-type': 'application/json',
  },
})
