import { vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useDraftAutosave,
  hasDraftableContent,
} from 'src/pages/AddRecipe/useDraftAutosave'
import DraftAPI from 'src/api/drafts'
import { RecipeDraftContent, RecipeDraftType } from 'types'

vi.mock('src/api/drafts', () => ({
  default: {
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn(),
    warmAuth: vi.fn(),
    // Return true by default so the unload flush marks itself as having fired
    // (mirrors a real flush that found a cached token).
    flushDraftKeepalive: vi.fn(() => true),
  },
  DRAFT_LIMIT_CODE: 'DRAFT_LIMIT',
  DRAFT_CONFLICT_CODE: 'DRAFT_CONFLICT',
}))

const mockedDraftAPI = DraftAPI as unknown as {
  createDraft: ReturnType<typeof vi.fn>
  updateDraft: ReturnType<typeof vi.fn>
  deleteDraft: ReturnType<typeof vi.fn>
  warmAuth: ReturnType<typeof vi.fn>
  flushDraftKeepalive: ReturnType<typeof vi.fn>
}

// A promise whose resolution we control, to model an in-flight network request.
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

const createdDraft: RecipeDraftType = {
  _id: 'new-draft',
  userId: 'test-uid',
  title: 'Soup',
  createdAt: '1000',
  updatedAt: '1000',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('hasDraftableContent — the canCreate gate (bug-hunt D3)', () => {
  // Mirrors useRecipeForm's draftContent for a pristine create form.
  const emptyForm = (): RecipeDraftContent => ({
    title: '',
    description: '',
    servings: null,
    prepTime: null,
    cookTime: null,
    fridgeLife: 0,
    freezerLife: 0,
    ingredients: [],
    instructions: [],
    cuisine: '',
    mealTypes: [],
    nutritionLabels: [],
  })

  it('is false for an all-default form (no throwaway drafts)', () => {
    expect(hasDraftableContent(emptyForm())).toBe(false)
    expect(hasDraftableContent({})).toBe(false)
  })

  it('is false for whitespace-only text fields', () => {
    expect(hasDraftableContent({ ...emptyForm(), title: '   ' })).toBe(false)
    expect(hasDraftableContent({ ...emptyForm(), description: ' \n ' })).toBe(
      false
    )
  })

  it('is true for any real content, with or without a title', () => {
    expect(hasDraftableContent({ ...emptyForm(), title: 'Soup' })).toBe(true)
    expect(
      hasDraftableContent({ ...emptyForm(), description: 'Cozy winter soup' })
    ).toBe(true)
    expect(
      hasDraftableContent({
        ...emptyForm(),
        ingredients: [{ label: 'Broth', id: 'l1' }],
      })
    ).toBe(true)
    expect(
      hasDraftableContent({
        ...emptyForm(),
        instructions: [{ content: 'Simmer', index: 1, id: 's1' }],
      })
    ).toBe(true)
    expect(hasDraftableContent({ ...emptyForm(), servings: 4 })).toBe(true)
    expect(hasDraftableContent({ ...emptyForm(), prepTime: 15 })).toBe(true)
    expect(hasDraftableContent({ ...emptyForm(), cookTime: 30 })).toBe(true)
    expect(hasDraftableContent({ ...emptyForm(), fridgeLife: 3 })).toBe(true)
    expect(hasDraftableContent({ ...emptyForm(), cuisine: 'Italian' })).toBe(
      true
    )
    expect(hasDraftableContent({ ...emptyForm(), mealTypes: ['dinner'] })).toBe(
      true
    )
    expect(
      hasDraftableContent({ ...emptyForm(), nutritionLabels: ['Vegan'] })
    ).toBe(true)
  })
})

describe('useDraftAutosave — publish during in-flight create (finding #2)', () => {
  it('deletes the draft that finishes creating after publish, instead of orphaning it', async () => {
    const created = deferred<RecipeDraftType>()
    mockedDraftAPI.createDraft.mockReturnValue(created.promise)
    const onDraftCreated = vi.fn()

    const { result, rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: true,
          canCreate: true,
          draftId: null,
          draftUpdatedAt: null,
          onDraftCreated,
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

    // First enable establishes the baseline; an edit then schedules the save.
    rerender({ content: { title: 'Soup' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    // createDraft is now in flight (its promise hasn't resolved).
    expect(mockedDraftAPI.createDraft).toHaveBeenCalledTimes(1)

    // User publishes: clearDraft disables autosave. No id exists yet to delete.
    await act(async () => {
      await result.current.clearDraft()
    })

    // The create now resolves — the hook must delete the just-created draft
    // rather than adopt it (which would leave an orphan after publish). Flush
    // the saveNow continuation that runs after createDraft's promise settles.
    await act(async () => {
      created.resolve(createdDraft)
      await created.promise
      await Promise.resolve()
    })

    expect(mockedDraftAPI.deleteDraft).toHaveBeenCalledWith('new-draft')
    expect(onDraftCreated).not.toHaveBeenCalled()
  })
})

describe('useDraftAutosave — draft cap (finding #4)', () => {
  it('notifies once and stops retrying creation when the server reports the cap', async () => {
    mockedDraftAPI.createDraft.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { code: 'DRAFT_LIMIT', error: 'Too many drafts — delete some.' },
      },
    })
    const onLimitReached = vi.fn()

    const { rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: true,
          canCreate: true,
          draftId: null,
          draftUpdatedAt: null,
          onDraftCreated: vi.fn(),
          onLimitReached,
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

    rerender({ content: { title: 'Soup' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(mockedDraftAPI.createDraft).toHaveBeenCalledTimes(1)
    expect(onLimitReached).toHaveBeenCalledWith('Too many drafts — delete some.')

    // A further edit must NOT fire another create attempt (no per-keystroke
    // request storm against a known-full account).
    rerender({ content: { title: 'Soup updated' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    expect(mockedDraftAPI.createDraft).toHaveBeenCalledTimes(1)
    expect(onLimitReached).toHaveBeenCalledTimes(1)
  })
})

describe('useDraftAutosave — updatedAt concurrency guard (B5)', () => {
  it("sends the known base updatedAt and bumps it from each response, so the next save's precondition is current", async () => {
    mockedDraftAPI.updateDraft
      .mockResolvedValueOnce({ ...createdDraft, updatedAt: '2000' })
      .mockResolvedValueOnce({ ...createdDraft, updatedAt: '3000' })

    const { rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: true,
          canCreate: true,
          draftId: 'existing-draft',
          draftUpdatedAt: '1000',
          onDraftCreated: vi.fn(),
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

    rerender({ content: { title: 'Soup' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    expect(mockedDraftAPI.updateDraft).toHaveBeenNthCalledWith(
      1,
      'existing-draft',
      { title: 'Soup' },
      '1000'
    )

    rerender({ content: { title: 'Soup, again' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    // The precondition is the '2000' the first save's response returned, not
    // the '1000' the hook was originally handed — proves the bump, not a
    // resend of the stale prop.
    expect(mockedDraftAPI.updateDraft).toHaveBeenNthCalledWith(
      2,
      'existing-draft',
      { title: 'Soup, again' },
      '2000'
    )
  })

  it('adopts the updatedAt that arrives AFTER mount (page opened with ?draftId), so the first autosave does not 409', async () => {
    // Regression (found in V8 live verification): when AddRecipe mounts with
    // ?draftId already in the URL — the normal resume flow from the drafts
    // list, or refreshing a resumed draft — `draftId` never changes after
    // mount. The hydrated `updatedAt` arrives via the prop alone, later. The
    // pre-fix hook synced updatedAtRef only on draftId changes, so it stayed
    // null and every autosave sent an empty precondition → guaranteed
    // DRAFT_CONFLICT 409 → autosave dead for the session.
    mockedDraftAPI.updateDraft.mockResolvedValue({
      ...createdDraft,
      updatedAt: '2000',
    })

    const { rerender } = renderHook(
      ({ content, enabled, draftUpdatedAt }) =>
        useDraftAutosave({
          content,
          enabled,
          isSignedIn: true,
          canCreate: true,
          draftId: 'existing-draft', // fixed from the first render, like a URL param
          draftUpdatedAt,
          onDraftCreated: vi.fn(),
        }),
      {
        initialProps: {
          // While hydration is loading: autosave disabled, no version yet.
          content: { title: '' } as Record<string, unknown>,
          enabled: false,
          draftUpdatedAt: null as string | null,
        },
      }
    )

    // Hydration completes: content + version land, autosave enables. draftId
    // itself never changes.
    rerender({
      content: { title: 'Resumed Soup' },
      enabled: true,
      draftUpdatedAt: '1000',
    })
    // User edits.
    rerender({
      content: { title: 'Resumed Soup, tweaked' },
      enabled: true,
      draftUpdatedAt: '1000',
    })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(mockedDraftAPI.updateDraft).toHaveBeenCalledWith(
      'existing-draft',
      { title: 'Resumed Soup, tweaked' },
      '1000' // pre-fix this was '' (the null the hook saw at mount)
    )
  })

  it('surfaces a conflict and stops autosaving once the server 409s a stale base version', async () => {
    mockedDraftAPI.updateDraft.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: 'DRAFT_CONFLICT',
          error: 'This draft was updated elsewhere.',
        },
      },
    })
    const onConflict = vi.fn()

    const { rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: true,
          canCreate: true,
          draftId: 'existing-draft',
          draftUpdatedAt: '1000',
          onDraftCreated: vi.fn(),
          onConflict,
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

    rerender({ content: { title: 'Soup' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    expect(mockedDraftAPI.updateDraft).toHaveBeenCalledTimes(1)
    expect(onConflict).toHaveBeenCalledWith('This draft was updated elsewhere.')

    // Further edits must NOT retry against the same (now-known-stale) draft —
    // no repeated 409s, and no silent clobber attempt.
    rerender({ content: { title: 'Soup, one more edit' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    expect(mockedDraftAPI.updateDraft).toHaveBeenCalledTimes(1)
    expect(onConflict).toHaveBeenCalledTimes(1)
  })
})

describe('useDraftAutosave — unload flush (V8 item 1)', () => {
  // jsdom dispatches beforeunload/pagehide as ordinary events, so we can assert
  // the handler fires the keepalive save with the right payload. What jsdom
  // CANNOT model — and must be verified live — is that fetch({keepalive:true})
  // actually completes after the document is torn down, and that a real Firebase
  // token was cached; here DraftAPI.flushDraftKeepalive is mocked.
  const renderCreate = (props?: {
    canCreate?: boolean
    isSignedIn?: boolean
  }) =>
    renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: props?.isSignedIn ?? true,
          canCreate: props?.canCreate ?? true,
          draftId: null,
          draftUpdatedAt: null,
          onDraftCreated: vi.fn(),
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

  it('flushes an unsaved new draft on beforeunload, before the debounce fires', () => {
    const { rerender } = renderCreate()
    // Edit, but do NOT advance to the 1500ms autosave — the change is still
    // sitting in the debounce window, exactly the work a hard refresh would lose.
    rerender({ content: { title: 'Soup' } })
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(mockedDraftAPI.flushDraftKeepalive).toHaveBeenCalledTimes(1)
    expect(mockedDraftAPI.flushDraftKeepalive).toHaveBeenCalledWith(
      null,
      { title: 'Soup' },
      ''
    )
  })

  it('carries the current B5 updatedAt precondition when flushing an existing draft', () => {
    const { rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: true,
          canCreate: true,
          draftId: 'existing-draft',
          draftUpdatedAt: '1000',
          onDraftCreated: vi.fn(),
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )
    rerender({ content: { title: 'Soup' } })

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    // The flush must send the same `updatedAt` the normal PUT path sends, or the
    // server's concurrency precondition would 409 every flushed save.
    expect(mockedDraftAPI.flushDraftKeepalive).toHaveBeenCalledWith(
      'existing-draft',
      { title: 'Soup' },
      '1000'
    )
  })

  it('no-ops when nothing changed since the last save', () => {
    renderCreate()
    // No edits at all — baseline equals current content.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(mockedDraftAPI.flushDraftKeepalive).not.toHaveBeenCalled()
  })

  it('does not flush twice when both beforeunload and pagehide fire', () => {
    const { rerender } = renderCreate()
    rerender({ content: { title: 'Soup' } })

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(mockedDraftAPI.flushDraftKeepalive).toHaveBeenCalledTimes(1)
  })

  it('never flushes for a signed-out visitor', () => {
    const { rerender } = renderCreate({ isSignedIn: false })
    rerender({ content: { title: 'Soup' } })

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(mockedDraftAPI.flushDraftKeepalive).not.toHaveBeenCalled()
  })
})

describe('useDraftAutosave — signed-out (V8 item 2)', () => {
  it('shows calm sign-in guidance and attempts no save when signed out', async () => {
    const { result, rerender } = renderHook(
      ({ content }) =>
        useDraftAutosave({
          content,
          enabled: true,
          isSignedIn: false,
          canCreate: true,
          draftId: null,
          draftUpdatedAt: null,
          onDraftCreated: vi.fn(),
        }),
      { initialProps: { content: { title: '' } as Record<string, unknown> } }
    )

    rerender({ content: { title: 'Soup' } })
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    // Calm 'signed-out' status (never 'error'), and no doomed save attempt.
    expect(result.current.status).toBe('signed-out')
    expect(mockedDraftAPI.createDraft).not.toHaveBeenCalled()
    expect(mockedDraftAPI.updateDraft).not.toHaveBeenCalled()
    expect(mockedDraftAPI.warmAuth).not.toHaveBeenCalled()
  })

  it('stays idle for a signed-out visitor who has typed nothing', async () => {
    const { result } = renderHook(() =>
      useDraftAutosave({
        content: { title: '' },
        enabled: true,
        isSignedIn: false,
        canCreate: false,
        draftId: null,
        draftUpdatedAt: null,
        onDraftCreated: vi.fn(),
      })
    )
    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })
    expect(result.current.status).toBe('idle')
  })
})
