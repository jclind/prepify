import React, { FC, ReactNode } from 'react'

// Server-enforced bounds (DESCRIPTION_MAX_LENGTH caps writes at 2000; posts
// under 5 chars are rejected client-side before they ever leave).
export const REVIEW_MIN_LENGTH = 5
export const REVIEW_MAX_LENGTH = 2000
// The counter turns amber as the limit approaches so it's a warning, not a
// surprise.
const WARN_AT = 1900

type ReviewTextareaProps = {
  value: string
  onChange: (val: string) => void
  ariaLabel: string
  placeholder?: string
  // Action buttons rendered in the footer row, after the counter.
  children?: ReactNode
}

/**
 * The review composer's text field: textarea + live length counter, shared by
 * the invitation composer and the own-review inline edit so the ≥5 / ≤2000
 * feedback reads identically in both.
 */
const ReviewTextarea: FC<ReviewTextareaProps> = ({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Share how it turned out…',
  children,
}) => {
  const len = value.length
  const counterClass =
    len >= REVIEW_MAX_LENGTH
      ? 'rr-count over'
      : len >= WARN_AT
      ? 'rr-count warn'
      : 'rr-count'
  const counter =
    len >= REVIEW_MAX_LENGTH
      ? `${REVIEW_MAX_LENGTH.toLocaleString()} / ${REVIEW_MAX_LENGTH.toLocaleString()} — limit reached`
      : len > 0 && len < REVIEW_MIN_LENGTH
      ? `Add at least ${REVIEW_MIN_LENGTH} characters`
      : `${len.toLocaleString()} / ${REVIEW_MAX_LENGTH.toLocaleString()}`

  return (
    <>
      <textarea
        className='rr-textarea'
        value={value}
        maxLength={REVIEW_MAX_LENGTH}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <div className='rr-cfoot'>
        <span className={counterClass} aria-live='polite'>
          {counter}
        </span>
        {children}
      </div>
    </>
  )
}

export default ReviewTextarea
