import React, { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiEdit3, FiSettings, FiShare2 } from 'react-icons/fi'

// ProfileControls — the header action cluster: a subtle Edit button plus icon
// buttons for Settings and Share. Edit + Settings both route to the existing
// /settings page (per the chosen design). Share copies the user's public
// profile link (/u/<username>), falling back to the current URL if the username
// isn't known yet.
type ProfileControlsProps = {
  username?: string
}

const ProfileControls: FC<ProfileControlsProps> = ({ username }) => {
  const navigate = useNavigate()

  const onShare = async () => {
    const url = username
      ? `${window.location.origin}/u/${username}`
      : window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Profile link copied to clipboard')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className='acct-controls'>
      <button
        className='acct-btn acct-edit'
        onClick={() => navigate('/settings')}
        title='Edit profile'
      >
        <FiEdit3 />
        <span>Edit profile</span>
      </button>
      <button
        className='acct-btn acct-iconbtn'
        onClick={() => navigate('/settings')}
        aria-label='Account settings'
        title='Settings'
      >
        <FiSettings />
      </button>
      <button
        className='acct-btn acct-iconbtn'
        onClick={onShare}
        aria-label='Share profile'
        title='Share'
      >
        <FiShare2 />
      </button>
    </div>
  )
}

export default ProfileControls
