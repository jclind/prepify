import React, { FC, useState } from 'react'
import { AiOutlineClose } from 'react-icons/ai'
import { TailSpin } from 'react-loader-spinner'
import Modal from 'react-modal'
import { useNavigate } from 'react-router-dom'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useQuery } from '@tanstack/react-query'
import './RecipeControls.scss'

type RecipeControlsType = {
  recipeId: string
  authorUsername: string
  recipeTitle: string
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

    background: '#eeeeee',
    padding: '2.5rem',
    borderRadius: '5px',
  },
  overlay: {
    zIndex: '1000',
    background: 'rgba(0, 0, 0, 0.5)',
  },
}

const RecipeControls: FC<RecipeControlsType> = ({
  recipeId,
  authorUsername,
  recipeTitle,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
  }

  const navigate = useNavigate()

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const currUID = AuthAPI.getUID()

  const { data: currUsername } = useQuery({
    queryKey: ['username', currUID],
    queryFn: () => AuthAPI.getUsername(currUID!),
    enabled: !!currUID,
  })

  const isUsersRecipe = currUsername === authorUsername

  if (!isUsersRecipe) return null

  const handleDeleteRecipe = () => {
    if (currUID) {
      setDeleteLoading(true)
      RecipeAPI.deleteRecipe(recipeId).then(res => {
        const response = res as { error?: string }
        if (response.error) {
          setDeleteError(response.error)
        } else {
          closeDeleteModal()
          navigate('/')
        }
        setDeleteLoading(false)
      })
    }
  }

  return (
    <div className='recipe-controls-container'>
      <div className='btns-container'>
        {/* <button className='edit-btn'>Edit</button> */}
        <button
          className='delete-btn'
          onClick={() => setIsDeleteModalOpen(true)}
        >
          Delete
        </button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={closeDeleteModal}
        style={customStyles}
        className='confirm-delete-modal'
      >
        <button className='close-modal btn' onClick={closeDeleteModal}>
          <AiOutlineClose className='icon' />
        </button>
        <div className='content'>
          <h4>Delete Recipe?</h4>
          <p>
            Are you sure you want to delete "<strong>{recipeTitle}</strong>"?
          </p>
          <p>This action cannot be undone.</p>
          {deleteError && <p className='error'>Error: {deleteError}</p>}
          <div className='btns'>
            <button className='cancel' onClick={closeDeleteModal}>
              Cancel
            </button>
            <button
              className='confirm'
              onClick={handleDeleteRecipe}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <TailSpin
                  height='26'
                  width='26'
                  color='white'
                  ariaLabel='loading'
                />
              ) : (
                'Delete Recipe'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RecipeControls
