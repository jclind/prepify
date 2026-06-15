/**
 * Saved tab — collection cards, collection filtering, title search, and the
 * per-card add-to-collection popover. RecipeAPI, CollectionsAPI and toast are
 * mocked; react-query and router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SavedRecipes from 'src/pages/Account/SavedRecipes/SavedRecipes'
import RecipeAPI from 'src/api/recipes'
import CollectionsAPI from 'src/api/collections'

vi.mock('src/api/recipes', () => ({
  __esModule: true,
  default: {
    getSavedRecipes: vi.fn(),
    getSavedRecipe: vi.fn(),
    getAccountCounts: vi.fn(),
  },
}))
vi.mock('src/api/collections', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    setRecipeCollections: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: vi.fn(), error: vi.fn() },
}))
// The add-to-collection control renders nothing for logged-out users, so give
// it a signed-in uid.
vi.mock('src/api/auth', () => ({
  __esModule: true,
  default: { getUID: () => 'test-uid' },
}))

const mockedGetSaved = RecipeAPI.getSavedRecipes as unknown as Mock
const mockedGetSavedOne = RecipeAPI.getSavedRecipe as unknown as Mock
const mockedCounts = RecipeAPI.getAccountCounts as unknown as Mock
const mockedList = CollectionsAPI.list as unknown as Mock
const mockedSetMembership = CollectionsAPI.setRecipeCollections as unknown as Mock

const recipe = (id: string, title: string) => ({
  _id: id,
  title,
  recipeImage: '',
  servingPrice: 100,
  servings: 4,
  totalTime: 20,
  rating: { rateValue: 4, rateCount: 3 },
})

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <SavedRecipes />
      </MemoryRouter>
    </QueryClientProvider>
  )

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetSaved.mockResolvedValue({
    recipes: [recipe('r1', 'Soup')],
    totalCount: 1,
  })
  mockedCounts.mockResolvedValue({ saved: 12, ratings: 0, recipes: 0, drafts: 0 })
  mockedList.mockResolvedValue([
    { id: 'c1', name: 'Weeknight', createdAt: '1', count: 3, coverRecipeId: 'r1', coverImage: null },
    { id: 'c2', name: 'Desserts', createdAt: '2', count: 0, coverRecipeId: null, coverImage: null },
  ])
  mockedGetSavedOne.mockResolvedValue({
    recipeId: 'r1',
    dateSaved: '100',
    collectionIds: [],
  })
  mockedSetMembership.mockResolvedValue({
    recipeId: 'r1',
    collectionIds: ['c1'],
    saved: true,
  })
})

it('renders a card per collection with its count, plus All saved and New', async () => {
  renderPage()
  expect(await screen.findByText('Weeknight')).toBeInTheDocument()
  expect(screen.getByText('Desserts')).toBeInTheDocument()
  expect(screen.getByText('All saved')).toBeInTheDocument()
  expect(screen.getByText('New')).toBeInTheDocument()
  // Counts ride on the card; the All tile shows the account-counts total.
  expect(screen.getByText('3 saved')).toBeInTheDocument()
  expect(screen.getByText('12 saved')).toBeInTheDocument()
})

it('filters the grid by collection id when a card is clicked', async () => {
  renderPage()
  const card = await screen.findByText('Weeknight')
  fireEvent.click(card)
  await waitFor(() =>
    expect(mockedGetSaved).toHaveBeenCalledWith(0, 6, 'newAdd', 'c1', undefined)
  )
})

it('searches by title (debounced) via the q param', async () => {
  renderPage()
  await screen.findByText('Soup')
  fireEvent.change(screen.getByPlaceholderText('Search saved…'), {
    target: { value: 'soup' },
  })
  await waitFor(() =>
    expect(mockedGetSaved).toHaveBeenCalledWith(0, 6, 'newAdd', undefined, 'soup')
  )
})

it('toggles membership through the add-to-collection popover', async () => {
  renderPage()
  // Wait for the card to render, then open its popover.
  await screen.findByText('Soup')
  fireEvent.click(screen.getByLabelText('Add to collection'))

  // Popover loads current membership, then lists collections as options.
  const option = await screen.findByText('Desserts', {
    selector: '.collection-option .name',
  })
  fireEvent.click(option)

  await waitFor(() =>
    expect(mockedSetMembership).toHaveBeenCalledWith('r1', ['c2'])
  )
})
