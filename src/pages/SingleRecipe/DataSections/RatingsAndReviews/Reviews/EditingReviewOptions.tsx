import React, { FC } from 'react'
import { TailSpin } from 'react-loader-spinner'
type EditingReviewOptionsProps = {
  editLoading: boolean
  editing: boolean
  setEditing: (val: boolean) => void
  setDeleteModalIsOpen: (val: boolean) => void
  handleEditReview: () => void
}
const EditingReviewOptions: FC<EditingReviewOptionsProps> = ({
  editLoading,
  editing,
  setEditing,
  setDeleteModalIsOpen,
  handleEditReview,
}) => {
  const renderIsEditing = () => (
    <>
      <button className='edit-btn btn' onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        className='delete-btn btn'
        onClick={() => setDeleteModalIsOpen(true)}
      >
        Delete
      </button>
    </>
  )
  const renderIsNotEditing = () => (
    <>
      <button className='cancel btn' onClick={() => setEditing(false)}>
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
  )

  return (
    <div className='actions'>
      {!editing ? renderIsEditing() : renderIsNotEditing()}
    </div>
  )
}

export default EditingReviewOptions
