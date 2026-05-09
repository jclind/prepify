import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

const canMakeAgain = (lastDateMade: number | null): boolean => {
  const currDate = new Date().getTime()
  const coolDownTime = 3600000
  return !lastDateMade || currDate - lastDateMade >= coolDownTime
}

type MadeRecipeBtnProps = {
  recipeId: string
}

const MadeRecipeBtn: FC<MadeRecipeBtnProps> = ({ recipeId }) => {
  const uid = AuthAPI.getUID()
  const [numTimesMade, setNumTimesMade] = useState(0)
  const [lastDateMade, setLastDateMade] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const handleMadeRecipe = () => {
    if (canMakeAgain(lastDateMade)) {
      setLoading(true)
      RecipeAPI.madeRecipe(recipeId)
        .then(() => {
          setLastDateMade(new Date().getTime())
          setNumTimesMade(prev => prev + 1)
          setLoading(false)
          toast.success('Recipe marked as read, share your feedback below!', {
            duration: 3000,
          })
        })
        .catch((error: any) => {
          toast.error(`Error: ${error.toString()}`)
          setLoading(false)
        })
    } else if (lastDateMade) {
      toast.error(
        `Recipe can only be marked as read once an hour. Try again in ${60 - Math.ceil((new Date().getTime() - lastDateMade) / (1000 * 60))} minutes.`
      )
    } else {
      toast.error('Something went wrong, try refreshing.', { duration: 10000 })
    }
  }

  useEffect(() => {
    if (uid && recipeId) {
      RecipeAPI.checkMadeRecipe(recipeId)
        .then(({ datesMade = [] } = {}) => {
          const numTimesMade = datesMade.length
          setNumTimesMade(numTimesMade)
          if (numTimesMade > 0) {
            const lastDate = Math.max(
              ...datesMade.map((x: string) => parseInt(x, 10))
            )
            setLastDateMade(lastDate)
          }
        })
        .catch((error: any) =>
          toast.error(error.toString())
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

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
