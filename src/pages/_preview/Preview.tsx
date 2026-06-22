// TEMP — mock-data seeder for the SIGNED-IN account experience (throwaway;
// removed before the polish PR). Instead of rendering pages standalone, this
// seeds the app's React Query cache with rich mock data + edge cases and
// disables refetch, so the REAL /account/* routes render fully in context
// (navbar + account header + nav rail + the polished sub-pages) — and the real
// /u/:username profile too. Requires being signed in (any account); the mock
// data overlays whatever account you're in.
import React, { FC, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import { buildPreviewData } from './mockData'
import './preview.scss'

const PREVIEW_HANDLE = 'preview_chef'

const Preview: FC = () => {
  const authRes = useAuth()
  const user = authRes?.user
  const qc = useQueryClient()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!user || seeded) return
    const uid = AuthAPI.getUID() || user.uid
    const data = buildPreviewData()

    // Account header + nav rail queries.
    qc.setQueryData(['username', uid], PREVIEW_HANDLE)
    qc.setQueryData(['profile', uid], {
      bio: data.profile.bio,
      location: data.profile.location,
      isPublic: true,
    })
    qc.setQueryData(['account-counts', uid], {
      saved: 8,
      ratings: data.reviews.length,
      recipes: data.recipes.length,
      drafts: data.drafts.length,
    })
    qc.setQueryData(['gamification', uid], {
      level: data.profile.level,
      rank: data.profile.rank,
      xp: data.profile.xp,
      xpNext: data.profile.xpNext,
      pct: data.profile.pct,
      totalXp: 4200,
      achievements: data.profile.achievements,
      earned: data.profile.achievements.map(a => a.id),
      newlyUnlocked: [],
    })

    // Sub-page queries (keys mirror each page's default sort + page 0).
    qc.setQueryData(['created-recipes', 'new', 0], {
      recipes: data.recipes,
      totalCount: data.recipes.length,
    })
    qc.setQueryData(['user-reviews', 'newAdd', 0], {
      reviews: data.reviews,
      totalCount: data.reviews.length,
    })
    qc.setQueryData(['drafts'], data.drafts)

    // Rich public profile (viewable at /u/preview_chef).
    qc.setQueryData(['public-profile', PREVIEW_HANDLE], {
      ...data.profile,
      username: PREVIEW_HANDLE,
    })

    // Freeze the cache so the real pages render the seeded mock data instead of
    // refetching live (account-scoped session; a page reload clears it).
    qc.setDefaultOptions({
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
      },
    })
    setSeeded(true)
  }, [user, seeded, qc])

  if (!user) {
    return (
      <div className='prev-gate'>
        <h1>Preview needs a signed-in session</h1>
        <p>
          Log in (any account), then come back to <code>/preview</code>. The mock
          data overlays your account so you can see the polished pages in context
          — your real data is untouched (a reload clears the mock).
        </p>
        <Link to='/login' className='prev-gate-btn'>
          Go to log in
        </Link>
      </div>
    )
  }

  if (!seeded) {
    return <div className='prev-loading'>Preparing mock data…</div>
  }

  return (
    <div className='prev-gate'>
      <h1>Mock data loaded ✓</h1>
      <p>
        Rich data + edge cases are seeded into your session. Open each page — they
        render in full context (navbar + account header + nav rail). A page reload
        clears the mock.
      </p>
      <div className='prev-links'>
        <Link to='/account/your-recipes'>Your Recipes →</Link>
        <Link to='/account/ratings'>Ratings →</Link>
        <Link to='/account/drafts'>Drafts →</Link>
        <Link to={`/u/${PREVIEW_HANDLE}`}>Public profile →</Link>
      </div>
      <p className='prev-fine'>
        Edge cases: 1.3M views · super-long titles · brand-new recipe (no
        rating/price) · untitled &amp; empty drafts · long clamped review · 6
        badges. (The “Saved” tab isn’t mocked.)
      </p>
    </div>
  )
}

export default Preview
