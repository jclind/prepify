import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import { getApiErrorMessage } from 'src/util/getApiErrorMessage'
import { AvatarField, TextField, TextArea, SaveBar } from '../components/controls'
import { useSettingsDirty } from '../SettingsDirtyContext'
import './sections.scss'

const MAX_FILE_SIZE = 5000 * 1024
const BIO_MAX_LENGTH = 300
const LOCATION_MAX_LENGTH = 80
// Mirror the server's bounds (validateUsername in server/routes/auth.js) so the
// limit is enforced inline instead of bouncing off a 400 as a toast.
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

// Profile = the user's public identity. Account fields (display name, username,
// avatar — stored in Firebase + the usernames collection) and profile fields
// (bio/location — stored in userProfiles) live in separate stores, so the save
// routes each side independently: editing only your bio never re-writes your
// avatar, and vice versa.
const ProfileSection: FC = () => {
  const authRes = useAuth()
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

  const { data: fetchedUsername } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })
  const { data: fetchedProfile } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => AuthAPI.getProfile(),
    enabled: !!uid,
  })

  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgURL, setImgURL] = useState('')
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  // Seed identity (avatar + display name) straight from the Firebase user as
  // soon as it resolves — NOT gated on the username/profile queries. Coupling
  // them made the avatar flash from the fallback initial to the real photo, and
  // briefly read the form as dirty, on every refresh.
  useEffect(() => {
    if (authRes?.user) {
      setDisplayName(authRes.user.displayName || '')
      setImgURL(authRes.user.photoURL || '')
      setImgFile(null)
      setAvatarRemoved(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRes?.user])

  useEffect(() => {
    if (fetchedUsername !== undefined) setUsername(fetchedUsername || '')
  }, [fetchedUsername])

  useEffect(() => {
    if (fetchedProfile) {
      setBio(fetchedProfile.bio || '')
      setLocation(fetchedProfile.location || '')
    }
  }, [fetchedProfile])

  // Live availability — only when the name differs from the saved one (your own
  // current username must never read as "taken").
  useEffect(() => {
    if (!username || username === fetchedUsername) {
      setUsernameStatus('idle')
      return
    }
    if (
      /\s/.test(username) ||
      username.length < USERNAME_MIN_LENGTH ||
      username.length > USERNAME_MAX_LENGTH
    ) {
      setUsernameStatus('invalid')
      return
    }
    setUsernameStatus('checking')
    let cancelled = false
    const timeout = setTimeout(() => {
      AuthAPI.checkUsernameAvailability(username)
        .then(ok => {
          if (!cancelled) setUsernameStatus(ok ? 'available' : 'taken')
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus('idle')
        })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [username, fetchedUsername])

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && /\.(jpe?g|png)$/i.test(file.name)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File cannot be more than 5mb in size')
        return
      }
      setImgFile(file)
      setImgURL(URL.createObjectURL(file))
      setAvatarRemoved(false)
    }
  }
  const triggerUpload = () =>
    document.getElementById('settings-avatar-input')?.click()
  const handleRemoveAvatar = () => {
    setImgFile(null)
    setImgURL('')
    setAvatarRemoved(true)
  }

  const avatarChanged = !!imgFile || avatarRemoved
  const accountFieldsChanged =
    avatarChanged ||
    displayName !== (authRes?.user?.displayName || '') ||
    username !== (fetchedUsername || '')
  const profileChanged =
    bio !== (fetchedProfile?.bio ?? '') ||
    location !== (fetchedProfile?.location ?? '')
  // Only consider the form dirty once every source has loaded and seeded the
  // fields — otherwise the gap between the auth user and the queries reads as a
  // change and flashes the save bar on refresh.
  const ready =
    !!authRes?.user &&
    fetchedUsername !== undefined &&
    fetchedProfile !== undefined
  const dirty = ready && (accountFieldsChanged || profileChanged)

  // Report unsaved changes to the shell so it can warn before navigating away.
  const { setDirty } = useSettingsDirty()
  useEffect(() => {
    setDirty(dirty)
    return () => setDirty(false)
  }, [dirty, setDirty])

  const usernameError =
    usernameStatus === 'taken'
      ? `${username} is already taken`
      : usernameStatus === 'invalid'
      ? `Usernames are ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters, no spaces`
      : undefined
  const usernameHint =
    usernameStatus === 'checking'
      ? 'Checking availability…'
      : usernameStatus === 'available'
      ? `${username} is available`
      : undefined

  const reset = () => {
    setUsername(fetchedUsername || '')
    setDisplayName(authRes?.user?.displayName || '')
    setImgURL(authRes?.user?.photoURL || '')
    setImgFile(null)
    setAvatarRemoved(false)
    setBio(fetchedProfile?.bio ?? '')
    setLocation(fetchedProfile?.location ?? '')
  }

  const handleSave = () => {
    if (!dirty) return
    // Identity fields are only validated when the account side is actually being
    // written. A bio/location-only edit routes through updateProfile alone, so an
    // empty display name (which it never touches) shouldn't block it.
    if (accountFieldsChanged) {
      if (!displayName) return toast.error('Display name is required.')
      if (!username) return toast.error('Username is required.')
      if (usernameError) return toast.error(usernameError)
    }

    setSaving(true)
    // Encode the avatar intent: a new File uploads, an explicit removal clears,
    // and an untouched avatar omits the key entirely (see updateProfileData).
    const data = {
      ...(displayName !== authRes?.user?.displayName && { displayName }),
      ...(imgFile ? { imgFile } : avatarRemoved ? { imgFile: null } : {}),
      username,
    }

    const runSave = async () => {
      // Account first: if it throws (e.g. a taken username) the profile write is
      // skipped, rather than leaving bio/location saved behind a failed save.
      if (accountFieldsChanged && authRes) {
        await authRes.updateProfileData(data)
      }
      if (profileChanged) {
        await AuthAPI.updateProfile({ bio, location })
      }
    }

    runSave()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['username', uid] })
        queryClient.invalidateQueries({ queryKey: ['profile', uid] })
        setSaving(false)
        setImgFile(null)
        setAvatarRemoved(false)
        toast.success('Profile updated!')
      })
      .catch(err => {
        setSaving(false)
        if (err.code === 'auth/email-already-in-use') {
          toast.error('Email already in use.')
        } else {
          // Prefer the server's reason (e.g. a 422 moderation block on the
          // username, bio, or location) over axios's generic "Request failed…".
          toast.error(getApiErrorMessage(err, 'Something went wrong.'))
        }
      })
  }

  return (
    <div className='sr-form'>
      <input
        id='settings-avatar-input'
        type='file'
        accept='.jpg,.jpeg,.png'
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />
      <AvatarField
        imgUrl={imgURL}
        name={displayName || username}
        seed={username}
        onUpload={triggerUpload}
        onRemove={handleRemoveAvatar}
      />
      <div className='sr-grid-2'>
        <TextField
          label='Display name'
          value={displayName}
          onChange={setDisplayName}
        />
        <TextField
          label='Username'
          value={username}
          onChange={setUsername}
          prefix='@'
          error={usernameError}
          hint={usernameHint}
          hintTone={usernameStatus === 'available' ? 'success' : 'default'}
          maxLength={USERNAME_MAX_LENGTH}
        />
      </div>
      <TextField
        label='Location'
        value={location}
        onChange={setLocation}
        placeholder='e.g. Portland, OR'
        maxLength={LOCATION_MAX_LENGTH}
      />
      <TextArea
        label='Bio'
        value={bio}
        onChange={setBio}
        placeholder='Tell others about your cooking…'
        maxLength={BIO_MAX_LENGTH}
      />
      <SaveBar
        dirty={dirty}
        loading={saving}
        onSave={handleSave}
        onReset={reset}
      />
    </div>
  )
}

export default ProfileSection
