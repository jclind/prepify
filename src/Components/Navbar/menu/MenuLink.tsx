import React, { FC } from 'react'
import { NavLink } from 'react-router-dom'
import { NavItem } from './types'

type MenuLinkProps = {
  item: NavItem
  onClose: () => void
  showIcon?: boolean
}

/** A single nav row (icon + label) used across variants. */
const MenuLink: FC<MenuLinkProps> = ({ item, onClose, showIcon = true }) => {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClose}
      className={({ isActive }) => (isActive ? 'menu-link is-active' : 'menu-link')}
    >
      {showIcon && <Icon className='menu-link__icon' />}
      <span className='menu-link__label'>{item.label}</span>
    </NavLink>
  )
}

export default MenuLink
