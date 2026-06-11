import React, { FC, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiBookmark, FiStar, FiBookOpen, FiFileText } from 'react-icons/fi'
import { AccountTabCounts } from 'types'

// SegmentedNav — the account sub-route switcher. On desktop it's the centered
// text segmented control from the P2 header; on phones (≤600px, see Account.scss)
// it becomes an app-style icon-over-label tab bar. The four tabs are URL routes
// (so deep-links keep working) and the sliding white indicator follows the active
// route at every width. Counts come from the aggregate GET /getAccountCounts
// query (passed in by Account); a tab shows its number only once counts have
// loaded and the count is non-zero.

type Tab = {
  key: keyof AccountTabCounts
  label: string
  // Shorter label swapped in on the phone tab bar, where a single line per cell
  // keeps the four columns even. Only set where the desktop label is too long.
  short?: string
  icon: ReactNode
  to: string
}

const tabs: Tab[] = [
  { key: 'saved', label: 'Saved', icon: <FiBookmark />, to: '/account/saved-recipes' },
  { key: 'ratings', label: 'Ratings', icon: <FiStar />, to: '/account/ratings' },
  {
    key: 'recipes',
    label: 'Your Recipes',
    short: 'Recipes',
    icon: <FiBookOpen />,
    to: '/account/your-recipes',
  },
  { key: 'drafts', label: 'Drafts', icon: <FiFileText />, to: '/account/drafts' },
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
            <span className='acct-seg-icon' aria-hidden>
              {t.icon}
            </span>
            <span className={`acct-seg-label${t.short ? ' has-short' : ''}`}>
              {t.label}
            </span>
            {t.short && (
              <span className='acct-seg-label acct-seg-label-short'>
                {t.short}
              </span>
            )}
            {count != null && count > 0 && (
              <span className='acct-seg-count'>{count}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default SegmentedNav
