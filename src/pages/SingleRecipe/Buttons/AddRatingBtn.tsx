import { StarFilledIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

type AddRatingBtnProps = {
  recipeId: string
}

const AddRatingBtn: FC<AddRatingBtnProps> = ({ recipeId }) => {
  const uid = AuthAPI.getUID()
  // Same cache entry the reviews section reads — the user's own rating/review
  // doc is the single source of truth, no prop-drilled review state.
  const { data: ownReview } = useQuery({
    queryKey: ['check-made', recipeId],
    queryFn: () => RecipeAPI.checkIfReviewed(recipeId),
    enabled: !!uid,
  })
  const myRating = typeof ownReview?.rating === 'number' ? ownReview.rating : 0

  const handleClick = () => {
    document.getElementById('recipeReviews')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  // Fill marks a persistent ON state, never hover: a filled star means the user
  // has rated (parallels Save's filled bookmark = saved). Unrated stays outline;
  // hover is the button's own chrome. See docs/design/icon-system.md.
  return (
    <div className='add-rating'>
      <button className='add-rating-btn btn btn--outline' onClick={handleClick}>
        {myRating > 0 ? (
          <>
            <StarFilledIcon className='icon' />
            {myRating}
          </>
        ) : (
          <>
            <StarOutlineIcon className='icon' /> Rate
          </>
        )}
      </button>
    </div>
  )
}

export default AddRatingBtn
