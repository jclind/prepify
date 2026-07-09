import React from 'react'
import { vi } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Ratings from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings'
import ReviewsList from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsList'
import AddReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/AddReview'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

vi.mock('src/api/recipes', () => ({
  default: {
    addRating: vi.fn(),
    removeRating: vi.fn(),
    getReviews: vi.fn().mockResolvedValue({ reviews: [], totalCount: 0 }),
    newReview: vi.fn(),
    editReview: vi.fn(),
    deleteReview: vi.fn(),
    checkIfReviewed: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('src/api/auth', () => ({
  default: {
    getUID: vi.fn().mockReturnValue(null),
    getUsername: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('src/Components/StarRating/StarRating', () => ({
  default: ({ rating, onChange, interactive }: any) => (
    <div
      data-testid='star-ratings-rating'
      onClick={() => interactive && onChange?.(4)}
      aria-label={`${rating} stars`}
    >
      {rating} stars
    </div>
  ),
}))

const mockToast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: mockToast }))

const mockAddRating = RecipeAPI.addRating as ReturnType<typeof vi.fn>
const mockRemoveRating = RecipeAPI.removeRating as ReturnType<typeof vi.fn>
const mockNewReview = RecipeAPI.newReview as ReturnType<typeof vi.fn>
const mockEditReview = RecipeAPI.editReview as ReturnType<typeof vi.fn>
const mockDeleteReview = RecipeAPI.deleteReview as ReturnType<typeof vi.fn>
const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>

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

// ─── Ratings ─────────────────────────────────────────────────────────────────

describe('Ratings', () => {
  const renderRatings = (
    uid: string | null = null,
    ratingVal = 0,
    ratingCount = 0,
    rating = 0,
    setRating = vi.fn()
  ) => {
    mockGetUID.mockReturnValue(uid)
    return render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <Ratings
            rating={rating}
            setRating={setRating}
            ratingVal={ratingVal}
            ratingCount={ratingCount}
            recipeId='recipe-1'
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    mockAddRating.mockReset()
    mockRemoveRating.mockReset()
    mockGetUID.mockReturnValue(null)
    mockToast.error.mockClear()
  })

  it('shows "Sign In To Rate" with non-interactive display stars when no uid is available', async () => {
    const user = userEvent.setup()
    renderRatings(null)
    expect(screen.getByText('Sign In To Rate')).toBeInTheDocument()
    // logged-out shows display stars as a prompt, but they don't submit a rating
    await user.click(screen.getByTestId('star-ratings-rating'))
    expect(mockAddRating).not.toHaveBeenCalled()
  })

  it('renders star widget when a uid is present', () => {
    renderRatings('user-1')
    expect(screen.getByTestId('star-ratings-rating')).toBeInTheDocument()
    expect(screen.queryByText('Sign In To Rate')).toBeNull()
  })

  it('clicking a star calls RecipeAPI.addRating with recipeId and rating value', async () => {
    const user = userEvent.setup()
    renderRatings('user-1')
    await user.click(screen.getByTestId('star-ratings-rating'))
    expect(mockAddRating).toHaveBeenCalledWith('recipe-1', 4)
  })

  it('average rating shows "0" when rateCount is 0', () => {
    renderRatings(null, 0, 0)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('average rating is formatted correctly for a non-zero count', () => {
    renderRatings(null, 4, 10)
    expect(screen.getByText(/4\.0/)).toBeInTheDocument()
    expect(screen.getByText('(10)')).toBeInTheDocument()
  })

  it('does NOT show "Remove rating" when the user has no rating', () => {
    renderRatings('user-1', 0, 0, 0)
    expect(screen.queryByText('Remove rating')).toBeNull()
  })

  it('shows "Remove rating" once the user has a rating', () => {
    renderRatings('user-1', 4, 1, 4)
    expect(screen.getByText('Remove rating')).toBeInTheDocument()
  })

  it('clicking "Remove rating" calls RecipeAPI.removeRating and clears the local rating', async () => {
    const user = userEvent.setup()
    const setRating = vi.fn()
    mockRemoveRating.mockResolvedValue(undefined)
    renderRatings('user-1', 4, 1, 4, setRating)
    await user.click(screen.getByText('Remove rating'))
    expect(setRating).toHaveBeenCalledWith(0)
    await waitFor(() => expect(mockRemoveRating).toHaveBeenCalledWith('recipe-1'))
  })

  it('reverts the optimistic star and shows a toast when addRating fails', async () => {
    const user = userEvent.setup()
    const setRating = vi.fn()
    mockAddRating.mockRejectedValue(new Error('network'))
    renderRatings('user-1', 0, 0, 0, setRating)
    await user.click(screen.getByTestId('star-ratings-rating'))
    // optimistic to 4, then reverted back to the prior value (0)
    expect(setRating).toHaveBeenCalledWith(4)
    await waitFor(() => expect(setRating).toHaveBeenLastCalledWith(0))
    expect(mockToast.error).toHaveBeenCalled()
  })

  it('reverts the cleared star and shows a toast when removeRating fails', async () => {
    const user = userEvent.setup()
    const setRating = vi.fn()
    mockRemoveRating.mockRejectedValue(new Error('network'))
    renderRatings('user-1', 4, 1, 4, setRating)
    await user.click(screen.getByText('Remove rating'))
    // optimistic to 0, then reverted back to the prior rating (4)
    expect(setRating).toHaveBeenCalledWith(0)
    await waitFor(() => expect(setRating).toHaveBeenLastCalledWith(4))
    expect(mockToast.error).toHaveBeenCalled()
  })
})

// ─── ReviewsList ──────────────────────────────────────────────────────────────

describe('ReviewsList', () => {
  const renderReviewsList = ({
    reviewList = [] as typeof baseReview[],
    currUserReview = null as typeof baseReview | null,
    isMoreReviews = false,
    getNextReviewsPage = vi.fn(),
  } = {}) =>
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ReviewsList
          recipeId='recipe-1'
          reviewList={reviewList}
          currUserReview={currUserReview}
          isMoreReviews={isMoreReviews}
          getNextReviewsPage={getNextReviewsPage}
        />
      </QueryClientProvider>
    )

  it('shows "No Reviews" when reviewList is empty and no currUserReview', () => {
    renderReviewsList()
    expect(screen.getByText('No Reviews')).toBeInTheDocument()
  })

  it('does NOT show "No Reviews" when currUserReview exists (even with empty list)', () => {
    renderReviewsList({ currUserReview: baseReview })
    expect(screen.queryByText('No Reviews')).toBeNull()
  })

  it('"Load more reviews" button is visible when isMoreReviews=true', () => {
    renderReviewsList({ isMoreReviews: true })
    expect(screen.getByText('Load more reviews')).toBeInTheDocument()
  })

  it('"Load more reviews" button is absent when isMoreReviews=false', () => {
    renderReviewsList({ isMoreReviews: false })
    expect(screen.queryByText('Load more reviews')).toBeNull()
  })

  it('clicking "Load more reviews" calls getNextReviewsPage', async () => {
    const user = userEvent.setup()
    const getNextReviewsPage = vi.fn()
    renderReviewsList({ isMoreReviews: true, getNextReviewsPage })
    await user.click(screen.getByText('Load more reviews'))
    expect(getNextReviewsPage).toHaveBeenCalledTimes(1)
  })

  it('renders reviews that have reviewText', () => {
    const reviews = [
      { ...baseReview, _id: 'r1', reviewText: 'Great!', username: 'a' },
      { ...baseReview, _id: 'r2', reviewText: '', username: 'b' },
    ]
    renderReviewsList({ reviewList: reviews })
    // The review with text is rendered; ReviewsContainer (not ReviewsList) filters before calling setReviewList
    expect(screen.getByText('Great!')).toBeInTheDocument()
  })
})

// ─── AddReview ───────────────────────────────────────────────────────────────

describe('AddReview', () => {
  const renderAddReview = ({
    uid = null as string | null,
    rating = 0,
    setCurrUserReview = vi.fn(),
  } = {}) =>
    render(
      <MemoryRouter>
        <AddReview
          rating={rating}
          recipeId='recipe-1'
          uid={uid}
          setCurrUserReview={setCurrUserReview}
        />
      </MemoryRouter>
    )

  beforeEach(() => {
    mockNewReview.mockReset()
    mockToast.mockClear()
  })

  it('renders nothing before a rating is given', () => {
    const { container } = renderAddReview({ uid: 'user-1', rating: 0 })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when logged out, even after a rating', () => {
    const { container } = renderAddReview({ uid: null, rating: 4 })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the review textarea once a signed-in user has rated', () => {
    renderAddReview({ uid: 'user-1', rating: 4 })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('submitting review text shorter than 5 chars shows a length error', async () => {
    const user = userEvent.setup()
    renderAddReview({ uid: 'user-1', rating: 4 })
    await user.type(screen.getByRole('textbox'), 'Hi')
    await user.click(screen.getByText('Submit Review'))
    expect(screen.getByText(/5 or more characters/)).toBeInTheDocument()
    expect(mockNewReview).not.toHaveBeenCalled()
  })

  it('submitting valid text ≥ 5 chars calls RecipeAPI.newReview', async () => {
    const user = userEvent.setup()
    mockNewReview.mockResolvedValue(baseReview)
    renderAddReview({ uid: 'user-1', rating: 4 })
    await user.type(screen.getByRole('textbox'), 'Really great recipe!')
    await user.click(screen.getByText('Submit Review'))
    await waitFor(() =>
      expect(mockNewReview).toHaveBeenCalledWith('recipe-1', 'Really great recipe!')
    )
  })

  it('calls setCurrUserReview with the response after successful submit', async () => {
    const user = userEvent.setup()
    const setCurrUserReview = vi.fn()
    mockNewReview.mockResolvedValue(baseReview)
    renderAddReview({ uid: 'user-1', rating: 4, setCurrUserReview })
    await user.type(screen.getByRole('textbox'), 'Really great recipe!')
    await user.click(screen.getByText('Submit Review'))
    await waitFor(() => expect(setCurrUserReview).toHaveBeenCalledWith(baseReview))
  })
})

// ─── RecipeReview ─────────────────────────────────────────────────────────────

describe('RecipeReview', () => {
  const renderRecipeReview = ({
    review = baseReview,
    setCurrUserReview = vi.fn(),
  } = {}) =>
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RecipeReview
          review={review}
          setCurrUserReview={setCurrUserReview}
          recipeId='recipe-1'
        />
      </QueryClientProvider>
    )

  beforeEach(() => {
    mockGetUID.mockReturnValue(null)
    mockGetUsername.mockResolvedValue(null)
    mockEditReview.mockReset()
    mockDeleteReview.mockReset()
  })

  it('displays the reviewer username, review text, and star rating', async () => {
    mockGetUID.mockReturnValue(null)
    renderRecipeReview()
    // reviewText is set from useState(review.reviewText) — immediately visible
    expect(screen.getByText('Really great recipe!')).toBeInTheDocument()
    // username is set in useEffect after mount
    await screen.findByText('@testuser')
    // star-ratings mock renders "{rating} stars" — after useEffect: 4 stars
    await screen.findByText(/4 stars/)
  })

  it('Edit and Delete controls are NOT shown when currUsername does not match author', async () => {
    mockGetUID.mockReturnValue('other-uid')
    mockGetUsername.mockResolvedValue('someone-else')
    renderRecipeReview()
    await screen.findByText('@testuser')
    await waitFor(() => expect(screen.queryByText('Edit')).toBeNull())
    expect(screen.queryByText(/^Delete$/)).toBeNull()
  })

  it('Edit and Delete controls ARE shown when currUsername matches the review author', async () => {
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText('Edit')
    expect(screen.getByText(/^Delete$/)).toBeInTheDocument()
  })

  it('clicking "Edit" enters editing mode with a textarea pre-filled with current text', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText('Edit')
    await user.click(screen.getByText('Edit'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea.value).toBe('Really great recipe!')
  })

  it('clicking "Cancel" exits editing mode and restores the original text', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText('Edit')
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'New text')
    await user.click(screen.getByText('Cancel'))
    expect(screen.getByText('Really great recipe!')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('submitting an edit with identical text does NOT call RecipeAPI.editReview', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText('Edit')
    await user.click(screen.getByText('Edit'))
    // Textarea already shows the original text — submit without changing it
    await user.click(screen.getByText('Submit'))
    expect(mockEditReview).not.toHaveBeenCalled()
  })

  it('submitting edit text shorter than 5 chars does NOT call RecipeAPI.editReview', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText('Edit')
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Hi')
    await user.click(screen.getByText('Submit'))
    expect(mockEditReview).not.toHaveBeenCalled()
  })

  it('submitting a valid edit calls RecipeAPI.editReview and updates the displayed text', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    mockEditReview.mockResolvedValue(undefined)
    renderRecipeReview()
    await screen.findByText('Edit')
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Updated review text here')
    await user.click(screen.getByText('Submit'))
    await waitFor(() =>
      expect(mockEditReview).toHaveBeenCalledWith('recipe-1', 'Updated review text here')
    )
    await screen.findByText('Updated review text here')
  })

  it('clicking "Delete" opens the confirmation modal', async () => {
    const user = userEvent.setup()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    renderRecipeReview()
    await screen.findByText(/^Delete$/)
    await user.click(screen.getByText(/^Delete$/))
    expect(
      screen.getByText('Are you sure you want to delete your review?')
    ).toBeInTheDocument()
  })

  it('confirming deletion calls deleteReview and setCurrUserReview(null)', async () => {
    const user = userEvent.setup()
    const setCurrUserReview = vi.fn()
    mockGetUID.mockReturnValue('author-uid')
    mockGetUsername.mockResolvedValue('testuser')
    mockDeleteReview.mockResolvedValue(undefined)
    renderRecipeReview({ setCurrUserReview })

    // Wait for Edit/Delete controls to appear
    await screen.findByText(/^Delete$/)
    // Open the confirmation modal
    await user.click(screen.getByText(/^Delete$/))
    await screen.findByText('Are you sure you want to delete your review?')

    // The modal Delete button is the last 'Delete' in the DOM (portal renders after main tree)
    const deleteButtons = screen.getAllByText(/^Delete$/)
    await user.click(deleteButtons[deleteButtons.length - 1])

    await waitFor(() => expect(mockDeleteReview).toHaveBeenCalledWith('recipe-1'))
    await waitFor(() => expect(setCurrUserReview).toHaveBeenCalledWith(null))
  })

  // ─── Reviewer avatar (photoURL vs. DefaultAvatar fallback) ─────────────────

  it('renders an <img> avatar when the review has a photoURL', () => {
    const review = {
      ...baseReview,
      photoURL: 'https://example.com/a.jpg',
      displayName: 'Photo User',
    }
    const { container } = renderRecipeReview({ review })
    const img = container.querySelector('img.avatar')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg')
    expect(container.querySelector('.default-avatar')).toBeNull()
  })

  it('falls back to DefaultAvatar when the <img> avatar fails to load', () => {
    const review = {
      ...baseReview,
      photoURL: 'https://example.com/broken.jpg',
      displayName: 'Photo User',
    }
    const { container } = renderRecipeReview({ review })
    const img = container.querySelector('img.avatar') as HTMLImageElement
    expect(img).not.toBeNull()

    fireEvent.error(img)

    expect(container.querySelector('img.avatar')).toBeNull()
    expect(container.querySelector('.default-avatar')).not.toBeNull()
  })

  it('renders DefaultAvatar (no <img> avatar) when photoURL is null', () => {
    const review = { ...baseReview, photoURL: null, displayName: null }
    const { container } = renderRecipeReview({ review })
    expect(container.querySelector('img.avatar')).toBeNull()
    expect(container.querySelector('.default-avatar')).not.toBeNull()
  })
})
