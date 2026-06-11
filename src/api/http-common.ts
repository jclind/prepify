import axios from 'axios'
import { getAuth } from 'firebase/auth'
import toast from 'react-hot-toast'

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
    return Promise.reject(error)
  }
)

export const nutrition = axios.create({
  baseURL: 'https://api.edamam.com/api',
  headers: {
    'Content-type': 'application/json',
  },
})
