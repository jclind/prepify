import React, { useState, useEffect } from 'react'
import { BsStar, BsStarFill } from 'react-icons/bs'

type AddRatingBtnProps = {
  currUserReview: { rating: string } | {}
}

const AddRatingBtn = ({ currUserReview }: AddRatingBtnProps) => {
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
        {'rating' in currUserReview ? (
          <>
            <BsStarFill className='icon' />
            {currUserReview.rating}
          </>
        ) : (
          <>
            {isHovered ? (
              <BsStarFill className='icon' />
            ) : (
              <BsStar className='icon' />
            )}{' '}
            Rate
          </>
        )}
      </button>
    </div>
  )
}

export default AddRatingBtn