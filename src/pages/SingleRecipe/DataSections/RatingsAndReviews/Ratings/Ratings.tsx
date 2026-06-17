import React, { FC } from 'react'
import { BsStar } from 'react-icons/bs'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import StarRating from 'src/Components/StarRating/StarRating'
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
  const queryClient = useQueryClient()
  const uid = AuthAPI.getUID()

  // After a rating change, refresh the recipe aggregate (the displayed
  // "Average Rating") and the user's own rating so both reflect the server
  // recompute rather than the stale page-load value.
  const refreshRatingViews = () => {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
  }

  const changeRating = async (e: number) => {
    setRating(e)
    await RecipeAPI.addRating(recipeId, e)
    refreshRatingViews()
  }

  const handleRemoveRating = async () => {
    setRating(0)
    await RecipeAPI.removeRating(recipeId)
    refreshRatingViews()
  }

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
      <div className='user-rating rate-card'>
        <span className='rate-heading'>Rate this recipe</span>
        <div className='user-rate-container'>
          {uid ? (
            <div className='rate-active'>
              <StarRating
                rating={rating}
                size={24}
                spacing={2}
                interactive={true}
                onChange={changeRating}
              />
              <span className='rate-hint'>{rating > 0 ? `${rating} / 5` : 'Tap a star'}</span>
              {rating > 0 && (
                <button
                  type='button'
                  className='remove-rating'
                  onClick={handleRemoveRating}
                >
                  Remove rating
                </button>
              )}
            </div>
          ) : (
            <Link to='/login' className='signin-rate'>
              <StarRating rating={0} size={24} spacing={2} />
              <span className='text signin-label'>Sign In To Rate</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ratings
