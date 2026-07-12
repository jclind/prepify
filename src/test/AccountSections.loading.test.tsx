import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
const { emptyStateTitles, skeletonMounts } = vi.hoisted(() => ({
  emptyStateTitles: [] as string[],
  skeletonMounts: { count: 0 },
}))

vi.mock('src/Components/EmptyState/EmptyState', () => ({
  default: ({
    title,
    action,
  }: {
    title: string
    action?: { label: string; onClick?: () => void }
  }) => {
    emptyStateTitles.push(title)
    return (
      <div data-testid='empty-state'>
        {title}
        {action?.onClick ? (
          <button onClick={action.onClick}>{action.label}</button>
        ) : null}
      </div>
    )
  },
}))

// Same transient-mount-spy trick as EmptyState: record every Skeleton render so a
// one-frame skeleton flash on a fast load is caught, not just the final DOM.
vi.mock('react-loading-skeleton', () => ({
  default: () => {
    skeletonMounts.count += 1
    return <div data-testid='skeleton' />
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
  rating: 5,
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
  skeletonMounts.count = 0
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
    expect(emptyStateTitles).toHaveLength(0)
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

  it('reserves the skeletons hidden (sk-hold) while a fast load settles — no skeleton or empty-state flash', async () => {
    // Hold the query pending so we can inspect the flash-guard window.
    let resolveQuery: (v: { recipes: RecipeType[]; totalCount: number }) => void =
      () => {}
    mockedAPI.getCreatedRecipes.mockReturnValue(
      new Promise(res => {
        resolveQuery = res
      })
    )

    const { container } = renderWithProviders(<UserRecipes />)

    // Reserve-space pattern (docs/design/loading-states.md): the skeletons mount
    // immediately so the grid holds its height from frame 1, but the container is
    // `sk-hold` (visibility:hidden) until the delay elapses — so nothing flashes,
    // and the empty state never mounts.
    const grid = container.querySelector('.thumbnails-container')
    expect(grid).toHaveClass('sk-hold')
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(emptyStateTitles).toHaveLength(0)

    // Resolving swaps the held skeletons for content — still no empty-state flash.
    resolveQuery({
      recipes: [makeRecipe({ _id: 'r1', title: 'Pancakes' })],
      totalCount: 1,
    })
    expect(await screen.findByText('Pancakes')).toBeInTheDocument()
    expect(emptyStateTitles).toHaveLength(0)
  })

  it('appends the next page on "Load More" and hides the button, without flashing empty state', async () => {
    // Page 0 returns 1 of 2 recipes (button shows); page 1 returns the rest.
    mockedAPI.getCreatedRecipes.mockImplementation(page =>
      Promise.resolve(
        page === 0
          ? {
              recipes: [makeRecipe({ _id: 'r1', title: 'Pancakes' })],
              totalCount: 2,
            }
          : {
              recipes: [makeRecipe({ _id: 'r2', title: 'Waffles' })],
              totalCount: 2,
            }
      )
    )

    renderWithProviders(<UserRecipes />)

    expect(await screen.findByText('Pancakes')).toBeInTheDocument()
    fireEvent.click(
      await screen.findByRole('button', { name: /load more recipes/i })
    )

    // Page 1 accumulated onto page 0 — both present, button gone (2 of 2).
    expect(await screen.findByText('Waffles')).toBeInTheDocument()
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /load more recipes/i })
    ).not.toBeInTheDocument()
    // The grid must not blank to the empty state during the page-2 fetch
    // (when `data` is briefly undefined for the new query key).
    expect(emptyStateTitles).toHaveLength(0)
  })
})

describe('Account tabs — error is not empty', () => {
  // A failed fetch must render the error state, never the "nothing here yet"
  // empty state — a user with data on a flaky connection must not be told they
  // have none. See docs/design/loading-states.md ("Error is not empty").
  it('UserRecipes shows the error state (not "No Recipes Created Yet") when the fetch fails', async () => {
    mockedAPI.getCreatedRecipes.mockRejectedValue(new Error('network down'))

    renderWithProviders(<UserRecipes />)

    expect(
      await screen.findByText('Couldn’t load your recipes')
    ).toBeInTheDocument()
    expect(emptyStateTitles).not.toContain('No Recipes Created Yet')
  })

  it('UserRatings shows the error state (not "No Ratings Yet") when the fetch fails', async () => {
    mockedAPI.getSingleUserReviews.mockRejectedValue(new Error('network down'))

    renderWithProviders(<UserRatings />)

    expect(
      await screen.findByText('Couldn’t load your ratings')
    ).toBeInTheDocument()
    expect(emptyStateTitles).not.toContain('No Ratings Yet')
  })

  it('the error state\'s "Try again" refetches and recovers into content', async () => {
    mockedAPI.getCreatedRecipes
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({
        recipes: [makeRecipe({ _id: 'r1', title: 'Pancakes' })],
        totalCount: 1,
      })

    renderWithProviders(<UserRecipes />)

    expect(
      await screen.findByText('Couldn’t load your recipes')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Pancakes')).toBeInTheDocument()
    expect(
      screen.queryByText('Couldn’t load your recipes')
    ).not.toBeInTheDocument()
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

  it('sends a sort literal the server recognizes ("new", not "newAdd")', async () => {
    // Regression: the server's getSingleUserReviews only matches on 'new'/'top'
    // (server/routes/reviews.js) — any other value silently falls through to no
    // sort at all (natural/insertion order), which Mongo doesn't guarantee.
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [makeReview({ recipeTitle: 'Granola' })],
      totalCount: 1,
    })

    renderWithProviders(<UserRatings />)

    await screen.findByText('Granola')
    expect(mockedAPI.getSingleUserReviews).toHaveBeenCalledWith(
      0,
      5,
      'new',
      true
    )
  })

  it('never flashes the empty state while a load that returns ratings settles', async () => {
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [makeReview({ recipeTitle: 'Granola' })],
      totalCount: 1,
    })

    renderWithProviders(<UserRatings />)

    expect(await screen.findByText('Granola')).toBeInTheDocument()
    expect(emptyStateTitles).toHaveLength(0)
  })

  it('shows the empty state once the query genuinely returns no ratings', async () => {
    mockedAPI.getSingleUserReviews.mockResolvedValue({
      reviews: [],
      totalCount: 0,
    })

    renderWithProviders(<UserRatings />)

    expect(await screen.findByText('No Ratings Yet')).toBeInTheDocument()
  })

  it('appends the next page on "Load More" and hides the button', async () => {
    mockedAPI.getSingleUserReviews.mockImplementation(page =>
      Promise.resolve(
        page === 0
          ? {
              reviews: [makeReview({ _id: 'rev1', recipeTitle: 'Granola' })],
              totalCount: 2,
            }
          : {
              reviews: [makeReview({ _id: 'rev2', recipeTitle: 'Oatmeal' })],
              totalCount: 2,
            }
      )
    )

    renderWithProviders(<UserRatings />)

    expect(await screen.findByText('Granola')).toBeInTheDocument()
    fireEvent.click(
      await screen.findByRole('button', { name: /load more reviews/i })
    )

    // Page 1 accumulated — both ratings present, button gone (2 of 2 shown).
    expect(await screen.findByText('Oatmeal')).toBeInTheDocument()
    expect(screen.getByText('Granola')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /load more reviews/i })
    ).not.toBeInTheDocument()
    expect(emptyStateTitles).toHaveLength(0)
  })
})
