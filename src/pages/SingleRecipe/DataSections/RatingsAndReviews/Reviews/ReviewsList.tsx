import React, { FC } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { ReviewType } from 'types'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'

const skeletonColor = '#d6d6d6'

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
  return (
    <div className='reviews-list-container'>
      {reviewList.length > 0 ? (
        reviewList.map(review => {
          return (
            <RecipeReview
              key={review._id}
              review={review}
              recipeId={recipeId}
            />
          )
        })
      ) : loading ? (
        <>
          <Skeleton baseColor={skeletonColor} height={80} />
          <Skeleton baseColor={skeletonColor} height={80} />
        </>
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
