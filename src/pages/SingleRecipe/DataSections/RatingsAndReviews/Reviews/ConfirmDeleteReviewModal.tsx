import React, { FC, useState } from 'react'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'
import Modal from 'react-modal'
import toast from 'react-hot-toast'
import { panelModalStylesWith } from 'src/util/modalStyles'

type ConfirmDeleteReviewModalProps = {
  deleteModalIsOpen: boolean
  setDeleteModalIsOpen: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
}

const ConfirmDeleteReviewModal: FC<ConfirmDeleteReviewModalProps> = ({
  deleteModalIsOpen,
  setDeleteModalIsOpen,
  handleDeleteReview,
}) => {
  const [deleteLoading, setDeleteLoading] = useState(false)

  const closeModal = () => {
    setDeleteModalIsOpen(false)
  }
  return (
    <Modal
      isOpen={deleteModalIsOpen}
      onRequestClose={closeModal}
      style={panelModalStylesWith({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      })}
      className='delete-modal'
    >
      <div className='heading'>
        Are you sure you want to delete your review?
      </div>
      <p className='text'>This action is permanent and cannot be undone.</p>
      <div className='options'>
        <button className='cancel btn' onClick={closeModal}>
          Cancel
        </button>
        <button
          className='delete btn'
          onClick={() => {
            setDeleteLoading(true)
            handleDeleteReview().catch(() => {
              // Surface the failure to the user (and keep the modal open to
              // retry) instead of failing silently — matches the rating
              // controls' toast pattern in Ratings.tsx.
              setDeleteLoading(false)
              toast.error('Could not delete your review. Please try again.')
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
                color={spinnerColor}
                ariaLabel='loading'
              />
            </div>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDeleteReviewModal
