import React, { FC } from 'react'
import { NavLink } from 'react-router-dom'

const PrepifyLogo: FC = () => {
  return (
    <div className='nav-link prepify-logo'>
      <NavLink to='/' className='nav-logo'>
        Prepify
      </NavLink>
    </div>
  )
}

export default PrepifyLogo
