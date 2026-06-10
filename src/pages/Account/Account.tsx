import React, { FC, useEffect } from 'react'
import { useLocation, useNavigate, Outlet, Link } from 'react-router-dom'
import './Account.scss'
import { Helmet } from 'react-helmet-async'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import GamificationAPI from 'src/api/gamification'
import { useAuth } from 'src/context/AuthContext'
import LevelCard from 'src/pages/Account/components/LevelCard'
import ProfileControls from 'src/pages/Account/components/ProfileControls'
import SegmentedNav from 'src/pages/Account/components/SegmentedNav'

// Format Firebase's `creationTime` ("Tue, 22 Mar 2023 …") as "March 2023".
const formatMemberSince = (creationTime?: string | null): string | null => {
  if (!creationTime) return null
  const d = new Date(creationTime)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const Account: FC = () => {
  const uid = AuthAPI.getUID()

  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const authRes = useAuth()
  const user = authRes?.user

  const { data } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid && !user?.displayName,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => AuthAPI.getProfile(),
    enabled: !!uid,
  })

  const { data: counts } = useQuery({
    queryKey: ['account-counts', uid],
    queryFn: () => RecipeAPI.getAccountCounts(),
    enabled: !!uid,
  })

  const { data: gamification } = useQuery({
    queryKey: ['gamification', uid],
    queryFn: () => GamificationAPI.getGamification(),
    enabled: !!uid,
  })

  // Celebrate any achievements earned since the user last looked, then mark them
  // acknowledged so the toast won't fire again on the next load. Several can
  // unlock at once (e.g. a new user's first visit), so collapse those into one
  // summary toast rather than stacking a wall of them.
  useEffect(() => {
    if (!gamification || gamification.newlyUnlocked.length === 0) return
    const byId = new Map(gamification.achievements.map(a => [a.id, a]))
    const names = gamification.newlyUnlocked
      .map(id => byId.get(id)?.name)
      .filter((n): n is string => !!n)
    if (names.length === 1) {
      toast.success(`🏅 Achievement unlocked: ${names[0]}`)
    } else if (names.length > 1) {
      toast.success(`🏅 ${names.length} achievements unlocked!`)
    }
    GamificationAPI.acknowledgeAchievements(gamification.newlyUnlocked)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['gamification', uid] })
      )
      .catch(() => {
        // Non-fatal: if the ack fails, the toast simply re-fires next load.
      })
  }, [gamification, uid, queryClient])

  const username = user?.displayName ?? data ?? ''
  const displayName = user?.displayName ?? username
  const nameInitial = displayName ? displayName.charAt(0).toUpperCase() : ''

  const memberSince = formatMemberSince(user?.metadata?.creationTime)
  const place = profile?.location ?? ''
  const bio = profile?.bio ?? ''
  // Name and username collapse to the same string today (displayName falls back
  // to the username), so a separate `@handle` would just duplicate the title.
  // Revisit when public profiles (Phase 5) give the handle independent meaning.
  const metaParts = [place, memberSince ? `Since ${memberSince}` : null].filter(
    Boolean
  )

  useEffect(() => {
    if (location.pathname === '/account') {
      navigate('/account/saved-recipes')
    }
  }, [location.pathname, navigate])

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Your Account</title>
      </Helmet>
      <div className='page account-page'>
        <header className='acct-head'>
          <div className='acct-id'>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt='Profile avatar'
                className='acct-avatar'
              />
            ) : (
              <div className='acct-avatar not-set'>{nameInitial}</div>
            )}
            <div className='acct-id-text'>
              <h1 className='acct-name'>{displayName}</h1>
              {/* Hold the meta/bio until the name resolves, so nothing flashes
                  beneath a blank header on first paint. */}
              {displayName && (
                <>
                  {metaParts.length > 0 && (
                    <p className='acct-meta'>{metaParts.join(' · ')}</p>
                  )}
                  {bio ? (
                    <p className='acct-bio'>{bio}</p>
                  ) : (
                    <Link to='/settings' className='acct-bio-empty'>
                      + Add a bio
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className='acct-side'>
            {gamification && (
              <LevelCard
                level={gamification.level}
                rank={gamification.rank}
                xp={gamification.xp}
                xpNext={gamification.xpNext}
                pct={gamification.pct}
              />
            )}
            <ProfileControls />
          </div>
        </header>

        <SegmentedNav counts={counts} />

        <div className='account-body'>
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default Account
