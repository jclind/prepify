import React, { useEffect, useState } from 'react'
import AuthAPI from 'src/api/auth'
import ConfirmDeleteReviewModal from './ConfirmDeleteReviewModal'
import EditingReviewOptions from './EditingReviewOptions'
import ReviewInteractionOptions from './ReviewInteractionOptions'

type ReviewOptionsProps = {
  handleEditReview: () => void
  editing: boolean
  setEditing: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
  editLoading: boolean
  reviewAuthorUsername: string
}

const ReviewOptions = ({
  handleEditReview,
  editing,
  setEditing,
  handleDeleteReview,
  editLoading,
  reviewAuthorUsername,
}: ReviewOptionsProps) => {
  const uid = AuthAPI.getUID()

  const [currUsername, setCurrUsername] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    const getCurrUsername = async () => {
      if (uid) {
        const un = await AuthAPI.getUsername(uid)
        setCurrUsername(un)
      }
    }
    getCurrUsername()
    return () => {
      abortController.abort()
    }
  }, [uid])

  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)

  return (
    <div className='review-options'>
      <ReviewInteractionOptions />
      {currUsername === reviewAuthorUsername ? (
        <>
          <ConfirmDeleteReviewModal
            deleteModalIsOpen={deleteModalIsOpen}
            setDeleteModalIsOpen={setDeleteModalIsOpen}
            handleDeleteReview={handleDeleteReview}
          />
          <EditingReviewOptions
            editLoading={editLoading}
            editing={editing}
            setEditing={setEditing}
            handleEditReview={handleEditReview}
            setDeleteModalIsOpen={setDeleteModalIsOpen}
          />
        </>
      ) : (
        ''
      )}
    </div>
  )
}

export default ReviewOptions
