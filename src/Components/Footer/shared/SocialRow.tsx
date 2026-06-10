import React, { FC } from 'react'
import { socialLinks } from '../footerData'

type SocialRowProps = { className?: string }

/** Row of recipe-discovery social icons (placeholder hrefs for now). */
const SocialRow: FC<SocialRowProps> = ({ className = '' }) => (
  <ul className={`footer-socials ${className}`.trim()}>
    {socialLinks.map(({ label, href, Icon }) => (
      <li key={label}>
        <a
          href={href}
          aria-label={label}
          target='_blank'
          rel='noopener noreferrer'
        >
          <Icon aria-hidden='true' />
        </a>
      </li>
    ))}
  </ul>
)

export default SocialRow
