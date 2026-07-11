import {
  AlertCircleIcon,
  CheckCircleIcon,
  CloudIcon,
  InfoIcon,
  RotateCwIcon,
} from 'src/Components/icons'
import React, { FC } from 'react'
import { DraftStatus } from 'src/pages/AddRecipe/useDraftAutosave'
import './DraftSaveStatus.scss'

type DraftSaveStatusProps = { status: DraftStatus }

const content: Record<
  Exclude<DraftStatus, 'idle'>,
  { icon: React.ReactElement; label: string }
> = {
  saving: { icon: <CloudIcon />, label: 'Saving draft…' },
  saved: { icon: <CheckCircleIcon />, label: 'Draft saved' },
  error: { icon: <AlertCircleIcon />, label: "Couldn't save draft" },
  // Distinct from the error badge: another tab/session saved newer content, so
  // nothing is broken — the user just needs to reload to see (and edit) the
  // latest version. A "reload" affordance, not an alarming failure.
  conflict: { icon: <RotateCwIcon />, label: 'Reload to see the latest' },
  // Calm guidance, not an error: a signed-out visitor's work can't be autosaved
  // (drafts are per-user), so point them at signing in rather than alarming them.
  'signed-out': { icon: <InfoIcon />, label: 'Sign in to save drafts' },
}

// Small inline indicator beneath the page heading reflecting draft autosave
// state. The element is always rendered (a fixed-height, empty slot when idle)
// so transitions between states never shift the form below it.
const DraftSaveStatus: FC<DraftSaveStatusProps> = ({ status }) => {
  const current = status === 'idle' ? null : content[status]
  return (
    <span className={`draft-save-status ${status}`} aria-live='polite'>
      {current && (
        <>
          {current.icon}
          {current.label}
        </>
      )}
    </span>
  )
}

export default DraftSaveStatus
