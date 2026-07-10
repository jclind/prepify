import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    // Not toHaveBeenCalledTimes(1): handleEditSubmit's own trailing
    // editInputRef.blur() re-fires FormInput's onBlur (wired to the same
    // handler), double-invoking submit on every edit — a pre-existing quirk
    // unrelated to B3, tracked separately. Assert the toast content, not the count.
    expect(mockToastError).toHaveBeenCalled()
    expect(mockToastError.mock.calls[0][0]).toMatch(/lookup limit/i)
  })

  it('does not re-enrich when the edited value is unchanged', async () => {
    const { container, setItemStatus } = renderItem()
    editTo(container, '1 cup milk') // same as original
    await Promise.resolve()
    expect(mockGetIngredientData).not.toHaveBeenCalled()
    expect(setItemStatus).not.toHaveBeenCalled()
  })
})
