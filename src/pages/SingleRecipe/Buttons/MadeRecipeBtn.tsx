import React, { FC, useEffect, useState } from 'react'
import { useAlert } from 'react-alert'
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
  const alert = useAlert()

  const handleMadeRecipe = () => {
    if (canMakeAgain(lastDateMade)) {
      setLoading(true)
      RecipeAPI.madeRecipe(recipeId)
        .then(() => {
          setLastDateMade(new Date().getTime())
          setNumTimesMade(prev => prev + 1)
          setLoading(false)
          alert.show('Recipe marked as read, share your feedback below!', {
            timeout: 3000,
            type: 'success',
          })
        })
        .catch((error: any) => {
          alert.show(<div>Error: {error.toString()}</div>, {
            timeout: 5000,
            type: 'error',
          })
          setLoading(false)
        })
    } else if (lastDateMade) {
      alert.show(
        <div>
          Recipe can only be marked as read once an hour. Try again in{' '}
          {60 - Math.ceil((new Date().getTime() - lastDateMade) / (1000 * 60))}{' '}
          minutes.
        </div>,
        {
          timeout: 5000,
          type: 'error',
        }
      )
    } else {
      alert.show('Something went wrong, try refreshing.', {
        timeout: 10000,
        type: 'error',
      })
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
          alert(error.toString(), { timeout: 5000, type: 'error' })
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
