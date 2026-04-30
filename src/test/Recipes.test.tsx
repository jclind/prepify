import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Recipes from 'src/pages/Recipes/Recipes'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: {
    getAllRecipes: vi.fn(),
    searchAutoCompleteRecipes: vi.fn().mockResolvedValue([]),
  },
}))

// RecipeFilters controls filtersLoading AND selectFilterVal. The Recipes useEffect
// that calls getRecipes depends on [selectFilterVal, ...], so the mock must update
// selectFilterVal on mount to trigger the initial fetch.
vi.mock('src/Components/RecipeFilters/RecipeFilters', async () => {
  const { useEffect } = await import('react')
  return {
    default: ({ setFiltersLoading, setSelectVal }: any) => {
      useEffect(() => {
        setFiltersLoading(false)
        setSelectVal('new') // changes selectFilterVal → triggers getRecipes effect
      }, [])
      return (
        <button
          data-testid='change-filter'
          onClick={() => setSelectVal('popular')}
        >
          Change Filter
        </button>
      )
    },
  }
})

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

const renderRecipes = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <HelmetProvider>
        <Recipes />
      </HelmetProvider>
    </MemoryRouter>
  )

describe('Recipes (Browse) page', () => {
  beforeEach(() => {
    mockGetAllRecipes.mockReset()
  })

  it('shows 4 loading skeleton cards before the API resolves', () => {
    mockGetAllRecipes.mockReturnValue(new Promise(() => {}))
    const { container } = renderRecipes()
    // 4 RecipeThumbnail buttons rendered while data is pending
    expect(container.querySelectorAll('.recipe-thumbnail')).toHaveLength(4)
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

  it('shows "No Results Found" when the API returns total_results: 0', async () => {
    mockGetAllRecipes.mockResolvedValue({
      recipeList: [],
      total_results: 0,
      page: 0,
      entries_per_page: 9,
      filters: {},
    })
    renderRecipes()
    await screen.findByText('No Results Found')
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
    await screen.findByText('Load More Recipes')
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
    expect(screen.queryByText('Load More Recipes')).toBeNull()
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
    await screen.findByText('Load More Recipes')

    await user.click(screen.getByText('Load More Recipes'))

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
    await screen.findByText('Load More Recipes')
    await user.click(screen.getByText('Load More Recipes'))

    await waitFor(() =>
      expect(mockGetAllRecipes).toHaveBeenCalledWith(1, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything())
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
    await screen.findByText('Load More Recipes')
    await user.click(screen.getByText('Load More Recipes'))

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

    await user.click(screen.getByTestId('change-filter'))

    await waitFor(() =>
      expect(mockGetAllRecipes).toHaveBeenCalledWith(0, expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything())
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
        'taco tuesday'
      )
    )
  })

  it('shows an error message when getAllRecipes throws', async () => {
    mockGetAllRecipes.mockRejectedValue(new Error('network error'))
    renderRecipes()
    await screen.findByText('Failed to load recipes. Please try again.')
  })
})
