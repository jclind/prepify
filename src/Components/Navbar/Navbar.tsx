import React, { useState, useEffect, FC } from 'react'
import './Navbar.scss'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from 'src/context/AuthContext'
import PrepifyLogo from 'src/Components/Navbar/PrepifyLogo'
import Hamburger from 'hamburger-react'
import { AiOutlineUser } from 'react-icons/ai'
import { BiHelpCircle, BiLogOut } from 'react-icons/bi'
import AuthAPI from 'src/api/auth'
import Skeleton from 'react-loading-skeleton'

const skeletonColor = '#d6d6d6'

type NavbarProps = {
  darkNavLinks: boolean
  loading: boolean
  navBackgroundColor: 'white' | 'gray' | 'none'
}

const Navbar: FC<NavbarProps> = ({
  darkNavLinks,
  navBackgroundColor,
  loading,
}) => {
  const [navOpen, setNavOpen] = useState(false)

  const authRes = useAuth()
  // const { user, logout, getUsername } = useAuth()
  const uid = AuthAPI.getUID()

  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location])

  const { data } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid && !!authRes?.user,
  })

  const username = data ?? ''
  const nameInitial = data
    ? data.charAt(0).toUpperCase()
    : data === null
    ? (authRes?.user?.email ? authRes.user.email.charAt(0).toUpperCase() : '')
    : ''

  const loggedOutLinks = (
    <>
      <NavLink
        to='/recipes'
        className={({ isActive }) => {
          return isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        recipes
      </NavLink>
      <NavLink
        to='/login'
        className={({ isActive }) => {
          return isActive ? 'nav-link active login' : 'nav-link login'
        }}
      >
        login
      </NavLink>
      <NavLink
        to='/signup'
        className={({ isActive }) => {
          return isActive ? 'nav-link active signup' : 'nav-link signup'
        }}
      >
        signup
      </NavLink>
    </>
  )
  const loggedInLinks = (
    <>
      <NavLink
        to='/recipes'
        className={({ isActive }) => {
          return isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        recipes
      </NavLink>
      <NavLink
        to='/add-recipe'
        className={({ isActive }) => {
          return isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        Create Recipe
      </NavLink>
      <div className='dropdown'>
        <div className='dropdown-btn'>
          {authRes?.authLoading ? (
            <Skeleton
              className='account-link-loading'
              baseColor={skeletonColor}
            />
          ) : (
            <NavLink to='/account' className='account-link'>
              {authRes?.user?.photoURL ? (
                <img
                  src={authRes.user.photoURL}
                  alt='Profile Avatar'
                  className='profile-image'
                />
              ) : (
                <div className='profile-image not-set'>{nameInitial}</div>
              )}
            </NavLink>
          )}
        </div>
        <div className='dropdown-links'>
          <div className='dropdown-section'>
            <div className='signed-in-as'>
              <AiOutlineUser className='icon' />
              <div className='text'>
                Signed in as <strong>{username}</strong>
              </div>
            </div>
          </div>
          <NavLink
            to='/help'
            className={({ isActive }) => {
              return isActive ? 'nav-link active' : 'nav-link'
            }}
          >
            <BiHelpCircle className='icon' />
            <div className='text'>Help</div>
          </NavLink>
          <button className='nav-link btn logout' onClick={authRes?.logout}>
            <BiLogOut className='icon' />
            <div className='text'>logout</div>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <nav className={`nav background-${navBackgroundColor}`}>
      <div className='nav-center'>
        <div className='nav-header'>
          <PrepifyLogo />
          <div
            className={
              !navOpen && !darkNavLinks ? 'hamburger light' : 'hamburger'
            }
          >
            <Hamburger toggled={navOpen} toggle={setNavOpen} />
          </div>
        </div>
        <div className={navOpen ? 'nav-content show' : 'nav-content'}>
          <div
            className={darkNavLinks ? 'nav-links dark-nav-links' : 'nav-links'}
          >
            {authRes?.authLoading
              ? null
              : authRes?.user
              ? loggedInLinks
              : loggedOutLinks}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
