import React, { FC, useState } from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RatingsAndReviews from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { ReviewType } from 'types'

// ReviewFilters sets reviewListSort on mount — that's the gateway for data fetching
// inside ReviewsContainer. Mock it to call through immediately.
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
    checkIfReviewed: vi.fn().mockResolvedValue(null),
    getReviews: vi.fn().mockResolvedValue({ reviews: [], totalCount: 0 }),
    addRating: vi.fn(),
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

// The interactive star widget (user's own rating) and the read-only header
// average both render StarRating, so distinguish them by testid.
vi.mock('src/Components/StarRating/StarRating', () => ({
  default: ({ rating, onChange, interactive }: any) => (
    <div
      data-testid={interactive ? 'star-ratings-rating' : 'star-ratings-display'}
      onClick={() => interactive && onChange?.(4)}
      aria-label={`${rating} stars`}
    >
      {rating} stars
    </div>
  ),
}))

const mockToast = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
)
vi.mock('react-hot-toast', () => ({ default: mockToast }))

const mockCheckIfReviewed = RecipeAPI.checkIfReviewed as ReturnType<typeof vi.fn>
const mockGetReviews = RecipeAPI.getReviews as ReturnType<typeof vi.fn>
const mockAddRating = RecipeAPI.addRating as ReturnType<typeof vi.fn>
const mockNewReview = RecipeAPI.newReview as ReturnType<typeof vi.fn>
const mockEditReview = RecipeAPI.editReview as ReturnType<typeof vi.fn>
const mockDeleteReview = RecipeAPI.deleteReview as ReturnType<typeof vi.fn>
const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const baseReview: ReviewType = {
  _id: 'rev-1',
  username: 'testuser',
  recipeId: 'recipe-1',
  rating: '4',
  ratingLastUpdated: '1704067200000',
  reviewCreatedAt: '1704067200000',
  reviewLastUpdated: '1704067200000',
  reviewText: 'Really great recipe!',
}

