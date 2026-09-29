import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOwnRating } from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/useOwnRating'
import RecipeAPI from 'src/api/recipes'

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: mockToast }))

vi.mock('src/api/recipes', () => ({
  default: {
    checkIfReviewed: vi.fn(),
    addRating: vi.fn(),
    removeRating: vi.fn(),
  },
}))
vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue('user-1') },
}))

// useOwnRating owns the signed-in user's stars on one recipe: seeded from the
// server doc, optimistic on taps, reverted on rejection — and, the subtlest
// part, guarded against out-of-order responses so a slow earlier request can't
// clobber a value the user has already moved past.
function Harness() {
  const { rating, changeRating, removeRating } = useOwnRating('recipe-1')
  return (
    <div>
      <span data-testid='rating'>{rating}</span>
      <button onClick={() => changeRating(4)}>rate4</button>
      <button onClick={() => changeRating(2)}>rate2</button>
      <button onClick={() => removeRating()}>remove</button>
    </div>
  )
}

const renderHarness = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Harness />
    </QueryClientProvider>
  )

const mockCheck = RecipeAPI.checkIfReviewed as ReturnType<typeof vi.fn>
const mockAdd = RecipeAPI.addRating as ReturnType<typeof vi.fn>
const mockRemove = RecipeAPI.removeRating as ReturnType<typeof vi.fn>

describe('useOwnRating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.error.mockReset()
    mockToast.success.mockReset()
  })

  it('seeds the stars from the stored review doc', async () => {
    mockCheck.mockResolvedValue({ rating: 3 })
    renderHarness()
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))
  })

  it('seeds to zero when there is no review doc or no numeric rating', async () => {
    mockCheck.mockResolvedValue(null)
    renderHarness()
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('0'))
  })

  it('reverts to the previous stars and toasts when the save fails', async () => {
    mockCheck.mockResolvedValue({ rating: 3 })
    mockAdd.mockRejectedValue(new Error('nope'))
    renderHarness()
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))

    fireEvent.click(screen.getByText('rate4'))
    expect(screen.getByTestId('rating').textContent).toBe('4')

    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))
    expect(mockToast.error).toHaveBeenCalledWith(
      'Could not save your rating. Please try again.'
    )
  })

  it('a superseded failed save does not revert the newer value', async () => {
    let serverRating = 3
    mockCheck.mockImplementation(async () => ({ rating: serverRating }))
    // First save hangs until the test releases it; second resolves at once.
    let rejectFirst!: (e: Error) => void
    const firstSave = new Promise<never>((_res, rej) => {
      rejectFirst = rej
    })
    mockAdd.mockImplementationOnce(() => firstSave)
    mockAdd.mockImplementation((_id: string, val: number) => {
      serverRating = val
      return Promise.resolve({})
    })
    renderHarness()
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))

    fireEvent.click(screen.getByText('rate4')) // req 1: slow, will fail later
    fireEvent.click(screen.getByText('rate2')) // req 2: lands immediately
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('2'))

    // The slow first request now fails — it must NOT revert to 3 or toast.
    await act(async () => {
      rejectFirst(new Error('slow failure'))
      await Promise.resolve()
    })
    expect(screen.getByTestId('rating').textContent).toBe('2')
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('reverts a failed removal (clearing the stars) back to the previous value', async () => {
    mockCheck.mockResolvedValue({ rating: 3 })
    mockRemove.mockRejectedValue(new Error('nope'))
    renderHarness()
    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))

    fireEvent.click(screen.getByText('remove'))
    expect(screen.getByTestId('rating').textContent).toBe('0')

    await waitFor(() => expect(screen.getByTestId('rating').textContent).toBe('3'))
    expect(mockToast.error).toHaveBeenCalledWith(
      'Could not remove your rating. Please try again.'
    )
  })
})
