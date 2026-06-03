import React, { FC } from 'react'
import { AiOutlineCheckCircle, AiOutlineCloud } from 'react-icons/ai'
import { BiErrorCircle } from 'react-icons/bi'
import { DraftStatus } from 'src/pages/AddRecipe/useDraftAutosave'
import './DraftSaveStatus.scss'

type DraftSaveStatusProps = { status: DraftStatus }

const content: Record<
  Exclude<DraftStatus, 'idle'>,
  { icon: React.ReactElement; label: string }
> = {
  saving: { icon: <AiOutlineCloud />, label: 'Saving draft…' },
  saved: { icon: <AiOutlineCheckCircle />, label: 'Draft saved' },
  error: { icon: <BiErrorCircle />, label: "Couldn't save draft" },
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
