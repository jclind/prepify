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

  const getNextReviewsPage = (recipeId: string) => {
    RecipeAPI.getReviews(recipeId, 'new', reviewListPage + 1, recipesPerPage)
      .then(res => {
        const updatedArr: ReviewType[] = [...reviewList, ...res?.data.reviews]
        setReviewList(updatedArr)
        if (res?.data.totalCount > updatedArr.length) {
          setIsMoreReviews(true)
        } else {
          setIsMoreReviews(false)
        }
      })
      .catch((error: any) => {
        console.log(error)
      })
    setReviewListPage(reviewListPage + 1)
  }

  const uid = AuthAPI.getUID()

  useEffect(() => {
    if (reviewListSort && uid) {
      setReviewListPage(0)
      RecipeAPI.getReviews(recipeId, reviewListSort, 0, recipesPerPage).then(
        res => {
          if (res) {
            const updatedArr = res.reviews || []
            setReviewList(updatedArr)

            if (res.totalCount > updatedArr.length) {
              setIsMoreReviews(true)
            } else {
              setIsMoreReviews(false)
            }
          }
        }
      )
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
        getNextReviewsPage={getNextReviewsPage}
        isMoreReviews={isMoreReviews}
        reviewList={reviewList}
      />
    </div>
  )
}

export default ReviewsContainer
