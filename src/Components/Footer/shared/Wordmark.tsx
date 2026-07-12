import React, { FC } from 'react'
import { Link } from 'react-router-dom'

/** The Prepify wordmark (links home). */
const Wordmark: FC = () => (
  <div className='footer-brand'>
    <Link to='/' className='footer-wordmark'>
      Prepify
    </Link>
  </div>
)

export default Wordmark
