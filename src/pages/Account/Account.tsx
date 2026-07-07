import React, { FC, useEffect, useState } from 'react'
import { useLocation, useNavigate, Outlet, Link } from 'react-router-dom'
import './Account.scss'
import { Helmet } from 'react-helmet-async'
import LevelCard from 'src/pages/Account/components/LevelCard'
import ProfileControls from 'src/pages/Account/components/ProfileControls'
import SegmentedNav from 'src/pages/Account/components/SegmentedNav'
import {
  accountTabs,
  activeAccountTab,
} from 'src/pages/Account/components/accountTabs'
import AchievementsModal from 'src/pages/Account/components/AchievementsModal'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'
import { useAccountData } from 'src/pages/Account/useAccountData'
import { useAchievementsToast } from 'src/pages/Account/useAchievementsToast'

const Account: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [rewardsOpen, setRewardsOpen] = useState(false)
  // Fall back to the initial if the avatar URL fails to load instead of showing
  // a broken image.
  const [avatarError, setAvatarError] = useState(false)

  const { handle, displayName, photoURL, metaParts, bio, counts, gamification } =
    useAccountData()
  useAchievementsToast(gamification)

  useEffect(() => {
    if (location.pathname === '/account') {
      // Redirect bare /account to the default tab. accountTabs[0] (saved) is the
      // default — same source activeAccountTabIndex treats as the /account
      // fallback — so the redirect target can't drift from the nav/heading.
      navigate(accountTabs[0].to)
    }
  }, [location.pathname, navigate])

  // Reset the avatar fallback when the photo changes.
  useEffect(() => setAvatarError(false), [photoURL])

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
            {photoURL && !avatarError ? (
              <img
                src={photoURL}
                alt='Profile avatar'
                className='acct-avatar'
                onError={() => setAvatarError(true)}
              />
            ) : (
              <DefaultAvatar
                seed={handle || displayName}
                className='acct-avatar not-set'
                title='Profile avatar'
              />
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
            {/* Heading for the active tab's panel (visually hidden) so the card
                <h3>s inside don't skip a level under the profile <h1>. Derived
                from the same accountTabs source as SegmentedNav's highlight, so
                the heading and the active tab always name the same route. */}
            <h2 className='sr-only'>
              {activeAccountTab(location.pathname).srHeading}
            </h2>
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
