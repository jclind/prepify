import React, { FC, useId, useRef, useState } from 'react'

type StarRatingProps = {
  rating: number
  color?: string
  size?: number
  spacing?: number
  interactive?: boolean
  onChange?: (val: number) => void
  ariaLabel?: string
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
  ariaLabel = 'Rating',
}) => {
  const [hovered, setHovered] = useState(0)
  // useId can contain ':' which is awkward inside url(#...) fragment refs.
  const baseId = useId().replace(/:/g, '')
  // While hovering/focusing, preview the whole-star value under the
  // cursor/focus; otherwise show the actual (possibly fractional) rating.
  const displayRating = hovered || rating
  // Refs to each star button, indexed 0-4 (star i lives at starRefs[i - 1]),
  // used to move DOM focus when arrow-key navigation changes the selection.
  const starRefs = useRef<Array<HTMLButtonElement | null>>([])

  const moveSelection = (next: number) => {
    onChange?.(next)
    starRefs.current[next - 1]?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        moveSelection(Math.min((rating || 0) + 1, 5))
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        moveSelection(Math.max((rating || 0) - 1, 1))
        break
      case 'Home':
        e.preventDefault()
        moveSelection(1)
        break
      case 'End':
        e.preventDefault()
        moveSelection(5)
        break
      default:
        break
    }
  }

  return (
    // Display-only stars convey their value once via an img role on the row, so
    // the individual stars below render as plain <span>s (not <button>s). A
    // focusable <button> inside the row's `role="img"` is a nested-interactive
    // a11y failure, and the stars carry no name of their own.
    //
    // Interactive stars are modeled as a WAI-ARIA radiogroup: the row carries
    // role="radiogroup" and each star is role="radio", with a roving tabindex
    // so the group is a single tab stop and arrow keys move the selection.
    <div
      style={{ display: 'inline-flex', gap: spacing }}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? ariaLabel : `Rated ${rating} out of 5`}
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
            ref={el => {
              starRefs.current[i - 1] = el
            }}
            type='button'
            role='radio'
            aria-checked={i === rating}
            tabIndex={i === (rating || 1) ? 0 : -1}
            onClick={() => onChange?.(i)}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(0)}
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
