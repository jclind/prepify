import { AlertCircleIcon, AtSignIcon, CheckCircleIcon, GoogleColorIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from 'src/context/AuthContext'
import { TextField, SettingRow } from '../components/controls'
import { EMAIL_IN_USE, PASSWORD_INCORRECT } from 'src/util/toastMessages'
import './sections.scss'

type PassErrors = { currPass: string; newPass: string; confirmPass: string }
const NO_PASS_ERRORS: PassErrors = { currPass: '', newPass: '', confirmPass: '' }

const providerMeta = (providerId: string) => {
  if (providerId === 'google.com') {
    return { label: 'Google', icon: <GoogleColorIcon /> }
  }
  if (providerId === 'password') {
    return { label: 'Email & password', icon: <AtSignIcon /> }
  }
  return { label: providerId, icon: <AtSignIcon /> }
}

const AccountSection: FC = () => {
  const authRes = useAuth()
  const user = authRes?.user

  // ── Email ──────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(user?.email || '')
  const [reauthPass, setReauthPass] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const emailChanged = email !== (user?.email || '')

  const handleUpdateEmail = () => {
    if (!email) return toast.error('Email is required.')
    setEmailLoading(true)
    authRes
      ?.updateProfileData({ email, password: reauthPass })
      .then(() => {
        setEmailLoading(false)
        setReauthPass('')
        toast.success(
          'Almost done — check your new inbox for a link to confirm the change.'
        )
      })
      .catch(err => {
        setEmailLoading(false)
        if (err.code === 'password-required') {
          toast.error(err.message)
        } else if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-credential'
        ) {
          toast.error(PASSWORD_INCORRECT)
        } else if (err.code === 'auth/email-already-in-use') {
          toast.error(EMAIL_IN_USE)
        } else {
          toast.error(err.message || 'Could not update email.')
        }
      })
  }

  // ── Password ─────────────────────────────────────────────────────────────────
  const [currPass, setCurrPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passErrors, setPassErrors] = useState<PassErrors>(NO_PASS_ERRORS)
  const [passLoading, setPassLoading] = useState(false)

  const clearPasswords = () => {
    setCurrPass('')
    setNewPass('')
    setConfirmPass('')
  }

  const handleChangePassword = () => {
    setPassErrors(NO_PASS_ERRORS)
    if (!authRes?.user) return

    if (!currPass || !newPass || !confirmPass) {
      return setPassErrors({
        currPass: currPass ? '' : 'Current password required',
        newPass: newPass ? '' : 'New password required',
        confirmPass: confirmPass ? '' : 'Confirmation password required',
      })
    }
    if (newPass !== confirmPass) {
      return setPassErrors({
        ...NO_PASS_ERRORS,
        newPass: 'New passwords do not match',
        confirmPass: 'New passwords do not match',
      })
    }
    if (newPass.length < 6) {
      return setPassErrors({
        ...NO_PASS_ERRORS,
        newPass: 'Password must be at least 6 characters',
      })
    }
    if (currPass === newPass) {
      return setPassErrors({
        ...NO_PASS_ERRORS,
        newPass: 'New password must differ from the current one',
      })
    }

    setPassLoading(true)
    authRes
      .changePassword(currPass, newPass)
      .then(() => {
        setPassLoading(false)
        clearPasswords()
        toast.success('Password successfully changed.')
      })
      .catch(err => {
        setPassLoading(false)
        if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-credential'
        ) {
          setPassErrors({
            ...NO_PASS_ERRORS,
            currPass: 'Incorrect password, try again.',
          })
        } else {
          toast.error(err.message || 'Could not change password.')
        }
      })
  }

  const providers = user?.providerData ?? []
  const hasPasswordProvider = providers.some(p => p.providerId === 'password')

  return (
    <div className='sr-form'>
      {/* Email — only editable for password accounts. A federated (e.g. Google)
          account's email is owned by the provider; letting them edit it here
          only dead-ends at Firebase's reauth requirement. */}
      <div className='sr-email-row'>
        <TextField
          label='Email address'
          value={email}
          onChange={setEmail}
          type='email'
          autoComplete='email'
          disabled={!hasPasswordProvider}
          hint={
            hasPasswordProvider
              ? undefined
              : 'Managed by your connected sign-in provider.'
          }
        />
        {user &&
          (user.emailVerified ? (
            <span className='sr-verified'>
              <CheckCircleIcon /> Verified
            </span>
          ) : (
            <span className='sr-unverified'>
              <AlertCircleIcon /> Unverified
            </span>
          ))}
      </div>
      {emailChanged && (
        <>
          {hasPasswordProvider && (
            <TextField
              label='Current password'
              value={reauthPass}
              onChange={setReauthPass}
              type='password'
              autoComplete='current-password'
              hint='Confirm your password to change your email.'
            />
          )}
          <button
            type='button'
            className='sr-btn-primary sr-self-start'
            onClick={handleUpdateEmail}
            disabled={emailLoading}
          >
            {emailLoading ? 'Updating…' : 'Update email'}
          </button>
        </>
      )}

      {/* Change password — only meaningful for password-based accounts. */}
      {hasPasswordProvider && (
        <div className='sr-subsection'>
          <h3 className='sr-subhead'>Change password</h3>
          <div className='sr-grid-2'>
            <TextField
              label='Current password'
              value={currPass}
              onChange={setCurrPass}
              type='password'
              autoComplete='current-password'
              error={passErrors.currPass}
            />
            <div />
            <TextField
              label='New password'
              value={newPass}
              onChange={setNewPass}
              type='password'
              autoComplete='new-password'
              error={passErrors.newPass}
            />
            <TextField
              label='Confirm new password'
              value={confirmPass}
              onChange={setConfirmPass}
              type='password'
              autoComplete='new-password'
              error={passErrors.confirmPass}
            />
          </div>
          <button
            type='button'
            className='sr-btn-outline'
            onClick={handleChangePassword}
            disabled={passLoading}
          >
            {passLoading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      )}

      {/* Connected accounts — display only. */}
      <div className='sr-subsection'>
        <h3 className='sr-subhead'>Connected accounts</h3>
        {providers.length === 0 ? (
          <p className='sr-hint'>No sign-in methods found.</p>
        ) : (
          providers.map(p => {
            const meta = providerMeta(p.providerId)
            return (
              <SettingRow
                key={p.providerId}
                label={meta.label}
                desc='Used to sign in to your account.'
                control={
                  <span className='sr-connected'>
                    {meta.icon} Connected
                  </span>
                }
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export default AccountSection
