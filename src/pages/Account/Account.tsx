import React, { FC, useEffect, useState } from 'react'
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
import AchievementsModal from 'src/pages/Account/components/AchievementsModal'

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
  const [rewardsOpen, setRewardsOpen] = useState(false)
  // Fall back to the initial if the avatar URL fails to load instead of showing
  // a broken image.
  const [avatarError, setAvatarError] = useState(false)

  const authRes = useAuth()
  const user = authRes?.user

  // Always fetch the real username handle (even when a Firebase displayName
  // exists): the Share link and public profile route resolve by handle, not by
  // display name, so we need it regardless of what we show in the header.
  const { data } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
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

  const handle = data ?? '' // the real @username, used for the share/public link
  const displayName = user?.displayName ?? handle
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

  // Reset the avatar fallback when the photo changes.
  useEffect(() => setAvatarError(false), [user?.photoURL])

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Your Account · Prepify</title>
        <meta name='robots' content='noindex' />
      </Helmet>
      <div className='page account-page'>
        <header className='acct-head'>
          <div className='acct-id'>
            {user?.photoURL && !avatarError ? (
              <img
                src={user.photoURL}
                alt='Profile avatar'
                className='acct-avatar'
                onError={() => setAvatarError(true)}
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
                onRewards={() => setRewardsOpen(true)}
              />
            )}
            <ProfileControls username={handle || undefined} />
          </div>
        </header>

        <div className='acct-main'>
          <SegmentedNav counts={counts} />

          <div className='account-body'>
            <Outlet />
          </div>
        </div>
      </div>

      <AchievementsModal
        isOpen={rewardsOpen}
        onClose={() => setRewardsOpen(false)}
        achievements={gamification?.achievements ?? []}
      />
    </>
  )
}

export default Account
