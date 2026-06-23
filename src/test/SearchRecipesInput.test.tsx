/**
 * SearchRecipesInput — autocomplete result activation.
 *
 * Regression guard for the "click swallowed during a live refetch" race: with
 * `keepPreviousData`, an in-flight autocomplete query can resolve between a
 * pointer's mousedown and mouseup, swapping the <li> rows and replacing the
 * <button> the click was landing on — so an onClick-only handler never fires.
 * The fix navigates on `onMouseDown` (pointer-down, before the swap window)
 * while keeping `onClick` for keyboard activation, deduped with a ref guard.
 *
 * These tests assert the contract that pins the fix in place:
 *   - a pointer-down alone navigates (the old onClick-only code would not),
 *   - a full mouse click navigates exactly once (no double-nav),
 *   - a keyboard click (no preceding mousedown) still navigates.
 */

import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import RecipeAPI from 'src/api/recipes'

const navigateSpy = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return { ...actual, useNavigate: () => navigateSpy }
})

vi.mock('src/api/recipes', () => ({
  default: { searchAutoCompleteRecipes: vi.fn() },
}))

const results = [
  {
    _id: 'abc123',
    title: 'Tuscan Chicken Skillet',
    recipeImage: 'x.jpg',
    totalTime: 40,
    servings: 4,
    rating: { rateValue: '13', rateCount: '3' },
    nutritionLabels: ['PEANUT_FREE'],
  },
  {
    _id: 'def456',
    title: 'Chinese Lemon Chicken',
    recipeImage: 'y.jpg',
    totalTime: 35,
    servings: 4,
    rating: { rateValue: '0', rateCount: '0' },
    nutritionLabels: [],
  },
]

const mockSearch = RecipeAPI.searchAutoCompleteRecipes as ReturnType<typeof vi.fn>

const renderInput = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SearchRecipesInput autoComplete />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Type a query and wait for the debounced autocomplete dropdown to render the
// first result option.
const openDropdown = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Search all recipes'), 'chic')
  return screen.findByRole(
    'option',
    { name: /Tuscan Chicken Skillet/ },
    { timeout: 3000 }
  )
}

beforeEach(() => {
  navigateSpy.mockClear()
  mockSearch.mockReset().mockResolvedValue(results)
})

describe('SearchRecipesInput — autocomplete result activation', () => {
  it('navigates on pointer-down (mousedown), so an in-flight refetch cannot swallow the click', async () => {
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    // Fire ONLY mousedown — no mouseup/click. The old onClick-only handler would
    // never navigate here; the fix activates on pointer-down.
    fireEvent.mouseDown(firstOption)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })

  it('navigates exactly once for a full mouse click (mousedown → mouseup → click)', async () => {
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    await user.click(firstOption)
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })

  it('still activates via a keyboard click (no preceding mousedown)', async () => {
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    // Keyboard activation (Enter/Space on a focused button) dispatches a click
    // with no mousedown — the onClick path must still navigate.
    fireEvent.click(firstOption)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })
})
