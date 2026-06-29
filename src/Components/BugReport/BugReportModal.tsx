import React, { FC, useState } from 'react'
import Modal from 'react-modal'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import { BugReportCategory } from 'types'
import { useAuth } from 'src/context/AuthContext'
import BugReportAPI from 'src/api/bugReports'
import { version } from 'src/Components/Footer/footerData'
import { panelModalStylesWith } from 'src/util/modalStyles'
import './BugReportModal.scss'

type BugReportModalProps = {
  // Visual style of the trigger: a small text link (default) or a plain button.
  variant?: 'link' | 'button'
}

const CATEGORY_OPTIONS: { value: BugReportCategory; label: string }[] = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'confusing', label: 'Something is confusing' },
  { value: 'idea', label: 'I have an idea' },
  { value: 'other', label: 'Something else' },
]

const MAX_DESCRIPTION = 2000

// "Report a bug" trigger + modal form. Open to everyone — logged-out included —
// so unlike ReportControl there is no auth gate. Auto-captures the current route
// and app version; logged-out users may add an email for follow-up. The server
// reads the User-Agent itself, so we don't send it.
const BugReportModal: FC<BugReportModalProps> = ({ variant = 'link' }) => {
  const authRes = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<BugReportCategory>('bug')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loggedOut = !authRes?.user
  // Identity shown to a signed-in reporter so they know the report is tied to
  // their account (which is why we don't ask logged-in users for an email). The
  // server attaches reporterUid from the token regardless of this label.
  const reporterName =
    authRes?.user?.displayName || authRes?.user?.email || null

  const close = () => {
    if (submitting) return
    setIsOpen(false)
  }

  const reset = () => {
    setDescription('')
    setEmail('')
    setCategory('bug')
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe what happened.')
      return
    }
    setSubmitting(true)
    try {
      await BugReportAPI.createBugReport({
        category,
        description: description.trim(),
        // Captured at submit time so the report reflects the page the user was on.
        url: window.location.pathname + window.location.search,
        appVersion: version,
        email: loggedOut && email.trim() ? email.trim() : undefined,
      })
      toast.success('Thanks — your report has been sent.')
      setIsOpen(false)
      reset()
    } catch {
      toast.error('Could not send your report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type='button'
        className={`bug-report-trigger btn ${variant}`}
        onClick={() => setIsOpen(true)}
      >
        Report a bug
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={close}
        style={panelModalStylesWith({ maxWidth: '460px', width: '90vw' })}
        className='bug-report-modal'
      >
        <h2 className='bug-report-modal-title'>Report a bug or send feedback</h2>
        <p className='bug-report-modal-sub'>
          Tell us what happened. We’ll attach the page you’re on automatically.
        </p>

        {!loggedOut && reporterName && (
          <p className='bug-report-identity'>
            Reporting as <strong>{reporterName}</strong>
          </p>
        )}

        <label className='bug-report-field'>
          <span>What kind of issue?</span>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as BugReportCategory)}
          >
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className='bug-report-field'>
          <span>Description</span>
          <textarea
            value={description}
            maxLength={MAX_DESCRIPTION}
            rows={5}
            placeholder='What went wrong, and what did you expect to happen?'
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        {loggedOut && (
          <label className='bug-report-field'>
            <span>Email (optional)</span>
            <input
              type='email'
              value={email}
              placeholder='So we can follow up if needed'
              onChange={e => setEmail(e.target.value)}
            />
          </label>
        )}

        <div className='bug-report-modal-actions'>
          <button
            type='button'
            className='bug-report-cancel-btn btn'
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type='button'
            className='bug-report-submit-btn btn'
            onClick={handleSubmit}
            disabled={submitting}
          >
            Send report
            {submitting && (
              <span className='bug-report-btn-spinner'>
                <TailSpin height='18' width='18' color='#fff' ariaLabel='loading' />
              </span>
            )}
          </button>
        </div>
      </Modal>
    </>
  )
}

export default BugReportModal
