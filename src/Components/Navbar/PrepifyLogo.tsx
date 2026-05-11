import React, { FC, useState } from 'react'
import { NavLink } from 'react-router-dom'
import ReleaseNotes from 'src/Components/ReleaseNotes/ReleaseNotes'

const PrepifyLogo: FC = () => {
  const [releaseNotesModalIsOpen, setReleaseNotesModalIsOpen] = useState(false)
  const handleOpenReleaseNotes = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    setReleaseNotesModalIsOpen(true)
  }
  return (
    <div className='nav-link prepify-logo'>
      <NavLink to='/' className='nav-logo'>
        Prepify
      </NavLink>
      <button className='beta-tag' onClick={handleOpenReleaseNotes}>
        Beta
      </button>
      <ReleaseNotes
        releaseNotesModalIsOpen={releaseNotesModalIsOpen}
        setReleaseNotesModalIsOpen={setReleaseNotesModalIsOpen}
      />
    </div>
  )
}

export default PrepifyLogo
