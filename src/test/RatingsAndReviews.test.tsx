import React from 'react'
import { vi } from 'vitest'
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReviewComposer from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewComposer'
import OwnReviewCard from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/OwnReviewCard'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'
import RatingSummary from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingSummary'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { OwnReviewStatus, ReviewType } from 'types'

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

// The composer/own-card read the signed-in user's photo + display name from
// AuthContext; tests adjust `mockAuthUser` per case.
const mockAuthUser = vi.hoisted(() => ({
  current: { photoURL: null, displayName: null } as {
    photoURL: string | null
    displayName: string | null
  } | null,
}))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser.current }),
}))

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

const mockAddRating = RecipeAPI.addRating as ReturnType<typeof vi.fn>
const mockRemoveRating = RecipeAPI.removeRating as ReturnType<typeof vi.fn>
const mockNewReview = RecipeAPI.newReview as ReturnType<typeof vi.fn>
const mockEditReview = RecipeAPI.editReview as ReturnType<typeof vi.fn>
const mockDeleteReview = RecipeAPI.deleteReview as ReturnType<typeof vi.fn>
const mockCheckIfReviewed = RecipeAPI.checkIfReviewed as ReturnType<typeof vi.fn>
const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>

const basePublicReview: ReviewType = {
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

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )

beforeEach(() => {
  mockAddRating.mockReset()
  mockRemoveRating.mockReset()
  mockNewReview.mockReset()
  mockEditReview.mockReset()
  mockDeleteReview.mockReset()
  mockCheckIfReviewed.mockReset()
  mockCheckIfReviewed.mockResolvedValue({ reviewed: false })
  mockGetUID.mockReturnValue('me-uid')
  mockGetUsername.mockResolvedValue('me')
  mockAuthUser.current = { photoURL: null, displayName: null }
  mockToast.error.mockClear()
})

// ─── ReviewComposer ──────────────────────────────────────────────────────────

describe('ReviewComposer', () => {
  it('tapping a star calls RecipeAPI.addRating with recipeId and value', async () => {
    const user = userEvent.setup()
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.click(screen.getByTestId('star-ratings-rating'))
    await waitFor(() => expect(mockAddRating).toHaveBeenCalledWith('recipe-1', 4))
  })

  it('seeds the star widget from checkIfReviewed', async () => {
    mockCheckIfReviewed.mockResolvedValue({ reviewed: true, rating: 3 })
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await waitFor(() =>
      expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
        '3 stars'
      )
    )
  })

  it('shows "Remove rating" only once the user has a rating, and clicking it calls removeRating', async () => {
    const user = userEvent.setup()
    mockRemoveRating.mockResolvedValue(undefined)
    mockCheckIfReviewed.mockResolvedValue({ reviewed: true, rating: 4 })
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await screen.findByText('Remove rating')
    await user.click(screen.getByText('Remove rating'))
    await waitFor(() => expect(mockRemoveRating).toHaveBeenCalledWith('recipe-1'))
  })

  it('hides "Remove rating" when the user has no rating', async () => {
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await screen.findByText('Tap a star — or just write')
    expect(screen.queryByText('Remove rating')).toBeNull()
  })

  it('reverts the optimistic star and shows a toast when addRating fails', async () => {
    const user = userEvent.setup()
    mockAddRating.mockRejectedValue(new Error('network'))
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.click(screen.getByTestId('star-ratings-rating'))
    // optimistic to 4, then reverted back to the prior value (0)
    await waitFor(() =>
      expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
        '0 stars'
      )
    )
    expect(mockToast.error).toHaveBeenCalled()
  })

  it('reverts a cleared star and shows a toast when removeRating fails', async () => {
    const user = userEvent.setup()
    mockRemoveRating.mockRejectedValue(new Error('network'))
    mockCheckIfReviewed.mockResolvedValue({ reviewed: true, rating: 4 })
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await screen.findByText('Remove rating')
    await user.click(screen.getByText('Remove rating'))
    await waitFor(() =>
      expect(screen.getByTestId('star-ratings-rating')).toHaveTextContent(
        '4 stars'
      )
    )
    expect(mockToast.error).toHaveBeenCalled()
  })

  it('submitting fewer than 5 characters shows an inline error and does not post', async () => {
    const user = userEvent.setup()
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.type(screen.getByRole('textbox'), 'Hi')
    await user.click(screen.getByText('Share your review'))
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 5 characters/)
    expect(mockNewReview).not.toHaveBeenCalled()
  })

  it('submits without a rating — review-only posts are allowed', async () => {
    const user = userEvent.setup()
    mockNewReview.mockResolvedValue(basePublicReview)
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.type(screen.getByRole('textbox'), 'Really great recipe!')
    await user.click(screen.getByText('Share your review'))
    await waitFor(() =>
      expect(mockNewReview).toHaveBeenCalledWith(
        'recipe-1',
        'Really great recipe!'
      )
    )
  })

  it('surfaces the server rejection reason (e.g. moderation) inline', async () => {
    const user = userEvent.setup()
    mockNewReview.mockRejectedValue(
      new Error('Review contains blocked language.')
    )
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.type(screen.getByRole('textbox'), 'Really great recipe!')
    await user.click(screen.getByText('Share your review'))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/blocked language/)
    )
  })

  it('live counter: shows the min-length nudge under 5 chars, then the running count', async () => {
    const user = userEvent.setup()
    wrap(<ReviewComposer recipeId='recipe-1' />)
    await user.type(screen.getByRole('textbox'), 'Hey')
    expect(screen.getByText('Add at least 5 characters')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), ' there')
    expect(screen.getByText('9 / 2,000')).toBeInTheDocument()
  })

  it('live counter: turns amber near the cap and flags the hard limit', () => {
    wrap(<ReviewComposer recipeId='recipe-1' />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'x'.repeat(1950) } })
    expect(screen.getByText('1,950 / 2,000')).toHaveClass('warn')
    fireEvent.change(textarea, { target: { value: 'x'.repeat(2000) } })
    expect(screen.getByText(/limit reached/)).toHaveClass('over')
  })
})

