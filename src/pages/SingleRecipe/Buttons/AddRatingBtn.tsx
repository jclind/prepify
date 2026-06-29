import { StarFilledIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC } from 'react'

type AddRatingBtnProps = {
  currUserReview: { rating: string } | null
}

const AddRatingBtn: FC<AddRatingBtnProps> = ({ currUserReview }) => {
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
        {currUserReview ? (
          <>
            <StarFilledIcon className='icon' />
            {currUserReview.rating}
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
