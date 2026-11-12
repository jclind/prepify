/**
 * usePaginatedLoadMore — the shared "Load more" accumulator behind the account
 * list tabs (Saved / Ratings / Your Recipes). Exercises the page cursor, the
 * page-0-replaces / later-pages-append accumulation, the `isMore` computation
 * off totalCount, reset-to-page-0, and the null-payload + flash-guard contract.
 *
 * react-query is real (a fresh client per test, staleTime Infinity so page 0 is
 * served from cache after a reset); the fetcher is a plain mock.
 */

import React, { FC, ReactNode } from 'react'
import { vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import {
  usePaginatedLoadMore,
  LoadMorePage,
} from 'src/pages/Account/usePaginatedLoadMore'

const makeWrapper = (client: QueryClient): FC<{ children: ReactNode }> => {
  return ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })

const nextTick = () => new Promise(resolve => setTimeout(resolve, 0))

const renderLoadMore = <T,>(
  queryFn: (page: number) => Promise<LoadMorePage<T> | null>,
  keyPrefix = 'k'
) =>
  renderHook(
    () =>
      usePaginatedLoadMore<T>({
        queryKey: page => [keyPrefix, page],
        queryFn,
      }),
    { wrapper: makeWrapper(newClient()) }
  )

it('loads page 0 and flags more when totalCount exceeds the page', async () => {
  const queryFn = vi.fn(async () => ({ items: ['a', 'b', 'c'], totalCount: 5 }))
  const { result } = renderLoadMore(queryFn)

  await waitFor(() => expect(result.current.items).toHaveLength(3))
  expect(result.current.items).toEqual(['a', 'b', 'c'])
  expect(result.current.isMore).toBe(true)
  expect(result.current.totalCount).toBe(5)
  expect(result.current.showList).toBe(true)
  expect(queryFn).toHaveBeenCalledWith(0)
})

it('appends later pages and clears isMore once everything is loaded', async () => {
  const queryFn = vi.fn(async (page: number) =>
    page === 0
      ? { items: ['a', 'b', 'c'], totalCount: 5 }
      : { items: ['d', 'e'], totalCount: 5 }
  )
  const { result } = renderLoadMore(queryFn)

  await waitFor(() => expect(result.current.items).toHaveLength(3))
  expect(result.current.isMore).toBe(true)

  act(() => result.current.loadMore())

  await waitFor(() => expect(result.current.items).toHaveLength(5))
  expect(result.current.items).toEqual(['a', 'b', 'c', 'd', 'e'])
  expect(result.current.isMore).toBe(false)
  expect(queryFn).toHaveBeenCalledWith(1)
})

it('reset() returns to page 0 and replaces the accumulated list', async () => {
  const queryFn = vi.fn(async (page: number) =>
    page === 0
      ? { items: ['a', 'b', 'c'], totalCount: 5 }
      : { items: ['d', 'e'], totalCount: 5 }
  )
  const { result } = renderLoadMore(queryFn)

  await waitFor(() => expect(result.current.items).toHaveLength(3))
  act(() => result.current.loadMore())
  await waitFor(() => expect(result.current.items).toHaveLength(5))

  act(() => result.current.reset())

  // Page 0 is served from cache (staleTime Infinity) and replaces the list.
  await waitFor(() => expect(result.current.items).toHaveLength(3))
  expect(result.current.items).toEqual(['a', 'b', 'c'])
  expect(result.current.page).toBe(0)
})

it('treats a null payload as no items (empty-state gate, not a flash)', async () => {
  const queryFn = vi.fn(async () => null)
  const { result } = renderLoadMore<string>(queryFn)

  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.items).toHaveLength(0)
  expect(result.current.hasResolvedItems).toBe(false)
  expect(result.current.isMore).toBe(false)
  // items empty + settled + no resolved payload => render the empty state.
  expect(result.current.showList).toBe(false)
})

it('a resolved-but-empty page keeps showList false (genuine empty state)', async () => {
  const queryFn = vi.fn(async () => ({ items: [] as string[], totalCount: 0 }))
  const { result } = renderLoadMore<string>(queryFn)

  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.items).toHaveLength(0)
  expect(result.current.hasResolvedItems).toBe(false)
  expect(result.current.isMore).toBe(false)
  expect(result.current.showList).toBe(false)
})

it('surfaces isError on a failed fetch so callers can branch before their empty state', async () => {
  const queryFn = vi.fn(async () => {
    throw new Error('network down')
  })
  const { result } = renderLoadMore<string>(queryFn)

  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.isLoading).toBe(false)
  expect(result.current.items).toHaveLength(0)
  // showList is false — without an isError branch this would fall through to
  // the empty state, telling a user with data that they have none.
  expect(result.current.showList).toBe(false)
})

