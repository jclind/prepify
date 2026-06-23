/**
 * SearchRecipesInput — autocomplete result activation.
 *
 * Result navigation is delegated to the stable `.auto-complete-results`
 * container: a click anywhere on a row bubbles up and resolves that row's
 * `data-recipe-id`, rather than being bound to the per-row <button>. This
 * survives the dropdown re-rendering / replacing row nodes during an in-flight
 * refetch (a detached row can't drop the event), and — because the handler is
 * stateless — stays correct for the navbar's SearchRecipesInput, which lives in
 * the persistent <Layout> and is reused across navigations without remounting.
 *
 * (Loading skeletons render under their own `.ac-skeleton` class, so the
 * `.ac-item` result rows asserted here are always real, navigable results.)
 *
 * These tests pin the contract:
 *   - clicking a result navigates to it,
 *   - the row is resolved from any inner element (delegation via closest()),
 *   - the same mounted instance navigates on every click — no stuck guard
 *     (regression: the navbar instance is never remounted),
 *   - keyboard activation (Enter/Space → click, no mousedown) still works.
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
  it('navigates to a result when its row is clicked', async () => {
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    await user.click(firstOption)
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })

  it('resolves the row from an inner element (delegation via closest)', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)

    // Click the title text deep inside the row, not the <button> itself — the
    // delegated handler must still walk up to the row's data-recipe-id.
    await user.click(screen.getByText('Tuscan Chicken Skillet'))
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })

  it('navigates on every click from the same mounted instance (navbar reuse, no stuck guard)', async () => {
    // The navbar's SearchRecipesInput is never remounted across navigations, so
    // activation must not depend on one-shot instance state. Two sequential
    // clicks on the same instance must both navigate.
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    await user.click(firstOption)
    await user.click(
      screen.getByRole('option', { name: /Chinese Lemon Chicken/ })
    )
    expect(navigateSpy).toHaveBeenCalledTimes(2)
    expect(navigateSpy).toHaveBeenNthCalledWith(1, '/recipes/abc123')
    expect(navigateSpy).toHaveBeenNthCalledWith(2, '/recipes/def456')
  })

  it('activates via a keyboard click (Enter/Space → click, no mousedown)', async () => {
    const user = userEvent.setup()
    renderInput()
    const firstOption = await openDropdown(user)

    // Keyboard activation dispatches a click with no preceding mousedown.
    fireEvent.click(firstOption)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/abc123')
  })
})
