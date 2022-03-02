import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import ReleaseNotes from '../ReleaseNotes/ReleaseNotes'

const PrepifyLogo = () => {
  const [releaseNotesModalIsOpen, setReleaseNotesModalIsOpen] = useState(false)
  const handleOpenReleaseNotes = e => {
    e.stopPropagation()
    e.preventDefault()
    setReleaseNotesModalIsOpen(true)
  }
  return (
    <div className='nav-link prepify-logo'>
      <NavLink to='/' className='nav-logo'>
        Prepify
      </NavLink>
      <div className='beta-tag' onClick={handleOpenReleaseNotes}>
        Beta
      </div>
      <ReleaseNotes
        releaseNotesModalIsOpen={releaseNotesModalIsOpen}
        setReleaseNotesModalIsOpen={setReleaseNotesModalIsOpen}
      />
    </div>
  )
}

export default PrepifyLogo
