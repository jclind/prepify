import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import { Toggle, SettingRow, SaveBar } from '../components/controls'
import { useSettingsDirty } from '../SettingsDirtyContext'
import './sections.scss'

// Privacy gates the public /u/:username view. Seeds from the same getProfile
// query the Profile section uses (extended to carry isPublic + hideLocation).
const PrivacySection: FC = () => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => AuthAPI.getProfile(),
    enabled: !!uid,
  })

  const [isPublic, setIsPublic] = useState(true)
  const [hideLocation, setHideLocation] = useState(false)
  const [baseline, setBaseline] = useState({ isPublic: true, hideLocation: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      const next = {
        isPublic: profile.isPublic ?? true,
        hideLocation: profile.hideLocation ?? false,
      }
      setIsPublic(next.isPublic)
      setHideLocation(next.hideLocation)
      setBaseline(next)
    }
  }, [profile])

  const dirty =
    isPublic !== baseline.isPublic || hideLocation !== baseline.hideLocation

  // Report unsaved changes to the shell so it can warn before navigating away.
  const { setDirty } = useSettingsDirty()
  useEffect(() => {
    setDirty(dirty)
    return () => setDirty(false)
  }, [dirty, setDirty])

  const handleSave = () => {
    if (!dirty) return
    setSaving(true)
    AuthAPI.updatePrivacy(isPublic, hideLocation)
      .then(() => {
        setBaseline({ isPublic, hideLocation })
        // Keep the shared profile query in sync for the next visit.
        queryClient.invalidateQueries({ queryKey: ['profile', uid] })
        setSaving(false)
        toast.success('Privacy settings saved.')
      })
      .catch(err => {
        setSaving(false)
        toast.error(err.message || 'Could not save privacy settings.')
      })
  }

  const reset = () => {
    setIsPublic(baseline.isPublic)
    setHideLocation(baseline.hideLocation)
  }

  return (
    <div className='sr-form sr-rows'>
      <SettingRow
        label='Public profile'
        desc='When on, anyone can view your profile and published recipes at prepify.com/u/your-name.'
        control={
          <Toggle
            checked={isPublic}
            onChange={setIsPublic}
            label='Public profile'
          />
        }
      />
      <SettingRow
        label='Hide my location'
        desc='Keep your location off your public profile.'
        control={
          <Toggle
            checked={hideLocation}
            onChange={setHideLocation}
            label='Hide location'
          />
        }
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

export default PrivacySection
