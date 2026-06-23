import React, { FC } from 'react'
import { getDefaultAvatar } from 'src/util/defaultAvatar'
import './DefaultAvatar.scss'

type DefaultAvatarProps = {
  // Stable identity (username) so the emoji/colour is consistent per user.
  seed: string | null | undefined
  // The avatar slot's existing class — supplies size + border-radius.
  className?: string
  // Accessible label; omit / pass ariaHidden when a sibling already names it.
  title?: string
  ariaHidden?: boolean
}

/**
 * Fun default avatar for users with no photo: a deterministic food emoji on a
 * soft tile. The emoji is drawn in an SVG so it scales to whatever size the
 * passed-in className gives the tile (16px nav avatar → 120px profile header).
 */
const DefaultAvatar: FC<DefaultAvatarProps> = ({
  seed,
  className = '',
  title,
  ariaHidden,
}) => {
  const { emoji, bg } = getDefaultAvatar(seed)
  return (
    <span
      className={`default-avatar ${className}`}
      style={{ background: bg }}
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : title || 'Default avatar'}
      aria-hidden={ariaHidden || undefined}
    >
      <svg className='default-avatar__art' viewBox='0 0 100 100'>
        <text
          x='50'
          y='54'
          textAnchor='middle'
          dominantBaseline='central'
          fontSize='58'
        >
          {emoji}
        </text>
      </svg>
    </span>
  )
}

export default DefaultAvatar
