import { useCallback, useEffect, useRef, useState } from 'react'
import { QueryKey, useQuery } from '@tanstack/react-query'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'

// usePaginatedLoadMore — the shared "Load more" accumulator behind the account
// list tabs (Saved / Ratings / Your Recipes). All three fetch a page at a time
// from a `{ items, totalCount }` endpoint and stitch the pages into one growing
// list, showing a "Load more" button until every item has been pulled. This hook
// is the single copy of that state machine (page cursor, accumulate-on-append,
// is-more, and the flash-guarded skeleton gate); the tabs supply only their
// query key and fetcher.
//
// Behaviour is byte-for-byte the pre-extraction pattern: page 0 replaces (a
// fresh sort/filter/search), later pages append; `isMore` is `totalCount >`
// what's accumulated. The accumulate effect is keyed on `data` alone — because
// each page increment yields a new `data` reference and page 0 resets via the
// query key — but a background refetch of the *current* page (e.g. react-query's
// default `refetchOnWindowFocus`) also yields a new `data` reference for the same
// `page`. `mergedPageRef`/`baseItemsRef` track which page was last merged and
// what `items` looked like before it, so a same-page refetch replaces that page's
// slice instead of re-appending it.

// One page from a paginated endpoint: the slice for the requested page plus the
// total across all pages (used to decide whether "Load more" should show).
export type LoadMorePage<T> = {
  items: T[]
  totalCount: number
}

type UsePaginatedLoadMoreOptions<T> = {
  // Cache key for a given page. Page-independent params (sort, filter, search)
  // must be baked into the key so changing them refetches; callers pair that
  // with reset() to jump back to page 0.
  queryKey: (page: number) => QueryKey
  // Fetch one page. Returns null on a soft-failed/absent response (matching the
  // RecipeAPI paginated endpoints); the hook treats null as "no new items".
  queryFn: (page: number) => Promise<LoadMorePage<T> | null>
}

export type UsePaginatedLoadMoreResult<T> = {
  items: T[]
  isLoading: boolean
  // Skeleton visibility, flash-guarded via useDelayedLoading — reserve the
  // list's height on this, not raw isLoading.
  showSkeleton: boolean
  // The current page's fetch failed (after react-query's retries). Callers must
  // branch on this BEFORE their empty state — an error rendered as "nothing
  // here yet" tells a user with data that they have none. See
  // docs/design/loading-states.md ("Error is not empty").
  isError: boolean
  // Refetch the failed/current page — wire this to the error state's
  // "Try again" action.
  refetch: () => void
  isMore: boolean
  // Total across all pages, from the most recent resolved page (0 until the
  // first page lands). Lets callers render an "N items" count without a second
  // request.
  totalCount: number
  // The current page's payload has resolved with at least one item. Bridges the
  // one-frame gap between the query settling and the accumulate effect
  // populating `items`, so the empty state doesn't flash on a fast load.
  hasResolvedItems: boolean
  // items.length > 0 || isLoading || hasResolvedItems — the standard "render the
  // list, not the empty state" gate for the flash-guarded tabs.
  showList: boolean
  loadMore: () => void
  reset: () => void
  page: number
}

export function usePaginatedLoadMore<T>({
  queryKey,
  queryFn,
}: UsePaginatedLoadMoreOptions<T>): UsePaginatedLoadMoreResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [isMore, setIsMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  // Last page merged into `items`, and what `items` held right before it was
  // merged — lets a same-page refetch replace that page's slice instead of
  // appending a duplicate copy of it.
  const mergedPageRef = useRef<number | null>(null)
  const baseItemsRef = useRef<T[]>([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKey(page),
    queryFn: () => queryFn(page),
  })
  const showSkeleton = useDelayedLoading(isLoading)

  useEffect(() => {
    if (!data) return
    if (page === 0) {
      setItems([...data.items])
      setIsMore(data.totalCount > data.items.length)
      mergedPageRef.current = 0
      baseItemsRef.current = []
    } else if (mergedPageRef.current !== page) {
      baseItemsRef.current = items
      const updated = [...items, ...data.items]
      setItems(updated)
      setIsMore(data.totalCount > updated.length)
      mergedPageRef.current = page
    } else {
      // A refetch of the already-merged current page (e.g. focus refetch) —
      // replace its slice instead of re-appending it.
      const updated = [...baseItemsRef.current, ...data.items]
      setItems(updated)
      setIsMore(data.totalCount > updated.length)
    }
    setTotalCount(data.totalCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const loadMore = useCallback(() => setPage(p => p + 1), [])
  const reset = useCallback(() => setPage(0), [])

  const hasResolvedItems = !!data && data.items.length > 0
  const showList = items.length > 0 || isLoading || hasResolvedItems

  return {
    items,
    isLoading,
    showSkeleton,
    isError,
    refetch,
    isMore,
    totalCount,
    hasResolvedItems,
    showList,
    loadMore,
    reset,
    page,
  }
}
