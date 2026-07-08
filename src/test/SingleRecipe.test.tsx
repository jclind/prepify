import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SingleRecipe from 'src/pages/SingleRecipe/SingleRecipe'
import RecipeAPI from 'src/api/recipes'

vi.mock('src/api/recipes', () => ({
  default: {
    getRecipe: vi.fn(),
    getSavedRecipes: vi.fn().mockResolvedValue({ _id: 'u1', userRecipes: [], savedRecipes: [] }),
    checkIfReviewed: vi.fn().mockResolvedValue(null),
    getReviews: vi.fn().mockResolvedValue({ reviews: [], totalCount: 0 }),
    addRating: vi.fn(),
  },
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue(null),
    getUsername: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ recipeId: 'recipe-1' }) }
})

// Isolate from complex sub-component trees
vi.mock('src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews', () => ({
  default: () => <div data-testid='ratings-section' />,
}))

vi.mock('src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls', () => ({
  default: () => null,
}))

vi.mock('src/pages/SingleRecipe/Buttons/MadeRecipeBtn', () => ({
  default: () => null,
}))

vi.mock('src/Components/StarRating/StarRating', () => ({
  default: ({ rating }: any) => <div data-testid='star-rating'>{rating}</div>,
}))

const mockGetRecipe = RecipeAPI.getRecipe as ReturnType<typeof vi.fn>

const baseRecipe = {
  _id: 'recipe-1',
  title: 'Chicken Tacos',
  recipeImage: 'https://example.com/tacos.jpg',
  servingPrice: 200,
  servings: 4,
  totalTime: 30,
  rating: { rateValue: 0, rateCount: 0 },
  prepTime: 15,
  cookTime: 15,
  fridgeLife: 3,
  freezerLife: 14,
  description: 'Tasty tacos',
  ingredients: [],
  instructions: [],
  nutritionData: null,
  authorUsername: 'chef',
  createdAt: '2024-01-01',
  editedAt: null,
  cuisine: 'Mexican',
  mealTypes: ['dinner'],
  nutritionLabels: null,
  views: 10,
  numTimesSaved: 2,
  numTimesMade: 5,
}

// Minimal Edamam-shaped nutrition payload covering every nutrient the
// NutritionData table reads, so the component renders without throwing.
const nutrientKeys = [
  'FAT', 'FASAT', 'FATRN', 'CHOLE', 'NA', 'CHOCDF',
  'FIBTG', 'SUGAR', 'PROCNT', 'VITD', 'CA', 'FE', 'K',
]
const buildNutrientMap = () =>
  Object.fromEntries(
    nutrientKeys.map(k => [k, { label: k, quantity: 40, unit: 'g' }])
  )
