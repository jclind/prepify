import { StarFilledIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'

type AddRatingBtnProps = {
  currUserReview: { rating: string } | null
}

const AddRatingBtn: FC<AddRatingBtnProps> = ({ currUserReview }) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    document.getElementById('recipeReviews')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <div className='add-rating'>
      <button
        className='add-rating-btn btn'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {currUserReview ? (
          <>
            <StarFilledIcon className='icon' />
            {currUserReview.rating}
          </>
        ) : (
          <>
            {isHovered ? (
              <StarFilledIcon className='icon' />
            ) : (
              <StarOutlineIcon className='icon' />
            )}{' '}
            Rate
          </>
        )}
      </button>
    </div>
  )
}

export default AddRatingBtn
