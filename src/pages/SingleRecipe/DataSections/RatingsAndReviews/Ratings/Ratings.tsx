import { StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
  // Monotonic id of the most recent rating change. Keyboard nav (arrow-key
  // hold / OS key-repeat) can fire several changeRating calls before any
  // resolves, so responses may land out of order. We only let a request touch
  // the UI if it's still the latest — otherwise a slow earlier request's
  // failure would revert to a stale value the user already moved past.
  const latestReqRef = useRef(0)

  // After a rating change, refresh the recipe aggregate (the displayed
  // "Average Rating") and the user's own rating so both reflect the server
  // recompute rather than the stale page-load value.
  const refreshRatingViews = () => {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
  }

  const changeRating = async (e: number) => {
    // Optimistic: show the new star immediately, but revert if the server
    // rejects (e.g. a suspended account hitting requireActive, or a network
    // failure) so the UI never shows a rating that wasn't actually saved.
    const prev = rating
    const reqId = ++latestReqRef.current
    setRating(e)
    try {
      await RecipeAPI.addRating(recipeId, e)
    } catch (err) {
      // Superseded by a newer change — leave that one's value in place.
      if (latestReqRef.current !== reqId) return
      setRating(prev)
      toast.error('Could not save your rating. Please try again.')
      return
    }
    // Only the latest change should refetch; a stale success would pull the
    // aggregate mid-flight and fight the newer optimistic value.
    if (latestReqRef.current === reqId) refreshRatingViews()
  }

  const handleRemoveRating = async () => {
    const prev = rating
    setRating(0)
    try {
      await RecipeAPI.removeRating(recipeId)
    } catch (err) {
      setRating(prev)
      toast.error('Could not remove your rating. Please try again.')
      return
    }
    refreshRatingViews()
  }

  return (
    <div className='overview'>
      <div className='average-rating-container'>
        <span className='text'>Average Rating:</span>
        <div className='average-rating'>
          <StarOutlineIcon className='icon' />
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
                  className='remove-rating btn btn--ghost'
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
