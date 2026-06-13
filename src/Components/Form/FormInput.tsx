import React, { ChangeEvent, FC, ReactElement, useState } from 'react'
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md'
import './FormInput.scss'

interface FormInputProps {
  icon: ReactElement
  type: string
  placeholder: string
  name: string
  val: string
  setVal: (value: string) => void
  /** Visible label above the field. Defaults to a capitalized `name`. */
  label?: string
  /** Small helper / validation line below the field. */
  hint?: string
  hintTone?: 'error' | 'ok'
  autoComplete?: string
  required?: boolean
  maxLength?: number
}

const FormInput: FC<FormInputProps> = ({
  icon,
  type,
  placeholder,
  name,
  val,
  setVal,
  label,
  hint,
  hintTone = 'ok',
  autoComplete = 'on',
  required = true,
  maxLength,
}) => {
  // Password fields render a show/hide toggle and swap their input type.
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (show ? 'text' : 'password') : type

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value)
  }

  return (
    <label className='form-input'>
      <span className='label-title'>{label ?? name}</span>
      <div className='input-container'>
        {icon}
        <input
          type={resolvedType}
          name={name}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          autoComplete={autoComplete}
          required={required}
          maxLength={maxLength}
        />
        {isPassword && (
          <button
            type='button'
            className='toggle-visibility'
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
          >
            {show ? <MdOutlineVisibilityOff /> : <MdOutlineVisibility />}
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
