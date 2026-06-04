import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReviewsContainer from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'

// ReviewFilters calls setReviewListSort on mount — that's the trigger for the first
// data fetch inside ReviewsContainer. Mock it to call through immediately so tests
// don't have to interact with react-select to kick off data loading.
vi.mock(
  'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewFilters',
  async () => {
    const { useEffect } = await import('react')
    return {
      default: ({ setReviewListSort }: any) => {
        useEffect(() => {
          setReviewListSort('new')
        }, [])
        return null
      },
    }
  }
)

vi.mock('src/api/recipes', () => ({
  default: {
    getReviews: vi.fn(),
    newReview: vi.fn(),
    editReview: vi.fn(),
    deleteReview: vi.fn(),
  },
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue(null),
    getUsername: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('src/Components/StarRating/StarRating', () => ({
  default: ({ rating }: any) => (
    <div data-testid='star-rating'>{rating} stars</div>
  ),
}))

const mockToast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
)
vi.mock('react-hot-toast', () => ({ default: mockToast }))

const mockGetReviews = RecipeAPI.getReviews as ReturnType<typeof vi.fn>
const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const baseReview = {
  _id: 'rev-1',
  username: 'testuser',
  recipeId: 'recipe-1',
  rating: '4',
  ratingLastUpdated: '1704067200000',
  reviewCreatedAt: '1704067200000',
  reviewLastUpdated: '1704067200000',
  reviewText: 'Really great recipe!',
}

const renderContainer = ({
  currUserReview = null as typeof baseReview | null,
  setCurrUserReview = vi.fn(),
  rating = 0,
  recipeId = 'recipe-1',
} = {}) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <ReviewsContainer
          currUserReview={currUserReview}
          setCurrUserReview={setCurrUserReview}
          rating={rating}
          recipeId={recipeId}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('ReviewsContainer', () => {
  beforeEach(() => {
    mockGetReviews.mockReset()
    mockGetReviews.mockResolvedValue({ reviews: [], totalCount: 0 })
    mockGetUID.mockReturnValue(null)
  })

  it('renders without crashing', () => {
    renderContainer()
  })

  it('calls RecipeAPI.getReviews with the correct recipeId, sort, page, and page size', async () => {
    renderContainer({ recipeId: 'recipe-42' })
    await waitFor(() =>
      expect(mockGetReviews).toHaveBeenCalledWith('recipe-42', 'new', 0, 5)
    )
  })

  it('renders review text when getReviews returns reviews that have reviewText', async () => {
    mockGetReviews.mockResolvedValue({
      reviews: [{ ...baseReview, reviewText: 'Delicious!' }],
      totalCount: 1,
    })
    renderContainer()
    await screen.findByText('Delicious!')
  })

  it('filters out reviews with empty reviewText before rendering', async () => {
    mockGetReviews.mockResolvedValue({
      reviews: [
        { ...baseReview, _id: 'r1', reviewText: 'Visible text' },
        { ...baseReview, _id: 'r2', reviewText: '' },
      ],
      totalCount: 2,
    })
    renderContainer()
    await screen.findByText('Visible text')
    // r2 was filtered before setReviewList — only 1 RecipeReview element in the DOM
    expect(document.querySelectorAll('.recipe-review')).toHaveLength(1)
  })

  it('shows "No Reviews" when getReviews returns empty and currUserReview is null', async () => {
    mockGetReviews.mockResolvedValue({ reviews: [], totalCount: 0 })
    renderContainer({ currUserReview: null })
    await screen.findByText('No Reviews')
  })

  it('shows the write-review box once a signed-in user has rated', () => {
    mockGetUID.mockReturnValue('user-1')
    renderContainer({ currUserReview: null, rating: 4 })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('does not show the write-review box before the user has rated', () => {
    renderContainer({ currUserReview: null, rating: 0 })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('shows the user\'s existing review and hides AddReview when currUserReview is set', async () => {
    renderContainer({ currUserReview: baseReview })
    expect(screen.getByText('Your Review:')).toBeInTheDocument()
    await screen.findByText('Really great recipe!')
    expect(screen.queryByText('Add Review')).toBeNull()
  })

  it('"More Reviews" button appears when totalCount exceeds the fetched list length', async () => {
    mockGetReviews.mockResolvedValue({ reviews: [baseReview], totalCount: 10 })
    renderContainer()
    await screen.findByText('More Reviews')
  })

  it('clicking "More Reviews" calls getReviews with an incremented page number', async () => {
    const user = userEvent.setup()
    mockGetReviews.mockResolvedValue({ reviews: [baseReview], totalCount: 10 })
    renderContainer()
    await screen.findByText('More Reviews')
    await user.click(screen.getByText('More Reviews'))
    await waitFor(() =>
      expect(mockGetReviews).toHaveBeenCalledWith('recipe-1', 'new', 1, 5)
    )
  })
})
