import React, { FC, useState } from 'react'

type StarRatingProps = {
  rating: number
  color?: string
  size?: number
  spacing?: number
  interactive?: boolean
  onChange?: (val: number) => void
}

const StarSVG: FC<{ filled: boolean; color: string; size: number }> = ({
  filled,
  color,
  size,
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill={filled ? color : 'none'}
    stroke={filled ? color : '#cccccc'}
    strokeWidth='1.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
  </svg>
)

const StarRating: FC<StarRatingProps> = ({
  rating,
  color = '#ff5722',
  size = 24,
  spacing = 2,
  interactive = false,
  onChange,
}) => {
  const [hovered, setHovered] = useState(0)

  return (
    <div style={{ display: 'inline-flex', gap: spacing }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type='button'
          onClick={interactive ? () => onChange?.(i) : undefined}
          onMouseEnter={interactive ? () => setHovered(i) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: interactive ? 'pointer' : 'default',
            display: 'flex',
            lineHeight: 0,
          }}
          tabIndex={interactive ? 0 : -1}
          aria-label={interactive ? `Rate ${i} out of 5` : undefined}
        >
          <StarSVG filled={i <= (hovered || rating)} color={color} size={size} />
        </button>
      ))}
    </div>
  )
}

export default StarRating
