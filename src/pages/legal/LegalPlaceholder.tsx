import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import './LegalPlaceholder.scss'

type LegalPlaceholderProps = {
  /** Page title — shown as the <h1> and in the document title. */
  title: string
  /** One-line description of what the finished page will contain. */
  intro: string
}

// Temporary stub for the company/legal pages (About, Privacy, Terms) so the
// footer links resolve to real routes instead of dead '#' anchors. The real
// content is written in a follow-up session — see docs/LEGAL_PAGES_PROMPT.md.
const LegalPlaceholder: FC<LegalPlaceholderProps> = ({ title, intro }) => (
  <div className='legal-placeholder'>
    <Helmet>
      <title>{`Prepify | ${title}`}</title>
    </Helmet>
    <div className='legal-placeholder-inner'>
      <h1>{title}</h1>
      <p className='lead'>{intro}</p>
      <p className='note'>This page is coming soon.</p>
      <Link to='/' className='back-home'>
        ← Back to home
      </Link>
    </div>
  </div>
)

export default LegalPlaceholder
