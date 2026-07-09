import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RatingsAndReviews from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { OwnReviewStatus, RatingAggregate, ReviewType } from 'types'

vi.mock('src/api/recipes', () => ({
  default: {
    checkIfReviewed: vi.fn().mockResolvedValue(null),
    getReviews: vi.fn().mockResolvedValue({ reviews: [], totalCount: 0 }),
    addRating: vi.fn(),
    removeRating: vi.fn(),
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

const mockAuthUser = vi.hoisted(() => ({
  current: { photoURL: null, displayName: null } as {
    photoURL: string | null
    displayName: string | null
  } | null,
}))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser.current }),
}))

// The interactive star widget (the user's own rating) and the read-only
// summary stars both render StarRating; distinguish them by testid.
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

const aggregate: RatingAggregate = {
  rateCount: 10,
  rateValue: 4,
  breakdown: { '1': 0, '2': 1, '3': 1, '4': 4, '5': 4 },
}

const publicReview: ReviewType = {
  _id: 'rev-1',
  userId: 'uid-1',
  username: 'testuser',
  recipeId: 'recipe-1',
  rating: 4,
  ratingLastUpdated: '1704067200000',
  reviewCreatedAt: '1704067200000',
  reviewLastUpdated: '1704067200000',
  reviewText: 'Really great recipe!',
  photoURL: null,
  displayName: null,
  isCurrentUser: false,
}

const ownReviewDoc: OwnReviewStatus = {
  reviewed: true,
  _id: 'own-1',
  userId: 'me-uid',
  username: 'me',
  recipeId: 'recipe-1',
  rating: 5,
  ratingLastUpdated: '1704067200000',
  reviewText: 'My own review text',
  reviewCreatedAt: '1704067200000',
  reviewLastUpdated: '1704067200000',
}