const nutritionDataFixture = {
  calories: 800,
  totalNutrients: buildNutrientMap(),
  totalDaily: buildNutrientMap(),
  dietLabels: [],
  healthLabels: [],
}

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderSingleRecipe = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/recipes/recipe-1']}>
        <HelmetProvider>
          <SingleRecipe />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('SingleRecipe page', () => {
  beforeEach(() => {
    mockGetRecipe.mockReset()
    localStorage.clear()
  })

  it('shows loading state in header while API call is pending', async () => {
    mockGetRecipe.mockReturnValue(new Promise(() => {}))
    renderSingleRecipe()
    // The body skeletons are delay-gated (useDelayedLoading); on a pending load
    // the header skeleton appears once the delay elapses.
    expect(await screen.findByTestId('header-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('ratings-section')).toBeNull()
  })

  it('renders recipe title after the API resolves', async () => {
    mockGetRecipe.mockResolvedValue(baseRecipe)
    renderSingleRecipe()
    await screen.findByText('Chicken Tacos')
  })

  it('links the author byline to the author profile at /u/:username', async () => {
    mockGetRecipe.mockResolvedValue(baseRecipe)
    renderSingleRecipe()
    await screen.findByText('Chicken Tacos')
    const authorLink = screen.getByRole('link', { name: "View @chef's profile" })
    expect(authorLink).toHaveAttribute('href', '/u/chef')
    // the handle + avatar live inside the single clickable byline
    expect(authorLink).toHaveTextContent('@chef')
  })

  it('shows RecipeNotFound when API response has no title', async () => {
    mockGetRecipe.mockResolvedValue({ _id: 'recipe-1' })
    renderSingleRecipe()
    await screen.findByText(/not found/i)
  })

  it('shows RecipeNotFound when the API returns null', async () => {
    mockGetRecipe.mockResolvedValue(null)
    renderSingleRecipe()
    await screen.findByText(/not found/i)
  })

  it('RatingsAndReviews is not rendered while loading=true', () => {
    mockGetRecipe.mockReturnValue(new Promise(() => {}))
    renderSingleRecipe()
    expect(screen.queryByTestId('ratings-section')).toBeNull()
  })

  it('RatingsAndReviews mounts after loading completes and recipe data exists', async () => {
    mockGetRecipe.mockResolvedValue(baseRecipe)
    renderSingleRecipe()
    await screen.findByTestId('ratings-section')
  })

  it('serving size is read from localStorage on mount', async () => {
    localStorage.setItem(
      'recipeServings',
      JSON.stringify([{ recipeId: 'recipe-1', numServings: 8 }])
    )
    mockGetRecipe.mockResolvedValue(baseRecipe)
    renderSingleRecipe()

    // The Ingredients component shows the serving size in its input
    await waitFor(() => {
      const servingsInput = screen.getAllByRole('textbox').find(
        el => (el as HTMLInputElement).value === '8'
      ) ?? screen.queryByDisplayValue('8')
      expect(servingsInput).toBeTruthy()
    })
  })

  it('changing the serving size writes the new value back to localStorage', async () => {
    mockGetRecipe.mockResolvedValue(baseRecipe)
    const user = userEvent.setup()
    renderSingleRecipe()

    // Wait for initial load
    await screen.findByText('Chicken Tacos')

    // The Ingredients component has a + button to increment
    const incButton = screen.getByRole('button', { name: 'Increase servings' })
    await user.click(incButton)

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('recipeServings') || '[]')
      expect(stored).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ recipeId: 'recipe-1', numServings: 5 }),
        ])
      )
    })
  })

  it('renders the nutrition facts table when the recipe has nutritionData', async () => {
    mockGetRecipe.mockResolvedValue({
      ...baseRecipe,
      nutritionData: nutritionDataFixture,
    })
    renderSingleRecipe()
    await screen.findByText('Chicken Tacos')
    // The inline facts table renders its rows.
    expect(screen.getByText('Total Fat')).toBeInTheDocument()
    // calories per serving = round(800 / 4 servings) = 200; shown in both the
    // macro summary and the facts table.
    expect(screen.getAllByText('200').length).toBeGreaterThan(0)
  })

  it('shows a calories-only nutrition view when only calories are present', async () => {
    // Stored recipes can have a `nutritionData` object with just a calorie
    // count (no `totalNutrients`); it renders the calories-only view, not an
    // empty facts table, and must not throw.
    mockGetRecipe.mockResolvedValue({
      ...baseRecipe,
      nutritionData: { calories: 800 },
    })
    renderSingleRecipe()
    await screen.findByText('Chicken Tacos')
    expect(screen.getByText('Nutrition')).toBeInTheDocument()
    // 800 / 4 servings = 200 calories per serving
    expect(screen.getByText('200')).toBeInTheDocument()
    // no detailed facts table without nutrient maps
    expect(screen.queryByText('Total Fat')).toBeNull()
  })

  it('omits the nutrition section when nutritionData is null', async () => {
    mockGetRecipe.mockResolvedValue(baseRecipe)
    renderSingleRecipe()
    await screen.findByText('Chicken Tacos')
    expect(screen.queryByText('Total Fat')).toBeNull()
  })

  it('shows error message and does not crash when getRecipe throws', async () => {
    mockGetRecipe.mockRejectedValue(new Error('server error'))
    renderSingleRecipe()
    await screen.findByText('Failed to load recipe. Please try again.')
  })
})
