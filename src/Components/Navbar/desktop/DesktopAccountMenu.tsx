import React, { FC, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AiOutlineUser, AiOutlineSetting } from 'react-icons/ai'
import { BiHelpCircle, BiLogOut } from 'react-icons/bi'
import { MdKeyboardArrowDown, MdOutlineRestaurantMenu } from 'react-icons/md'
import { IconType } from 'react-icons'
import { NavMenuData } from 'src/Components/Navbar/menu/types'

type DesktopAccountMenuProps = Pick<
  NavMenuData,
  'username' | 'email' | 'nameInitial' | 'photoURL' | 'logout'
>

type LinkItem = { to: string; label: string; Icon: IconType }

/**
 * Accessible avatar dropdown ("Profile Card"): a profile header (avatar + name +
 * email linking to /account), the account links, and an outlined Log out button.
 * Opens on click, closes on outside-click and Escape, exposes aria-expanded.
 */
const DesktopAccountMenu: FC<DesktopAccountMenuProps> = ({
  username,
  email,
  nameInitial,
  photoURL,
  logout,
}) => {
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

  const linkItems: LinkItem[] = [
    { to: '/account', label: 'Account', Icon: AiOutlineUser },
    { to: '/account/your-recipes', label: 'Your recipes', Icon: MdOutlineRestaurantMenu },
    { to: '/settings', label: 'Settings', Icon: AiOutlineSetting },
    { to: '/help', label: 'Help', Icon: BiHelpCircle },
  ]

  return (
    <div className={`dnav-account${open ? ' is-open' : ''}`} ref={ref}>
      <button
        type='button'
        className='dnav-account__btn'
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label='Account menu'
        onClick={() => setOpen(o => !o)}
      >
        {renderAvatar('dnav-account__avatar')}
        <MdKeyboardArrowDown className='dnav-account__caret' />
      </button>

      <div className='dnav-account__menu' role='menu'>
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

        <div className='dnav-account__links'>
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
      </div>
    </div>
  )
}

export default DesktopAccountMenu
