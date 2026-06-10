import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { footerColumns, FooterLink } from '../footerData'

/** Renders one footer link as an internal <Link> or external/placeholder <a>. */
export const FooterLinkItem: FC<{ link: FooterLink }> = ({ link }) =>
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

/** The standard Discover / Account / Company link columns. */
const FooterColumns: FC<FooterColumnsProps> = ({ className = '' }) => (
  <div className={`footer-columns ${className}`.trim()}>
    {footerColumns.map(col => (
      <div
        className='footer-col'
        key={col.heading}
        role='navigation'
        aria-label={col.heading}
      >
        <p className='footer-col-heading'>{col.heading}</p>
        <ul>
          {col.links.map(link => (
            <li key={link.label}>
              <FooterLinkItem link={link} />
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
)

export default FooterColumns
