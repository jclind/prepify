import React, { FC } from 'react'
import { ReviewType } from 'types'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'
import ReviewCardSkeleton from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewCardSkeleton'

type ReviewsListProps = {
  recipeId: string
  reviewList: ReviewType[]
  currUserReview: ReviewType | null
  isMoreReviews: boolean
  getNextReviewsPage: () => void
  loading?: boolean
}

const ReviewsList: FC<ReviewsListProps> = ({
  recipeId,
  reviewList,
  currUserReview,
  isMoreReviews,
  getNextReviewsPage,
  loading = false,
}) => {
  // Per docs/design/loading-states.md: keep `loading` as the gate (so "No Reviews"
  // never flashes mid-load) but only paint the skeleton once the load is slow
  // enough to warrant one.
  const showSkeleton = useDelayedLoading(loading)

  const reviewSkeletons = showSkeleton ? <ReviewCardSkeleton count={2} /> : null

  return (
    <div className='reviews-list-container'>
      {reviewList.length > 0 ? (
        reviewList.map(review => (
          <RecipeReview key={review._id} review={review} recipeId={recipeId} />
        ))
      ) : loading ? (
        reviewSkeletons
      ) : !currUserReview ? (
        <div className='no-reviews'>No Reviews</div>
      ) : null}
      {isMoreReviews && (
        <div className='get-more-reviews'>
          <button
            className='get-more-reviews-btn btn btn--ghost'
            onClick={getNextReviewsPage}
          >
            More Reviews
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewsList
