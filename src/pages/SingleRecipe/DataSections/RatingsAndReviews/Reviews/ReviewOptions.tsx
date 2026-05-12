import React, { FC, useState } from 'react'
import AuthAPI from 'src/api/auth'
import { useQuery } from '@tanstack/react-query'
import ConfirmDeleteReviewModal from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ConfirmDeleteReviewModal'
import EditingReviewOptions from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/EditingReviewOptions'
import ReviewInteractionOptions from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewInteractionOptions'

type ReviewOptionsProps = {
  handleEditReview: () => void
  editing: boolean
  setEditing: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
  editLoading: boolean
  reviewAuthorUsername: string
}

const ReviewOptions: FC<ReviewOptionsProps> = ({
  handleEditReview,
  editing,
  setEditing,
  handleDeleteReview,
  editLoading,
  reviewAuthorUsername,
}) => {
  const uid = AuthAPI.getUID()

  const { data: currUsername } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(uid!),
    enabled: !!uid,
  })

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
