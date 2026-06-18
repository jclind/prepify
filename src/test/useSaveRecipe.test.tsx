/**
 * useSaveRecipe — the shared save/unsave hook behind every bookmark (browse
 * cards + the single-recipe action row). Exercises the optimistic toggle over
 * the shared ['savedRecipeIds', uid] cache, rollback on a failed write, and the
 * race where a background refetch lands while a save is still in flight.
 *
 * RecipeAPI + AuthAPI are mocked; react-query is real (a fresh client per test).
 */

import React, { FC, ReactNode } from 'react'
import { vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSaveRecipe } from 'src/hooks/useSaveRecipe'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: {
    getSavedRecipeIds: vi.fn(),
    saveRecipe: vi.fn(),
    unsaveRecipe: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

// uid drives the query key + the logged-in gate. Overridable per test so the
// logged-out path can be exercised too.
let mockUid: string | null = 'test-uid'
vi.mock('src/api/auth', () => ({
  __esModule: true,
  default: { getUID: () => mockUid },
}))

const mockedSavedIds = RecipeAPI.getSavedRecipeIds as unknown as Mock
const mockedSave = RecipeAPI.saveRecipe as unknown as Mock
const mockedUnsave = RecipeAPI.unsaveRecipe as unknown as Mock

const makeWrapper = (client: QueryClient): FC<{ children: ReactNode }> => {
  return ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

// staleTime: Infinity + no focus refetch removes INCIDENTAL refetches so each
// test drives the exact getSavedRecipeIds call sequence it sets up (otherwise a
// stray refetch consumes a mockResolvedValueOnce and makes the guard flaky). The
// bug scenarios still trigger refetches explicitly, and onSettled's
// invalidateQueries forces a refetch regardless of staleTime.
const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    },
  })

beforeEach(() => {
  vi.clearAllMocks()
  mockUid = 'test-uid'
  mockedSavedIds.mockResolvedValue([])
  mockedSave.mockResolvedValue({ data: { saved: true } })
  mockedUnsave.mockResolvedValue({ data: { unsaved: true } })
})

it('reflects server saved-ids: isSaved is true for an already-saved recipe', async () => {
  mockedSavedIds.mockResolvedValue(['r1'])
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(newClient()),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(true))
})

it('optimistically flips to saved and POSTs the save', async () => {
  // Server reflects the committed save on any subsequent (re)fetch — the shape
  // the onSettled reconciliation reads back.
  mockedSavedIds.mockResolvedValueOnce([]).mockResolvedValue(['r1'])
  const client = newClient()
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(false))

  await act(async () => {
    await result.current.toggle()
  })

  expect(mockedSave).toHaveBeenCalledWith('r1')
  expect(mockedUnsave).not.toHaveBeenCalled()
  // Cache (and therefore isSaved) reflects the save, and stays saved once the
  // post-write reconciliation (onSettled) settles.
  expect(client.getQueryData(['savedRecipeIds', 'test-uid'])).toContain('r1')
  await waitFor(() => expect(result.current.isSaved).toBe(true))
})

it('optimistically flips to unsaved and DELETEs the save', async () => {
  // Initial load shows it saved; once unsaved, the server reflects [] on refetch.
  mockedSavedIds.mockResolvedValueOnce(['r1']).mockResolvedValue([])
  const client = newClient()
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(true))

  await act(async () => {
    await result.current.toggle()
  })

  expect(mockedUnsave).toHaveBeenCalledWith('r1')
  // Cache drops it optimistically and the post-write reconciliation keeps it out.
  expect(client.getQueryData(['savedRecipeIds', 'test-uid'])).not.toContain('r1')
  await waitFor(() => expect(result.current.isSaved).toBe(false))
})

it('rolls back to unsaved when the save request fails', async () => {
  mockedSave.mockRejectedValue(new Error('network'))
  const client = newClient()
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(false))

  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.toggle()
  })

  expect(ok).toBe(false)
  await waitFor(() => expect(result.current.isSaved).toBe(false))
  expect(client.getQueryData(['savedRecipeIds', 'test-uid'])).not.toContain('r1')
})

it('rolls back to saved when the unsave request fails', async () => {
  mockedSavedIds.mockResolvedValue(['r1'])
  mockedUnsave.mockRejectedValue(new Error('network'))
  const client = newClient()
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(true))

  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.toggle()
  })

  expect(ok).toBe(false)
  await waitFor(() => expect(result.current.isSaved).toBe(true))
})

it('logged-out toggle no-ops without hitting the API', async () => {
  mockUid = null
  const client = newClient()
  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  let ok: boolean | undefined
  await act(async () => {
    ok = await result.current.toggle()
  })
  expect(ok).toBe(false)
  expect(mockedSave).not.toHaveBeenCalled()
})

// The reproduction (the actual "saving is broken" root cause). The saved-id
// list is a SHARED cache that runs at the app's default staleTime (0), so a
// refetch is triggered all the time — a window-focus, another card mounting, or
// invalidateSavedCaches firing on a different surface. When such a refetch fires
// AFTER the user toggles but BEFORE the server write commits, it resolves with
// the stale pre-save list and overwrites the optimistic value. The original hook
// had no post-write reconciliation, so the bookmark stayed reverted even once
// the save had succeeded on the server — a stuck, "broken" bookmark.
//
// This models that exact ordering and asserts the bookmark ends up saved.
// The fix's core guarantee: after the server write commits, the hook reconciles
// the shared saved-id cache against the server. Without it (the old hook), a
// stale refetch that overwrote the optimistic value mid-write left the bookmark
// stuck in the wrong state even though the save succeeded — the "saving is
// broken" symptom. Here the stale refetch is simulated deterministically by
// clobbering the cache via setQueryData while the POST is in flight; the
// post-write reconciliation must restore the committed truth.
it('reconciles with the server after a write, healing a mid-write clobber', async () => {
  const client = newClient()
  // The server reflects the committed save on the reconciliation refetch.
  mockedSavedIds.mockResolvedValueOnce([]).mockResolvedValue(['r1'])

  let resolvePost: (v: unknown) => void = () => {}
  mockedSave.mockReturnValue(
    new Promise(res => {
      resolvePost = res
    })
  )

  const { result } = renderHook(() => useSaveRecipe('r1'), {
    wrapper: makeWrapper(client),
  })
  await waitFor(() => expect(result.current.isSaved).toBe(false))

  // User saves; POST is in flight, optimistic cache shows it saved.
  let togglePromise!: Promise<boolean>
  act(() => {
    togglePromise = result.current.toggle()
  })
  await waitFor(() =>
    expect(client.getQueryData(['savedRecipeIds', 'test-uid'])).toContain('r1')
  )

  // A stale refetch lands mid-write and overwrites the optimistic value (this is
  // exactly what a window-focus / sibling-card refetch did in production).
  act(() => {
    client.setQueryData(['savedRecipeIds', 'test-uid'], [])
  })
  await waitFor(() => expect(result.current.isSaved).toBe(false))

  const callsBeforeCommit = mockedSavedIds.mock.calls.length

  // The write commits. onSettled must re-fetch the committed truth so the stuck
  // clobber self-heals.
  await act(async () => {
    resolvePost({ data: { saved: true } })
    await togglePromise
  })

  // A reconciliation refetch fired after the write...
  expect(mockedSavedIds.mock.calls.length).toBeGreaterThan(callsBeforeCommit)
  // ...and it restored the committed (saved) state.
  await waitFor(() => expect(result.current.isSaved).toBe(true))
})
