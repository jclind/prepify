import React, { FC, useState } from 'react'
import {
  AiOutlineClose,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineUser,
} from 'react-icons/ai'
import { TailSpin } from 'react-loader-spinner'
import Modal from 'react-modal'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()

  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const currUID = AuthAPI.getUID()

  const { data: currUsername } = useQuery({
    queryKey: ['username', currUID],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!currUID,
  })

  const isUsersRecipe = currUsername === authorUsername

  if (!isUsersRecipe) return null

  const handleDeleteRecipe = async () => {
    if (!currUID) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await RecipeAPI.deleteRecipe(recipeId)
      // Drop cached copies so lists/pages don't show the deleted recipe.
      queryClient.removeQueries({ queryKey: ['recipe', recipeId] })
      queryClient.invalidateQueries({ queryKey: ['created-recipes'] })
      closeDeleteModal()
      // Toaster is mounted at the app root, so the toast survives the redirect.
      toast.success(`"${recipeTitle}" deleted.`)
      navigate('/')
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? err.response?.data?.error ?? err.message
        : 'Failed to delete recipe. Please try again.'
      setDeleteError(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className='recipe-controls-container'>
      <span className='who'>
        <AiOutlineUser className='icon' aria-hidden='true' />
        <span>
          <strong>You</strong> created this recipe
        </span>
      </span>
      <div className='btns-container'>
        <button
          className='edit-btn'
          onClick={() => navigate(`/recipes/${recipeId}/edit`)}
          aria-label='Edit recipe'
        >
          <AiOutlineEdit className='icon' aria-hidden='true' />
          Edit
        </button>
        <button
          className='delete-btn'
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <AiOutlineDelete className='icon' aria-hidden='true' />
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
