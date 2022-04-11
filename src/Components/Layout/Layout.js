import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('.nav').scrollIntoView()
  }, [pathname])
  return null
}

const Layout = ({ children, darkNavLinks }) => {
  return (
    <>
      <Navbar darkNavLinks={darkNavLinks} />
      <ScrollToTop />
      {children}
      <Footer />
    </>
  )
}

export default Layout