const renderSection = (props: { isOwner?: boolean } = {}) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <RatingsAndReviews
          recipeId='recipe-1'
          rating={aggregate}
          isOwner={props.isOwner}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('RatingsAndReviews integration', () => {
  beforeEach(() => {
    mockCheckIfReviewed.mockReset()
    mockCheckIfReviewed.mockResolvedValue({ reviewed: false })
    mockGetReviews.mockReset()
    mockGetReviews.mockResolvedValue({ reviews: [], totalCount: 0 })
    mockAddRating.mockReset()
    mockNewReview.mockReset()
    mockEditReview.mockReset()
    mockDeleteReview.mockReset()
    mockGetUID.mockReturnValue(null)
    mockGetUsername.mockResolvedValue(null)
    mockAuthUser.current = { photoURL: null, displayName: null }
    mockToast.mockClear()
    mockToast.error.mockClear()
  })

  describe('initial load', () => {
    it('calls checkIfReviewed on mount when signed in', async () => {
      mockGetUID.mockReturnValue('me-uid')
      renderSection()
      await waitFor(() =>
        expect(mockCheckIfReviewed).toHaveBeenCalledWith('recipe-1')
      )
    })

    it('skips checkIfReviewed when signed out', async () => {
      renderSection()
      await waitFor(() => expect(mockGetReviews).toHaveBeenCalled())
      expect(mockCheckIfReviewed).not.toHaveBeenCalled()
    })

    it('fetches the first page of reviews newest-first', async () => {
      renderSection()
      await waitFor(() =>
        expect(mockGetReviews).toHaveBeenCalledWith('recipe-1', 'new', 0, 5)
      )
    })

    it('pre-fills the composer stars from checkIfReviewed', async () => {
      mockGetUID.mockReturnValue('me-uid')
      mockCheckIfReviewed.mockResolvedValue({ reviewed: true, rating: 4 })
      renderSection()
      await waitFor(() =>
        expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
          '4 stars'
        )
      )
    })
  })

  describe('the invitation slot', () => {
    it('shows the composer for a signed-in user with no review', async () => {
      mockGetUID.mockReturnValue('me-uid')
      renderSection()
      await screen.findByText('How did it turn out?')
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.queryByText('Your review')).toBeNull()
    })

    it('shows the own-review card instead once a review exists', async () => {
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      mockCheckIfReviewed.mockResolvedValue(ownReviewDoc)
      renderSection()
      await screen.findByText('Your review')
      expect(screen.getByText('My own review text')).toBeInTheDocument()
      expect(screen.queryByText('How did it turn out?')).toBeNull()
    })

    it('signed out: invites to sign in instead of composing', async () => {
      renderSection()
      const signin = await screen.findByText('Sign in to rate')
      expect(signin).toHaveAttribute('href', '/login')
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('recipe owner: shows the owner note, no composer', async () => {
      mockGetUID.mockReturnValue('me-uid')
      renderSection({ isOwner: true })
      await screen.findByText(/This is your recipe/)
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(mockCheckIfReviewed).toHaveBeenCalled() // rating state still loads
    })
  })

  describe('summary strip', () => {
    it('renders average, count, and facepile from the aggregate', async () => {
      mockGetReviews.mockResolvedValue({
        reviews: [publicReview],
        totalCount: 1,
      })
      renderSection()
      await screen.findByText('4.0')
      expect(screen.getByText('10 ratings')).toBeInTheDocument()
      expect(screen.getByText('Rated by 10 cooks')).toBeInTheDocument()
    })
  })

  describe('review list', () => {
    it('renders fetched reviews as cards', async () => {
      mockGetReviews.mockResolvedValue({
        reviews: [publicReview],
        totalCount: 1,
      })
      renderSection()
      await screen.findByText('Really great recipe!')
      expect(document.querySelectorAll('.recipe-review')).toHaveLength(1)
    })

    it("filters the signed-in user's own review out of the list (it lives in the slot above)", async () => {
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      mockCheckIfReviewed.mockResolvedValue(ownReviewDoc)
      mockGetReviews.mockResolvedValue({
        reviews: [
          {
            ...publicReview,
            _id: 'own-1',
            userId: 'me-uid',
            username: 'me',
            reviewText: 'My own review text',
            isCurrentUser: true,
          },
          publicReview,
        ],
        totalCount: 2,
      })
      renderSection()
      await screen.findByText('Really great recipe!')
      // own text renders once — in the own-review card, not as a list card
      expect(screen.getAllByText('My own review text')).toHaveLength(1)
      expect(document.querySelectorAll('.recipe-review')).toHaveLength(1)
    })

    it('shows the toolbar count and sort pills once reviews exist', async () => {
      mockGetReviews.mockResolvedValue({
        reviews: [publicReview],
        totalCount: 7,
      })
      renderSection()
      await screen.findByText('7 reviews')
      expect(screen.getByRole('group', { name: 'Sort reviews' })).toBeInTheDocument()
    })

    it('switching to Top refetches page 0 with the top sort', async () => {
      const user = userEvent.setup()
      mockGetReviews.mockResolvedValue({
        reviews: [publicReview],
        totalCount: 7,
      })
      renderSection()
      await screen.findByText('7 reviews')
      await user.click(screen.getByRole('button', { name: 'Top' }))
      await waitFor(() =>
        expect(mockGetReviews).toHaveBeenCalledWith('recipe-1', 'top', 0, 5)
      )
    })

    it('"Load more reviews" pages forward while more remain', async () => {
      const user = userEvent.setup()
      mockGetReviews.mockResolvedValue({
        reviews: [publicReview],
        totalCount: 10,
      })
      renderSection()
      await screen.findByText('Load more reviews')
      await user.click(screen.getByText('Load more reviews'))
      await waitFor(() =>
        expect(mockGetReviews).toHaveBeenCalledWith('recipe-1', 'new', 1, 5)
      )
    })

    it('empty, signed in: nudges to be the first', async () => {
      mockGetUID.mockReturnValue('me-uid')
      renderSection()
      await screen.findByText(/be the first to share/)
    })

    it('empty, signed out: plain empty note (the sign-in CTA is in the invite)', async () => {
      renderSection()
      await screen.findByText('No reviews yet.')
      expect(screen.queryByText(/be the first/)).toBeNull()
    })
  })

  describe('submit → own card flow', () => {
    it('posting a review flips the invitation slot to the own-review card', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      // Stateful mock: not reviewed until the post lands, then the refetch
      // (triggered by the composer's invalidate) sees the new doc. Stateful
      // rather than mockResolvedValueOnce because extra observers mounting the
      // ['check-made'] query refetch it at unpredictable times.
      let ownDoc: OwnReviewStatus = { reviewed: false }
      mockCheckIfReviewed.mockImplementation(async () => ownDoc)
      mockNewReview.mockImplementation(async () => {
        ownDoc = ownReviewDoc
        return publicReview
      })

      renderSection()
      await screen.findByText('How did it turn out?')
      await user.type(screen.getByRole('textbox'), 'My own review text')
      await user.click(screen.getByText('Share your review'))

      await waitFor(() =>
        expect(mockNewReview).toHaveBeenCalledWith(
          'recipe-1',
          'My own review text'
        )
      )
      await screen.findByText('Your review')
      expect(screen.getByText('My own review text')).toBeInTheDocument()
    })
  })

  describe('edit flow', () => {
    it('saving an edit calls editReview and shows the refetched text', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      // Stateful: the refetch only sees the updated text once the edit lands.
      let ownDoc: OwnReviewStatus = ownReviewDoc
      mockCheckIfReviewed.mockImplementation(async () => ownDoc)
      mockEditReview.mockImplementation(async (_id: string, text: string) => {
        ownDoc = { ...ownReviewDoc, reviewText: text }
        return undefined
      })

      renderSection()
      await screen.findByText('Edit')
      await user.click(screen.getByText('Edit'))

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      await user.clear(textarea)
      await user.type(textarea, 'Updated recipe review')
      await user.click(screen.getByText('Save changes'))

      await waitFor(() =>
        expect(mockEditReview).toHaveBeenCalledWith(
          'recipe-1',
          'Updated recipe review'
        )
      )
      await screen.findByText('Updated recipe review')
      expect(screen.queryByRole('textbox')).toBeNull()
    })
  })

  describe('delete flow', () => {
    it('confirming deletion flips the slot back to the composer (rating kept)', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      // Stateful: after the delete lands, the refetch shows the rating-only doc.
      let ownDoc: OwnReviewStatus = ownReviewDoc
      mockCheckIfReviewed.mockImplementation(async () => ownDoc)
      mockDeleteReview.mockImplementation(async () => {
        ownDoc = { reviewed: true, rating: 5, reviewText: '' }
        return undefined
      })

      renderSection()
      await screen.findByText('Delete')
      await user.click(screen.getByText('Delete'))
      await screen.findByText('Delete your review?')
      await user.click(screen.getByText('Delete review'))

      await waitFor(() =>
        expect(mockDeleteReview).toHaveBeenCalledWith('recipe-1')
      )
      // back to the invitation, with the kept rating seeded into the stars
      await screen.findByText('How did it turn out?')
      expect(screen.queryByText('Your review')).toBeNull()
      await waitFor(() =>
        expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
          '5 stars'
        )
      )
    })

    it('surfaces a toast and keeps the review when deleteReview fails', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('me-uid')
      mockGetUsername.mockResolvedValue('me')
      mockCheckIfReviewed.mockResolvedValue(ownReviewDoc)
      mockDeleteReview.mockRejectedValue(new Error('network down'))

      renderSection()
      await screen.findByText('Delete')
      await user.click(screen.getByText('Delete'))
      await screen.findByText('Delete your review?')
      await user.click(screen.getByText('Delete review'))

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          'Could not delete your review. Please try again.'
        )
      )
      expect(screen.getByText('My own review text')).toBeInTheDocument()
    })
  })

  describe('rating interaction', () => {
    it('tapping a composer star calls addRating with the star value', async () => {
      const user = userEvent.setup()
      mockGetUID.mockReturnValue('me-uid')
      renderSection()
      await screen.findByTestId('star-ratings-rating')
      await user.click(screen.getByTestId('star-ratings-rating'))
      await waitFor(() =>
        expect(mockAddRating).toHaveBeenCalledWith('recipe-1', 4)
      )
    })
  })
})
