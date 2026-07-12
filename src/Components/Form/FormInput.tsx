import { EyeIcon, EyeOffIcon } from 'src/Components/icons'
import React, { ChangeEvent, ReactElement, useState } from 'react'
import './FormInput.scss'

interface FormInputProps {
  /** Visual density. `md` (default) = the auth/profile field (48px, focus ring);
   *  `compact` = the denser AddRecipe field (40px, no focus ring). */
  size?: 'md' | 'compact'
  /** Optional leading icon, rendered inside the field on the left. */
  icon?: ReactElement
  type?: string
  placeholder?: string
  name?: string
  val: string
  /**
   * Receives the field's raw DOM string on every change — `<input>` values are
   * always strings, so this is the honest type. A numeric field (e.g.
   * ServingsInput) must accept the string and parse/coerce it itself rather than
   * relying on a cast that would let a numeric *string* masquerade as a `number`.
   */
  setVal: (value: string) => void
  /** Visible label above the field. Defaults to a capitalized `name`; omitted when neither is set. */
  label?: string
  /** Small helper / validation line below the field. */
  hint?: string
  hintTone?: 'error' | 'ok'
  autoComplete?: string
  /** Native `required`. Defaults to `true` for `md`, `false` for `compact`. */
  required?: boolean
  /** Native maxLength attribute. */
  maxLength?: number
  /** Hard character cap enforced in the change handler — keystrokes past it are dropped. */
  characterLimit?: number
  /** Static prefix shown inside the field, before the value (e.g. "Hours"). */
  inputBeginningText?: string
  onEnter?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  onBlur?: () => void
  // Accessibility: flag the field as invalid and point it at its error message.
  invalid?: boolean
  describedBy?: string
}

const FormInput = ({
  size = 'md',
  icon,
  type = 'text',
  placeholder,
  name,
  val,
  setVal,
  label,
  hint,
  hintTone = 'ok',
  autoComplete = 'on',
  required,
  maxLength,
  characterLimit,
  inputBeginningText,
  onEnter,
  inputRef,
  onBlur,
  invalid,
  describedBy,
}: FormInputProps) => {
  // Password fields render a show/hide toggle and swap their input type.
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (show ? 'text' : 'password') : type

  // `md` (auth) fields default to required; `compact` (AddRecipe) fields don't.
  const isRequired = required ?? size === 'md'
  const labelText = label ?? name

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (characterLimit && next.length > characterLimit) return
    setVal(next)
  }

  return (
    <label className={`form-input form-input--${size}`}>
      {labelText && <span className='label-title'>{labelText}</span>}
      <div className='input-container'>
        {icon}
        {inputBeginningText && (
          <div className='input-beginning-text'>{inputBeginningText}</div>
        )}
        <input
          type={resolvedType}
          name={name}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          autoComplete={autoComplete}
          required={isRequired}
          maxLength={maxLength}
          style={
            inputBeginningText
              ? { paddingLeft: `${inputBeginningText.length + 2}ch` }
              : undefined
          }
          onKeyDown={e => {
            if (e.key === 'Enter' && onEnter) onEnter()
          }}
          ref={inputRef}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        {isPassword && (
          <button
            type='button'
            className='toggle-visibility'
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hint && (
        <span
          className={`input-hint input-hint--${hintTone}`}
          role={hintTone === 'error' ? 'alert' : undefined}
        >
          {hint}
        </span>
      )}
    </label>
  )
}

export default FormInput
