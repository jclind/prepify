import { useCallback, useEffect, useState } from 'react'
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
// what's accumulated. The accumulate effect is keyed on `data` alone — as the
// original tabs were — because each page increment yields a new `data` reference
// and page 0 resets via the query key, so replace-vs-append stays correct
// without listing `items`/`page` as deps (which would loop).

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
  isMore: boolean
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

  const { data, isLoading } = useQuery({
    queryKey: queryKey(page),
    queryFn: () => queryFn(page),
  })
  const showSkeleton = useDelayedLoading(isLoading)

  useEffect(() => {
    if (!data) return
    if (page === 0) {
      setItems([...data.items])
      setIsMore(data.totalCount > data.items.length)
    } else {
      const updated = [...items, ...data.items]
      setItems(updated)
      setIsMore(data.totalCount > updated.length)
    }
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
    isMore,
    hasResolvedItems,
    showList,
    loadMore,
    reset,
    page,
  }
}
