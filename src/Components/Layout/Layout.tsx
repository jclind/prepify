import React, { FC, ReactElement } from 'react'
import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'

type LayoutProps = {
  children?: ReactElement
  darkNavLinks?: boolean
  loading?: boolean
}

const Layout: FC<LayoutProps> = ({
  children,
  darkNavLinks = false,
  loading = false,
}) => {
  return (
    <>
      <Navbar darkNavLinks={darkNavLinks} loading={loading} />
      {children}
      <Footer />
    </>
  )
}

export default Layout
