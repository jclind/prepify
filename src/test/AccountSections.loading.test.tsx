import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import UserRecipes from 'src/pages/Account/UserRecipes/UserRecipes'
import UserRatings from 'src/pages/Account/UserRatings/UserRatings'
import RecipeAPI from 'src/api/recipes'
import { OptionalReviewType, RecipeType } from 'types'

// Record every EmptyState render so we can assert it NEVER mounts during a
// successful load. The "Your Recipes" / "Ratings" flash was a one-frame mount
// of the empty state in the gap between react-query settling (isLoading=false)
// and the list state being populated by the effect a render later — a transient
// mount RTL's final-DOM assertions would miss, but this spy catches.
const { emptyStateTitles } = vi.hoisted(() => ({
  emptyStateTitles: [] as string[],
}))

vi.mock('src/Components/EmptyState/EmptyState', () => ({
  default: ({ title }: { title: string }) => {
    emptyStateTitles.push(title)
    return <div data-testid='empty-state'>{title}</div>
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue('test-uid'),
    getUsername: vi.fn().mockResolvedValue('chef'),
  },
}))

vi.mock('src/api/recipes', () => ({
  default: {
    getCreatedRecipes: vi.fn(),
    getSingleUserReviews: vi.fn(),
  },
}))

const mockedAPI = RecipeAPI as unknown as {
  getCreatedRecipes: ReturnType<typeof vi.fn>
  getSingleUserReviews: ReturnType<typeof vi.fn>
}

const makeRecipe = (overrides: Partial<RecipeType> = {}): RecipeType => ({
  _id: 'recipe-1',
  title: 'Test Recipe',
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  fridgeLife: 3,
  freezerLife: 30,
  description: 'A recipe',
  ingredients: [],
  instructions: [],
  recipeImage: 'https://example.com/recipe.jpg',
  nutritionData: null,
  totalTime: 30,
  authorUsername: 'chef',
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '1000',
  editedAt: null,
  servingPrice: 100,
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: [],
  views: 0,
  numTimesSaved: 0,
  numTimesMade: 0,
  ...overrides,
})

const makeReview = (
  overrides: Partial<OptionalReviewType> = {}
): OptionalReviewType => ({
  _id: 'review-1',
  username: 'chef',
  recipeId: 'recipe-1',
  rating: '5',
  ratingLastUpdated: '1000',
  reviewText: 'Loved it',
  recipeTitle: 'Test Recipe',
  recipeImage: 'https://example.com/recipe.jpg',
  ...overrides,
})

const renderWithProviders = (ui: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  emptyStateTitles.length = 0
})

describe('UserRecipes — empty-state flash (Bug B)', () => {
  it('never flashes the empty state while a load that returns recipes settles', async () => {
    mockedAPI.getCreatedRecipes.mockResolvedValue({
      recipes: [makeRecipe({ _id: 'r1', title: 'Pancakes' })],
      totalCount: 1,
    })

    renderWithProviders(<UserRecipes />)

    expect(await screen.findByText('Pancakes')).toBeInTheDocument()
    // The empty state must not have mounted at any point during the load.
    expect(emptyStateTitles).not.toContain('No Recipes Created Yet')
  })

  it('shows the empty state once the query genuinely returns no recipes', async () => {
    mockedAPI.getCreatedRecipes.mockResolvedValue({
      recipes: [],
      totalCount: 0,
    })

    renderWithProviders(<UserRecipes />)

    expect(
      await screen.findByText('No Recipes Created Yet')
    ).toBeInTheDocument()
  })
})

describe('UserRatings — image rendering (Bug A) + empty-state flash', () => {
  it('renders the recipe image and title from the flattened review fields', async () => {
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [
        makeReview({
          recipeTitle: 'Granola',
          recipeImage: 'https://cdn.example.com/granola.jpg',
        }),
      ],
      totalCount: 1,
    })

    renderWithProviders(<UserRatings />)

    const img = (await screen.findByAltText('Granola')) as HTMLImageElement
    expect(img.src).toBe('https://cdn.example.com/granola.jpg')
    expect(screen.getByText('Granola')).toBeInTheDocument()
  })

  it('never flashes the empty state while a load that returns ratings settles', async () => {
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [makeReview({ recipeTitle: 'Granola' })],
      totalCount: 1,
    })

    renderWithProviders(<UserRatings />)

    expect(await screen.findByText('Granola')).toBeInTheDocument()
    expect(emptyStateTitles).not.toContain('No Ratings Yet')
  })

  it('shows the empty state once the query genuinely returns no ratings', async () => {
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [],
      totalCount: 0,
    })

    renderWithProviders(<UserRatings />)

    expect(await screen.findByText('No Ratings Yet')).toBeInTheDocument()
  })
})
