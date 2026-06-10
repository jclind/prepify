import React, { FC, useEffect } from 'react'
import { useLocation, useNavigate, Outlet, Link } from 'react-router-dom'
import './Account.scss'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
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
            <LevelCard />
            <ProfileControls />
          </div>
        </header>

        <SegmentedNav />

        <div className='account-body'>
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default Account
