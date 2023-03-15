import React from 'react'
import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'

const Layout = ({ children, darkNavLinks, loading }) => {
  return (
    <>
      <Navbar darkNavLinks={darkNavLinks} loading={loading} />
      {children}
      <Footer />
    </>
  )
}

export default Layout
