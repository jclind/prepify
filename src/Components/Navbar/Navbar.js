import React, { useState, useEffect } from 'react'
import './Navbar.scss'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PrepifyLogo from './PrepifyLogo'

const Navbar = ({ darkNavLinks }) => {
  const { user, logout, getUsername } = useAuth()

  const [nameInitial, setNameInitial] = useState('')

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
      <button className='nav-link btn' onClick={logout}>
        logout
      </button>
      <NavLink to='/account' className='account-link'>
        {nameInitial}
      </NavLink>
    </>
  )

  return (
    <nav className='nav'>
      <div className='nav-header'>
        <PrepifyLogo />
      </div>
      <div className='nav-content'>
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
