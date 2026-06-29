import { EditIcon, SettingsIcon, ShareIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  PROFILE_LINK_COPIED,
  PROFILE_LINK_COPY_ERROR,
} from 'src/util/toastMessages'

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
      toast.success(PROFILE_LINK_COPIED)
    } catch {
      toast.error(PROFILE_LINK_COPY_ERROR)
    }
  }

  return (
    <div className='acct-controls'>
      <button
        className='acct-btn acct-edit'
        onClick={() => navigate('/settings')}
        title='Edit profile'
      >
        <EditIcon />
        <span>Edit profile</span>
      </button>
      <button
        className='acct-btn acct-iconbtn'
        onClick={() => navigate('/settings')}
        aria-label='Account settings'
        title='Settings'
      >
        <SettingsIcon />
      </button>
      <button
        className='acct-btn acct-iconbtn'
        onClick={onShare}
        aria-label='Share profile'
        title='Share'
      >
        <ShareIcon />
      </button>
    </div>
  )
}

export default ProfileControls
