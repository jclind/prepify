import React, { FC, useState } from 'react'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { GENERIC_ERROR } from 'src/util/toastMessages'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const canMakeAgain = (lastDateMade: number | null): boolean => {
  const currDate = new Date().getTime()
  const coolDownTime = 3600000
  return !lastDateMade || currDate - lastDateMade >= coolDownTime
}

type MadeRecipeBtnProps = {
  recipeId: string
}

type MadeRecipeData = { datesMade?: string[] }

const MadeRecipeBtn: FC<MadeRecipeBtnProps> = ({ recipeId }) => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const { data } = useQuery({
    queryKey: ['madeRecipe', recipeId],
    queryFn: () => RecipeAPI.checkMadeRecipe(recipeId) as Promise<MadeRecipeData>,
    enabled: !!(uid && recipeId),
  })

  const datesMade = data?.datesMade ?? []
  const numTimesMade = datesMade.length
  const lastDateMade: number | null =
    numTimesMade > 0
      ? Math.max(...datesMade.map(x => parseInt(x, 10)))
      : null

  const handleMadeRecipe = () => {
    if (canMakeAgain(lastDateMade)) {
      setLoading(true)
      RecipeAPI.madeRecipe(recipeId)
        .then(() => {
          queryClient.setQueryData(
            ['madeRecipe', recipeId],
            (old: MadeRecipeData | undefined) => ({
              datesMade: [...(old?.datesMade ?? []), String(new Date().getTime())],
            })
          )
          setLoading(false)
          toast.success('Recipe marked as read, share your feedback below.', {
            duration: 3000,
          })
        })
        .catch(() => {
          toast.error(GENERIC_ERROR)
          setLoading(false)
        })
    } else if (lastDateMade) {
      toast.error(
        `Recipe can only be marked as read once an hour. Try again in ${60 - Math.ceil((new Date().getTime() - lastDateMade) / (1000 * 60))} minutes.`
      )
    } else {
      toast.error('Something went wrong. Try refreshing.', { duration: 10000 })
    }
  }

  if (!uid) return null

  return (
    <div className='made-this-recipe'>
      <div className='content'>
        <button
          className='made-recipe'
          onClick={handleMadeRecipe}
          disabled={loading}
        >
          {loading ? (
            <TailSpin
              height='26'
              width='26'
              color='black'
              ariaLabel='loading'
            />
          ) : (
            'Made It'
          )}
        </button>
        <span>
          {numTimesMade > 0 &&
            `Made ${numTimesMade === 1 ? '1 time' : numTimesMade + ' times'}`}
        </span>
      </div>
    </div>
  )
}

export default MadeRecipeBtn
