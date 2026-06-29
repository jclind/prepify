import { DonutIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import './404.scss'
import { Link, useNavigate } from 'react-router-dom'

const NotFound: FC = () => {
  const navigate = useNavigate()

  return (
    <div className='not-found-page page'>
      <Helmet>
        <title>Page Not Found · Prepify</title>
        <meta name='robots' content='noindex' />
      </Helmet>
      <div className='header'>
        <span className='number'>4</span>
        <DonutIcon className='zero' aria-hidden='true' />
        <span className='number'>4</span>
      </div>
      <div className='content'>
        <h1>Page not found</h1>
        <p className='text'>
          It seems like we can't find the page you are looking for, if you think
          this is a mistake, please{' '}
          <Link to='/help' className='contact-link'>
            contact our support team
          </Link>
          .
        </p>
        <button className='home-btn btn' onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    </div>
  )
}

export default NotFound
