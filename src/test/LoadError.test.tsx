import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import LoadError, { loadErrorKind } from 'src/Components/LoadError/LoadError'

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
    renderWith(<LoadError error={networkError()} ghost={null} />)
    expect(screen.getByText('Can’t reach Prepify')).toBeInTheDocument()
    expect(screen.getByText(/check your connection/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says the visitor is offline when the browser reports no connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderWith(<LoadError error={networkError()} ghost={null} />)
    expect(screen.getByText('You’re offline')).toBeInTheDocument()
  })

  it('blames the server when it answered with an error', () => {
    renderWith(<LoadError error={serverError()} ghost={null} />)
    expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument()
  })

  it('shows only the title in compact mode', () => {
    renderWith(<LoadError error={networkError()} compact ghost={null} />)
    expect(screen.getByText('Can’t reach Prepify')).toBeInTheDocument()
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument()
  })

  it('keeps the skeleton it stands in for, hidden from screen readers', () => {
    const { container } = renderWith(
      <LoadError error={networkError()} ghost={<div className='sk'>skeleton</div>} />
    )
    expect(container.querySelector('.load-error__ghost .sk')).toBeInTheDocument()
    expect(container.querySelector('.load-error__ghost')).toHaveAttribute('aria-hidden', 'true')
  })

  it('Try again refetches every failed query', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const failed = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValue('ok')
    const healthy = vi.fn().mockResolvedValue('ok')
    await client.prefetchQuery({ queryKey: ['failed'], queryFn: failed })
    await client.prefetchQuery({ queryKey: ['healthy'], queryFn: healthy })
    expect(client.getQueryState(['failed'])?.status).toBe('error')

    renderWith(<LoadError error={networkError()} ghost={null} />, client)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(client.getQueryState(['failed'])?.status).toBe('success'))
    expect(failed).toHaveBeenCalledTimes(2)
    expect(healthy).toHaveBeenCalledTimes(1)
  })
  it('gives focus back to Try again when a keyboard retry fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Fails after a short delay, like a real request, so the loading state
    // actually renders between the two trays.
    const fetcher = vi.fn(
      () => new Promise((_, reject) => setTimeout(() => reject(networkError()), 30))
    )
    // Mirrors the real sections: the skeleton replaces the tray while loading,
    // so the focused button is unmounted during the retry.
    const Section = () => {
      const { isLoading, isError, error } = useQuery({ queryKey: ['s'], queryFn: fetcher })
      if (isLoading) return <p>Loading</p>
      return isError ? <LoadError error={error} ghost={null} /> : <p>Loaded</p>
    }
    renderWith(<Section />, client)
    const first = await screen.findByRole('button', { name: 'Try again' })
    first.focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('Loading')).toBeInTheDocument()

    const again = await screen.findByRole('button', { name: 'Try again' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(again).toHaveFocus())
  })
})
