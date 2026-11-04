import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoadError, { loadErrorKind } from 'src/Components/LoadError/LoadError'
import { API_UNREACHABLE_MESSAGE, OFFLINE_MESSAGE } from 'src/api/http-common'

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
}))

const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK')
const serverError = () =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 502,
    statusText: 'Bad Gateway',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

function renderWith(ui: React.ReactElement, client = new QueryClient()) {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('LoadError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('classifies errors the same way as the unreachable toast', () => {
    expect(loadErrorKind(networkError())).toBe('unreachable')
    expect(loadErrorKind(serverError())).toBe('server')
    // A plain Error has no response either, but it's our bug, not the network.
    expect(loadErrorKind(new Error('boom'))).toBe('server')
  })

  it('says the server could not be reached when the request got no response', () => {
    renderWith(<LoadError error={networkError()} />)
    expect(screen.getByText(API_UNREACHABLE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says the visitor is offline when the browser reports no connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderWith(<LoadError error={networkError()} />)
    expect(screen.getByText(OFFLINE_MESSAGE)).toBeInTheDocument()
  })

  it('blames the server when it answered with an error', () => {
    renderWith(<LoadError error={serverError()} />)
    expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument()
  })

  it('uses short copy in compact mode', () => {
    renderWith(<LoadError error={networkError()} compact />)
    expect(screen.getByText('Couldn’t reach Prepify.')).toBeInTheDocument()
  })

  it('Try again refetches every failed query', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const failed = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValue('ok')
    const healthy = vi.fn().mockResolvedValue('ok')
    await client.prefetchQuery({ queryKey: ['failed'], queryFn: failed })
    await client.prefetchQuery({ queryKey: ['healthy'], queryFn: healthy })
    expect(client.getQueryState(['failed'])?.status).toBe('error')

    renderWith(<LoadError error={networkError()} />, client)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(client.getQueryState(['failed'])?.status).toBe('success'))
    expect(failed).toHaveBeenCalledTimes(2)
    expect(healthy).toHaveBeenCalledTimes(1)
  })
})
