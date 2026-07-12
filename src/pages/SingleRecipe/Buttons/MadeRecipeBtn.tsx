import React, { FC, useState } from 'react'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'
import { CheckIcon } from 'src/Components/icons'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { GENERIC_ERROR } from 'src/util/toastMessages'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type MadeRecipeBtnProps = {
  recipeId: string
}

// The server models "made" as binary set membership — `madeRecipes` is a
// `$addToSet` and the global `numTimesMade` only increments on a user's first
// mark, so re-marking is intentionally idempotent (server/routes/recipes.js).
// `GET /checkMadeRecipe` returns `{ made }`; there's no per-user re-make log.
type MadeRecipeData = { made: boolean }

const MadeRecipeBtn: FC<MadeRecipeBtnProps> = ({ recipeId }) => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data } = useQuery({
    queryKey: ['madeRecipe', recipeId],
    queryFn: () => RecipeAPI.checkMadeRecipe(recipeId) as Promise<MadeRecipeData>,
    enabled: !!(uid && recipeId),
  })

  const made = data?.made ?? false

  const handleMadeRecipe = () => {
    if (made || loading) return
    setLoading(true)
    RecipeAPI.madeRecipe(recipeId)
      .then(() => {
        queryClient.setQueryData<MadeRecipeData>(['madeRecipe', recipeId], {
          made: true,
        })
        setLoading(false)
        toast.success('Recipe marked as made, share your feedback below.', {
          duration: 3000,
        })
      })
      .catch(() => {
        toast.error(GENERIC_ERROR)
        setLoading(false)
      })
  }

  if (!uid) return null

  return (
    <div className='made-this-recipe'>
      <div className='content'>
        <button
          className={`made-recipe btn${made ? ' is-made' : ''}`}
          onClick={handleMadeRecipe}
          disabled={loading || made}
        >
          {loading ? (
            <TailSpin
              height='26'
              width='26'
              color={spinnerColor}
              ariaLabel='loading'
            />
          ) : made ? (
            <>
              <CheckIcon aria-hidden='true' /> Made it
            </>
          ) : (
            'Made It'
          )}
        </button>
      </div>
    </div>
  )
}

export default MadeRecipeBtn
