import React, { FC, useState, useEffect } from 'react'
import { useLocation, useNavigate, Link, Outlet } from 'react-router-dom'
import './Account.scss'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

const Account: FC = () => {
  const [currPath, setCurrPath] = useState('')

  const uid = AuthAPI.getUID()

  const location = useLocation()
  const navigate = useNavigate()

  const authRes = useAuth()

  const { data } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid && !authRes?.user?.displayName,
  })

  const username = data ?? ''
  const nameInitial = authRes?.user?.displayName
    ? authRes.user.displayName.charAt(0).toUpperCase()
    : data
    ? data.charAt(0).toUpperCase()
    : data === null
    ? 'null'
    : ''

  useEffect(() => {
    setCurrPath(location.pathname)
    if (location.pathname === '/account') {
      navigate('/account/saved-recipes')
    }
  }, [location.pathname, navigate])

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Your Account</title>
      </Helmet>
      <div className='page account-page'>
        <section className='account-header'>
          <div className='info-container'>
            {authRes?.user?.photoURL ? (
              <img
                src={authRes.user.photoURL}
                alt='Profile Avatar'
                className='profile-image'
              />
            ) : (
              <div className='profile-image not-set'>{nameInitial}</div>
            )}

            <div className='content'>
              <h1 className='username'>{username && username}</h1>
              <div className='actions'>
                <button
                  className='edit-profile-btn btn'
                  onClick={() => navigate('/settings')}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </section>
        <div className='account-body'>
          <div className='options-bar'>
            <Link
              to='/account/saved-recipes'
              className={
                currPath === '/account/saved-recipes'
                  ? 'active selection'
                  : 'selection'
              }
            >
              Saved Recipe
            </Link>
            <Link
              to='/account/ratings'
              className={
                currPath === '/account/ratings'
                  ? 'active selection'
                  : 'selection'
              }
            >
              Ratings
            </Link>
            <Link
              to='/account/your-recipes'
              className={
                currPath === '/account/your-recipes'
                  ? 'active selection'
                  : 'selection'
              }
            >
              Your Recipes
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default Account
