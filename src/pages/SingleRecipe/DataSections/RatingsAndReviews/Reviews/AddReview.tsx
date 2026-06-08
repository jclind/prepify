import React, { FC, useState } from 'react'
import RecipeAPI from 'src/api/recipes'
import { ReviewType } from 'types'

type AddReviewProps = {
  rating: number
  recipeId: string
  uid: string | null
  setCurrUserReview: (val: ReviewType | null) => void
}

// Shown once a logged-in user has tapped a star to rate. The written review is
// optional — they've already left the rating — but posting one needs >= 5
// characters.
const AddReview: FC<AddReviewProps> = ({
  rating,
  recipeId,
  uid,
  setCurrUserReview,
}) => {
  const [newReviewText, setNewReviewText] = useState('')
  const [newReviewError, setNewReviewError] = useState('')

  const handleSubmitReview = () => {
    setNewReviewError('')
    if (rating === 0) {
      return setNewReviewError(
        'Please add a rating before submitting your review.'
      )
    }
    if (newReviewText.length < 5) {
      return setNewReviewError(
        'Review is too short. Please make sure to add 5 or more characters.'
      )
    }
    RecipeAPI.newReview(recipeId, newReviewText)
      .then(res => {
        setCurrUserReview(res ?? null)
      })
      .catch(() => {
        setNewReviewError(
          'Something went wrong submitting your review. Please try again.'
        )
      })
  }

  // The textarea only appears after a signed-in user rates.
  if (!uid || rating === 0) return null

  return (
    <div className='write-review'>
      <h4 className='write-review-title'>
        Add a written review <span>(optional)</span>
      </h4>
      {newReviewError && <div className='error'>{newReviewError}</div>}
      <textarea
        name='review'
        className='review-text-area'
        placeholder='Share how it turned out…'
        value={newReviewText}
        onChange={e => setNewReviewText(e.target.value)}
      />
      <button className='submit-review-btn btn' onClick={handleSubmitReview}>
        Submit Review
      </button>
    </div>
  )
}

export default AddReview
