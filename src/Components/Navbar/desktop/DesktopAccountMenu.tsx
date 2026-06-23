import React, { FC, useEffect, useId, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AiOutlineUser, AiOutlineSetting } from 'react-icons/ai'
import { BiHelpCircle, BiLogOut } from 'react-icons/bi'
import { MdKeyboardArrowDown, MdOutlineRestaurantMenu } from 'react-icons/md'
import { IconType } from 'react-icons'
import { NavMenuData } from 'src/Components/Navbar/menu/types'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'

type DesktopAccountMenuProps = Pick<
  NavMenuData,
  'username' | 'email' | 'photoURL' | 'logout'
>

type LinkItem = { to: string; label: string; Icon: IconType }

/**
 * Accessible avatar dropdown ("Profile Card"): a profile header (avatar + name +
 * email linking to /account), the account links, and an outlined Log out button.
 *
 * Built as a disclosure (a button with `aria-expanded`/`aria-controls` revealing
 * a panel of links) rather than an ARIA `menu` — site-nav dropdowns don't have
 * the application-menu keyboard model (arrow navigation / roving focus), so the
 * lighter disclosure semantics are the honest, correct fit. Opens on click,
 * closes on outside-click and Escape (which returns focus to the trigger).
 */
const DesktopAccountMenu: FC<DesktopAccountMenuProps> = ({
  username,
  email,
  photoURL,
  logout,
}) => {
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
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
      <DefaultAvatar
        seed={username || email}
        className={`${className} ${className}--initial`}
        ariaHidden
      />
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
        ref={btnRef}
        type='button'
        className='dnav-account__btn'
        aria-haspopup='true'
        aria-expanded={open}
        aria-controls={panelId}
        aria-label='Account menu'
        onClick={() => setOpen(o => !o)}
      >
        {renderAvatar('dnav-account__avatar')}
        {/* Fixed-size clip box; the inner icon (not this box) rotates, so the
            rotation never enlarges the button's `outline: auto` focus ring. */}
        <span className='dnav-account__caret'>
          <MdKeyboardArrowDown className='dnav-account__caret-icon' />
        </span>
      </button>

      <div className='dnav-account__menu' id={panelId}>
        <NavLink
          to='/account'
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

        <ul className='dnav-account__links'>
          {linkItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink to={to} className='dnav-account__item' onClick={close}>
                <Icon className='icon' />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type='button'
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