// Wrapper owns currUserReview state so the full RatingsAndReviews → ReviewsContainer
// prop chain can react to changes (submit, delete) just as SingleRecipe does.
const IntegrationWrapper: FC<{ initialReview?: ReviewType | null }> = ({
  initialReview = null,
}) => {
  const [currUserReview, setCurrUserReview] = useState<ReviewType | null>(
    initialReview ?? null
  )
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <HelmetProvider>
          <RatingsAndReviews
            recipeId='recipe-1'
            ratingVal={4}
            ratingCount={10}
            currUserReview={currUserReview}
            setCurrUserReview={setCurrUserReview}
          />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RatingsAndReviews integration', () => {
  beforeEach(() => {
    mockCheckIfReviewed.mockReset()
    mockCheckIfReviewed.mockResolvedValue(null)
    mockGetReviews.mockReset()
    mockGetReviews.mockResolvedValue({ reviews: [], totalCount: 0 })
    mockAddRating.mockReset()
    mockNewReview.mockReset()
    mockEditReview.mockReset()
    mockDeleteReview.mockReset()
    mockGetUID.mockReturnValue(null)
    mockGetUsername.mockResolvedValue(null)
    mockToast.mockClear()
  })

  describe('initial load with existing user data', () => {
    it('calls checkIfReviewed on mount when uid is set', async () => {
      mockGetUID.mockReturnValue('user-1')
      render(<IntegrationWrapper />)
      await waitFor(() =>
        expect(mockCheckIfReviewed).toHaveBeenCalledWith('recipe-1')
      )
    })

    it('does not call checkIfReviewed when uid is null', async () => {
      mockGetUID.mockReturnValue(null)
      render(<IntegrationWrapper />)
      // Wait for getReviews (ReviewFilters mock fires on mount) as evidence
      // that useEffects have run, then confirm checkIfReviewed was skipped.
      await waitFor(() => expect(mockGetReviews).toHaveBeenCalled())
      expect(mockCheckIfReviewed).not.toHaveBeenCalled()
    })

    it('pre-fills rating from checkIfReviewed response', async () => {
      mockGetUID.mockReturnValue('user-1')
      mockCheckIfReviewed.mockResolvedValue({ rating: '4', reviewText: null })
      render(<IntegrationWrapper />)
      // Interactive star mock renders "{rating} stars"; starts "0 stars", becomes "4 stars"
      await waitFor(() =>
        expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
          '4 stars'
        )
      )
    })

    it('shows RecipeReview (not AddReview) when checkIfReviewed returns a review with text', async () => {
      mockGetUID.mockReturnValue('user-1')
      mockCheckIfReviewed.mockResolvedValue(baseReview)
      render(<IntegrationWrapper />)
      await screen.findByText('Your Review:')
      expect(screen.queryByText('Add Review')).toBeNull()
    })
  })

  describe('submit review flow', () => {
    it('submitting a review calls newReview with the correct recipeId and review text, then shows the review in the UI', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('user-1')
      // checkIfReviewed sets rating=4 in RatingsAndReviews, which AddReview requires
      // to pass its "Please add a rating" validation guard before calling newReview.
      mockCheckIfReviewed.mockResolvedValue({ rating: '4', reviewText: null })
      mockNewReview.mockResolvedValue(baseReview)

      render(<IntegrationWrapper />)
      // Confirm rating=4 has propagated through the component tree before interacting.
      // Once a signed-in user has a rating, the review textarea appears in-flow
      // (no separate "Add Review" toggle).
      await waitFor(() =>
        expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
          '4 stars'
        )
      )

      await user.type(screen.getByRole('textbox'), 'Really great recipe!')
      await user.click(screen.getByText('Submit Review'))

      await waitFor(() =>
        expect(mockNewReview).toHaveBeenCalledWith('recipe-1', 'Really great recipe!')
      )
      // After a successful submit, setCurrUserReview(baseReview) causes ReviewsContainer
      // to switch from AddReview to the curr-user-review section containing RecipeReview.
      await screen.findByText('Your Review:')
      expect(screen.getByText('Really great recipe!')).toBeInTheDocument()
    })
  })

  describe('edit review flow', () => {
    it('editing a review calls editReview with the new text and updates the displayed content', async () => {
      const user = userEvent.setup()
      // ReviewOptions shows Edit/Delete only when currUsername === reviewAuthorUsername
      mockGetUID.mockReturnValue('author-uid')
      mockGetUsername.mockResolvedValue('testuser') // matches baseReview.username
      // checkIfReviewed fires in RatingsAndReviews.useEffect (uid is non-null) and calls
      // setCurrUserReview — return baseReview so it doesn't wipe the initialReview state.
      mockCheckIfReviewed.mockResolvedValue(baseReview)
      mockEditReview.mockResolvedValue(undefined)

      render(<IntegrationWrapper initialReview={baseReview} />)

      await screen.findByText('Edit')
      await user.click(screen.getByText('Edit'))

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      await user.clear(textarea)
      await user.type(textarea, 'Updated recipe review')

      await user.click(screen.getByText('Submit'))

      await waitFor(() =>
        expect(mockEditReview).toHaveBeenCalledWith('recipe-1', 'Updated recipe review')
      )
      await screen.findByText('Updated recipe review')
    })
  })

  describe('delete review flow', () => {
    it('confirming deletion calls deleteReview and removes the review from the UI', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('author-uid')
      mockGetUsername.mockResolvedValue('testuser')
      // Same as edit: checkIfReviewed must return baseReview to avoid wiping initialReview.
      mockCheckIfReviewed.mockResolvedValue(baseReview)
      mockDeleteReview.mockResolvedValue(undefined)

      render(<IntegrationWrapper initialReview={baseReview} />)

      await screen.findByText(/^Delete$/)
      await user.click(screen.getByText(/^Delete$/))
      await screen.findByText('Are you sure you want to delete your review?')

      // Two "Delete" texts exist: the trigger button and the modal confirm button
      const deleteButtons = screen.getAllByText(/^Delete$/)
      await user.click(deleteButtons[deleteButtons.length - 1])

      await waitFor(() =>
        expect(mockDeleteReview).toHaveBeenCalledWith('recipe-1')
      )
      // setCurrUserReview(null) switches ReviewsContainer back to the write-review
      // box (the user still has their rating, so the textarea reappears in-flow)
      await screen.findByText(/Add a written review/i)
      expect(screen.queryByText('Your Review:')).toBeNull()
    })
  })

  describe('rating interaction', () => {
    it('clicking a star calls addRating with the correct recipeId and star value', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('user-1')
      render(<IntegrationWrapper />)
      await screen.findByTestId('star-ratings-rating')
      await user.click(screen.getByTestId('star-ratings-rating'))
      await waitFor(() =>
        expect(mockAddRating).toHaveBeenCalledWith('recipe-1', 4)
      )
    })
  })
})
