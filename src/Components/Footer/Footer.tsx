import React, { FC } from 'react'
import Wordmark from './shared/Wordmark'
import SocialRow from './shared/SocialRow'
import FooterColumns from './shared/FooterColumns'
import LegalBar from './shared/LegalBar'
import { longTagline } from './footerData'

import './Footer.scss'

// Site footer: brand block (wordmark + blurb + socials) alongside the
// Discover / Account / Company link columns, with a copyright + legal strip
// underneath. Sits on a white surface to match the white content cards.
const Footer: FC = () => (
  <footer className='site-footer'>
    <div className='ftr'>
      <div className='ftr-inner'>
        <div className='ftr-top'>
          <div className='ftr-brand-block'>
            <Wordmark />
            <p className='ftr-blurb'>{longTagline}</p>
            <SocialRow />
          </div>
          <FooterColumns />
        </div>
        <LegalBar />
      </div>
    </div>
  </footer>
)

export default Footer
