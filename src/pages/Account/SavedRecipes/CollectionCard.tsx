import { FolderIcon } from 'src/Components/icons'
import React, { FC, ReactNode } from 'react'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'

// A collection tile on the Saved page: cover photo on top, name + count on a
// white caption strip. Fixed height with the name clamped to two lines (so a
// long name can't reflow the row), and the name+count sit together with one
// fixed gap (chosen "grouped" spacing) so short and long names read the same.
const CollectionCard: FC<{
  label?: string
  count?: number | null
  cover?: string | null
  active?: boolean
  icon?: ReactNode
  // 'all' = the system "All saved" view; gets a branded thumb so it reads as the
  // primary all-view rather than an empty-folder fallback.
  variant?: 'default' | 'all'
  // Whole-card placeholder while the collections list is loading. Renders the
  // same 158px tile (thumb + name + count) with skeleton fills, so the row
  // reserves its real height instead of popping collections in under the grid.
  loading?: boolean
  // The "All saved" count comes from a separate query than the card itself, so
  // show a count skeleton while only that value is still resolving.
  countLoading?: boolean
  // Extra class on the loading placeholder (e.g. `sk-hold` to reserve its slot
  // through the flash-guard window without painting yet).
  className?: string
  onClick?: () => void
}> = ({
  label,
  count,
  cover,
  active,
  icon,
  variant = 'default',
  loading = false,
  countLoading = false,
  className = '',
  onClick,
}) => {
  if (loading) {
    return (
      <div className={`collection-card ${className}`.trim()} aria-hidden='true'>
        <span className='collection-card__thumb empty'>
          <Skeleton containerClassName='cc-thumb-sk' baseColor={skeletonColor} />
        </span>
        <span className='collection-card__text'>
          <span className='collection-card__name'>
            <Skeleton inline width='75%' baseColor={skeletonColor} />
          </span>
          <span className='collection-card__count'>
            <Skeleton inline width='45%' baseColor={skeletonColor} />
          </span>
        </span>
      </div>
    )
  }

  return (
    <button
      type='button'
      className={`collection-card ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span
        className={`collection-card__thumb ${cover ? '' : 'empty'} ${
          variant === 'all' ? 'all' : ''
        }`.trim()}
      >
        {cover ? <img src={cover} alt='' /> : icon ?? <FolderIcon />}
      </span>
      <span className='collection-card__text'>
        <span className='collection-card__name'>{label}</span>
        {count != null ? (
          <span className='collection-card__count'>{count} saved</span>
        ) : countLoading ? (
          <span className='collection-card__count'>
            <Skeleton inline width={52} baseColor={skeletonColor} />
          </span>
        ) : null}
      </span>
    </button>
  )
}

export default CollectionCard
