import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReviewType } from 'types'
import Ratings from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings'
import ReviewsContainer from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer'
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

const RatingsAndReviews: FC<RatingsAndReviewsProps> = ({
  recipeId,
  ratingVal,
  ratingCount,
  currUserReview,
  setCurrUserReview,
}) => {
  const [rating, setRating] = useState(0)

  const uid = AuthAPI.getUID()

  const { data: checkData } = useQuery({
    queryKey: ['check-made', recipeId],
    queryFn: () => RecipeAPI.checkIfReviewed(recipeId),
    enabled: !!uid,
  })

  useEffect(() => {
    if (checkData === undefined) return
    const userRating = checkData?.rating
    if (!isNaN(userRating)) {
      setRating(Number(userRating))
    }
    const reviewData = checkData?.reviewText ? checkData : null
    setCurrUserReview(reviewData ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkData])

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
