import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Home from 'src/pages/Home/Home'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: {
    getTrendingRecipes: vi.fn(),
  },
}))

vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => null,
}))

vi.mock('src/Components/RecipeThumbnail/RecipeThumbnail', () => ({
  default: ({ recipe, loading }: any) =>
    loading ? (
      <div data-testid='recipe-thumb-loading' />
    ) : (
      <div data-testid='recipe-thumb'>{recipe?.title}</div>
    ),
}))

const mockGetTrendingRecipes = RecipeAPI.getTrendingRecipes as ReturnType<typeof vi.fn>

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
  authorUsername: 'chef',
  createdAt: '2024-01-01',
  editedAt: null,
  cuisine: '',
  mealTypes: [],
  nutritionLabels: null,
  views: 0,
  numTimesSaved: 0,
  numTimesMade: 0,
})

const renderHome = () =>
  render(
    <MemoryRouter>
      <HelmetProvider>
        <Home />
      </HelmetProvider>
    </MemoryRouter>
  )

describe('Home page', () => {
  beforeEach(() => {
    mockGetTrendingRecipes.mockReset()
  })

  it('renders without crashing', () => {
    mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
    renderHome()
  })

  it('renders the hero heading text', () => {
    mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(
      screen.getByText('Save money. Reduce stress. Be healthy.')
    ).toBeInTheDocument()
  })

  describe('TrendingRecipes', () => {
    it('shows 4 skeleton cards while the API call is pending', () => {
      mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
      renderHome()
      expect(screen.getAllByTestId('recipe-thumb-loading')).toHaveLength(4)
    })

    it('replaces skeleton cards with recipe cards after getTrendingRecipes resolves', async () => {
      mockGetTrendingRecipes.mockResolvedValue([makeRecipe('a'), makeRecipe('b')])
      renderHome()
      // findAllByTestId handles multiple matches; findByTestId throws when >1 element is found
      const thumbs = await screen.findAllByTestId('recipe-thumb')
      expect(thumbs).toHaveLength(2)
      expect(screen.getByText('Recipe a')).toBeInTheDocument()
      expect(screen.getByText('Recipe b')).toBeInTheDocument()
      expect(screen.queryByTestId('recipe-thumb-loading')).toBeNull()
    })

    // TrendingRecipes has no .catch and no empty-state UI — when the fetch resolves
    // with no recipes the component silently stays in skeleton state indefinitely.
    // A rejected fetch has the same visible result but can't be tested directly
    // without triggering an unhandled-rejection warning (no .catch on the Promise).
    // See REFACTOR_NOTES.md.
    it('stays in skeleton state when getTrendingRecipes resolves with empty data (no error state)', async () => {
      mockGetTrendingRecipes.mockResolvedValue([])
      renderHome()
      await waitFor(() => {
        expect(screen.getAllByTestId('recipe-thumb-loading')).toHaveLength(4)
      })
    })
  })
})
