import React, { FC, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BiLogOut } from 'react-icons/bi'
import { NavMenuData } from './types'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'

type AccountCardProps = Pick<
  NavMenuData,
  'isLoggedIn' | 'username' | 'email' | 'nameInitial' | 'photoURL' | 'logout'
> & {
  onClose: () => void
}

/**
 * Logged-in: profile identity (avatar + name + email) and a logout button.
 * Logged-out: prominent Login / Signup CTAs. Skinned via CSS variables in NavMenu.scss.
 */
const AccountCard: FC<AccountCardProps> = ({
  isLoggedIn,
  username,
  email,
  nameInitial,
  photoURL,
  logout,
  onClose,
}) => {
  // Fall back to the initial avatar if the profile image fails to load.
  const [imgFailed, setImgFailed] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className='account-card account-card--logged-out'>
        <NavLink
          to='/login'
          className='account-cta account-cta--login'
          onClick={onClose}
        >
          Log in
        </NavLink>
        <NavLink
          to='/signup'
          className='account-cta account-cta--signup'
          onClick={onClose}
        >
          Sign up
        </NavLink>
      </div>
    )
  }

  return (
    <div className='account-card'>
      <NavLink
        to='/account'
        className='account-card__identity'
        onClick={onClose}
      >
        {photoURL && !imgFailed ? (
          <img
            src={photoURL}
            alt='Profile'
            className='account-card__avatar'
            onError={() => setImgFailed(true)}
          />
        ) : (
          <DefaultAvatar
            seed={username || email}
            className='account-card__avatar account-card__avatar--initial'
            ariaHidden
          />
        )}
        <div className='account-card__meta'>
          <span className='account-card__name'>{username || 'Your account'}</span>
          {email && <span className='account-card__email'>{email}</span>}
        </div>
      </NavLink>
      <button
        className='account-card__logout'
        onClick={() => {
          onClose()
          logout()
        }}
      >
        <BiLogOut className='icon' />
        <span>Log out</span>
      </button>
    </div>
  )
}

export default AccountCard
