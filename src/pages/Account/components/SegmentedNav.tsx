import React, { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AccountTabCounts } from 'types'
import { accountTabs, activeAccountTabIndex } from './accountTabs'

// SegmentedNav — the account sub-route switcher. On desktop (≥900px, see
// Account.scss) it's a vertical rail sitting beside the sub-page content, turning
// the account into a two-column dashboard. Below that it collapses to a fixed
// four-up icon-over-label tab bar — all four destinations stay visible, never a
// horizontal scroll. The four tabs are URL routes (so deep-links keep working)
// and the active route gets a tinted background. Counts come from the aggregate
// GET /getAccountCounts query (passed in by Account); a tab shows its number only
// once counts have loaded and the count is non-zero. The route/label definitions
// live in ./accountTabs so the SR panel heading in Account stays in sync. (Named
// SegmentedNav for history; the control is now a rail.)

type SegmentedNavProps = {
  counts?: AccountTabCounts | null
}

const SegmentedNav: FC<SegmentedNavProps> = ({ counts }) => {
  const { pathname } = useLocation()
  const activeIndex = activeAccountTabIndex(pathname)

  return (
    <div className='acct-segment' role='navigation' aria-label='Account sections'>
      {accountTabs.map((t, i) => {
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
