import React, { FC, ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import './LegalDocument.scss'

type LegalDocumentProps = {
  /** Page title — shown as the <h1> and in the document title. */
  title: string
  /** Effective / last-updated date, e.g. 'June 10, 2026'. */
  effectiveDate: string
  /** The sectioned prose (<section>/<h2>/<p> …) for this document. */
  children: ReactNode
}

// Shared chrome for the legal documents (Privacy Policy, Terms of Service):
// Helmet title, page heading, an effective-date line, a visible draft notice,
// and the centered prose container. About is distinct enough to stand alone.
const LegalDocument: FC<LegalDocumentProps> = ({
  title,
  effectiveDate,
  children,
}) => (
  <div className='legal-document'>
    <Helmet>
      <title>{`${title} · Prepify`}</title>
    </Helmet>
    <div className='legal-document-inner'>
      <header className='legal-document-header'>
        <h1>{title}</h1>
        <p className='effective-date'>Last updated: {effectiveDate}</p>
        <p className='draft-notice' role='note'>
          <strong>Draft notice:</strong> This document is a working draft
          provided for transparency. It has not been reviewed by a qualified
          legal professional and does not constitute legal advice. Please consult
          an attorney before relying on it.
        </p>
      </header>
      <div className='legal-document-body'>{children}</div>
    </div>
  </div>
)

export default LegalDocument
