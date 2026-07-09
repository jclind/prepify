import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { ReviewType } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import UserAvatar from 'src/Components/UserAvatar/UserAvatar'
import ReportControl from 'src/Components/ReportControl/ReportControl'
import { formatDate } from 'src/util/formatDate'
import './RecipeReview.scss'

type RecipeReviewProps = {
  review: ReviewType
  recipeId: string
}

/**
 * One review in the public list: avatar, the reviewer's name linking to their
 * profile (displayName when they've set one, handle otherwise), stars when the
 * review carries a rating (review-only posts don't), date, text, and a report
 * kebab. The signed-in user's own review never renders here — it lives in the
 * OwnReviewCard slot above the list.
 */
const RecipeReview: FC<RecipeReviewProps> = ({ review, recipeId }) => {
  const { username, displayName, rating, reviewText } = review
  const date = review.reviewCreatedAt
    ? formatDate(review.reviewCreatedAt, true)
    : ''

  return (
    <article className='recipe-review'>
      <div className='head'>
        <UserAvatar
          photoURL={review.photoURL}
          seed={username}
          className='avatar'
          ariaHidden
        />
        <div className='rr-who'>
          <div className='rr-nm'>
            <Link
              to={`/u/${username}`}
              aria-label={`View ${displayName || `@${username}`}'s profile`}
            >
              {displayName || `@${username}`}
            </Link>
          </div>
          {displayName && <div className='rr-sub'>@{username}</div>}
        </div>
        <span className='rr-dt'>{date}</span>
        {/* Report affordance for other people's reviews; ReportControl nudges
            logged-out viewers to sign in. */}
        <div className='review-options'>
          <ReportControl
            variant='menu'
            target={{
              targetType: 'review',
              recipeId,
              reportedUsername: username,
            }}
          />
        </div>
      </div>
      {rating !== null && (
        <div className='stars'>
          <StarRating rating={rating} size={14} spacing={1} />
        </div>
      )}
      <p className='text'>{reviewText}</p>
    </article>
  )
}

export default RecipeReview
