import React, { FC } from 'react'
import { currentYear, version, legalLinks } from '../footerData'

type LegalBarProps = {
  /** Show the version tag (kept from the original footer, de-emphasized). */
  showVersion?: boolean
  /** Show the Privacy / Terms / About placeholder links. */
  showLinks?: boolean
  className?: string
}

/** Bottom copyright + legal links + version strip. */
const LegalBar: FC<LegalBarProps> = ({
  showVersion = true,
  showLinks = true,
  className = '',
}) => (
  <div className={`footer-legal ${className}`.trim()}>
    <span className='footer-copy'>© {currentYear} Prepify</span>
    {showLinks && (
      <ul className='footer-legal-links'>
        {legalLinks.map(l => (
          <li key={l.label}>
            <a href={l.to}>{l.label}</a>
          </li>
        ))}
      </ul>
    )}
    {showVersion && <span className='footer-version'>v{version}-beta</span>}
  </div>
)

export default LegalBar
