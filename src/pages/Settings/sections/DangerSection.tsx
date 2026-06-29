import { CloseIcon, DownloadIcon, TrashIcon } from 'src/Components/icons'
import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import { TextField } from '../components/controls'
import { PASSWORD_INCORRECT } from 'src/util/toastMessages'
import './sections.scss'

const CONFIRM_WORD = 'DELETE'

const DangerSection: FC = () => {
  const authRes = useAuth()
  const user = authRes?.user

  const [exporting, setExporting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const hasPasswordProvider =
    user?.providerData.some(p => p.providerId === 'password') ?? false

  // Delete is gated on the typed confirmation AND — for password accounts —
  // re-entering the password (Google accounts re-consent via popup instead).
  const canDelete =
    confirmText === CONFIRM_WORD && (!hasPasswordProvider || password.length > 0)

  const handleExport = () => {
    setExporting(true)
    AuthAPI.exportMyData()
      .then(() => toast.success('Your data is downloading.'))
      .catch(err => toast.error(err.message || 'Could not export your data.'))
      .finally(() => setExporting(false))
  }

  const closeModal = () => {
    if (deleting) return
    setModalOpen(false)
    setConfirmText('')
    setPassword('')
  }

  // While the confirm modal is open: close on Escape and lock background scroll.
  // The cleanup restores scroll, so a mid-delete unmount can't leave it stuck.
  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
    // closeModal is stable enough for this effect; re-running only on open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, deleting])

  const handleDelete = () => {
    if (!canDelete) return
    setDeleting(true)
    authRes
      ?.deleteAccount(hasPasswordProvider ? password : undefined)
      .then(() => {
        // deleteAccount signs out and navigates home on success.
        toast.success('Your account has been deleted.')
      })
      .catch(err => {
        setDeleting(false)
        if (err.code === 'password-required') {
          toast.error(err.message)
        } else if (
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-credential'
        ) {
          toast.error(PASSWORD_INCORRECT)
        } else if (err.code === 'auth/popup-closed-by-user') {
          toast.error('Reauthentication was cancelled.')
        } else {
          toast.error(err.message || 'Could not delete your account.')
        }
      })
  }

  return (
    <div className='sr-form'>
      <SettingRowLikeExport exporting={exporting} onExport={handleExport} />

      <div className='sr-danger-card'>
        <div className='sr-row-text'>
          <span className='sr-row-label'>Delete account</span>
          <span className='sr-row-desc'>
            Permanently delete your account, recipes and reviews. This cannot be
            undone.
          </span>
        </div>
        <button
          type='button'
          className='sr-btn-danger'
          onClick={() => setModalOpen(true)}
        >
          <TrashIcon className='sr-btn-icon' />
          Delete account
        </button>
      </div>

      {modalOpen && (
        <div
          className='sr-modal-scrim'
          // Dismiss when the backdrop itself (not the panel) is clicked.
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className='sr-modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='sr-delete-modal-title'
          >
            <header className='sr-modal-head'>
              <h3 id='sr-delete-modal-title'>Delete your account?</h3>
              <button
                type='button'
                className='sr-modal-close'
                aria-label='Close'
                onClick={closeModal}
              >
                <CloseIcon />
              </button>
            </header>
            <p className='sr-modal-body'>
              This permanently deletes your profile, recipes, drafts and reviews.
              This action cannot be undone.
            </p>
            <TextField
              label={`Type ${CONFIRM_WORD} to confirm`}
              value={confirmText}
              onChange={setConfirmText}
              placeholder={CONFIRM_WORD}
            />
            {hasPasswordProvider && (
              <TextField
                label='Your password'
                value={password}
                onChange={setPassword}
                type='password'
                autoComplete='current-password'
              />
            )}
            <div className='sr-modal-actions'>
              <button
                type='button'
                className='sr-btn-text'
                onClick={closeModal}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type='button'
                className='sr-btn-danger'
                onClick={handleDelete}
                disabled={!canDelete || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// The export row mirrors a SettingRow but keeps its own loading state.
const SettingRowLikeExport: FC<{
  exporting: boolean
  onExport: () => void
}> = ({ exporting, onExport }) => (
  <div className='sr-row'>
    <div className='sr-row-text'>
      <span className='sr-row-label'>Export your data</span>
      <span className='sr-row-desc'>
        Download a JSON copy of your profile, recipes and saved items.
      </span>
    </div>
    <div className='sr-row-control'>
      <button
        type='button'
        className='sr-btn-outline'
        onClick={onExport}
        disabled={exporting}
      >
        <DownloadIcon className='sr-btn-icon' />
        {exporting ? 'Preparing…' : 'Export'}
      </button>
    </div>
  </div>
)

export default DangerSection
