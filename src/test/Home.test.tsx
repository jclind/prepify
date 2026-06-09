import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from 'src/pages/Home/Home'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: {
    getTrendingRecipes: vi.fn(),
    getAllRecipes: vi.fn(),
  },
}))

// HomeHero renders the real search input; stub it so we don't pull in Firebase/network.
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => null,
}))

const mockGetTrendingRecipes = RecipeAPI.getTrendingRecipes as ReturnType<typeof vi.fn>
const mockGetAllRecipes = RecipeAPI.getAllRecipes as ReturnType<typeof vi.fn>

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

const mealResult = (recipes: ReturnType<typeof makeRecipe>[]) => ({
  recipeList: recipes,
  total_results: recipes.length,
})

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderHome = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <HelmetProvider>
          <Home />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('Home page', () => {
  beforeEach(() => {
    mockGetTrendingRecipes.mockReset()
    mockGetAllRecipes.mockReset()
    // Neutral defaults; individual tests override the section they exercise.
    mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
    mockGetAllRecipes.mockResolvedValue(mealResult([]))
  })

  it('renders without crashing', () => {
    renderHome()
  })

  it('renders the hero heading text', () => {
    renderHome()
    expect(
      screen.getByText('Save money. Reduce stress. Be healthy.')
    ).toBeInTheDocument()
  })

  describe('Trending this week', () => {
    it('shows 4 skeleton cards while the API call is pending', () => {
      mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
      const { container } = renderHome()
      expect(container.querySelectorAll('.home-trending-grid .home-recipe-card')).toHaveLength(4)
    })

    it('replaces skeletons with recipe cards after getTrendingRecipes resolves', async () => {
      mockGetTrendingRecipes.mockResolvedValue([makeRecipe('a'), makeRecipe('b')])
      const { container } = renderHome()
      expect(await screen.findByText('Recipe a')).toBeInTheDocument()
      expect(screen.getByText('Recipe b')).toBeInTheDocument()
      expect(container.querySelectorAll('.home-trending-grid .home-recipe-card')).toHaveLength(2)
    })

    it('shows an empty-state message when getTrendingRecipes resolves with no recipes', async () => {
      mockGetTrendingRecipes.mockResolvedValue([])
      renderHome()
      expect(await screen.findByText(/no trending recipes/i)).toBeInTheDocument()
    })

    it('shows an error message when getTrendingRecipes rejects', async () => {
      mockGetTrendingRecipes.mockRejectedValue(new Error('boom'))
      renderHome()
      expect(await screen.findByText(/couldn.t load trending recipes/i)).toBeInTheDocument()
    })
  })

  describe('Browse by meal', () => {
    it('renders the three meal columns', () => {
      renderHome()
      expect(screen.getByText('Breakfast')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
      expect(screen.getByText('Dinner')).toBeInTheDocument()
    })

    it('renders each meal column with its recipes', async () => {
      mockGetAllRecipes.mockImplementation((_p: number, _o: string, tags: string[]) =>
        Promise.resolve(mealResult([makeRecipe(`${tags[0]}1`)]))
      )
      renderHome()
      expect(await screen.findByText('Recipe Breakfast1')).toBeInTheDocument()
      expect(screen.getByText('Recipe Lunch1')).toBeInTheDocument()
      expect(screen.getByText('Recipe Dinner1')).toBeInTheDocument()
    })

    it('does not repeat a recipe that is tagged for multiple meals', async () => {
      mockGetAllRecipes.mockImplementation((_p: number, _o: string, tags: string[]) => {
        const meal = tags[0]
        if (meal === 'Breakfast') return Promise.resolve(mealResult([makeRecipe('shared'), makeRecipe('bk')]))
        if (meal === 'Lunch') return Promise.resolve(mealResult([makeRecipe('shared'), makeRecipe('ln')]))
        return Promise.resolve(mealResult([]))
      })
      renderHome()
      // Breakfast claims "shared"; Lunch should fall back to its own unique recipe.
      expect(await screen.findByText('Recipe bk')).toBeInTheDocument()
      expect(screen.getByText('Recipe ln')).toBeInTheDocument()
      expect(screen.getAllByText('Recipe shared')).toHaveLength(1)
      expect(screen.getByText(/no dinner recipes yet/i)).toBeInTheDocument()
    })

    it('shows an error message in each column when the fetch rejects', async () => {
      mockGetAllRecipes.mockRejectedValue(new Error('boom'))
      renderHome()
      await waitFor(() => {
        expect(screen.getAllByText(/couldn.t load recipes/i)).toHaveLength(3)
      })
    })
  })
})
