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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
