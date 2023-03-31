import React, { FC } from 'react'
import { BsStar } from 'react-icons/bs'
import { Link } from 'react-router-dom'
import StarRatings from 'react-star-ratings'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { formatRating } from 'src/util/formatRating'

type RatingsProps = {
  rating: number
  setRating: (val: number) => void
  ratingVal: number
  ratingCount: number
  recipeId: string
}

const Ratings: FC<RatingsProps> = ({
  rating,
  setRating,
  ratingVal,
  ratingCount,
  recipeId,
}) => {
  const changeRating = (e: any) => {
    RecipeAPI.addRating(recipeId, e)
    setRating(e)
  }

  const uid = AuthAPI.getUID()

  return (
    <div className='overview'>
      <div className='average-rating-container'>
        <span className='text'>Average Rating:</span>
        <div className='average-rating'>
          <BsStar className='icon' />
          <div className='number'>
            {Number(ratingVal) === 0
              ? '0'
              : formatRating(ratingVal, ratingCount)}
          </div>
          <span className='count'>({ratingCount})</span>
        </div>
      </div>
      <div className='user-rating'>
        <span className='text'>Your Rating:</span>
        <div className='user-rate-container'>
          {uid ? (
            <StarRatings
              rating={rating}
              starRatedColor='#ff5722'
              changeRating={changeRating}
              numberOfStars={5}
              starDimension='30px'
              starSpacing='2px'
              name='rating'
              tabIndex={1}
            />
          ) : (
            <Link to='/login' className='text'>
              Sign In To Rate
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ratings
