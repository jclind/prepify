import React, { FC, useId, useState } from 'react'

type StarRatingProps = {
  rating: number
  color?: string
  size?: number
  spacing?: number
  interactive?: boolean
  onChange?: (val: number) => void
}

// Renders a single star filled left-to-right by `fill` (0–1) using a
// hard-edged linear gradient, so fractional ratings (e.g. 4.5) display as
// partial stars. A unique gradientId per star avoids collisions when several
// StarRatings render on the same page.
const StarSVG: FC<{
  fill: number
  color: string
  size: number
  gradientId: string
}> = ({ fill, color, size, gradientId }) => {
  const clamped = Math.max(0, Math.min(1, fill))
  const offset = `${clamped * 100}%`
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' aria-hidden='true'>
      <defs>
        <linearGradient id={gradientId}>
          <stop offset={offset} stopColor={color} />
          <stop offset={offset} stopColor='transparent' />
        </linearGradient>
      </defs>
      <polygon
        points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'
        fill={`url(#${gradientId})`}
        stroke={clamped > 0 ? color : '#cccccc'}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

const StarRating: FC<StarRatingProps> = ({
  rating,
  color = '#ff5722',
  size = 24,
  spacing = 2,
  interactive = false,
  onChange,
}) => {
  const [hovered, setHovered] = useState(0)
  // useId can contain ':' which is awkward inside url(#...) fragment refs.
  const baseId = useId().replace(/:/g, '')
  // While hovering, preview the whole-star value under the cursor; otherwise
  // show the actual (possibly fractional) rating.
  const displayRating = hovered || rating

  return (
    // Display-only stars convey their value once via an img role on the row, so
    // the individual stars below render as plain <span>s (not <button>s). A
    // focusable <button> inside the row's `role="img"` is a nested-interactive
    // a11y failure, and the stars carry no name of their own.
    <div
      style={{ display: 'inline-flex', gap: spacing }}
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : `Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const star = (
          <StarSVG
            fill={displayRating - (i - 1)}
            color={color}
            size={size}
            gradientId={`${baseId}-${i}`}
          />
        )
        if (!interactive) {
          return (
            <span key={i} style={{ display: 'flex', lineHeight: 0 }}>
              {star}
            </span>
          )
        }
        return (
          <button
            key={i}
            type='button'
            onClick={() => onChange?.(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              lineHeight: 0,
            }}
            aria-label={`Rate ${i} out of 5`}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}

export default StarRating
