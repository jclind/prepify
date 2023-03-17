import React from 'react'
import pjson from '../../../package.json'

import './Footer.scss'

const version = pjson.version

const Footer = () => {
  return (
    <footer>
      <div className='email'>JesseLindCS@gmail.com</div>
      <div className='info'>
        © {new Date().getFullYear()} || Made with{' '}
        <a href='https://reactjs.org/'>React.js</a>
      </div>
      <div className='version'>version {version}-beta</div>
    </footer>
  )
}

export default Footer
