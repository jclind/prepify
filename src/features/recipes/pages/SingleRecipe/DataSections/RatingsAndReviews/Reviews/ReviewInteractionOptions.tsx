import React, { useState } from 'react'
import { useAlert } from 'react-alert'
import {
  AiOutlineLike,
  AiOutlineDislike,
  AiTwotoneLike,
  AiTwotoneDislike,
} from 'react-icons/ai'

const ReviewInteractionOptions = () => {
  const [isLikeHovered, setIsLikeHovered] = useState(false)
  const [isDislikeHovered, setIsDislikeHovered] = useState(false)

  const alert = useAlert()

  return (
    <>
      <button
        className='like-review-btn btn'
        onMouseEnter={() => setIsLikeHovered(true)}
        onMouseLeave={() => setIsLikeHovered(false)}
        onClick={() => {
          alert.show(
            "Sorry, liking and disliking reviews isn't available yet in beta.",
            {
              timeout: 10000,
              type: 'info',
            }
          )
        }}
      >
        {isLikeHovered ? (
          <AiTwotoneLike className='icon' />
        ) : (
          <AiOutlineLike className='icon' />
        )}
      </button>
      <button
        className='dislike-review-btn btn'
        onMouseEnter={() => setIsDislikeHovered(true)}
        onMouseLeave={() => setIsDislikeHovered(false)}
        onClick={() => {
          alert.show(
            "Sorry, liking and disliking reviews isn't available yet in beta.",
            {
              timeout: 10000,
              type: 'info',
            }
          )
        }}
      >
        {isDislikeHovered ? (
          <AiTwotoneDislike className='icon' />
        ) : (
          <AiOutlineDislike className='icon' />
        )}
      </button>
    </>
  )
}

export default ReviewInteractionOptions
