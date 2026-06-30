import React, { FC, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import AddRecipe from 'src/pages/AddRecipe/AddRecipe'

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
    isPending,
    isError,
  } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => RecipeAPI.getRecipe(recipeId!),
    enabled: !!recipeId,
    // Reuse the copy SingleRecipe already cached. GET /getRecipe increments the
    // public view counter, so refetching just to open the editor would inflate
    // it; serving the cache avoids that on the common (click-Edit) path.
    staleTime: Infinity,
  })

  const loading = isPending
  // Key ownership on the Firebase uid, matching the server's `userId === uid`
  // check. authorUsername is a creation-time snapshot that goes stale after a
  // rename, which would otherwise lock a legitimate owner out of editing.
  const isOwner = !!recipe && !!currUID && recipe.userId === currUID

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
        <TailSpin height='60' width='60' color={spinnerColor} ariaLabel='loading' />
      </div>
    )
  }

  return <AddRecipe initialRecipe={recipe} />
}

export default EditRecipe
