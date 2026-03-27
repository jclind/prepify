import React, { FC, ReactElement } from 'react'
import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'

type LayoutProps = {
  children?: ReactElement
  darkNavLinks?: boolean
  navBackgroundColor?: 'white' | 'gray' | 'none'
  loading?: boolean
}

const Layout: FC<LayoutProps> = ({
  children,
  darkNavLinks = false,
  navBackgroundColor = 'none',
  loading = false,
}) => {
  return (
    <>
      <Navbar
        darkNavLinks={darkNavLinks}
        loading={loading}
        navBackgroundColor={navBackgroundColor}
      />
      {children}
      <Footer />
    </>
  )
}

export default Layout
