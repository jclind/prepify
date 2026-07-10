import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientsContainer from 'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer'
import RecipeAPI from 'src/api/recipes'
import { toast } from 'react-hot-toast'
import {
  IngredientEnrichTimeoutError,
  IngredientStatus,
  withIngredientStatus,
  withTimeout,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'

vi.mock('src/api/recipes', () => ({
  default: { getIngredientData: vi.fn() },
}))

vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue(null) },
}))

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Pass-through by default so the timeout doesn't actually run against real time;
// the timeout-handling test overrides it to reject with a timeout error. The
// real IngredientEnrichTimeoutError class is preserved for `instanceof` checks.
vi.mock(
  'src/pages/AddRecipe/Ingredients/ingredientEnrichment',
  async importOriginal => {
    const actual = await importOriginal<
      typeof import('src/pages/AddRecipe/Ingredients/ingredientEnrichment')
    >()
    return { ...actual, withTimeout: vi.fn((p: Promise<unknown>) => p) }
  }
)

// DnD renders nothing in jsdom — render children directly.
vi.mock('src/pages/AddRecipe/Dnd', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  Drag: ({ children }: any) => <div>{children}</div>,
  Drop: ({ children }: any) => <div>{children}</div>,
}))

// Local, synchronous parse (the real one is a library fn) — echo the input so
// the optimistic row text is predictable.
vi.mock('@jclind/ingredient-parser', () => ({
  parseIngredientString: (val: string) => ({
    ingredient: 'flour',
    quantity: 2,
    unit: 'cups',
    comment: null,
    originalIngredientString: val,
  }),
}))

vi.mock('src/pages/AddRecipe/AddLabel/AddLabel', () => ({ default: () => null }))

const mockGetIngredientData = RecipeAPI.getIngredientData as ReturnType<typeof vi.fn>
const mockToastError = toast.error as ReturnType<typeof vi.fn>
const mockWithTimeout = withTimeout as ReturnType<typeof vi.fn>

const PLACEHOLDER = 'Add ingredients to your recipe.'

// A successful enrichment payload (price + image).
const enriched = (original: string) => ({
  parsedIngredient: {
    ingredient: 'flour',
    quantity: 2,
    unit: 'cups',
    comment: null,
    originalIngredientString: original,
  },
  ingredientData: {
    totalPriceUSACents: 300,
    imagePath: 'https://img.test/flour.png',
  },
  id: 'server-generated-id',
})

const errorVariant = (original: string) => ({
  error: { message: 'not found' },
  parsedIngredient: {
    ingredient: 'flour',
    quantity: 2,
    unit: 'cups',
    comment: null,
    originalIngredientString: original,
  },
  ingredientData: null,
  id: 'server-id',
})

// Mirrors the real wiring: the enrichment-status map is owned by useRecipeForm
// and passed down, so the wrapper hosts it the same way.
const Wrapper = () => {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [statusById, setStatusById] = useState<Record<string, IngredientStatus>>(
    {}
  )
  return (
    <IngredientsContainer
      ingredients={ingredients}
      setIngredients={setIngredients}
      statusById={statusById}
      setItemStatus={(id, status) =>
        setStatusById(prev => withIngredientStatus(prev, id, status))
      }
    />
  )
}

const addIngredient = async (
  user: ReturnType<typeof userEvent.setup>,
  val: string
) => {
  await user.type(screen.getByPlaceholderText(PLACEHOLDER), `${val}{enter}`)
}

// The enriched row price and the footer subtotal both render "$3.00"; assert on
// the row's `.ingr-price` element specifically.
const rowPriceText = () =>
  document.querySelector('.ingr-price')?.textContent ?? ''

beforeEach(() => {
  mockGetIngredientData.mockReset()
  mockToastError.mockReset()
  mockWithTimeout.mockReset()
  mockWithTimeout.mockImplementation((p: Promise<unknown>) => p)
})

describe('IngredientsContainer — optimistic add', () => {
  it('shows the ingredient immediately, then reconciles price when enrichment returns', async () => {
    const user = userEvent.setup()
    // A deferred enrichment we resolve manually, so we can observe the
    // optimistic (pre-response) state.
    let resolve!: (v: any) => void
    mockGetIngredientData.mockReturnValue(new Promise(r => (resolve = r)))

    render(<Wrapper />)
    await addIngredient(user, '2 cups flour')

    // Optimistic: the row text is on screen before enrichment resolves, and no
    // price yet (it's still loading).
    expect(screen.getByText('flour')).toBeInTheDocument()
    expect(rowPriceText()).not.toContain('$3.00')

    // Reconcile.
    await act(async () => {
      resolve(enriched('2 cups flour'))
    })
    await waitFor(() => expect(rowPriceText()).toContain('$3.00'))
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('marks the row errored (with a retry) when enrichment soft-fails, keeping the ingredient', async () => {
    const user = userEvent.setup()
    mockGetIngredientData.mockResolvedValue(errorVariant('2 cups flour'))

    render(<Wrapper />)
    await addIngredient(user, '2 cups flour')

    // Row is kept and flagged for retry; a soft-fail is shown inline (no toast).
    await waitFor(() =>
      expect(screen.getByLabelText('Retry ingredient lookup')).toBeInTheDocument()
    )
    expect(screen.getByText('flour')).toBeInTheDocument()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('retrying an errored row re-runs enrichment and clears the error on success', async () => {
    const user = userEvent.setup()
    mockGetIngredientData
      .mockResolvedValueOnce(errorVariant('2 cups flour'))
      .mockResolvedValueOnce(enriched('2 cups flour'))

    render(<Wrapper />)
    await addIngredient(user, '2 cups flour')

    const retry = await screen.findByLabelText('Retry ingredient lookup')
    await user.click(retry)

    await waitFor(() => expect(rowPriceText()).toContain('$3.00'))
    expect(screen.queryByLabelText('Retry ingredient lookup')).toBeNull()
    expect(mockGetIngredientData).toHaveBeenCalledTimes(2)
  })
})

describe('IngredientsContainer — enrichment timeout', () => {
  it('errors the row and toasts when the request times out', async () => {
    const user = userEvent.setup()
    // getIngredientData is called (and ignored); withTimeout rejects as if the
    // request hung past the wall clock.
    mockGetIngredientData.mockReturnValue(new Promise(() => {}))
    // Async throw so the rejected promise is created only when awaited by the
    // container (avoids an "unhandled rejection" from an eagerly-built reject).
    mockWithTimeout.mockImplementationOnce(async () => {
      throw new IngredientEnrichTimeoutError(12000)
    })

    render(<Wrapper />)
    await addIngredient(user, '2 cups flour')

    // Optimistic row present, then flips to errored with a surfaced toast.
    expect(screen.getByText('flour')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByLabelText('Retry ingredient lookup')).toBeInTheDocument()
    )
    expect(mockToastError).toHaveBeenCalledTimes(1)
    expect(mockToastError.mock.calls[0][0]).toMatch(/too long/i)
  })
})
