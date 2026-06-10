import React, { FC, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AiOutlineUser, AiOutlineSetting } from 'react-icons/ai'
import { BiHelpCircle, BiLogOut } from 'react-icons/bi'
import { MdKeyboardArrowDown, MdOutlineRestaurantMenu } from 'react-icons/md'
import { IconType } from 'react-icons'
import { NavMenuData } from 'src/Components/Navbar/menu/types'
import { useDesktopDropdown } from './dropdownStore'

type DesktopAccountMenuProps = Pick<
  NavMenuData,
  'username' | 'email' | 'nameInitial' | 'photoURL' | 'logout'
>

type LinkItem = { to: string; label: string; Icon: IconType }

/**
 * Accessible avatar dropdown shared by every desktop variant. Replaces the old
 * hover-only menu (invalid CSS, keyboard-inaccessible) with a click/focus toggle
 * that closes on outside-click and Escape.
 *
 * The *menu design* is a switchable dimension (see dropdownRegistry/dropdownStore
 * + the dev switcher): classic card, profile card, compact list, or rich
 * sections. The trigger + open/close behavior stay shared across all of them.
 */
const DesktopAccountMenu: FC<DesktopAccountMenuProps> = ({
  username,
  email,
  nameInitial,
  photoURL,
  logout,
}) => {
  const dropdownId = useDesktopDropdown()
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const renderAvatar = (className: string) =>
    photoURL && !imgFailed ? (
      <img
        src={photoURL}
        alt='Profile'
        className={className}
        onError={() => setImgFailed(true)}
      />
    ) : (
      <span className={`${className} ${className}--initial`}>{nameInitial}</span>
    )

  const showProfileHeader = dropdownId === 'profile' || dropdownId === 'rich'
  const buttonLogout = dropdownId === 'classic' || dropdownId === 'compact'

  const linkItems: LinkItem[] = [
    { to: '/account', label: 'Account', Icon: AiOutlineUser },
    { to: '/account/your-recipes', label: 'Your recipes', Icon: MdOutlineRestaurantMenu },
    { to: '/settings', label: 'Settings', Icon: AiOutlineSetting },
    { to: '/help', label: 'Help', Icon: BiHelpCircle },
  ]

  return (
    <div
      className={`dnav-account dnav-account--${dropdownId}${open ? ' is-open' : ''}`}
      ref={ref}
    >
      <button
        type='button'
        className='dnav-account__btn'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label='Account menu'
        onClick={() => setOpen(o => !o)}
      >
        {renderAvatar('dnav-account__avatar')}
        {/* Shown only by variants that surface the name beside the avatar. */}
        <span className='dnav-account__name'>{username || 'Account'}</span>
        <MdKeyboardArrowDown className='dnav-account__caret' />
      </button>

      <div className='dnav-account__menu' role='menu'>
        {/* Header */}
        {dropdownId === 'classic' && (
          <div className='dnav-account__identity'>
            <AiOutlineUser className='icon' />
            <span className='text'>
              Signed in as <strong>{username || 'you'}</strong>
              {email && <span className='dnav-account__email'>{email}</span>}
            </span>
          </div>
        )}
        {showProfileHeader && (
          <NavLink
            to='/account'
            role='menuitem'
            className='dnav-account__profile'
            onClick={close}
          >
            {renderAvatar('dnav-account__profile-avatar')}
            <span className='dnav-account__profile-meta'>
              <span className='dnav-account__profile-name'>
                {username || 'Your account'}
              </span>
              {email && <span className='dnav-account__email'>{email}</span>}
            </span>
          </NavLink>
        )}

        {/* Links */}
        <div className='dnav-account__links'>
          {dropdownId === 'rich' && (
            <p className='dnav-account__group-heading'>Manage</p>
          )}
          {linkItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              role='menuitem'
              className='dnav-account__item'
              onClick={close}
            >
              <Icon className='icon' />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Logout */}
        {buttonLogout ? (
          <button
            type='button'
            role='menuitem'
            className='dnav-account__item dnav-account__logout'
            onClick={() => {
              close()
              logout()
            }}
          >
            <BiLogOut className='icon' />
            <span>Log out</span>
          </button>
        ) : (
          <button
            type='button'
            role='menuitem'
            className='dnav-account__logout-btn'
            onClick={() => {
              close()
              logout()
            }}
          >
            <BiLogOut className='icon' />
            <span>Log out</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default DesktopAccountMenu
