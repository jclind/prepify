import React, { useState, useEffect } from 'react'
import './RecipeReview.scss'
import StarRatings from 'react-star-ratings'
import { formatDate } from '../../../../util/formatDate'
import Modal from 'react-modal'
import { ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import ReviewOptions from './ReviewOptions'
Modal.setAppElement('#root')

type RecipeReviewProps = {
  review: ReviewType
  setCurrUserReview?: (val: ReviewType | {}) => void
  recipeId?: string
}

const RecipeReview = ({
  review,
  setCurrUserReview,
  recipeId,
}: RecipeReviewProps) => {
  const [rating, setRating] = useState(0)
  const [date, setDate] = useState('')
  const [username, setUsername] = useState('')

  const [reviewText, setReviewText] = useState(review.reviewText)

  const [editingText, setEditingText] = useState(review.reviewText)
  const [editing, setEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (review.rating) {
      setRating(Number(review.rating))
      setDate(formatDate(review.reviewCreatedAt, true))
      setUsername(review.username)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review])

  const handleEditReview = () => {
    if (editingText.length >= 5 && editingText !== reviewText && recipeId) {
      setEditLoading(true)
      RecipeAPI.editReview(recipeId, editingText).then(() => {
        setEditing(false)
        setReviewText(editingText)
        setEditLoading(false)
      })
    }
  }
  const handleDeleteReview = async () => {
    if (recipeId && setCurrUserReview) {
      await RecipeAPI.deleteReview(recipeId).then(() => {
        setCurrUserReview({})
      })
    }
  }

  const renderReviewHeader = () => (
    <div className='head'>
      <div className='name-content'>
        <div className='name'>{username}</div>
        <div className='rating'>
          <StarRatings
            rating={rating}
            starRatedColor='#ff5722'
            starDimension='15px'
            starSpacing='1px'
            name='rating'
          />
        </div>
      </div>
      <div className='date'>{date}</div>
    </div>
  )

  return (
    <div className='recipe-review'>
      {renderReviewHeader()}
      <div className='body'>
        {!editing ? (
          <div className='text'>{reviewText}</div>
        ) : (
          <textarea
            className='editing-review text'
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
          ></textarea>
        )}

        <ReviewOptions
          handleEditReview={handleEditReview}
          editing={editing}
          setEditing={setEditing}
          handleDeleteReview={handleDeleteReview}
          editLoading={editLoading}
          reviewAuthorUsername={review.username}
        />
      </div>
    </div>
  )
}

export default RecipeReview
