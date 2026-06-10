import React, { FC } from 'react'
import { NavLink } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import { MdOutlineRestaurantMenu } from 'react-icons/md'
import { AiOutlinePlusCircle } from 'react-icons/ai'
import { BiBookmark } from 'react-icons/bi'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import DesktopAccountMenu from './DesktopAccountMenu'
import { useDesktopCreateStyle } from './createStore'
import { useAuthPreview } from './authPreviewStore'
import { DesktopNavProps, DesktopVariant } from './types'

const skeletonColor = '#d6d6d6'

type DesktopBarProps = DesktopNavProps & { variant: DesktopVariant }

/** Dev-only: force the bar into a signed-in / signed-out preview. No-op in prod. */
const useEffectiveAuth = (data: DesktopNavProps): DesktopNavProps => {
  const preview = useAuthPreview()
  if (!import.meta.env.DEV || preview === 'auto') return data
  if (preview === 'out') return { ...data, isLoggedIn: false, authLoading: false }
  // 'in' — fill mock identity when the real one is empty so the avatar/menu read
  return {
    ...data,
    isLoggedIn: true,
    authLoading: false,
    username: data.username || 'Preview Chef',
    email: data.email || 'preview@prepify.app',
    nameInitial: data.nameInitial || 'P',
  }
}

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
 * Shared desktop nav markup used by every variant. Content/IA is fixed here
 * (prominent search · Recipes · Create · Saved · account menu); visual identity
 * (layout, surface, active state) comes from the `.dnav--<id>` skin in
 * DesktopNav.scss. `Create` prominence is a switchable style; the account menu
 * design is another switchable dimension (see DesktopAccountMenu).
 */
const DesktopBar: FC<DesktopBarProps> = ({ variant, ...rawData }) => {
  const data = useEffectiveAuth(rawData)
  const { isLoggedIn, authLoading } = data
  const createStyle = useDesktopCreateStyle()

  return (
    <div
      className={`dnav dnav--${variant.id}${
        variant.centerSearch ? ' dnav--center-search' : ''
      }`}
    >
      <div className='dnav__search'>
        <SearchRecipesInput autoComplete={true} />
      </div>

      <nav className='dnav__links' aria-label='Primary'>
        <NavLink to='/recipes' className={linkClass}>
          <MdOutlineRestaurantMenu className='dnav__link-icon' />
          <span className='dnav__link-label'>Recipes</span>
        </NavLink>
        {isLoggedIn && (
          <NavLink
            to='/add-recipe'
            className={({ isActive }) =>
              `dnav__link dnav__create dnav__create--${createStyle}${
                isActive ? ' is-active' : ''
              }`
            }
          >
            <AiOutlinePlusCircle className='dnav__link-icon' />
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
              <BiBookmark />
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
