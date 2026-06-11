import React, { FC, useState } from 'react'
import Modal from 'react-modal'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import { AxiosError } from 'axios'
import { ReportReason, ReportTargetType } from 'types'
import { useAuth } from 'src/context/AuthContext'
import ReportAPI, { ALREADY_REPORTED_CODE } from 'src/api/reports'
import './ReportControl.scss'

Modal.setAppElement('#root')

type ReportTarget = {
  targetType: ReportTargetType
  recipeId: string
  reportedUsername?: string // required when targetType === 'review'
}

type ReportControlProps = {
  target: ReportTarget
  // Visual style of the trigger: a small text link (default) or a plain button.
  variant?: 'link' | 'button'
}

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'offensive', label: 'Offensive or abusive' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'dangerous', label: 'Dangerous or unsafe' },
  { value: 'other', label: 'Something else' },
]

const customStyles = {
  content: {
    // position must be set explicitly: react-modal only applies its default
    // positioning styles when no `className` is given, and we pass one below.
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '440px',
    width: '90vw',
  },
  overlay: {
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.5)',
  },
} as const

const ReportControl: FC<ReportControlProps> = ({ target, variant = 'link' }) => {
  const authRes = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reporting requires a logged-in user (the server stamps reporterUid).
  if (!authRes?.user) return null

  const noun = target.targetType === 'review' ? 'review' : 'recipe'

  const close = () => {
    if (submitting) return
    setIsOpen(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await ReportAPI.createReport({
        targetType: target.targetType,
        recipeId: target.recipeId,
        reportedUsername: target.reportedUsername,
        reason,
        details: details.trim() || undefined,
      })
      toast.success('Thanks — our team will review this report.')
      setIsOpen(false)
      setDetails('')
      setReason('spam')
    } catch (err) {
      const axiosErr = err as AxiosError<{ code?: string }>
      if (axiosErr.response?.data?.code === ALREADY_REPORTED_CODE) {
        toast.error('You already have an open report for this content.')
        setIsOpen(false)
      } else {
        toast.error('Could not submit your report. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type='button'
        className={`report-control-trigger ${variant}`}
        onClick={() => setIsOpen(true)}
        aria-label={`Report this ${noun}`}
      >
        Report
      </button>

      <Modal
        isOpen={isOpen}
        onRequestClose={close}
        style={customStyles}
        className='report-modal'
      >
        <h2 className='report-modal-title'>Report this {noun}</h2>
        <p className='report-modal-sub'>
          Tell us what’s wrong. Reports are reviewed by our moderation team.
        </p>

        <label className='report-field'>
          <span>Reason</span>
          <select
            value={reason}
            onChange={e => setReason(e.target.value as ReportReason)}
          >
            {REASON_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className='report-field'>
          <span>Details (optional)</span>
          <textarea
            value={details}
            maxLength={1000}
            rows={4}
            placeholder='Add any context that will help us review this.'
            onChange={e => setDetails(e.target.value)}
          />
        </label>

        <div className='report-modal-actions'>
          <button
            type='button'
            className='report-cancel-btn'
            onClick={close}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type='button'
            className='report-submit-btn'
            onClick={handleSubmit}
            disabled={submitting}
          >
            Submit report
            {submitting && (
              <span className='report-btn-spinner'>
                <TailSpin height='18' width='18' color='#fff' ariaLabel='loading' />
              </span>
            )}
          </button>
        </div>
      </Modal>
    </>
  )
}

export default ReportControl
