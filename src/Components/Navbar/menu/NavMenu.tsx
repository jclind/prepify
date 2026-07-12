import React, { FC } from 'react'
import { useLocation } from 'react-router-dom'
import './NavMenu.scss'
import MenuShell from './MenuShell'
import MenuLink from './MenuLink'
import AccountCard from './AccountCard'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import { getNavGroups } from './navItems'
import { NavMenuProps } from './types'
import { RECIPES_PATH } from 'src/routes'

/**
 * Mobile navigation menu (≤725px): full-screen panel with a subtle brand
 * gradient, an in-menu recipe search, frosted cards grouping the nav, and an
 * account card. Data comes from `useNavMenu` (see Navbar.tsx).
 */
const NavMenu: FC<NavMenuProps> = ({ open, onClose, ...menu }) => {
  // The /recipes browse page has its own search, so don't duplicate it in the
  // menu there. Kept on every other route (incl. single-recipe /recipes/:id).
  const { pathname } = useLocation()
  const showSearch = pathname !== RECIPES_PATH

  return (
  <MenuShell open={open} onClose={onClose}>
    {showSearch && (
      <div className='menu-search'>
        <SearchRecipesInput autoComplete={true} />
      </div>
    )}
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
}

export default NavMenu
