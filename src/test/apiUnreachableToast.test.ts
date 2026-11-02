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

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
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
})
