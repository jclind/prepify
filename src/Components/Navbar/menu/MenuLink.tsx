import React, { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { NavItem } from './types'

type MenuLinkProps = {
  item: NavItem
  onClose: () => void
}

/** A single nav row (icon + label) in the mobile menu. */
const MenuLink: FC<MenuLinkProps> = ({ item, onClose }) => {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClose}
      className={({ isActive }) => (isActive ? 'menu-link is-active' : 'menu-link')}
    >
      <Icon className='menu-link__icon' />
      <span className='menu-link__label'>{item.label}</span>
    </NavLink>
  )
}

export default MenuLink
