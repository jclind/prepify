import { ClockIcon, CloseIcon, DiceIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Modal from 'react-modal'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { fmtPrice, ratingLabel, skeletonColor } from './homeFormat'
import { bareModalStyles } from 'src/util/modalStyles'
import './HomeCookSuggestion.scss'

// Card-shaped skeleton, matching the real card's layout so the modal doesn't
// resize between the loading and loaded states.
const CardSkeleton: FC = () => (
  <>
    <div className='thumb'>
      <Skeleton baseColor={skeletonColor} height='100%' style={{ aspectRatio: '4 / 3', display: 'block' }} />
    </div>
    <div className='body'>
      <h3><Skeleton baseColor={skeletonColor} width='75%' /></h3>
      <div className='meta'><Skeleton baseColor={skeletonColor} width={170} /></div>
      <div className='actions'>
        <span className='sk-btn'><Skeleton baseColor={skeletonColor} height={38} borderRadius={999} /></span>
        <span className='sk-btn'><Skeleton baseColor={skeletonColor} height={38} borderRadius={999} /></span>
      </div>
    </div>
  </>
)

// "What should I cook?" — a one-tap decision-fatigue killer in the hero. The
// button never moves; clicking opens a spotlight modal with a single recipe the
// user can open or re-roll with "Try another". Taste-aware when signed in, a
// random pick otherwise (the server decides via the attached token). Available
// to everyone — no auth gate here.
const HomeCookSuggestion: FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  // The currently displayed pick is held in state (not read off the mutation)
  // so a re-roll keeps the previous card on screen — stable size, no squish —
  // until the next pick arrives. undefined = nothing fetched yet, null = 404.
  const [pick, setPick] = useState<RecipeType | null | undefined>(undefined)

  const { mutate, isPending, isError, reset } = useMutation<RecipeType | null, unknown, string | undefined>({
    mutationFn: (excludeId) => RecipeAPI.getRandomRecipe(excludeId),
    onSuccess: (r) => setPick(r),
  })

  const open = () => {
    setIsOpen(true)
    setPick(undefined)
    mutate(undefined)
  }
  const tryAnother = () => mutate(pick?._id)
  const close = () => {
    setIsOpen(false)
    setPick(undefined)
    reset()
  }

  return (
    <div className='home-cook-suggestion'>
      <button className='cook-suggestion-btn btn' type='button' onClick={open}>
        <DiceIcon /> What should I cook?
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={close}
        style={bareModalStyles}
        className='cook-modal'
        contentLabel='Recipe suggestion'
      >
        <div className='cook-modal-card'>
          <button className='cook-modal-close btn btn--icon' onClick={close} aria-label='Close' type='button'>
            <CloseIcon />
          </button>

          {pick ? (
            <>
              <div className='thumb'>
                <img src={pick.recipeImage} alt={pick.title} />
                {pick.servingPrice != null && (
                  <span className='price-chip'>{fmtPrice(pick.servingPrice)}/serv</span>
                )}
                {isPending && (
                  <div className='reroll-veil' aria-hidden>
                    <span className='spinner' />
                  </div>
                )}
              </div>
              <div className='body'>
                <h3>{pick.title}</h3>
                <div className='meta'>
                  <span><ClockIcon /> {pick.totalTime}m</span>
                  <span><StarOutlineIcon /> {ratingLabel(pick.rating)}</span>
                  {pick.cuisine && <span className='cuisine'>{pick.cuisine}</span>}
                </div>
                <div className='actions'>
                  <Link to={`/recipes/${pick._id}`} className='primary btn' onClick={close}>
                    View recipe
                  </Link>
                  <button className='ghost btn' onClick={tryAnother} disabled={isPending} type='button'>
                    <DiceIcon /> {isPending ? 'Finding…' : 'Try another'}
                  </button>
                </div>
              </div>
            </>
          ) : isPending ? (
            <CardSkeleton />
          ) : isError ? (
            <div className='cook-modal-state cook-modal-msg'>
              <p>Couldn’t pick a recipe.</p>
              <button className='ghost btn' onClick={() => mutate(undefined)} type='button'>
                Try again
              </button>
            </div>
          ) : (
            <div className='cook-modal-state cook-modal-msg'>
              <p>No recipes to suggest yet — check back soon.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default HomeCookSuggestion