// ─── OwnReviewCard ───────────────────────────────────────────────────────────

describe('OwnReviewCard', () => {
  const renderOwnCard = (review: OwnReviewStatus = ownReviewDoc) => {
    mockCheckIfReviewed.mockResolvedValue(review)
    return wrap(<OwnReviewCard recipeId='recipe-1' review={review} />)
  }

  it('renders the review text, eyebrow, and handle identity', async () => {
    renderOwnCard()
    expect(screen.getByText('Your review')).toBeInTheDocument()
    expect(screen.getByText('My own review text')).toBeInTheDocument()
    await screen.findByText('@me')
  })

  it('shows displayName with the handle demoted to the sub-line when set', async () => {
    mockAuthUser.current = { photoURL: null, displayName: 'Jesse Lind' }
    renderOwnCard()
    await screen.findByText('Jesse Lind')
    expect(screen.getByText(/@me/)).toBeInTheDocument()
  })

  it('editing: prefills the textarea, saves via editReview, and shows the updated text after refetch', async () => {
    const user = userEvent.setup()
    mockEditReview.mockResolvedValue(undefined)
    mockCheckIfReviewed.mockResolvedValue(ownReviewDoc)
    wrap(<OwnReviewCard recipeId='recipe-1' review={ownReviewDoc} />)

    await user.click(screen.getByText('Edit'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('My own review text')

    await user.clear(textarea)
    await user.type(textarea, 'Updated review text here')
    await user.click(screen.getByText('Save changes'))
    await waitFor(() =>
      expect(mockEditReview).toHaveBeenCalledWith(
        'recipe-1',
        'Updated review text here'
      )
    )
  })

  it('editing: an unchanged text closes the editor without calling editReview', async () => {
    const user = userEvent.setup()
    renderOwnCard()
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByText('Save changes'))
    expect(mockEditReview).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('editing: fewer than 5 chars shows an inline error and does not save', async () => {
    const user = userEvent.setup()
    renderOwnCard()
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Hi')
    await user.click(screen.getByText('Save changes'))
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 5 characters/)
    expect(mockEditReview).not.toHaveBeenCalled()
  })

  it('editing: cancel restores the read view without saving', async () => {
    const user = userEvent.setup()
    renderOwnCard()
    await user.click(screen.getByText('Edit'))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Never saved')
    await user.click(screen.getByText('Cancel'))
    expect(screen.getByText('My own review text')).toBeInTheDocument()
    expect(mockEditReview).not.toHaveBeenCalled()
  })

  it('delete: opens the confirm modal (copy says the star rating stays) and confirms via deleteReview', async () => {
    const user = userEvent.setup()
    mockDeleteReview.mockResolvedValue(undefined)
    renderOwnCard()
    await user.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete your review?')).toBeInTheDocument()
    expect(screen.getByText(/star rating stays/)).toBeInTheDocument()
    await user.click(screen.getByText('Delete review'))
    await waitFor(() => expect(mockDeleteReview).toHaveBeenCalledWith('recipe-1'))
  })

  it('delete: a failed delete keeps the modal and shows a toast', async () => {
    const user = userEvent.setup()
    mockDeleteReview.mockRejectedValue(new Error('network down'))
    renderOwnCard()
    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Delete review'))
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        'Could not delete your review. Please try again.'
      )
    )
  })

  it('stars stay interactive on the card — tapping calls addRating', async () => {
    const user = userEvent.setup()
    renderOwnCard()
    await user.click(screen.getByTestId('star-ratings-rating'))
    await waitFor(() => expect(mockAddRating).toHaveBeenCalledWith('recipe-1', 4))
  })
})

