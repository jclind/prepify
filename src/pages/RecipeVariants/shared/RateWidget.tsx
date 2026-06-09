import React, { FC, useState } from 'react'
import { AiFillStar, AiOutlineStar } from 'react-icons/ai'
import './RateWidget.scss'

type Props = {
  /** visual size of the stars */
  size?: 'sm' | 'lg'
  /** show a review textarea + submit button under the stars */
  withReview?: boolean
  /** heading shown above the stars; pass null to hide */
  title?: string | null
}

/**
 * Interactive "rate this recipe" control shared across the recipe design
 * variants. Purely presentational/local state — clicking sets a star value and
 * (optionally) reveals a review box. No network calls; this is design preview
 * scaffolding on mock data.
 */
const RateWidget: FC<Props> = ({
  size = 'lg',
  withReview = true,
  title = 'Rate this recipe',
}) => {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [text, setText] = useState('')

  const display = hover || rating

  if (submitted) {
    return (
      <div className={`rate-widget ${size} submitted`}>
        <div className='rw-thanks'>
          <span className='rw-stars filled'>
            {Array.from({ length: 5 }).map((_, i) => (
              <AiFillStar key={i} className={i < rating ? 'on' : 'off'} />
            ))}
          </span>
          <p>Thanks for rating! Your {rating}-star review was posted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rate-widget ${size}`}>
      {title && <div className='rw-title'>{title}</div>}
      <div
        className='rw-stars'
        onMouseLeave={() => setHover(0)}
        role='radiogroup'
        aria-label='Rating'
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1
          return (
            <button
              key={val}
              type='button'
              className='rw-star'
              aria-label={`${val} star${val > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(val)}
              onClick={() => setRating(val)}
            >
              {val <= display ? (
                <AiFillStar className='on' />
              ) : (
                <AiOutlineStar className='off' />
              )}
            </button>
          )
        })}
        <span className='rw-hint'>
          {display ? `${display} / 5` : 'Tap a star'}
        </span>
      </div>

      {withReview && rating > 0 && (
        <div className='rw-review'>
          <textarea
            placeholder='Share a few words about how it turned out (optional)'
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button
            type='button'
            className='rw-submit'
            onClick={() => setSubmitted(true)}
          >
            Post rating
          </button>
        </div>
      )}
    </div>
  )
}

export default RateWidget
