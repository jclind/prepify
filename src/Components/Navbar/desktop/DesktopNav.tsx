import React, { FC } from 'react'
import './DesktopNav.scss'
import DesktopBar from './DesktopBar'
import { getVariant } from './registry'
import { DesktopNavProps } from './types'

type Props = DesktopNavProps & { variantId: string }

/**
 * Renders the active desktop nav variant. The bar is hidden below 725px (the
 * mobile menu takes over there — see DesktopNav.scss / Navbar.scss).
 */
const DesktopNav: FC<Props> = ({ variantId, ...data }) => (
  <DesktopBar variant={getVariant(variantId)} {...data} />
)

export default DesktopNav
