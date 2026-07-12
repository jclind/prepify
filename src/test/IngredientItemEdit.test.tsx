import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import IngredientItem from 'src/pages/AddRecipe/Ingredients/IngredientItem'
import RecipeAPI from 'src/api/recipes'
import { toast } from 'react-hot-toast'
import {
  IngredientEnrichTimeoutError,
  withTimeout,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'

vi.mock('src/api/recipes', () => ({
  default: { getIngredientData: vi.fn() },
  INGREDIENT_RATE_LIMIT_CODE: 'RATE_LIMITED',
}))
vi.mock('src/api/auth', () => ({ default: { getUID: vi.fn().mockReturnValue(null) } }))
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Pass-through by default; the hung-edit test overrides it to reject with a
// timeout (mirroring the add-path test), so the real timer never runs.
vi.mock(
  'src/pages/AddRecipe/Ingredients/ingredientEnrichment',
  async importOriginal => {
    const actual = await importOriginal<
      typeof import('src/pages/AddRecipe/Ingredients/ingredientEnrichment')
    >()
    return { ...actual, withTimeout: vi.fn((p: Promise<unknown>) => p) }
  }
)

const mockGetIngredientData = RecipeAPI.getIngredientData as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockWithTimeout = withTimeout as ReturnType<typeof vi.fn>

const parsed = (id: string, original: string) => ({
  id,
  parsedIngredient: {
    ingredient: 'milk',
    quantity: 1,
    unit: 'cup',
    comment: null,
    originalIngredientString: original,
  },
  ingredientData: null,
})

const enriched = (original: string) => ({
  parsedIngredient: {
    ingredient: 'flour',
    quantity: 2,
    unit: 'cups',
    comment: null,
    originalIngredientString: original,
  },
  ingredientData: { totalPriceUSACents: 300, imagePath: 'https://img.test/x.png' },
  id: 'srv',
})

const rateLimited = (original: string, retryAt: number) => ({
  error: {
    message: 'Too many ingredient lookups — wait 30s and retry.',
    code: 'RATE_LIMITED',
    retryAt,
  },
  parsedIngredient: {
    ingredient: 'flour',
    quantity: 2,
    unit: 'cups',
    comment: null,
    originalIngredientString: original,
  },
  ingredientData: null,
  id: 'srv',
})

const renderItem = () => {
  const ingredient = parsed('ing-1', '1 cup milk')
  const setItemStatus = vi.fn()
  const setIngredients = vi.fn()
  const { container } = render(
    <IngredientItem
      ingredients={[ingredient as any]}
      ingredient={ingredient as any}
      setItemStatus={setItemStatus}
      loading={false}
      errored={false}
      removeIngredient={vi.fn()}
      retryIngredient={vi.fn()}
      setIngredients={setIngredients}
    />
  )
  return { container, setItemStatus, setIngredients }
}

// Enter edit mode, type a new value, and submit it (Enter).
const editTo = (container: HTMLElement, value: string) => {
  fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
  const input = container.querySelector('input') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

beforeEach(() => {
  mockGetIngredientData.mockReset()
  mockToastError.mockReset()
  mockWithTimeout.mockReset().mockImplementation((p: Promise<unknown>) => p)
})

describe('IngredientItem inline edit', () => {
  it('re-enriches on a successful edit and clears the loading status', async () => {
    mockGetIngredientData.mockResolvedValue(enriched('2 cups flour'))
    const { container, setItemStatus, setIngredients } = renderItem()

    editTo(container, '2 cups flour')

    await waitFor(() =>
      expect(mockGetIngredientData).toHaveBeenCalledWith('2 cups flour')
    )
    // Sets loading first, then clears it (null) once enrichment resolves cleanly.
    expect(setItemStatus).toHaveBeenCalledWith('ing-1', 'loading')
    await waitFor(() =>
      expect(setItemStatus).toHaveBeenCalledWith('ing-1', null)
    )
    // Reconciled the row in place.
    expect(setIngredients).toHaveBeenCalled()
    expect(mockToastError).not.toHaveBeenCalled()
    // Pin: Enter-submit must invoke the network call exactly once. Before the
    // blur-guard fix, handleEditSubmit's own trailing editInputRef.blur()
    // synchronously re-fired FormInput's onBlur (also wired to submit),
    // double-calling getIngredientData against the same stale closed-over
    // editedVal/ingredient — a real duplicate paid lookup.
    expect(mockGetIngredientData).toHaveBeenCalledTimes(1)
  })

  it('submits exactly once on genuine blur-away (no Enter)', async () => {
    mockGetIngredientData.mockResolvedValue(enriched('2 cups flour'))
    const { container, setItemStatus } = renderItem()

    fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2 cups flour' } })
    // Click away without pressing Enter first — a genuine blur.
    fireEvent.blur(input)

    await waitFor(() =>
      expect(mockGetIngredientData).toHaveBeenCalledWith('2 cups flour')
    )
    await waitFor(() => expect(setItemStatus).toHaveBeenCalledWith('ing-1', null))
    expect(mockGetIngredientData).toHaveBeenCalledTimes(1)
  })

  // Stale-suppression regression: on a GENUINE blur-away, real focus has
  // already left the input by the time handleEditSubmit runs, so its trailing
  // self-blur() no-ops (per spec, blur() on a non-focused element fires no
  // event — jsdom conforms) and never consumes the suppress flag. Without the
  // edit-entry reset in handleIngrClick, the flag stays stuck true and the
  // NEXT edit session's genuine blur-away is swallowed (no submit, edit mode
  // stays open). This test moves REAL focus (element.focus() on another
  // control) instead of fireEvent.blur, so the browser-faithful ordering —
  // blur event first, self-blur() a no-op — is what actually runs.
  it('a second edit session still submits on blur-away after a prior blur-away submit', async () => {
    mockGetIngredientData.mockImplementation(async (s: string) => enriched(s))
    const { container } = renderItem()
    const removeBtn = container.querySelector('.ingr-remove') as HTMLButtonElement

    const blurAwaySession = (value: string) => {
      fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
      const input = container.querySelector('input') as HTMLInputElement
      expect(document.activeElement).toBe(input) // real focus from click-to-edit
      fireEvent.change(input, { target: { value } })
      // Genuine blur-away: move real DOM focus to another control. jsdom
      // fires the real blur on the input; the handler's trailing blur() then
      // targets an already-unfocused element and fires nothing.
      act(() => removeBtn.focus())
    }

    blurAwaySession('2 cups flour')
    await waitFor(() => expect(mockGetIngredientData).toHaveBeenCalledTimes(1))

    blurAwaySession('3 cups sugar')
    // Pre-fix: the stale flag from session 1 swallows this submit (stays 1).
    await waitFor(() => expect(mockGetIngredientData).toHaveBeenCalledTimes(2))
    expect(mockGetIngredientData).toHaveBeenLastCalledWith('3 cups sugar')
  })

  it('flags the row errored and toasts when the edit enrichment times out', async () => {
    // getIngredientData hangs; withTimeout rejects as if the wall clock fired.
    mockGetIngredientData.mockReturnValue(new Promise(() => {}))
    mockWithTimeout.mockImplementationOnce(async () => {
      throw new IngredientEnrichTimeoutError(12000)
    })
    const { container, setItemStatus } = renderItem()

    editTo(container, '2 cups flour')

    await waitFor(() => expect(setItemStatus).toHaveBeenCalledWith('ing-1', 'error'))
    expect(setItemStatus).toHaveBeenCalledWith('ing-1', 'loading')
    expect(mockToastError).toHaveBeenCalledTimes(1)
    expect(mockToastError.mock.calls[0][0]).toMatch(/too long/i)
  })

  it('toasts an honest wait message and flags the row errored when the edit hits RATE_LIMITED (B3)', async () => {
    mockGetIngredientData.mockResolvedValue(
      rateLimited('2 cups flour', Date.now() + 30_000)
    )
    const { container, setItemStatus } = renderItem()

    editTo(container, '2 cups flour')

    await waitFor(() => expect(setItemStatus).toHaveBeenCalledWith('ing-1', 'error'))
    // The blur-guard (V6) makes this a single submit again: handleEditSubmit's
    // trailing editInputRef.blur() no longer re-fires FormInput's onBlur into
    // a second submit.
    expect(mockToastError).toHaveBeenCalledTimes(1)
    expect(mockToastError.mock.calls[0][0]).toMatch(/lookup limit/i)
  })

  it('does not re-enrich when the edited value is unchanged', async () => {
    const { container, setItemStatus } = renderItem()
    editTo(container, '1 cup milk') // same as original
    await Promise.resolve()
    expect(mockGetIngredientData).not.toHaveBeenCalled()
    expect(setItemStatus).not.toHaveBeenCalled()
  })

  // In-flight re-entry guard (isSubmittingRef): the enrichment await in
  // handleEditSubmit leaves the input visible+focused for the whole pending
  // window (setIsEditing(false) only runs after the await settles). Without
  // a guard, a genuine blur-away or a rapid double-Enter during that window
  // fires a second full submit against the same stale editedVal — a real
  // duplicate paid lookup and duplicate 429 toast. These tests hold the
  // enrichment promise open with a deferred so they can assert the *pending*
  // window's behavior, not just the settled outcome.
  describe('in-flight submit re-entry guard', () => {
    const deferred = <T,>() => {
      let resolve!: (v: T) => void
      const promise = new Promise<T>(res => {
        resolve = res
      })
      return { promise, resolve }
    }

    it('blur-away while enrichment is still pending does not trigger a second submit', async () => {
      const { promise, resolve } = deferred<ReturnType<typeof enriched>>()
      mockGetIngredientData.mockReturnValue(promise)
      const { container } = renderItem()
      const removeBtn = container.querySelector('.ingr-remove') as HTMLButtonElement

      fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
      const input = container.querySelector('input') as HTMLInputElement
      fireEvent.change(input, { target: { value: '2 cups flour' } })
      fireEvent.keyDown(input, { key: 'Enter' }) // starts the pending submit

      await waitFor(() => expect(mockGetIngredientData).toHaveBeenCalledTimes(1))

      // Real blur-away while the first submit is still awaiting enrichment —
      // the input is still rendered+focused at this point (setIsEditing(false)
      // hasn't run yet), so this exercises the exact race.
      act(() => removeBtn.focus())

      // Let the pending submit resolve.
      await act(async () => {
        resolve(enriched('2 cups flour'))
      })

      await waitFor(() => expect(mockGetIngredientData).toHaveBeenCalledTimes(1))
      // The in-flight submit's own post-await tail is what exits edit mode —
      // confirm the blur-away didn't leave the row wedged open.
      expect(container.querySelector('.edit-input')).toBeNull()
    })

    it('a rapid double-Enter while enrichment is still pending only submits once', async () => {
      const { promise, resolve } = deferred<ReturnType<typeof enriched>>()
      mockGetIngredientData.mockReturnValue(promise)
      const { container } = renderItem()

      fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
      const input = container.querySelector('input') as HTMLInputElement
      fireEvent.change(input, { target: { value: '2 cups flour' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      // Second Enter fires while the first submit is still awaiting.
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => expect(mockGetIngredientData).toHaveBeenCalledTimes(1))

      await act(async () => {
        resolve(enriched('2 cups flour'))
      })

      await waitFor(() =>
        expect(container.querySelector('.edit-input')).toBeNull()
      )
      expect(mockGetIngredientData).toHaveBeenCalledTimes(1)
    })
  })
})
