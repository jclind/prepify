import React, { FC, ReactElement } from 'react'
import Navbar from 'src/Components/Navbar/Navbar'
import Footer from 'src/Components/Footer/Footer'

type LayoutProps = {
  children?: ReactElement
  darkNavLinks?: boolean
  navBackgroundColor?: 'white' | 'gray' | 'none'
}

const Layout: FC<LayoutProps> = ({
  children,
  darkNavLinks = false,
  navBackgroundColor = 'none',
}) => {
  return (
    <>
      <Navbar
        darkNavLinks={darkNavLinks}
        navBackgroundColor={navBackgroundColor}
      />
      {children}
      <Footer />
    </>
  )
}

export default Layout
