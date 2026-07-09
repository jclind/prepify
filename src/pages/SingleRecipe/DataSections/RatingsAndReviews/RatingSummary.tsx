import React, { FC } from 'react'
import { RatingAggregate } from 'types'
import StarRating from 'src/Components/StarRating/StarRating'
import UserAvatar from 'src/Components/UserAvatar/UserAvatar'
import { formatRating } from 'src/util/formatRating'

const STAR_WORDS = ['one', 'two', 'three', 'four', 'five']
const FACEPILE_MAX = 4

export type SummaryReviewer = {
  username: string
  photoURL: string | null
}

type RatingSummaryProps = {
  rating: RatingAggregate
  // Reviewer identities from the loaded page of reviews, for the facepile.
  reviewers: SummaryReviewer[]
}

/**
 * The compact summary strip under the invitation: average + stars + count on
 * the left, the per-star mini histogram in the middle, and a facepile of
 * recent reviewers ("Rated by N cooks") on the right.
 */
const RatingSummary: FC<RatingSummaryProps> = ({ rating, reviewers }) => {
  const { rateCount, rateValue, breakdown } = rating
  if (rateCount <= 0) return null

  const buckets = breakdown
    ? ([1, 2, 3, 4, 5] as const).map(star => breakdown[`${star}`] ?? 0)
    : null
  const maxBucket = buckets ? Math.max(...buckets) : 0

  const histogramLabel = buckets
    ? `Rating breakdown: ${buckets
        .map((count, i) => `${count} ${STAR_WORDS[i]}-star`)
        .reverse()
        .join(', ')}`
    : ''

  const pile = reviewers.slice(0, FACEPILE_MAX)
  const overflow = rateCount - pile.length

  return (
    <div className='rr-sumstrip'>
      <div className='rr-score'>
        <span className='rr-big'>{formatRating(rateValue, rateCount)}</span>
        <div>
          <StarRating rating={Number(rateValue) || 0} size={14} spacing={1} />
          <div className='rr-cnt'>
            {rateCount} {rateCount === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </div>
      {buckets && maxBucket > 0 && (
        <div className='rr-miniwrap'>
          <div className='rr-mini' role='img' aria-label={histogramLabel}>
            {buckets.map((count, i) => (
              <div className='rr-vcol' key={i}>
                <div
                  className='rr-vfill'
                  style={{ height: `${(count / maxBucket) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className='rr-mini-cap' aria-hidden='true'>
            1★ → 5★
          </div>
        </div>
      )}
      <div className='rr-pilewrap'>
        {pile.length > 0 && (
          <div className='rr-pile' aria-hidden='true'>
            {pile.map(r => (
              <UserAvatar
                key={r.username}
                photoURL={r.photoURL}
                seed={r.username}
                className='rr-avatar'
                ariaHidden
              />
            ))}
            {overflow > 0 && <span className='rr-more'>+{overflow}</span>}
          </div>
        )}
        <span className='rr-pile-txt'>
          Rated by {rateCount} {rateCount === 1 ? 'cook' : 'cooks'}
        </span>
      </div>
    </div>
  )
}

export default RatingSummary
