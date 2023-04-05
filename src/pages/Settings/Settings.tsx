import React, { useEffect, useState } from 'react'
import './Settings.scss'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

const Settings = () => {
  const settingsPages = [
    { name: 'Profile', path: '/settings' },
    { name: 'Security', path: '/settings/security' },
  ]

  const [currPath, setCurrPath] = useState('')

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setCurrPath(location.pathname)
    if (location.pathname === '/account') {
      navigate('/account/saved-recipes')
    }
  }, [location.pathname, navigate])

  return (
    <div className='page settings-page'>
      <h1>Settings</h1>
      <div className='link-options'>
        {settingsPages.map(link => {
          return (
            <Link
              to={link.path}
              className={
                currPath === link.path ? 'active selection' : 'selection'
              }
              key={link.path}
            >
              {link.name}
            </Link>
          )
        })}
      </div>
      <Outlet />
    </div>
  )
}

export default Settings
