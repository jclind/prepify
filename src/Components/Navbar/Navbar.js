import React, { useState, useEffect } from 'react'
import './Navbar.scss'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PrepifyLogo from './PrepifyLogo'
import Hamburger from 'hamburger-react'
import { AiOutlineUser } from 'react-icons/ai'
import { BiHelpCircle, BiLogOut } from 'react-icons/bi'

const Navbar = ({ darkNavLinks }) => {
  const [navOpen, setNavOpen] = useState(false)

  const { user, logout, getUsername } = useAuth()

  const [username, setUsername] = useState('')
  const [nameInitial, setNameInitial] = useState('')

  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location])

  useEffect(() => {
    if (user) {
      const uid = user.uid

      getUsername(uid).then(val => {
        if (!val) {
          if (user.email) {
            const displayInitial = user.email.charAt(0).toUpperCase()
            return setNameInitial(displayInitial)
          }
          return setNameInitial('')
        } else {
          const displayInitial = val.charAt(0).toUpperCase()
          setNameInitial(displayInitial)
          setUsername(val)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
          return isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        login
      </NavLink>
      <NavLink
        to='/signup'
        className={({ isActive }) => {
          return isActive ? 'nav-link active' : 'nav-link'
        }}
      >
        Signup
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
          <NavLink to='/account' className='account-link'>
            {nameInitial}
          </NavLink>
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
          <button className='nav-link btn' onClick={logout}>
            <BiLogOut className='icon' />
            <div className='text'>logout</div>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <nav className='nav'>
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
          {user ? loggedInLinks : loggedOutLinks}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