it('a refetch of the current page replaces its slice instead of re-appending it', async () => {
  // Simulates react-query's refetchOnWindowFocus refiring page 1 with a
  // structurally-changed payload (e.g. a rating changed) while page 0 stays put.
  let page1Calls = 0
  const queryFn = vi.fn(async (page: number): Promise<LoadMorePage<string> | null> => {
    if (page === 0) return { items: ['a', 'b', 'c'], totalCount: 5 }
    page1Calls += 1
    return page1Calls === 1
      ? { items: ['d', 'e'], totalCount: 5 }
      : { items: ['d', 'e-updated'], totalCount: 5 }
  })
  const { result } = renderLoadMore(queryFn)

  await waitFor(() => expect(result.current.items).toHaveLength(3))
  act(() => result.current.loadMore())
  await waitFor(() => expect(result.current.items).toHaveLength(5))
  expect(result.current.items).toEqual(['a', 'b', 'c', 'd', 'e'])

  // A background refetch of the still-current page (page 1) resolves with a
  // new `data` reference for the same page.
  await act(async () => {
    result.current.refetch()
  })

  await waitFor(() =>
    expect(result.current.items).toEqual(['a', 'b', 'c', 'd', 'e-updated'])
  )
  // Length must stay at 5 — a re-append bug would grow this to 7.
  expect(result.current.items).toHaveLength(5)
  expect(result.current.isMore).toBe(false)
})

it('refetch() recovers from a failed fetch into content', async () => {
  const queryFn = vi
    .fn(async (): Promise<LoadMorePage<string> | null> => ({
      items: ['a'],
      totalCount: 1,
    }))
    .mockRejectedValueOnce(new Error('network down'))
  const { result } = renderLoadMore<string>(queryFn)

  await waitFor(() => expect(result.current.isError).toBe(true))
  // Async act: the refetch settles in a microtask; the act flush drains it and
  // runs the accumulate effect before we assert.
  await act(async () => {
    result.current.refetch()
  })

  await waitFor(() => expect(result.current.items).toEqual(['a']))
  expect(result.current.isError).toBe(false)
  expect(result.current.showList).toBe(true)
})

it('a double click on "Load more" advances one page, never skipping one', async () => {
  // Two clicks before the re-render used to run `p => p + 1` twice, landing on
  // page 2 so page 1 was never fetched.
  const queryFn = vi.fn(async (page: number) => ({
    items: [`p${page}`],
    totalCount: 5,
  }))
  const { result } = renderLoadMore(queryFn)
  await waitFor(() => expect(result.current.items).toEqual(['p0']))

  act(() => {
    result.current.loadMore()
    result.current.loadMore()
  })

  await waitFor(() => expect(result.current.items).toEqual(['p0', 'p1']))
  expect(result.current.page).toBe(1)
  expect(queryFn).not.toHaveBeenCalledWith(2)
})

it('after a later page fails, loadMore retries that page instead of skipping it', async () => {
  let page1Calls = 0
  const queryFn = vi.fn(async (page: number): Promise<LoadMorePage<string> | null> => {
    if (page === 0) return { items: ['a'], totalCount: 3 }
    if (page === 1) {
      page1Calls += 1
      if (page1Calls === 1) throw new Error('network down')
      return { items: ['b'], totalCount: 3 }
    }
    return { items: ['c'], totalCount: 3 }
  })
  const { result } = renderLoadMore(queryFn)
  await waitFor(() => expect(result.current.items).toEqual(['a']))

  act(() => result.current.loadMore())
  await waitFor(() => expect(result.current.loadMoreError).toBe(true))
  // The loaded page stays on screen and the button can offer a retry.
  expect(result.current.items).toEqual(['a'])
  expect(result.current.isMore).toBe(true)

  await act(async () => {
    result.current.loadMore()
  })

  await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
  expect(result.current.page).toBe(1)
  expect(result.current.loadMoreError).toBe(false)
  expect(queryFn).not.toHaveBeenCalledWith(2)
})

it('a null later page counts as failed and is retried, not skipped', async () => {
  let page1Calls = 0
  const queryFn = vi.fn(async (page: number): Promise<LoadMorePage<string> | null> => {
    if (page === 0) return { items: ['a'], totalCount: 2 }
    page1Calls += 1
    return page1Calls === 1 ? null : { items: ['b'], totalCount: 2 }
  })
  const { result } = renderLoadMore(queryFn)
  await waitFor(() => expect(result.current.items).toEqual(['a']))

  act(() => result.current.loadMore())
  await waitFor(() => expect(result.current.loadMoreError).toBe(true))

  // A double click on the retry sends one request. A plain refetch() would
  // cancel the first one and send it again, since null counts as cached data.
  await act(async () => {
    result.current.loadMore()
    result.current.loadMore()
  })

  await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
  expect(result.current.page).toBe(1)
  expect(page1Calls).toBe(2)
})

