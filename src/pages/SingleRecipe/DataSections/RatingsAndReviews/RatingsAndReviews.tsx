import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ReviewType } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import Ratings from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Ratings/Ratings'
import ReviewsContainer from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsContainer'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { formatRating } from 'src/util/formatRating'

import './RatingsAndReviews.scss'

type RatingsAndReviewsProps = {
  recipeId: string
  ratingVal: number
  ratingCount: number
  currUserReview: ReviewType | null
  setCurrUserReview: (val: ReviewType | null) => void
  isOwner?: boolean
}

const RatingsAndReviews: FC<RatingsAndReviewsProps> = ({
  recipeId,
  ratingVal,
  ratingCount,
  currUserReview,
  setCurrUserReview,
  isOwner = false,
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
      <div className='rr-header'>
        <h2 className='title'>Ratings &amp; Reviews</h2>
        {ratingCount > 0 && (
          <div className='rr-avg'>
            <div className='big'>{formatRating(ratingVal, ratingCount)}</div>
            <div className='rr-avg-meta'>
              <div className='stars'>
                <StarRating rating={Number(ratingVal) || 0} size={16} />
              </div>
              <div className='count'>
                {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className='ratings-reviews-container'>
        {isOwner ? (
          <div className='owner-review-note'>
            This is your recipe — you can’t leave a rating or review.
          </div>
        ) : (
          <Ratings
            rating={rating}
            setRating={setRating}
            ratingCount={ratingCount}
            ratingVal={ratingVal}
            recipeId={recipeId}
          />
        )}
        <ReviewsContainer
          currUserReview={currUserReview}
          setCurrUserReview={setCurrUserReview}
          rating={rating}
          recipeId={recipeId}
          isOwner={isOwner}
        />
      </div>
    </div>
  )
}

export default RatingsAndReviews
