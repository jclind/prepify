import React, { FC, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import AddRecipe from 'src/pages/AddRecipe/AddRecipe'
import styles from 'src/_exports.module.scss'

// Wrapper for /recipes/:recipeId/edit. Fetches the recipe, confirms the signed-in
// user is its author, then renders the AddRecipe form pre-populated for editing.
// Ownership is also enforced server-side; this gate is just UX so non-owners
// don't see (and can't submit) the form.
const EditRecipe: FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>()
  const navigate = useNavigate()

  const currUID = AuthAPI.getUID()

  const {
    data: recipe,
    isPending: recipePending,
    isError,
  } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => RecipeAPI.getRecipe(recipeId!),
    enabled: !!recipeId,
  })

  const { data: currUsername, isPending: usernamePending } = useQuery({
    queryKey: ['username', currUID],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!currUID,
  })

  const loading = recipePending || (!!currUID && usernamePending)
  const isOwner = !!recipe && recipe.authorUsername === currUsername

  useEffect(() => {
    if (loading) return
    if (isError || !recipe || !recipe.title) {
      toast.error('Recipe not found.')
      navigate('/')
    } else if (!isOwner) {
      toast.error('You can only edit your own recipes.')
      navigate(`/recipes/${recipe._id}`)
    }
  }, [loading, isError, recipe, isOwner, navigate])

  if (loading || !recipe || !isOwner) {
    return (
      <div
        className='page'
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <TailSpin height='60' width='60' color={styles.primary} ariaLabel='loading' />
      </div>
    )
  }

  return <AddRecipe initialRecipe={recipe} />
}

export default EditRecipe
