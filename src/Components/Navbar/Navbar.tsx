import React, { useState, useEffect, useCallback, FC } from 'react'
import './Navbar.scss'
import { useLocation } from 'react-router-dom'
import PrepifyLogo from 'src/Components/Navbar/PrepifyLogo'
import Hamburger from 'hamburger-react'
import NavMenu from 'src/Components/Navbar/menu/NavMenu'
import { useNavMenu } from 'src/Components/Navbar/menu/useNavMenu'
import { useIsMobile } from 'src/Components/Navbar/menu/useIsMobile'
import DesktopNav from 'src/Components/Navbar/desktop/DesktopNav'
import { useScrolled } from 'src/Components/Navbar/desktop/useScrolled'

type NavbarProps = {
  darkNavLinks: boolean
  loading: boolean
  navBackgroundColor: 'white' | 'gray' | 'none'
}

const Navbar: FC<NavbarProps> = ({ darkNavLinks, navBackgroundColor }) => {
  const [navOpen, setNavOpen] = useState(false)

  const location = useLocation()

  // Shared auth/profile data (one source for the desktop bar + mobile menu).
  const menu = useNavMenu()
  const isMobile = useIsMobile()
  const scrolled = useScrolled()
  const closeNav = useCallback(() => setNavOpen(false), [])

  useEffect(() => {
    setNavOpen(false)
  }, [location])

  // Desktop bar is transparent over the Home hero (darkNavLinks=false) and goes
  // solid once scrolled or on any non-hero page. Mobile bar is left untouched.
  const solid = !isMobile && (scrolled || darkNavLinks)
  // ...and condenses to a slim bar once scrolled (desktop only).
  const condensed = !isMobile && scrolled

  const navClassName = [
    'nav',
    `background-${navBackgroundColor}`,
    solid ? 'nav--solid' : '',
    condensed ? 'nav--condensed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <nav className={navClassName}>
        <div className='nav-center'>
          <div className='nav-header'>
            <PrepifyLogo />
            <div className={!navOpen && !darkNavLinks ? 'hamburger light' : 'hamburger'}>
              <Hamburger toggled={navOpen} toggle={setNavOpen} />
            </div>
          </div>

          {/* Desktop nav variant (>725px). Mounted only on desktop so its
              optional search input isn't kept alive behind the mobile menu. */}
          {!isMobile && (
            <DesktopNav
              darkNavLinks={darkNavLinks}
              scrolled={scrolled}
              {...menu}
            />
          )}
        </div>
      </nav>

      {/* Redesigned mobile menu (≤725px) — rendered outside <nav> so the bar
          stays tappable above the overlay. Unchanged by the desktop redesign. */}
      {isMobile && <NavMenu open={navOpen} onClose={closeNav} {...menu} />}
    </>
  )
}

export default Navbar
