import React, { FC, useEffect, useState } from 'react'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { ReviewType } from 'types'
import AddReview from './AddReview'
import RecipeReview from './RecipeReview/RecipeReview'
import ReviewFilters from './ReviewFilters'
import ReviewsList from './ReviewsList'

const recipesPerPage = 5

type ReviewsContainerProps = {
  currUserReview: ReviewType | null
  setCurrUserReview: (val: ReviewType | null) => void
  rating: number
  recipeId: string
}

const ReviewsContainer: FC<ReviewsContainerProps> = ({
  currUserReview,
  setCurrUserReview,
  rating,
  recipeId,
}) => {
  const [reviewList, setReviewList] = useState<ReviewType[]>([])
  const [reviewListPage, setReviewListPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)
  const [reviewListSort, setReviewListSort] = useState<string>('')

  const handleGetUserReviews = (recipesPage: number, selectValue: string) => {
    if (recipesPage >= 0 && selectValue) {
      RecipeAPI.getReviews(recipeId, selectValue, recipesPage, recipesPerPage)
        .then(res => {
          if (res) {
            const updatedArr =
              recipesPage === 0
                ? [...res.reviews]
                : [...reviewList, ...res.reviews]
            // Remove elements that are only ratings and not reviews
            const reviewArr = updatedArr.filter(review => review.reviewText)
            console.log(reviewArr)
            setReviewList(reviewArr)

            if (Number(res.totalCount) > updatedArr.length) {
              setIsMoreReviews(true)
            } else {
              setIsMoreReviews(false)
            }
          }
          setReviewListPage(reviewListPage + 1)
        })
        .catch((error: any) => console.log(error))
    }
  }

  const uid = AuthAPI.getUID()

  useEffect(() => {
    if (reviewListSort && uid) {
      setReviewListPage(0)
      handleGetUserReviews(0, reviewListSort)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewListSort, uid])

  return (
    <div className='reviews'>
      <div className='leave-review-input-container'>
        {!currUserReview ? (
          <AddReview
            rating={rating}
            recipeId={recipeId}
            uid={uid}
            setCurrUserReview={setCurrUserReview}
          />
        ) : (
          <div className='curr-user-review'>
            <h4 className='heading'>Your Review:</h4>
            <RecipeReview
              review={currUserReview}
              setCurrUserReview={setCurrUserReview}
              recipeId={recipeId}
            />
          </div>
        )}
      </div>
      <div className='review-filters'>
        <ReviewFilters
          reviewListSort={reviewListSort}
          setReviewListSort={setReviewListSort}
          isList={reviewList.length > 0}
        />
      </div>
      <ReviewsList
        recipeId={recipeId}
        currUserReview={currUserReview}
        getNextReviewsPage={() =>
          handleGetUserReviews(reviewListPage, reviewListSort)
        }
        isMoreReviews={isMoreReviews}
        reviewList={reviewList}
      />
    </div>
  )
}

export default ReviewsContainer
