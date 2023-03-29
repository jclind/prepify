import React, { FC, useRef, useState } from 'react'
import RecipeAPI from 'src/api/recipes'
import { useAlert } from 'react-alert'
import { Link } from 'react-router-dom'
import { ReviewType } from 'types'

type AddReviewProps = {
  rating: number
  recipeId: string
  uid: string | null
  setCurrUserReview: (val: ReviewType | null) => void
}

const AddReview: FC<AddReviewProps> = ({
  rating,
  recipeId,
  uid,
  setCurrUserReview,
}) => {
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [newReviewText, setNewReviewText] = useState('')
  const [newReviewError, setNewReviewError] = useState('')
  const addReviewTextAreaRef = useRef<HTMLTextAreaElement>(null)

  const alert = useAlert()

  const handleSubmitReview = () => {
    setNewReviewError('')
    if (rating === 0) {
      return setNewReviewError(
        'Please add a rating before submitting your review.'
      )
    }
    if (newReviewText.length < 5) {
      return setNewReviewError(
        'Review is too short. Please make sure to add 4 or more characters.'
      )
    }
    setIsReviewOpen(false)
    RecipeAPI.newReview(recipeId, newReviewText).then(res => {
      setCurrUserReview(res ?? null)
    })
  }

  return (
    <>
      <div className={`review-open ${isReviewOpen ? 'visible' : ''}`}>
        <h4 className='review-input-title'>Write Review:</h4>
        {newReviewError && <div className='error'>{newReviewError}</div>}
        <textarea
          name='review'
          className='review-text-area'
          value={newReviewText}
          onChange={e => setNewReviewText(e.target.value)}
          ref={addReviewTextAreaRef}
          // tabIndex={isReviewOpen ? 1 : -1}
        />
        <div className='btns-container'>
          <button
            className='close-review-textarea-btn'
            onClick={() => setIsReviewOpen(false)}
            // tabIndex={isReviewOpen ? 1 : -1}
          >
            close
          </button>
          <button
            className='submit-review-btn btn'
            onClick={handleSubmitReview}
            // tabIndex={isReviewOpen ? 1 : -1}
          >
            Submit Review
          </button>
        </div>
      </div>
      <button
        className={`leave-review-btn btn ${isReviewOpen ? '' : 'visible'}`}
        // tabIndex={isReviewOpen ? 1 : -1}
        onClick={() => {
          if (uid) {
            setNewReviewText('')
            setIsReviewOpen(true)
            addReviewTextAreaRef?.current &&
              addReviewTextAreaRef.current.focus()
          } else {
            alert.show(
              <div>
                Please <Link to='/login'>login</Link> to add a review.
              </div>,
              {
                timeout: 10000,
                type: 'info',
              }
            )
          }
        }}
      >
        Add Review
      </button>
    </>
  )
}

export default AddReview
