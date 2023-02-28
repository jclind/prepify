import React, { useState, useEffect } from 'react'
import './RecipeReview.scss'
import StarRatings from 'react-star-ratings'
import { useAuth } from '../../../../context/AuthContext'
import { useAlert } from 'react-alert'
import { formatDate } from '../../../../util/formatDate'
import { TailSpin } from 'react-loader-spinner'
import {
  AiOutlineLike,
  AiOutlineDislike,
  AiTwotoneLike,
  AiTwotoneDislike,
} from 'react-icons/ai'
import Modal from 'react-modal'
import { ReviewType } from 'types'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
Modal.setAppElement('#root')

type ReviewOptionsProps = {
  handleEditReview: () => void
  editing: boolean
  setEditing: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
  editLoading: boolean
  reviewAuthorUID: string
}

const ReviewOptions = ({
  handleEditReview,
  editing,
  setEditing,
  handleDeleteReview,
  editLoading,
  reviewAuthorUID,
}: ReviewOptionsProps) => {
  const uid = AuthAPI.getUID()
  const alert = useAlert()

  // const [likeStatus, setLikeStatue] = useState(null)
  const [isLikeHovered, setIsLikeHovered] = useState(false)
  const [isDislikeHovered, setIsDislikeHovered] = useState(false)

  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)

  const [deleteLoading, setDeleteLoading] = useState(false)

  const customStyles = {
    content: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',

      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',

      background: '#eeeeee',
      padding: '2.5rem',
      borderRadius: '5px',
    },
    overlay: {
      zIndex: '1000',
      background: 'rgba(0, 0, 0, 0.5)',
    },
  }
  const closeModal = () => {
    setDeleteModalIsOpen(false)
  }

  return (
    <div className='review-options'>
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
      {uid === reviewAuthorUID ? (
        <>
          <Modal
            isOpen={deleteModalIsOpen}
            onRequestClose={closeModal}
            style={customStyles}
            className='delete-modal'
          >
            <div className='heading'>
              Are you sure you want to delete your review?
            </div>
            <p className='text'>
              This action is permanent and cannot be undone.
            </p>
            <div className='options'>
              <button className='cancel btn' onClick={closeModal}>
                Cancel
              </button>
              <button
                className='delete btn'
                onClick={() => {
                  setDeleteLoading(true)
                  handleDeleteReview().then(() => {
                    setDeleteModalIsOpen(false)
                    setDeleteLoading(false)
                  })
                }}
                disabled={deleteLoading}
              >
                Delete
                {deleteLoading && (
                  <div className='btn-overlay'>
                    <TailSpin
                      height='30'
                      width='30'
                      color='#303841'
                      ariaLabel='loading'
                    />
                  </div>
                )}
              </button>
            </div>
          </Modal>
          <div className='actions'>
            {!editing ? (
              <>
                <button
                  className='edit-btn btn'
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  className='delete-btn btn'
                  onClick={() => setDeleteModalIsOpen(true)}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  className='cancel btn'
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className='edit-review btn'
                  onClick={handleEditReview}
                  disabled={editLoading}
                >
                  Submit
                  {editLoading && (
                    <div className='btn-overlay'>
                      <TailSpin
                        height='30'
                        width='30'
                        color='#303841'
                        ariaLabel='loading'
                      />
                    </div>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        ''
      )}
    </div>
  )
}

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
  const authResponse = useAuth()

  const [reviewText, setReviewText] = useState(review.reviewText)

  const [editingText, setEditingText] = useState(review.reviewText)
  const [editing, setEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (review.rating) {
      setRating(Number(review.rating))
      setDate(formatDate(review.reviewCreatedAt, true))
      authResponse?.getUsername(review.userId).then(res => {
        if (res) {
          setUsername(res)
        }
      })
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

  return (
    <div className='recipe-review'>
      <div className='head'>
        <div className='name-content'>
          <div className='name'>{username}</div>
          <div className='rating'>
            <div className='text'>rated this recipe:</div>
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
          reviewAuthorUID={review.userId}
        />
      </div>
    </div>
  )
}

export default RecipeReview
