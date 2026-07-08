import { FlagIcon, MoreIcon } from 'src/Components/icons'
import React, { FC, useEffect, useRef, useState } from 'react'
import Modal from 'react-modal'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import { AxiosError } from 'axios'
import { ReportReason, ReportTargetType } from 'types'
import { useAuth } from 'src/context/AuthContext'
import ReportAPI, { ALREADY_REPORTED_CODE } from 'src/api/reports'
import { panelModalStylesWith } from 'src/util/modalStyles'
import './ReportControl.scss'

type ReportTarget = {
  targetType: ReportTargetType
  recipeId?: string // required for 'recipe' / 'review'; omitted for 'user'
  reportedUsername?: string // required for 'review' / 'user'
}

type ReportControlProps = {
  target: ReportTarget
  // Visual style of the trigger:
  //  - 'link'   — a small inline text link (default)
  //  - 'button' — a plain bordered button
  //  - 'menu'   — a three-dots (kebab) trigger that opens a dropdown whose
  //               single item opens the report modal
  variant?: 'link' | 'button' | 'menu'
}

// `recipeOnly` reasons (wrong quantities / price) are offered only when the
// target is a recipe; the server rejects them on review/user targets, so the two
// lists must agree (server/routes/reports.js: RECIPE_ONLY_REASONS).
const REASON_OPTIONS: {
  value: ReportReason
  label: string
  recipeOnly?: boolean
}[] = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'offensive', label: 'Offensive or abusive' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'dangerous', label: 'Dangerous or unsafe' },
  { value: 'incorrect_info', label: 'Incorrect information or price', recipeOnly: true },
  { value: 'other', label: 'Something else' },
]

const ReportControl: FC<ReportControlProps> = ({ target, variant = 'link' }) => {
  const authRes = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const NOUNS: Record<ReportTargetType, string> = {
    recipe: 'recipe',
    review: 'review',
    user: 'user',
  }
  const noun = NOUNS[target.targetType]

  // Recipe-only reasons appear solely on recipe reports; everything else is
  // universal. The default/reset reason ('spam') is always in this list, so the
  // filtered set can never leave `reason` pointing at a hidden option.
  const reasonOptions = REASON_OPTIONS.filter(
    opt => !opt.recipeOnly || target.targetType === 'recipe'
  )

  // Close the kebab dropdown on an outside click or Escape (matches the
  // SortDropdown pattern). Only wired while the menu is actually open.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // The trigger stays visible to everyone so logged-out visitors still know
  // reporting exists; reporting itself needs an account (the server stamps
  // reporterUid), so clicking while logged out nudges to log in instead of
  // opening the modal.
  const handleTriggerClick = () => {
    setMenuOpen(false)
    if (!authRes?.user) {
      toast.error(`Log in to report this ${noun}.`)
      return
    }
    setIsOpen(true)
  }

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

  const modal = (
    <Modal
      isOpen={isOpen}
      onRequestClose={close}
      style={panelModalStylesWith({ maxWidth: '440px', width: '90vw' })}
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
          {reasonOptions.map(opt => (
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
              <TailSpin height='18' width='18' color='white' ariaLabel='loading' />
            </span>
          )}
        </button>
      </div>
    </Modal>
  )

  // Kebab variant: a three-dots trigger opening a dropdown with a single
  // "Report …" item. The modal is a sibling of the (collapsible) panel, so it
  // survives the panel closing when the item is clicked.
  if (variant === 'menu') {
    return (
      <div className='report-menu' ref={menuRef}>
        <button
          type='button'
          className={`report-menu-trigger ${menuOpen ? 'is-open' : ''}`}
          aria-haspopup='menu'
          aria-expanded={menuOpen}
          aria-label='More options'
          onClick={() => setMenuOpen(o => !o)}
        >
          <MoreIcon />
        </button>
        {menuOpen && (
          <div className='report-menu-panel' role='menu'>
            <button
              type='button'
              role='menuitem'
              className='report-menu-item'
              onClick={handleTriggerClick}
              aria-label={`Report this ${noun}`}
            >
              <FlagIcon /> Report {noun}
            </button>
          </div>
        )}
        {modal}
      </div>
    )
  }

  return (
    <>
      <button
        type='button'
        className={`report-control-trigger ${variant}`}
        onClick={handleTriggerClick}
        aria-label={`Report this ${noun}`}
      >
        Report
      </button>
      {modal}
    </>
  )
}

export default ReportControl
