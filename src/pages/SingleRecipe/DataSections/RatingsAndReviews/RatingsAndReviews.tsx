import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RatingAggregate, ReviewType } from 'types'
import { ChevronDownIcon } from 'src/Components/icons'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { usePaginatedLoadMore } from 'src/pages/Account/usePaginatedLoadMore'
import RatingSummary from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingSummary'
import ReviewComposer from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewComposer'
import OwnReviewCard from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/OwnReviewCard'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'
import ReviewCardSkeleton from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewCardSkeleton'

import './RatingsAndReviews.scss'

const REVIEWS_PER_PAGE = 5

type ReviewSort = 'new' | 'top'

type RatingsAndReviewsProps = {
  recipeId: string
  rating: RatingAggregate | undefined
  isOwner?: boolean
}

/**
 * The Ratings & Reviews section: an invitation to participate leads (composer,
 * or your posted review once you have one), then the score summary strip, then
 * the public review list with New/Top sorting. The user's own rating/review
 * state comes from the ['check-made'] query — no prop-drilled review state.
 */
const RatingsAndReviews: FC<RatingsAndReviewsProps> = ({
  recipeId,
  rating,
  isOwner = false,
}) => {
  const uid = AuthAPI.getUID()
  const [sort, setSort] = useState<ReviewSort>('new')

  const { data: ownReview } = useQuery({
    queryKey: ['check-made', recipeId],
    queryFn: () => RecipeAPI.checkIfReviewed(recipeId),
    enabled: !!uid,
  })
  const hasOwnReview = !!ownReview?.reviewText

  const {
    items: reviews,
    isLoading,
    showSkeleton,
    isError,
    isMore,
    totalCount,
    showList,
    loadMore,
    reset,
  } = usePaginatedLoadMore<ReviewType>({
    queryKey: page => ['reviews', recipeId, sort, page],
    queryFn: async page => {
      const res = await RecipeAPI.getReviews(recipeId, sort, page, REVIEWS_PER_PAGE)
      return res ? { items: res.reviews, totalCount: res.totalCount } : null
    },
  })

  const changeSort = (next: ReviewSort) => {
    if (next === sort) return
    setSort(next)
    reset()
  }

  // The user's own review renders in the invitation slot, not the list.
  const publicReviews = reviews.filter(r => !r.isCurrentUser)
  // Facepile identities for the summary strip, from the loaded reviews.
  const reviewers = reviews.map(r => ({
    username: r.username,
    photoURL: r.photoURL,
  }))

  const aggregate: RatingAggregate = rating ?? { rateCount: 0, rateValue: 0 }

  const renderInvitationSlot = () => {
    if (isOwner) {
      return (
        <div className='owner-review-note'>
          This is your recipe — you can’t leave a rating or review.
        </div>
      )
    }
    if (!uid) {
      return (
        <div className='rr-invite rr-signedout'>
          <h3 className='rr-invite-title'>How did it turn out?</h3>
          <p className='rr-invite-sub'>
            Sign in to rate this recipe or write a review.
          </p>
          <Link to='/login' className='rr-signin'>
            Sign in to rate
          </Link>
        </div>
      )
    }
    if (hasOwnReview && ownReview) {
      return <OwnReviewCard recipeId={recipeId} review={ownReview} />
    }
    return <ReviewComposer recipeId={recipeId} />
  }

  return (
    <div className='recipe-ratings' id='recipeReviews'>
      <h2 className='title'>Ratings &amp; Reviews</h2>

      {renderInvitationSlot()}

      <RatingSummary rating={aggregate} reviewers={reviewers} />

      {totalCount > 0 && (
        <div className='rr-toolbar'>
          <span className='rr-n'>
            {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
          </span>
          <div className='rr-pills' role='group' aria-label='Sort reviews'>
            {(['new', 'top'] as const).map(s => (
              <button
                key={s}
                type='button'
                className={sort === s ? 'on' : ''}
                aria-pressed={sort === s}
                onClick={() => changeSort(s)}
              >
                {s === 'new' ? 'New' : 'Top'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className='rr-list'>
        {showList ? (
          <>
            {publicReviews.map(review => (
              <RecipeReview
                key={review._id}
                review={review}
                recipeId={recipeId}
              />
            ))}
            {showSkeleton && publicReviews.length === 0 && (
              <ReviewCardSkeleton count={2} />
            )}
          </>
        ) : isError ? (
          // Error is not empty: a failed fetch must not read as "no reviews".
          // Same lightweight treatment as the Home sections' inline error copy.
          <div className='rr-empty'>
            <p>Couldn’t load reviews. Please try again later.</p>
          </div>
        ) : (
          <div className='rr-empty'>
            {uid && !isOwner ? (
              <p>No reviews yet — be the first to share how it turned out.</p>
            ) : (
              <p>No reviews yet.</p>
            )}
          </div>
        )}
        {isMore && !isLoading && (
          <div className='get-more-reviews'>
            <button className='load-more-btn' onClick={loadMore}>
              Load more reviews <ChevronDownIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RatingsAndReviews
