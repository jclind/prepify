import React, { FC, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AiOutlineLike,
  AiOutlineDislike,
  AiTwotoneLike,
  AiTwotoneDislike,
} from 'react-icons/ai'

const ReviewInteractionOptions: FC = () => {
  const [isLikeHovered, setIsLikeHovered] = useState(false)
  const [isDislikeHovered, setIsDislikeHovered] = useState(false)

  return (
    <>
      <button
        className='like-review-btn btn'
        onMouseEnter={() => setIsLikeHovered(true)}
        onMouseLeave={() => setIsLikeHovered(false)}
        onClick={() => {
          toast("Sorry, liking and disliking reviews isn't available yet in beta.", {
            duration: 10000,
          })
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
          toast("Sorry, liking and disliking reviews isn't available yet in beta.", {
            duration: 10000,
          })
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
