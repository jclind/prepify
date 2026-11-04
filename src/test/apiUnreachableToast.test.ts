import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter } from 'axios'
import toast from 'react-hot-toast'
import {
  http,
  API_UNREACHABLE_MESSAGE,
  API_UNREACHABLE_TOAST_ID,
  OFFLINE_MESSAGE,
} from 'src/api/http-common'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

// Signed out by default; a test can sign in a user whose token refresh fails.
let currentUser: { getIdToken: () => Promise<string> } | null = null
vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser }),
}))

const captureException = vi.fn()
vi.mock('src/util/sentry', () => ({
  sentryEnabled: true,
  Sentry: { captureException: (...args: unknown[]) => captureException(...args) },
}))

const mockToastError = toast.error as ReturnType<typeof vi.fn>

function failWith(error: AxiosError): AxiosAdapter {
  return async () => {
    throw error
  }
}

describe('unreachable-server notice', () => {
  const originalAdapter = http.defaults.adapter

  beforeEach(() => {
    mockToastError.mockClear()
    captureException.mockClear()
    currentUser = null
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.unstubAllGlobals()
  })

  it('shows one notice when a request gets no response', async () => {
    http.defaults.adapter = failWith(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(http.get('api/recipes')).rejects.toThrow('Network Error')
    expect(mockToastError).toHaveBeenCalledWith(API_UNREACHABLE_MESSAGE, {
      id: API_UNREACHABLE_TOAST_ID,
      duration: 8000,
    })
  })

  it('says offline when the browser reports no connection', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    http.defaults.adapter = failWith(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(mockToastError).toHaveBeenCalledWith(OFFLINE_MESSAGE, expect.objectContaining({ id: API_UNREACHABLE_TOAST_ID }))
  })

  it('stays quiet for a cancelled request', async () => {
    http.defaults.adapter = failWith(new AxiosError('canceled', 'ERR_CANCELED'))
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('stays quiet when the server answered, even with an error', async () => {
    const error = new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      data: { error: 'Not found' },
      headers: {},
      config: { headers: {} } as never,
    })
    http.defaults.adapter = failWith(error)
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it("doesn't blame the network when the sign-in token can't refresh", async () => {
    currentUser = {
      getIdToken: () => Promise.reject(Object.assign(new Error('token expired'), { code: 'auth/user-token-expired' })),
    }
    http.defaults.adapter = failWith(new AxiosError('should not be sent', 'ERR_NETWORK'))
    await expect(http.get('api/recipes')).rejects.toThrow('token expired')
    expect(mockToastError).not.toHaveBeenCalled()
    // Still reported, but not under the outage monitor's `kind: network`.
    expect(captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: expect.objectContaining({ kind: 'request-setup' }) })
    )
  })
})

describe('Sentry reporting', () => {
  const originalAdapter = http.defaults.adapter

  beforeEach(() => {
    captureException.mockClear()
    currentUser = null
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  const kindOf = () => captureException.mock.calls[0]?.[1]?.tags?.kind

  it('counts a request with no response as network', async () => {
    http.defaults.adapter = failWith(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(kindOf()).toBe('network')
  })

  it('counts a 5xx as network', async () => {
    http.defaults.adapter = failWith(
      new AxiosError('Bad Gateway', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 502,
        statusText: 'Bad Gateway',
        data: {},
        headers: {},
        config: { headers: {} } as never,
      })
    )
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(kindOf()).toBe('network')
  })

  it('ignores cancelled requests', async () => {
    http.defaults.adapter = failWith(new AxiosError('canceled', 'ERR_CANCELED'))
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('ignores a 4xx', async () => {
    http.defaults.adapter = failWith(
      new AxiosError('Not found', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {},
        headers: {},
        config: { headers: {} } as never,
      })
    )
    await expect(http.get('api/recipes')).rejects.toThrow()
    expect(captureException).not.toHaveBeenCalled()
  })
})
