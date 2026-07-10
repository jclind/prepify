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
  },
  DRAFT_LIMIT_CODE: 'DRAFT_LIMIT',
}))

const mockedDraftAPI = DraftAPI as unknown as {
  createDraft: ReturnType<typeof vi.fn>
  updateDraft: ReturnType<typeof vi.fn>
  deleteDraft: ReturnType<typeof vi.fn>
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
          canCreate: true,
          draftId: null,
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
          canCreate: true,
          draftId: null,
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
