import React, { FC, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import StarRating from 'src/Components/StarRating/StarRating'
import UserAvatar from 'src/Components/UserAvatar/UserAvatar'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'
import { getApiErrorMessage } from 'src/util/getApiErrorMessage'
import { spinnerColor } from 'src/util/loadingStyles'
import { useOwnRating } from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/useOwnRating'
import ReviewTextarea, {
  REVIEW_MIN_LENGTH,
} from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewTextarea'

type ReviewComposerProps = {
  recipeId: string
}

/**
 * The invitation card that leads the section for a signed-in user who hasn't
 * written a review yet: "How did it turn out?", their avatar beside the
 * interactive stars, and the review textarea. Stars are invited but optional —
 * a written review posts with or without a rating (the star itself saves the
 * moment it's tapped), and a rating needs no words.
 */
const ReviewComposer: FC<ReviewComposerProps> = ({ recipeId }) => {
  const queryClient = useQueryClient()
  const uid = AuthAPI.getUID()
  const authRes = useAuth()
  const { rating, changeRating, removeRating } = useOwnRating(recipeId)

  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Handle for the DefaultAvatar seed; the same cached query the navbar uses.
  const { data: username } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })

  const handleSubmit = () => {
    setError('')
    if (text.length < REVIEW_MIN_LENGTH) {
      setError(
        `Reviews need at least ${REVIEW_MIN_LENGTH} characters — add a few more words.`
      )
      return
    }
    setSubmitting(true)
    RecipeAPI.newReview(recipeId, text)
      .then(() => {
        // The ['check-made'] refetch flips this slot to the own-review card.
        queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
        queryClient.invalidateQueries({ queryKey: ['reviews', recipeId] })
        setText('')
      })
      .catch(err => {
        // Surface the server's reason (e.g. a 422 moderation block) inline so
        // the user can rephrase, falling back to the generic message.
        setError(
          getApiErrorMessage(
            err,
            'Something went wrong submitting your review. Please try again.'
          )
        )
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className='rr-invite'>
      <h3 className='rr-invite-title'>How did it turn out?</h3>
      <p className='rr-invite-sub'>Rate it, write a few words, or both.</p>
      <div className='rr-irow'>
        <UserAvatar
          photoURL={authRes?.user?.photoURL}
          seed={username}
          className='rr-avatar'
          ariaHidden
        />
        <StarRating
          rating={rating}
          interactive
          onChange={changeRating}
          size={30}
          spacing={3}
          ariaLabel='Rate this recipe'
        />
        {rating > 0 ? (
          <>
            <span className='rr-rate-hint'>{rating} / 5</span>
            <button
              type='button'
              className='remove-rating btn btn--ghost'
              onClick={removeRating}
            >
              Remove rating
            </button>
          </>
        ) : (
          <span className='rr-rate-hint'>Tap a star — or just write</span>
        )}
      </div>
      {error && (
        <p className='rr-error' role='alert'>
          {error}
        </p>
      )}
      <ReviewTextarea
        value={text}
        onChange={setText}
        ariaLabel='Write a review'
      >
        <button
          type='button'
          className='rr-submit btn btn--primary'
          onClick={handleSubmit}
          disabled={submitting}
        >
          Share your review
          {submitting && (
            <span className='btn-overlay'>
              <TailSpin
                height='24'
                width='24'
                color={spinnerColor}
                ariaLabel='loading'
              />
            </span>
          )}
        </button>
      </ReviewTextarea>
    </div>
  )
}

export default ReviewComposer
