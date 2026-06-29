import { BookmarkIcon, PlusCircleIcon, RecipesMenuIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import DesktopAccountMenu from './DesktopAccountMenu'
import { DesktopNavProps } from './types'

const skeletonColor = '#d6d6d6'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'dnav__link is-active' : 'dnav__link'

/** Logged-out actions: ghost Log in + accent Sign up CTAs. */
const DesktopCTAs: FC = () => (
  <>
    <NavLink
      to='/login'
      className={({ isActive }) =>
        isActive ? 'dnav__cta dnav__cta--login is-active' : 'dnav__cta dnav__cta--login'
      }
    >
      Log in
    </NavLink>
    <NavLink to='/signup' className='dnav__cta dnav__cta--signup'>
      Sign up
    </NavLink>
  </>
)

/**
 * The desktop nav bar (>725px): prominent persistent search · Recipes · Create ·
 * Saved · accessible account menu (logged in) / Log in + Sign up CTAs (logged
 * out). Visual identity is the "Quiet" skin in DesktopNav.scss; the surface
 * flips transparent→solid on scroll (driven by `.nav--solid` on the shell).
 */
const DesktopBar: FC<DesktopNavProps> = data => {
  const { isLoggedIn, authLoading } = data
  // The /recipes browse page carries its own prominent search, so suppress the
  // duplicate one in the top bar there (and only there — single-recipe pages at
  // /recipes/:id have no search of their own and keep it). With the search gone,
  // `.dnav--no-search` pushes the links/actions cluster to the right so the bar
  // doesn't leave a gap — same treatment the Home hero uses (DesktopNav.scss).
  const { pathname } = useLocation()
  const showSearch = pathname !== '/recipes'

  return (
    <div className={`dnav dnav--quiet${showSearch ? '' : ' dnav--no-search'}`}>
      {showSearch && (
        <div className='dnav__search'>
          <SearchRecipesInput autoComplete={true} />
        </div>
      )}

      <nav className='dnav__links' aria-label='Primary'>
        {/* aria-label keeps the name when the label collapses to an icon below
            1000px (the icon SVG carries no accessible name on its own). */}
        <NavLink to='/recipes' className={linkClass} aria-label='Recipes'>
          <RecipesMenuIcon className='dnav__link-icon' />
          <span className='dnav__link-label'>Recipes</span>
        </NavLink>
        {isLoggedIn && (
          <NavLink
            to='/add-recipe'
            aria-label='Create Recipe'
            className={({ isActive }) =>
              `dnav__link dnav__create dnav__create--promoted${
                isActive ? ' is-active' : ''
              }`
            }
          >
            <PlusCircleIcon className='dnav__link-icon' />
            <span className='dnav__link-label'>Create Recipe</span>
          </NavLink>
        )}
      </nav>

      <div className='dnav__actions'>
        {authLoading ? (
          <Skeleton className='dnav__actions-loading' baseColor={skeletonColor} />
        ) : isLoggedIn ? (
          <>
            <NavLink
              to='/account/saved-recipes'
              aria-label='Saved recipes'
              className={({ isActive }) =>
                isActive ? 'dnav__icon-link is-active' : 'dnav__icon-link'
              }
            >
              <BookmarkIcon />
            </NavLink>
            <DesktopAccountMenu {...data} />
          </>
        ) : (
          <DesktopCTAs />
        )}
      </div>
    </div>
  )
}

export default DesktopBar
