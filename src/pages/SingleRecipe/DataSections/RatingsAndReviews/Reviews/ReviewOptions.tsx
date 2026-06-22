import React, { FC, useState } from 'react'
import AuthAPI from 'src/api/auth'
import { useQuery } from '@tanstack/react-query'
import ConfirmDeleteReviewModal from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ConfirmDeleteReviewModal'
import EditingReviewOptions from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/EditingReviewOptions'
import ReportControl from 'src/Components/ReportControl/ReportControl'

type ReviewOptionsProps = {
  handleEditReview: () => void
  editing: boolean
  setEditing: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
  editLoading: boolean
  reviewAuthorUsername: string
  recipeId?: string
}

const ReviewOptions: FC<ReviewOptionsProps> = ({
  handleEditReview,
  editing,
  setEditing,
  handleDeleteReview,
  editLoading,
  reviewAuthorUsername,
  recipeId,
}) => {
  const uid = AuthAPI.getUID()

  const { data: currUsername } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })

  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)

  return (
    <div className='review-options'>
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
        // Not the author: offer a report affordance in a kebab menu (the trigger
        // stays visible logged-out and nudges to log in on click).
        recipeId && (
          <ReportControl
            variant='menu'
            target={{
              targetType: 'review',
              recipeId,
              reportedUsername: reviewAuthorUsername,
            }}
          />
        )
      )}
    </div>
  )
}

export default ReviewOptions
