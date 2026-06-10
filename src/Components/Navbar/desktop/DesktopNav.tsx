import React, { FC } from 'react'
import './DesktopNav.scss'
import DesktopBar from './DesktopBar'
import { DesktopNavProps } from './types'

/**
 * The desktop nav bar. Hidden below 725px, where the mobile menu takes over
 * (see DesktopNav.scss / Navbar.scss).
 */
const DesktopNav: FC<DesktopNavProps> = data => <DesktopBar {...data} />

export default DesktopNav
