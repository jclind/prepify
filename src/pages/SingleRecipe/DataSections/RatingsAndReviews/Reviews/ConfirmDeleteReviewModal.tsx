import React, { FC, useState } from 'react'
import { TailSpin } from 'react-loader-spinner'
import Modal from 'react-modal'

type ConfirmDeleteReviewModalProps = {
  deleteModalIsOpen: boolean
  setDeleteModalIsOpen: (val: boolean) => void
  handleDeleteReview: () => Promise<void>
}

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
      style={customStyles}
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
            handleDeleteReview().catch((error: any) => {
              setDeleteLoading(false)
              console.log(error)
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
  )
}

export default ConfirmDeleteReviewModal