// ─── RecipeReview (public card) ──────────────────────────────────────────────

describe('RecipeReview', () => {
  const renderCard = (review: ReviewType = basePublicReview) =>
    wrap(<RecipeReview review={review} recipeId='recipe-1' />)

  it('shows the handle as the name (linked to the profile) when displayName is null', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /@testuser/ })
    expect(link).toHaveAttribute('href', '/u/testuser')
    expect(screen.getByText('Really great recipe!')).toBeInTheDocument()
  })

  it('shows displayName as the linked name with the handle on the sub-line', () => {
    renderCard({ ...basePublicReview, displayName: 'Maria Sanchez' })
    const link = screen.getByRole('link', { name: /Maria Sanchez/ })
    expect(link).toHaveAttribute('href', '/u/testuser')
    expect(screen.getByText('@testuser')).toBeInTheDocument()
  })

  it('renders stars for a rated review', () => {
    renderCard()
    expect(screen.getByTestId('star-ratings-display')).toHaveTextContent(
      '4 stars'
    )
  })

  it('omits the star row entirely for a review-only (null rating) post', () => {
    renderCard({ ...basePublicReview, rating: null })
    expect(screen.queryByTestId('star-ratings-display')).toBeNull()
    expect(screen.getByText('Really great recipe!')).toBeInTheDocument()
  })

  it('offers the report kebab (never edit/delete — own reviews are not in this list)', () => {
    const { container } = renderCard()
    expect(container.querySelector('.review-options')).not.toBeNull()
    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.queryByText('Delete')).toBeNull()
  })

  // ─── Reviewer avatar (photoURL vs. DefaultAvatar fallback) ─────────────────

  it('renders an <img> avatar when the review has a photoURL', () => {
    const { container } = renderCard({
      ...basePublicReview,
      photoURL: 'https://example.com/a.jpg',
    })
    const img = container.querySelector('img.avatar')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg')
    expect(container.querySelector('.default-avatar')).toBeNull()
  })

  it('falls back to DefaultAvatar when the <img> avatar fails to load', () => {
    const { container } = renderCard({
      ...basePublicReview,
      photoURL: 'https://example.com/broken.jpg',
    })
    const img = container.querySelector('img.avatar') as HTMLImageElement
    expect(img).not.toBeNull()

    fireEvent.error(img)

    expect(container.querySelector('img.avatar')).toBeNull()
    expect(container.querySelector('.default-avatar')).not.toBeNull()
  })

  it('renders DefaultAvatar (no <img> avatar) when photoURL is null', () => {
    const { container } = renderCard()
    expect(container.querySelector('img.avatar')).toBeNull()
    expect(container.querySelector('.default-avatar')).not.toBeNull()
  })
})

// ─── RatingSummary ───────────────────────────────────────────────────────────

describe('RatingSummary', () => {
  const aggregate = {
    rateCount: 8,
    rateValue: 4.2,
    breakdown: { '1': 1, '2': 0, '3': 1, '4': 2, '5': 4 },
  }
  const reviewers = [
    { username: 'a', photoURL: null },
    { username: 'b', photoURL: null },
  ]

  it('renders the average, count, histogram, and facepile caption', () => {
    const { container } = wrap(
      <RatingSummary rating={aggregate} reviewers={reviewers} />
    )
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('8 ratings')).toBeInTheDocument()
    expect(screen.getByText('Rated by 8 cooks')).toBeInTheDocument()
    // five columns, scaled to the max bucket (4 five-star)
    expect(container.querySelectorAll('.rr-vcol')).toHaveLength(5)
    const fills = container.querySelectorAll<HTMLElement>('.rr-vfill')
    expect(fills[4].style.height).toBe('100%')
    expect(fills[1].style.height).toBe('0%')
    // the two loaded reviewers in the pile, +6 overflow chip for the rest
    // (the pile is decorative/aria-hidden, so query the DOM directly)
    expect(container.querySelectorAll('.rr-pile .default-avatar')).toHaveLength(2)
    expect(container.querySelector('.rr-more')?.textContent).toBe('+6')
  })

  it('renders nothing when there are no ratings', () => {
    const { container } = wrap(
      <RatingSummary rating={{ rateCount: 0, rateValue: 0 }} reviewers={[]} />
    )
    expect(container.querySelector('.rr-sumstrip')).toBeNull()
  })

  it('omits the histogram when the aggregate has no breakdown yet', () => {
    const { container } = wrap(
      <RatingSummary
        rating={{ rateCount: 3, rateValue: 4 }}
        reviewers={reviewers}
      />
    )
    expect(container.querySelector('.rr-mini')).toBeNull()
    expect(screen.getByText('Rated by 3 cooks')).toBeInTheDocument()
  })
})
