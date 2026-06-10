import React, { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AccountTabCounts } from 'types'

// SegmentedNav — the centered segmented control from the P2 header, wired to the
// real account sub-routes. The four tabs are URL routes (so deep-links keep
// working); the sliding indicator follows the active route. Counts come from the
// aggregate GET /getAccountCounts query (passed in by Account); a tab shows its
// number only once counts have loaded and the count is non-zero.

type Tab = {
  key: keyof AccountTabCounts
  label: string
  to: string
}

const tabs: Tab[] = [
  { key: 'saved', label: 'Saved', to: '/account/saved-recipes' },
  { key: 'ratings', label: 'Ratings', to: '/account/ratings' },
  { key: 'recipes', label: 'Your Recipes', to: '/account/your-recipes' },
  { key: 'drafts', label: 'Drafts', to: '/account/drafts' },
]

type SegmentedNavProps = {
  counts?: AccountTabCounts | null
}

const SegmentedNav: FC<SegmentedNavProps> = ({ counts }) => {
  const { pathname } = useLocation()
  // The bare /account path redirects to saved-recipes, so treat it as "saved".
  const activeIndex = Math.max(
    0,
    tabs.findIndex(t =>
      t.key === 'saved'
        ? pathname === '/account' || pathname.startsWith(t.to)
        : pathname.startsWith(t.to)
    )
  )

  return (
    <div
      className='acct-segment'
      role='navigation'
      aria-label='Account sections'
      style={{
        ['--seg-i' as string]: activeIndex,
        ['--seg-n' as string]: tabs.length,
      }}
    >
      <div className='acct-seg-indicator' />
      {tabs.map((t, i) => {
        const count = counts?.[t.key]
        return (
          <Link
            key={t.key}
            to={t.to}
            className={`acct-seg ${i === activeIndex ? 'active' : ''}`}
            aria-current={i === activeIndex ? 'page' : undefined}
          >
            {t.label}
            {count != null && count > 0 && <span>{count}</span>}
          </Link>
        )
      })}
    </div>
  )
}

export default SegmentedNav