it('flags isLoadingMore for a later page but not for page 0', async () => {
  let releasePage1: () => void = () => {}
  const queryFn = vi.fn((page: number): Promise<LoadMorePage<string> | null> =>
    page === 0
      ? Promise.resolve({ items: ['a'], totalCount: 2 })
      : new Promise(res => (releasePage1 = () => res({ items: ['b'], totalCount: 2 })))
  )
  const { result } = renderLoadMore(queryFn)
  expect(result.current.isLoading).toBe(true)
  expect(result.current.isLoadingMore).toBe(false)
  await waitFor(() => expect(result.current.items).toEqual(['a']))

  act(() => result.current.loadMore())
  await waitFor(() => expect(result.current.isLoadingMore).toBe(true))
  expect(result.current.items).toEqual(['a'])

  await act(async () => releasePage1())
  await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
  expect(result.current.isLoadingMore).toBe(false)
})

it('a background refetch of a loaded page does not block "Load more"', async () => {
  // e.g. refetchOnWindowFocus refiring page 0 just as the user clicks.
  let page0Calls = 0
  const queryFn = vi.fn((page: number): Promise<LoadMorePage<string> | null> => {
    if (page === 1) return Promise.resolve({ items: ['b'], totalCount: 2 })
    page0Calls += 1
    return page0Calls === 1
      ? Promise.resolve({ items: ['a'], totalCount: 2 })
      : new Promise(() => {})
  })
  const { result } = renderLoadMore(queryFn)
  await waitFor(() => expect(result.current.items).toEqual(['a']))

  // react-query notifies observers on a timer, so wait one tick for the hook
  // to see the refetch in flight before clicking.
  await act(async () => {
    result.current.refetch()
    await nextTick()
  })
  expect(page0Calls).toBe(2)
  act(() => result.current.loadMore())

  await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
  expect(result.current.page).toBe(1)
})

describe('offline', () => {
  // react-query pauses fetches while offline: no request and no error, so
  // without handling the button looked idle and a first load looked empty.
  afterEach(() => onlineManager.setOnline(true))

  it('a later page requested offline waits, says so, and loads on reconnect', async () => {
    const queryFn = vi.fn(async (page: number) => ({
      items: [page === 0 ? 'a' : 'b'],
      totalCount: 2,
    }))
    const { result } = renderLoadMore(queryFn)
    await waitFor(() => expect(result.current.items).toEqual(['a']))

    act(() => onlineManager.setOnline(false))
    act(() => result.current.loadMore())

    await waitFor(() => expect(result.current.loadMoreOffline).toBe(true))
    expect(result.current.isLoadingMore).toBe(true)
    expect(result.current.loadMoreError).toBe(false)
    expect(result.current.items).toEqual(['a'])
    expect(queryFn).not.toHaveBeenCalledWith(1)

    // More clicks while offline don't move the page.
    act(() => result.current.loadMore())
    expect(result.current.page).toBe(1)

    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
    expect(result.current.loadMoreOffline).toBe(false)
    expect(queryFn).not.toHaveBeenCalledWith(2)
  })

  it('a paused refresh of a loaded page still lets "Load more" say it is offline', async () => {
    const queryFn = vi.fn(async (page: number) => ({
      items: [page === 0 ? 'a' : 'b'],
      totalCount: 2,
    }))
    const { result } = renderLoadMore(queryFn)
    await waitFor(() => expect(result.current.items).toEqual(['a']))

    // Page 0 refreshes while offline, so it sits paused with its data cached.
    act(() => onlineManager.setOnline(false))
    await act(async () => {
      result.current.refetch()
      await nextTick()
    })
    act(() => result.current.loadMore())

    await waitFor(() => expect(result.current.loadMoreOffline).toBe(true))
    expect(result.current.page).toBe(1)
    expect(result.current.items).toEqual(['a'])

    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(result.current.items).toEqual(['a', 'b']))
  })

  it('a first load offline counts as loading, not as an empty list', async () => {
    onlineManager.setOnline(false)
    const queryFn = vi.fn(async () => ({ items: ['a'], totalCount: 1 }))
    const { result } = renderLoadMore(queryFn)

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    expect(result.current.showList).toBe(true)
    expect(result.current.loadMoreOffline).toBe(false)
    expect(queryFn).not.toHaveBeenCalled()

    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(result.current.items).toEqual(['a']))
  })
})
