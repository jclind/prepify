import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Recipes from 'src/pages/Recipes/Recipes'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: {
    getAllRecipes: vi.fn(),
    searchAutoCompleteRecipes: vi.fn().mockResolvedValue([]),
    // RecipeCard's save button queries this; it stays disabled in tests (no
    // signed-in uid), but provide it so the mocked module is complete.
    getSavedRecipe: vi.fn().mockResolvedValue(null),
  },
}))

// The page reads its filters from the URL on mount and clears filtersLoading
// itself, so the initial fetch fires without any filter component. Stub the
// search input (autocomplete makes its own request).
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => null,
}))

const makeRecipe = (id: string) => ({
  _id: id,
  title: `Recipe ${id}`,
  recipeImage: `https://example.com/${id}.jpg`,
  servingPrice: 100,
  servings: 2,
  totalTime: 20,
  rating: { rateValue: 0, rateCount: 0 },
  prepTime: 10,
  cookTime: 10,
  fridgeLife: 3,
  freezerLife: 14,
  description: 'desc',
  ingredients: [],
  instructions: [],
  nutritionData: null,
  authorUsername: 'user',
  createdAt: '2024-01-01',
  editedAt: null,
  cuisine: '',
  mealTypes: [],
  nutritionLabels: null,
  views: 0,
  numTimesSaved: 0,
  numTimesMade: 0,
})

const mockGetAllRecipes = RecipeAPI.getAllRecipes as ReturnType<typeof vi.fn>

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderRecipes = (initialEntry = '/') =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <HelmetProvider>
          <Recipes />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('Recipes (Browse) page', () => {
  beforeEach(() => {
    mockGetAllRecipes.mockReset()
  })

  it('shows loading skeleton cards before the API resolves', () => {
    mockGetAllRecipes.mockReturnValue(new Promise(() => {}))
    const { container } = renderRecipes()
    // Skeleton RecipeCards rendered while data is pending (no images yet)
    expect(container.querySelectorAll('.recipe-card--loading')).toHaveLength(8)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders recipe thumbnails once the API resolves with results', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [makeRecipe('1'), makeRecipe('2'), makeRecipe('3')],
      total_results: 3,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes()
    await screen.findByText('Recipe 1')
    expect(screen.getByText('Recipe 2')).toBeInTheDocument()
    expect(screen.getByText('Recipe 3')).toBeInTheDocument()
  })

  it('shows an empty state when the API returns total_results: 0', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [],
      total_results: 0,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes()
    await screen.findByText('No recipes found')
  })

  it('"Load More" button is visible when total_results > loaded count', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [makeRecipe('1'), makeRecipe('2'), makeRecipe('3')],
      total_results: 6,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes()
    await screen.findByText('Load more recipes')
  })

  it('"Load More" button is absent when all results are already loaded', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [makeRecipe('1'), makeRecipe('2')],
      total_results: 2,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes()
    await screen.findByText('Recipe 1')
    expect(screen.queryByText('Load more recipes')).toBeNull()
  })

  it('"Load More" is disabled while a fetch is in flight', async () => {
    const user = userEvent.setup()
    mockGetAllRecipes.mockResolvedValueOnce({
      recipeList: [makeRecipe('1')],
      total_results: 6,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })

    let resolveNext: (v: any) => void
    mockGetAllRecipes.mockReturnValueOnce(
      new Promise(res => {
        resolveNext = res
      })
    )

    const { container } = renderRecipes()
    await screen.findByText('Load more recipes')

    await user.click(screen.getByText('Load more recipes'))

    const btn = container.querySelector('.load-more-btn') as HTMLButtonElement
    expect(btn).toBeDisabled()

    resolveNext!({
      recipeList: [makeRecipe('2')],
      total_results: 6,
      page: 1,
      entries_per_page: 9,
      filters: {},
    })
    await waitFor(() => expect(btn).not.toBeDisabled())
  })

  it('clicking "Load More" calls getAllRecipes with the next page number', async () => {
    const user = userEvent.setup()
    mockGetAllRecipes
      .mockResolvedValueOnce({
        recipeList: [makeRecipe('1')],
        total_results: 6,
        page: 0,
        entries_per_page: 9,
        filters: {},
      })
      .mockResolvedValueOnce({
        recipeList: [makeRecipe('2')],
        total_results: 6,
        page: 1,
        entries_per_page: 9,
        filters: {},
      })

    renderRecipes()
    await screen.findByText('Load more recipes')
    await user.click(screen.getByText('Load more recipes'))

    await waitFor(() =>
      expect(mockGetAllRecipes).toHaveBeenCalledWith(1, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything())
    )
  })

  it('clicking "Load More" appends results rather than replacing them', async () => {
    const user = userEvent.setup()
    mockGetAllRecipes
      .mockResolvedValueOnce({
        recipeList: [makeRecipe('1')],
        total_results: 6,
        page: 0,
        entries_per_page: 9,
        filters: {},
      })
      .mockResolvedValueOnce({
        recipeList: [makeRecipe('2')],
        total_results: 6,
        page: 1,
        entries_per_page: 9,
        filters: {},
      })

    renderRecipes()
    await screen.findByText('Load more recipes')
    await user.click(screen.getByText('Load more recipes'))

    await screen.findByText('Recipe 2')
    expect(screen.getByText('Recipe 1')).toBeInTheDocument()
  })

  it('changing the sort filter resets the list and fetches from page 0', async () => {
    const user = userEvent.setup()
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [makeRecipe('1')],
      total_results: 1,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })

    renderRecipes()
    await screen.findByText('Recipe 1')

    mockGetAllRecipes.mockClear()
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [makeRecipe('A')],
      total_results: 1,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })

    // Open the Sort menu and pick a different option.
    await user.click(screen.getByRole('button', { name: /Sort:/ }))
    await user.click(screen.getByRole('button', { name: 'Newest' }))

    await waitFor(() =>
      expect(mockGetAllRecipes).toHaveBeenCalledWith(
        0,
        'new',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    )
    await screen.findByText('Recipe A')
    expect(screen.queryByText('Recipe 1')).toBeNull()
  })

  it('normalizes URL query ?q=taco-tuesday to "taco tuesday" before the API call', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [],
      total_results: 0,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes('/?q=taco-tuesday')
    await waitFor(() =>
      expect(mockGetAllRecipes).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'taco tuesday',
        expect.anything()
      )
    )
  })

  it('shows an error message when getAllRecipes throws', async () => {
    mockGetAllRecipes.mockRejectedValue(new Error('network error'))
    renderRecipes()
    await screen.findByText('Failed to load recipes. Please try again.')
  })
})
