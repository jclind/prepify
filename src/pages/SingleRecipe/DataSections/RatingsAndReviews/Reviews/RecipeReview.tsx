import React, { Component, FC, useState, useEffect } from 'react'
import './RecipeReview.scss'
import StarRating from 'src/Components/StarRating/StarRating'

class StarRatingErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
import { ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import ReviewOptions from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewOptions'
import { formatDate } from 'src/util/formatDate'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'

type RecipeReviewProps = {
  review: ReviewType
  setCurrUserReview?: (val: ReviewType | null) => void
  recipeId?: string
}

const RecipeReview: FC<RecipeReviewProps> = ({
  review,
  setCurrUserReview,
  recipeId,
}) => {
  const [rating, setRating] = useState(0)
  const [date, setDate] = useState('')
  const [username, setUsername] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

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
        setCurrUserReview(null)
      })
    }
  }

  const renderReviewHeader = () => (
    <div className='head'>
      {review.photoURL && !imgFailed ? (
        <img
          className='avatar'
          src={review.photoURL}
          alt=''
          onError={() => setImgFailed(true)}
        />
      ) : (
        <DefaultAvatar className='avatar' seed={username} ariaHidden />
      )}
      <div className='name-content'>
        <div className='name'>{username ? `@${username}` : ''}</div>
        <div className='rating'>
          <StarRatingErrorBoundary>
            <StarRating rating={rating} size={14} spacing={1} />
          </StarRatingErrorBoundary>
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
          recipeId={recipeId}
        />
      </div>
    </div>
  )
}

export default RecipeReview
