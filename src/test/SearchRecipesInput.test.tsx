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
 *
 * A second suite pins the ARIA combobox/listbox contract added in the Wave 2
 * accessibility sweep: the input is a `role="combobox"`, results are valid
 * `<li role="option">` direct children of the listbox, and arrow/Home/End/Enter/
 * Escape drive the highlight via `aria-activedescendant` without moving focus
 * off the input.
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

describe('SearchRecipesInput — combobox / listbox semantics + keyboard nav', () => {
  it('exposes the input as a combobox whose aria-expanded tracks the popup', async () => {
    const user = userEvent.setup()
    renderInput()
    const combobox = screen.getByRole('combobox')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')

    await openDropdown(user)
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    // aria-controls points at the live listbox element.
    expect(combobox).toHaveAttribute(
      'aria-controls',
      screen.getByRole('listbox').id
    )
  })

  it('renders options as <li role="option"> direct children of the listbox', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)

    const listbox = screen.getByRole('listbox')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    options.forEach(opt => {
      expect(opt.tagName).toBe('LI')
      // No intermediate wrapper / no <button>: options are direct children.
      expect(opt.parentElement).toBe(listbox)
    })
  })

  it('moves the highlight with ArrowDown via aria-activedescendant + aria-selected', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)
    const combobox = screen.getByRole('combobox')
    // No option highlighted until the user navigates.
    expect(combobox).not.toHaveAttribute('aria-activedescendant')

    await user.keyboard('{ArrowDown}')
    const [first, second] = screen.getAllByRole('option')
    expect(combobox).toHaveAttribute('aria-activedescendant', first.id)
    expect(first).toHaveAttribute('aria-selected', 'true')
    expect(second).toHaveAttribute('aria-selected', 'false')

    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', second.id)
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(first).toHaveAttribute('aria-selected', 'false')
  })

  it('wraps around the ends with ArrowUp/ArrowDown', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)
    const combobox = screen.getByRole('combobox')
    const [first, second] = screen.getAllByRole('option')

    // ArrowUp from no selection wraps to the last option.
    await user.keyboard('{ArrowUp}')
    expect(combobox).toHaveAttribute('aria-activedescendant', second.id)
    // ArrowDown from the last option wraps back to the first.
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', first.id)
  })

  it('Enter on a highlighted option navigates to it (not a full search)', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(navigateSpy).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith('/recipes/def456')
  })

  it('Enter with no highlight runs the full search', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)

    await user.keyboard('{Enter}')
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.stringContaining('/recipes?q=')
    )
  })

  it('Escape closes the dropdown and collapses the combobox', async () => {
    const user = userEvent.setup()
    renderInput()
    await openDropdown(user)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
