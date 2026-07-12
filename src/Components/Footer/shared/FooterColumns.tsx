import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'src/context/AuthContext'
import { footerColumns, FooterLink } from '../footerData'

/** Renders one footer link as an internal <Link> or external/placeholder <a>. */
const FooterLinkItem: FC<{ link: FooterLink }> = ({ link }) =>
  link.external ? (
    <a href={link.to} className='footer-link'>
      {link.label}
    </a>
  ) : (
    <Link to={link.to} className='footer-link'>
      {link.label}
    </Link>
  )

type FooterColumnsProps = { className?: string }

// One labelled navigation landmark for all columns. Deliberately a <div> with
// role='navigation' rather than a <nav> element: Navbar.scss has an unscoped
// global `nav { position: absolute; top: 0 }` that would otherwise yank these
// columns out of flow to the top of the page.
const FooterColumns: FC<FooterColumnsProps> = ({ className = '' }) => {
  const isLoggedIn = !!useAuth()?.user
  // Links tagged `auth: 'in' | 'out'` only show in the matching auth state; e.g.
  // Sign in / Create account drop out once signed in, replaced by the account
  // pages. Untagged links always show.
  const isVisible = (link: FooterLink) =>
    !link.auth || (link.auth === 'in') === isLoggedIn

  return (
    <div
      className={`footer-columns ${className}`.trim()}
      role='navigation'
      aria-label='Footer'
    >
      {footerColumns.map(col => (
        <div className='footer-col' key={col.heading}>
          <p className='footer-col-heading'>{col.heading}</p>
          <ul aria-label={col.heading}>
            {col.links.filter(isVisible).map(link => (
              <li key={link.label}>
                <FooterLinkItem link={link} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default FooterColumns
