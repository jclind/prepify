import React, { FC, ReactElement } from 'react'
import Navbar from 'src/Components/Navbar/Navbar'
import Footer from 'src/Components/Footer/Footer'
import AccountStatusBanner from 'src/Components/AccountStatusBanner/AccountStatusBanner'
import { useSlashFocusSearch } from 'src/hooks/useSlashFocusSearch'

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
  // Press `/` anywhere (outside a text field) to jump to the recipe search.
  useSlashFocusSearch()

  return (
    <div className='app-shell'>
      <a href='#main-content' className='skip-to-content'>
        Skip to content
      </a>
      <Navbar
        darkNavLinks={darkNavLinks}
        navBackgroundColor={navBackgroundColor}
      />
      <AccountStatusBanner />
      <main id='main-content' className='app-main' tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout
