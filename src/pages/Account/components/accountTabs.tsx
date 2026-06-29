import React, { ReactNode } from 'react'
import { FiBookmark, FiStar, FiBookOpen, FiFileText } from 'react-icons/fi'
import { AccountTabCounts } from 'types'

// The single source of truth for the account sub-routes. Both SegmentedNav (the
// rail/tab-bar switcher) and Account (the visually-hidden per-panel <h2>) derive
// from this list, so a route rename here updates the nav and the screen-reader
// heading together — they can't silently drift apart.

export type AccountTab = {
  key: keyof AccountTabCounts
  // Desktop rail label.
  label: string
  // Shorter label swapped in on the phone tab bar, where a single line per cell
  // keeps the four columns even. Only set where the desktop label is too long.
  short?: string
  // Visually-hidden <h2> for the tab's panel. Intentionally fuller than the
  // terse nav label ("Saved" → "Saved recipes") so the heading reads as a
  // standalone landmark out of the nav's visual context.
  srHeading: string
  icon: ReactNode
  to: string
}

export const accountTabs: AccountTab[] = [
  {
    key: 'saved',
    label: 'Saved',
    srHeading: 'Saved recipes',
    icon: <FiBookmark />,
    to: '/account/saved-recipes',
  },
  {
    key: 'ratings',
    label: 'Ratings',
    srHeading: 'Your ratings',
    icon: <FiStar />,
    to: '/account/ratings',
  },
  {
    key: 'recipes',
    label: 'Your Recipes',
    short: 'Recipes',
    srHeading: 'Recipes you created',
    icon: <FiBookOpen />,
    to: '/account/your-recipes',
  },
  {
    key: 'drafts',
    label: 'Drafts',
    srHeading: 'Your drafts',
    icon: <FiFileText />,
    to: '/account/drafts',
  },
]

// Resolve the active tab index from a pathname. The bare /account path redirects
// to saved-recipes, so it's treated as the "saved" tab. Falls back to 0 (saved)
// for any unmatched path so callers always get a valid tab.
export const activeAccountTabIndex = (pathname: string): number =>
  Math.max(
    0,
    accountTabs.findIndex(t =>
      t.key === 'saved'
        ? pathname === '/account' || pathname.startsWith(t.to)
        : pathname.startsWith(t.to)
    )
  )
