import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { QueryClient, QueryClientProvider, onlineManager, useQuery } from '@tanstack/react-query'
import LoadError, { loadErrorKind, loadErrorView } from 'src/Components/LoadError/LoadError'

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

// Mirrors the real sections: the skeleton while loading, the tray while the
// query's latest outcome is an error (including during a retry after it).
const Section = ({ queryKey, fetcher }: { queryKey: string; fetcher: () => Promise<unknown> }) => {
  const query = useQuery({ queryKey: [queryKey], queryFn: fetcher })
  const { failed, retrying } = loadErrorView(query)
  if (failed) return <LoadError error={query.error} retrying={retrying} ghost={null} />
  return <p>{query.isLoading ? 'Loading' : `Loaded ${queryKey}`}</p>
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
  it('keeps the tray and keyboard focus through a failed retry, and clears on success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Fails after a short delay, like a real request, so the retry is in
    // flight long enough for the section to re-render.
    const failLater = () =>
      new Promise((_, reject) => setTimeout(() => reject(networkError()), 30))
    const fetcher = vi
      .fn()
      .mockImplementationOnce(failLater)
      .mockImplementationOnce(failLater)
      .mockResolvedValue('ok')
    renderWith(<Section queryKey='s' fetcher={fetcher} />, client)
    const button = await screen.findByRole('button', { name: 'Try again' })
    button.focus()

    await userEvent.keyboard('{Enter}')
    // Mid-retry: same button, still focused, marked busy, no skeleton swap.
    expect(await screen.findByRole('button', { name: 'Retrying' })).toBe(button)
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()

    // The retry fails: the tray is still the same element, focus untouched.
    await screen.findByRole('button', { name: 'Try again' })
    expect(button).toHaveFocus()
    expect(fetcher).toHaveBeenCalledTimes(2)

    // The next retry succeeds: the tray gives way to the content.
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('Loaded s')).toBeInTheDocument()
  })

  it('does not carry an error over to a different query, like a new sort', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const slow = () => new Promise(resolve => setTimeout(() => resolve('ok'), 30))
    const { rerender } = renderWith(
      <Section queryKey='popular' fetcher={() => Promise.reject(networkError())} />,
      client
    )
    await screen.findByRole('button', { name: 'Try again' })
    rerender(
      <QueryClientProvider client={client}>
        <Section queryKey='newest' fetcher={slow} />
      </QueryClientProvider>
    )
    // The new query loads normally instead of showing the old one's tray.
    expect(screen.getByText('Loading')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again|retrying/i })).not.toBeInTheDocument()
    expect(await screen.findByText('Loaded newest')).toBeInTheDocument()
  })

  it('keeps the tray while a retry is paused because the browser is offline', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderWith(<Section queryKey='p' fetcher={() => Promise.reject(networkError())} />, client)
    const button = await screen.findByRole('button', { name: 'Try again' })
    button.focus()
    onlineManager.setOnline(false)
    try {
      await userEvent.keyboard('{Enter}')
      expect(await screen.findByRole('button', { name: 'Retrying' })).toBe(button)
      expect(button).toHaveFocus()
    } finally {
      onlineManager.setOnline(true)
    }
  })
})
