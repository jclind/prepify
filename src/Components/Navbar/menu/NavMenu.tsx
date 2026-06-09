import React, { FC } from 'react'
import './NavMenu.scss'
import MenuShell from './MenuShell'
import MenuLink from './MenuLink'
import AccountCard from './AccountCard'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import { getNavGroups } from './navItems'
import { NavMenuVariantProps } from './types'

/**
 * Mobile navigation menu (≤725px): full-screen panel with a subtle brand
 * gradient, an in-menu recipe search, frosted cards grouping the nav, and an
 * account card. Data comes from `useNavMenu` (see Navbar.tsx).
 */
const NavMenu: FC<NavMenuVariantProps> = ({ open, onClose, ...menu }) => (
  <MenuShell open={open} onClose={onClose}>
    <div className='menu-search'>
      <SearchRecipesInput autoComplete={true} />
    </div>
    {getNavGroups(menu.isLoggedIn).map(group => (
      <div className='menu-group' key={group.heading}>
        <p className='menu-group__heading'>{group.heading}</p>
        {group.items.map(item => (
          <MenuLink key={item.to} item={item} onClose={onClose} />
        ))}
      </div>
    ))}
    <AccountCard {...menu} onClose={onClose} />
  </MenuShell>
)

export default NavMenu
