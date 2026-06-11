import React, { FC, ReactElement } from 'react'
import Navbar from 'src/Components/Navbar/Navbar'
import Footer from 'src/Components/Footer/Footer'

import './Layout.scss'

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
    <div className='app-shell'>
      <Navbar
        darkNavLinks={darkNavLinks}
        navBackgroundColor={navBackgroundColor}
      />
      <main className='app-main'>{children}</main>
      <Footer />
    </div>
  )
}

export default Layout
