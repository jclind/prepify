import { BookmarkIcon, CheckCircleIcon, CloseIcon, EditIcon, EyeIcon, TrashIcon, UserIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { TailSpin } from 'react-loader-spinner'
import Modal from 'react-modal'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useQueryClient } from '@tanstack/react-query'
import { panelModalStyles } from 'src/util/modalStyles'
import './RecipeControls.scss'

type RecipeControlsType = {
  recipeId: string
  recipeUserId?: string
  recipeTitle: string
  views?: number
  numTimesSaved?: number
  numTimesMade?: number
}

const formatCount = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString()

const RecipeControls: FC<RecipeControlsType> = ({
  recipeId,
  recipeUserId,
  recipeTitle,
  views,
  numTimesSaved,
  numTimesMade,
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

  // Key ownership on the Firebase uid (what the server authorizes against), not
  // the snapshotted authorUsername which goes stale after a rename and would
  // hide these controls from the legitimate owner.
  const isUsersRecipe = !!currUID && currUID === recipeUserId

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
        <UserIcon className='icon' aria-hidden='true' />
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
          <EditIcon className='icon' aria-hidden='true' />
          Edit
        </button>
        <button
          className='delete-btn'
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <TrashIcon className='icon' aria-hidden='true' />
          Delete
        </button>
      </div>

      <div className='owner-stats' aria-label='Recipe statistics'>
        <span className='stat'>
          <EyeIcon className='icon' aria-hidden='true' />
          <b>{formatCount(views)}</b> {views === 1 ? 'view' : 'views'}
        </span>
        <span className='stat'>
          <BookmarkIcon className='icon' aria-hidden='true' />
          <b>{formatCount(numTimesSaved)}</b>{' '}
          {numTimesSaved === 1 ? 'save' : 'saves'}
        </span>
        <span className='stat'>
          <CheckCircleIcon className='icon' aria-hidden='true' />
          <b>{formatCount(numTimesMade)}</b> made
        </span>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onRequestClose={closeDeleteModal}
        style={panelModalStyles}
        className='confirm-delete-modal'
      >
        <button className='close-modal btn' onClick={closeDeleteModal}>
          <CloseIcon className='icon' />
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
