import React, { useEffect, useState } from 'react'
import { ReviewType } from 'types'
import Ratings from './Ratings/Ratings'
import ReviewsContainer from './Reviews/ReviewsContainer'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'

import './RatingsAndReviews.scss'

type RatingsAndReviewsProps = {
  recipeId: string
  ratingVal: number
  ratingCount: number
  currUserReview: ReviewType | null
  setCurrUserReview: (val: ReviewType | null) => void
}

const RatingsAndReviews = ({
  recipeId,
  ratingVal,
  ratingCount,
  currUserReview,
  setCurrUserReview,
}: RatingsAndReviewsProps) => {
  const [rating, setRating] = useState(0)

  const uid = AuthAPI.getUID()

  useEffect(() => {
    if (uid) {
      RecipeAPI.checkIfReviewed(recipeId).then(res => {
        const userRating = res?.rating
        if (!isNaN(userRating)) {
          setRating(Number(userRating))
        }
        const reviewData = res?.reviewText ? res : null
        setCurrUserReview(reviewData ?? null)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  return (
    <div className='recipe-ratings' id='recipeReviews'>
      <h2 className='title'>Ratings & Reviews</h2>
      <div className='ratings-reviews-container'>
        <Ratings
          rating={rating}
          setRating={setRating}
          ratingCount={ratingCount}
          ratingVal={ratingVal}
          recipeId={recipeId}
        />
        <ReviewsContainer
          currUserReview={currUserReview}
          setCurrUserReview={setCurrUserReview}
          rating={rating}
          recipeId={recipeId}
        />
      </div>
    </div>
  )
}

export default RatingsAndReviews
