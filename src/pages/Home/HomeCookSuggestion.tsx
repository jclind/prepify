import React, { FC } from 'react'
import { useMutation } from '@tanstack/react-query'
import { IoDiceOutline } from 'react-icons/io5'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { HomeRecipeCard } from './HomeRecipeCard'

// "What should I cook?" — a one-tap decision-fatigue killer in the hero. Asks
// the server for a single recipe (taste-aware when signed in, a uniform random
// pick otherwise — the server decides based on the attached token) and reveals
// it as a card the user can open or re-roll with "Try another". Available to
// everyone; no auth gate here. Silent-ish: a rare empty catalog (404 → null)
// shows a soft note, a transient error lets them retry.
const HomeCookSuggestion: FC = () => {
  const { mutate, data, isPending, isError } = useMutation<
    RecipeType | null,
    unknown,
    string | undefined
  >({
    mutationFn: (excludeId) => RecipeAPI.getRandomRecipe(excludeId),
  })

  const pick = data ?? null
  // data === null only after a resolved 404 (empty catalog); undefined before
  // the first run or after an error.
  const mode: 'idle' | 'revealed' | 'empty' = pick
    ? 'revealed'
    : data === null
      ? 'empty'
      : 'idle'

  return (
    <div className='home-cook-suggestion'>
      {mode === 'idle' && (
        <button
          type='button'
          className='cook-suggestion-btn'
          onClick={() => mutate(undefined)}
          disabled={isPending}
        >
          <IoDiceOutline />
          {isPending ? 'Finding a recipe…' : 'What should I cook?'}
        </button>
      )}

      {mode === 'revealed' && pick && (
        <div className='cook-suggestion-reveal'>
          <HomeRecipeCard recipe={pick} />
          <button
            type='button'
            className='try-another-btn'
            onClick={() => mutate(pick._id)}
            disabled={isPending}
          >
            <IoDiceOutline />
            {isPending ? 'Finding…' : 'Try another'}
          </button>
        </div>
      )}

      {mode === 'empty' && (
        <p className='cook-suggestion-msg'>No recipes to suggest yet — check back soon.</p>
      )}
      {isError && (
        <p className='cook-suggestion-msg'>Couldn’t pick a recipe. Give it another try.</p>
      )}
    </div>
  )
}

export default HomeCookSuggestion
