import React, { FC, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import { OwnReviewStatus } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import UserAvatar from 'src/Components/UserAvatar/UserAvatar'
import { EditIcon, TrashIcon } from 'src/Components/icons'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'
import { formatDate } from 'src/util/formatDate'
import { getApiErrorMessage } from 'src/util/getApiErrorMessage'
import { spinnerColor } from 'src/util/loadingStyles'
import { useOwnRating } from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/useOwnRating'
import ConfirmDeleteReviewModal from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ConfirmDeleteReviewModal'
import ReviewTextarea, {
  REVIEW_MIN_LENGTH,
} from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewTextarea'

type OwnReviewCardProps = {
  recipeId: string
  review: OwnReviewStatus
}

/**
 * Once the user has posted, the invitation slot becomes this card: their
 * review on the same warm surface, with the stars still interactive (adjust or
 * remove the rating in place), inline edit, and delete. Deleting the written
 * review keeps the star rating — the confirm modal says so.
 */
const OwnReviewCard: FC<OwnReviewCardProps> = ({ recipeId, review }) => {
  const queryClient = useQueryClient()
  const uid = AuthAPI.getUID()
  const authRes = useAuth()
  const { rating, changeRating, removeRating } = useOwnRating(recipeId)

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)

  const { data: username } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })

  const displayName = authRes?.user?.displayName || null
  const handle = username || review.username || ''
  const date = review.reviewCreatedAt
    ? formatDate(review.reviewCreatedAt, true)
    : ''

  const startEditing = () => {
    setEditText(review.reviewText ?? '')
    setEditError('')
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    setEditError('')
    if (editText === review.reviewText) {
      setEditing(false)
      return
    }
    if (editText.length < REVIEW_MIN_LENGTH) {
      setEditError(
        `Reviews need at least ${REVIEW_MIN_LENGTH} characters — add a few more words.`
      )
      return
    }
    setEditLoading(true)
    try {
      await RecipeAPI.editReview(recipeId, editText)
      // Refetch before closing the editor so the card never flashes the old
      // text between the save resolving and the query settling.
      await queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
      queryClient.invalidateQueries({ queryKey: ['reviews', recipeId] })
      setEditing(false)
    } catch (err) {
      setEditError(
        getApiErrorMessage(
          err,
          'Something went wrong saving your review. Please try again.'
        )
      )
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteReview = async () => {
    await RecipeAPI.deleteReview(recipeId)
    // The ['check-made'] refetch flips this slot back to the invitation.
    queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['reviews', recipeId] })
  }

  return (
    <div className='rr-invite rr-own'>
      <div className='rr-own-head'>
        <p className='rr-eyebrow'>Your review</p>
        {date && <span className='rr-dt'>{date}</span>}
      </div>
      <div className='rr-irow'>
        <UserAvatar
          photoURL={authRes?.user?.photoURL}
          seed={handle}
          className='rr-avatar'
          ariaHidden
        />
        <div className='rr-who'>
          <div className='rr-nm'>{displayName || `@${handle}`}</div>
          {displayName && <div className='rr-sub'>@{handle}</div>}
        </div>
      </div>
      <div className='rr-own-stars'>
        <StarRating
          rating={rating}
          interactive
          onChange={changeRating}
          size={20}
          spacing={2}
          ariaLabel='Your rating'
        />
        {rating > 0 && (
          <button
            type='button'
            className='remove-rating btn btn--ghost'
            onClick={removeRating}
          >
            Remove rating
          </button>
        )}
      </div>
      {editing ? (
        <>
          {editError && (
            <p className='rr-error' role='alert'>
              {editError}
            </p>
          )}
          <ReviewTextarea
            value={editText}
            onChange={setEditText}
            ariaLabel='Edit your review'
          >
            <button
              type='button'
              className='btn btn--ghost'
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='rr-submit btn btn--primary'
              onClick={handleSaveEdit}
              disabled={editLoading}
            >
              Save changes
              {editLoading && (
                <span className='btn-overlay'>
                  <TailSpin
                    height='24'
                    width='24'
                    color={spinnerColor}
                    ariaLabel='loading'
                  />
                </span>
              )}
            </button>
          </ReviewTextarea>
        </>
      ) : (
        <>
          <p className='rr-own-text'>{review.reviewText}</p>
          <div className='rr-own-actions'>
            <button type='button' className='btn btn--ghost' onClick={startEditing}>
              <EditIcon /> Edit
            </button>
            <button
              type='button'
              className='btn btn--ghost rr-danger'
              onClick={() => setDeleteModalIsOpen(true)}
            >
              <TrashIcon /> Delete
            </button>
          </div>
        </>
      )}
      <ConfirmDeleteReviewModal
        deleteModalIsOpen={deleteModalIsOpen}
        setDeleteModalIsOpen={setDeleteModalIsOpen}
        handleDeleteReview={handleDeleteReview}
      />
    </div>
  )
}

export default OwnReviewCard
