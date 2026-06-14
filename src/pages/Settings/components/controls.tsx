// Low-level, presentational form controls shared across the settings sections.
// Token-styled building blocks so every section stays visually consistent; none
// of these touch the backend. Promoted from the settings-overhaul design
// playground once the V1 "Dashboard" layout was chosen.

import React, { FC, ReactNode } from 'react'
import './controls.scss'

/* ---------------------------------------------------------------- Avatar ---- */

type AvatarFieldProps = {
  imgUrl: string
  name: string
  onUpload?: () => void
  onRemove?: () => void
}

export const AvatarField: FC<AvatarFieldProps> = ({
  imgUrl,
  name,
  onUpload,
  onRemove,
}) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?'
  return (
    <div className='sr-avatar-field'>
      <div className='sr-avatar'>
        {imgUrl ? (
          <img src={imgUrl} alt='profile avatar' />
        ) : (
          <span className='sr-avatar-initial'>{initial}</span>
        )}
      </div>
      <div className='sr-avatar-actions'>
        <button type='button' className='sr-btn-outline' onClick={onUpload}>
          Upload photo
        </button>
        {imgUrl && (
          <button type='button' className='sr-btn-text' onClick={onRemove}>
            Remove
          </button>
        )}
        <p className='sr-hint'>JPG or PNG, up to 5MB.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- Text field ---- */

type TextFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  error?: string
  prefix?: string
  type?: string
  maxLength?: number
  autoComplete?: string
  disabled?: boolean
  // Tints the hint line — e.g. 'success' (green) for an available username.
  hintTone?: 'default' | 'success'
}

export const TextField: FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  prefix,
  type = 'text',
  maxLength,
  autoComplete,
  disabled,
  hintTone = 'default',
}) => (
  <label
    className={`sr-field ${error ? 'has-error' : ''} ${
      !error && hint && hintTone === 'success' ? 'has-success' : ''
    } ${disabled ? 'is-disabled' : ''}`}
  >
    {label && <span className='sr-field-label'>{label}</span>}
    <span className={`sr-input-wrap ${prefix ? 'has-prefix' : ''}`}>
      {prefix && <span className='sr-input-prefix'>{prefix}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      />
    </span>
    {error ? (
      <span className='sr-field-error'>{error}</span>
    ) : hint ? (
      <span className={`sr-field-hint ${hintTone === 'success' ? 'is-success' : ''}`}>
        {hint}
      </span>
    ) : null}
  </label>
)

type TextAreaProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}

export const TextArea: FC<TextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}) => (
  <label className='sr-field'>
    <span className='sr-field-label'>
      {label}
      {maxLength != null && (
        <span className='sr-counter'>
          {value.length}/{maxLength}
        </span>
      )}
    </span>
    <textarea
      className='sr-textarea'
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={3}
      onChange={e => onChange(e.target.value)}
    />
  </label>
)

/* ----------------------------------------------------------------- Toggle ---- */

type ToggleProps = {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export const Toggle: FC<ToggleProps> = ({ checked, onChange, label }) => (
  <button
    type='button'
    role='switch'
    aria-checked={checked}
    aria-label={label}
    className={`sr-toggle ${checked ? 'on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className='sr-toggle-knob' />
  </button>
)

/* ------------------------------------------------------------ Setting row ---- */

// Label + description on the left, a control on the right. Used for the toggle
// rows in Privacy and the read-only rows in Account & Security.
type SettingRowProps = {
  label: string
  desc?: string
  control: ReactNode
  danger?: boolean
}

export const SettingRow: FC<SettingRowProps> = ({
  label,
  desc,
  control,
  danger,
}) => (
  <div className={`sr-row ${danger ? 'danger' : ''}`}>
    <div className='sr-row-text'>
      <span className='sr-row-label'>{label}</span>
      {desc && <span className='sr-row-desc'>{desc}</span>}
    </div>
    <div className='sr-row-control'>{control}</div>
  </div>
)

/* --------------------------------------------------------------- Save bar ---- */

// Sticky "you have unsaved changes" bar. Shown by a section while its form is
// dirty; the section owns the save/reset handlers and the loading state.
export const SaveBar: FC<{
  dirty: boolean
  loading?: boolean
  onSave: () => void
  onReset: () => void
}> = ({ dirty, loading, onSave, onReset }) => (
  <div className={`sr-savebar ${dirty ? 'show' : ''}`}>
    <span className='sr-savebar-msg'>You have unsaved changes</span>
    <div className='sr-savebar-actions'>
      <button type='button' className='sr-btn-text' onClick={onReset}>
        Discard
      </button>
      <button
        type='button'
        className='sr-btn-primary'
        onClick={onSave}
        disabled={loading}
      >
        {loading ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  </div>
)
