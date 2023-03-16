import React, { FC } from 'react'
import { ReviewType } from 'types'
import RecipeReview from './RecipeReview/RecipeReview'

type ReviewsListProps = {
  recipeId: string
  reviewList: ReviewType[]
  currUserReview: ReviewType | null
  isMoreReviews: boolean
  getNextReviewsPage: (recipeId: string) => void
}

const ReviewsList: FC<ReviewsListProps> = ({
  recipeId,
  reviewList,
  currUserReview,
  isMoreReviews,
  getNextReviewsPage,
}) => {
  return (
    <div className='reviews-list-container'>
      {reviewList.length > 0 ? (
        reviewList.map(review => {
          return <RecipeReview key={review._id} review={review} />
        })
      ) : !currUserReview ? (
        <div className='no-reviews'>No Reviews</div>
      ) : null}
      {isMoreReviews && (
        <div className='get-more-reviews'>
          <button
            className='get-more-reviews-btn btn'
            onClick={() => getNextReviewsPage(recipeId)}
          >
            More Reviews
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewsList
