import { FolderIcon } from 'src/Components/icons'
import React, { FC, ReactNode } from 'react'

// A collection tile on the Saved page: cover photo on top, name + count on a
// white caption strip. Fixed height with the name clamped to two lines (so a
// long name can't reflow the row), and the name+count sit together with one
// fixed gap (chosen "grouped" spacing) so short and long names read the same.
const CollectionCard: FC<{
  label: string
  count: number | null
  cover: string | null
  active: boolean
  icon?: ReactNode
  // 'all' = the system "All saved" view; gets a branded thumb so it reads as the
  // primary all-view rather than an empty-folder fallback.
  variant?: 'default' | 'all'
  onClick: () => void
}> = ({ label, count, cover, active, icon, variant = 'default', onClick }) => (
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
      {count != null && (
        <span className='collection-card__count'>{count} saved</span>
      )}
    </span>
  </button>
)

export default CollectionCard
