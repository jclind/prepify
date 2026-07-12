import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from 'src/pages/Home/Home'
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/api/recipes', () => ({
  default: {
    getTrendingRecipes: vi.fn(),
    getAllRecipes: vi.fn(),
    getForYouRecipes: vi.fn(),
    getRandomRecipe: vi.fn(),
  },
}))

// HomeHero renders the real search input; stub it so we don't pull in Firebase/network.
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => null,
}))

// For You is gated on auth — control the current user per test.
vi.mock('src/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockGetTrendingRecipes = RecipeAPI.getTrendingRecipes as ReturnType<typeof vi.fn>
const mockGetAllRecipes = RecipeAPI.getAllRecipes as ReturnType<typeof vi.fn>
const mockGetForYouRecipes = RecipeAPI.getForYouRecipes as ReturnType<typeof vi.fn>
const mockGetRandomRecipe = RecipeAPI.getRandomRecipe as ReturnType<typeof vi.fn>
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>

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
    mockGetForYouRecipes.mockReset()
    mockGetRandomRecipe.mockReset()
    mockUseAuth.mockReset()
    // Neutral defaults; individual tests override the section they exercise.
    mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
    mockGetAllRecipes.mockResolvedValue(mealResult([]))
    mockGetForYouRecipes.mockResolvedValue([])
    // Logged out by default → the For You row is absent and doesn't interfere.
    mockUseAuth.mockReturnValue({ user: null })
  })

  it('renders the hero heading text', () => {
    renderHome()
    expect(
      screen.getByText('Save money. Reduce stress. Be healthy.')
    ).toBeInTheDocument()
  })

  describe('Trending this week', () => {
    it('shows 4 skeleton cards while the API call is pending', async () => {
      mockGetTrendingRecipes.mockReturnValue(new Promise(() => {}))
      const { container } = renderHome()
      // Skeletons are delay-gated (useDelayedLoading) so a fast load can't flash
      // them — on a genuinely pending load they appear once the delay elapses.
      await waitFor(() =>
        expect(
          container.querySelectorAll('.home-trending-grid .home-recipe-card')
        ).toHaveLength(4)
      )
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

  describe('For you', () => {
    const loggedIn = () => mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })

    it('is absent for a logged-out visitor', () => {
      // default beforeEach: user = null
      renderHome()
      expect(screen.queryByText('For you')).not.toBeInTheDocument()
      expect(mockGetForYouRecipes).not.toHaveBeenCalled()
    })

    it('renders recipe cards when the API returns personalized picks', async () => {
      loggedIn()
      mockGetForYouRecipes.mockResolvedValue([makeRecipe('fy1'), makeRecipe('fy2')])
      renderHome()
      expect(await screen.findByText('For you')).toBeInTheDocument()
      expect(await screen.findByText('Recipe fy1')).toBeInTheDocument()
      expect(screen.getByText('Recipe fy2')).toBeInTheDocument()
    })

    it('hides the whole row when the API returns no picks (too little signal)', async () => {
      loggedIn()
      mockGetForYouRecipes.mockResolvedValue([])
      renderHome()
      await waitFor(() => expect(mockGetForYouRecipes).toHaveBeenCalled())
      await waitFor(() => expect(screen.queryByText('For you')).not.toBeInTheDocument())
    })

    it('hides the row on fetch error (silent, non-core)', async () => {
      loggedIn()
      mockGetForYouRecipes.mockRejectedValue(new Error('boom'))
      renderHome()
      await waitFor(() => expect(mockGetForYouRecipes).toHaveBeenCalled())
      await waitFor(() => expect(screen.queryByText('For you')).not.toBeInTheDocument())
    })

    it('stays hidden while the personalized fetch is pending (pop-in, no skeleton)', async () => {
      loggedIn()
      mockGetForYouRecipes.mockReturnValue(new Promise(() => {}))
      renderHome()
      // For You has no loading skeleton: it often resolves to empty, so it renders
      // nothing until real picks arrive (then pops in) rather than reserving space
      // it may take back. The header must not appear while the fetch is pending.
      await waitFor(() => expect(mockGetForYouRecipes).toHaveBeenCalled())
      expect(screen.queryByText('For you')).not.toBeInTheDocument()
    })
  })

  describe('What should I cook?', () => {
    const cookButton = () => screen.getByRole('button', { name: /what should i cook/i })

    it('shows the button for a logged-out visitor and does not fetch until clicked', () => {
      renderHome() // user = null by default
      expect(cookButton()).toBeInTheDocument()
      expect(mockGetRandomRecipe).not.toHaveBeenCalled()
    })

    it('shows the button for a logged-in user too (not auth-gated)', () => {
      mockUseAuth.mockReturnValue({ user: { uid: 'u1' } })
      renderHome()
      expect(cookButton()).toBeInTheDocument()
    })

    it('reveals a recipe card when clicked', async () => {
      mockGetRandomRecipe.mockResolvedValue(makeRecipe('rnd1'))
      renderHome()
      fireEvent.click(cookButton())
      expect(await screen.findByText('Recipe rnd1')).toBeInTheDocument()
      expect(mockGetRandomRecipe).toHaveBeenCalledWith(undefined)
    })

    it('"Try another" re-rolls, excluding the current pick', async () => {
      mockGetRandomRecipe
        .mockResolvedValueOnce(makeRecipe('rnd1'))
        .mockResolvedValueOnce(makeRecipe('rnd2'))
      renderHome()
      fireEvent.click(cookButton())
      expect(await screen.findByText('Recipe rnd1')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /try another/i }))
      expect(await screen.findByText('Recipe rnd2')).toBeInTheDocument()
      expect(mockGetRandomRecipe).toHaveBeenLastCalledWith('rnd1')
    })

    it('shows a soft message when there are no recipes (404 → null)', async () => {
      mockGetRandomRecipe.mockResolvedValue(null)
      renderHome()
      fireEvent.click(cookButton())
      expect(await screen.findByText(/no recipes to suggest yet/i)).toBeInTheDocument()
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
      mockGetAllRecipes.mockImplementation(({ tags }: { tags: string[] }) =>
        Promise.resolve(mealResult([makeRecipe(`${tags[0]}1`)]))
      )
      renderHome()
      expect(await screen.findByText('Recipe Breakfast1')).toBeInTheDocument()
      expect(screen.getByText('Recipe Lunch1')).toBeInTheDocument()
      expect(screen.getByText('Recipe Dinner1')).toBeInTheDocument()
    })

    it('does not repeat a recipe that is tagged for multiple meals', async () => {
      mockGetAllRecipes.mockImplementation(({ tags }: { tags: string[] }) => {
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
