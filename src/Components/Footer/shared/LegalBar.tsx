import React, { FC } from 'react'
import { currentYear, version } from '../footerData'
import BugReportModal from 'src/Components/BugReport/BugReportModal'

type LegalBarProps = {
  /** Show the version tag (kept from the original footer, de-emphasized). */
  showVersion?: boolean
  className?: string
}

/** Bottom copyright + version strip, with a global "Report a bug" entry. */
const LegalBar: FC<LegalBarProps> = ({ showVersion = true, className = '' }) => (
  <div className={`footer-legal ${className}`.trim()}>
    <span className='footer-copy'>© {currentYear} Prepify</span>
    <BugReportModal />
    {showVersion && <span className='footer-version'>v{version}-beta</span>}
  </div>
)

export default LegalBar
