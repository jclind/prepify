import React from 'react'
import { FC } from 'react'

type InputContainerProps = {
  label: string
  type?: string
  val: string
  setVal: (val: string) => void
  placeholder?: string
  error?: string
  // Render a <textarea> instead of an <input> — used for multi-line fields
  // like the profile bio.
  multiline?: boolean
  maxLength?: number
}

const InputContainer: FC<InputContainerProps> = ({
  label,
  type = 'text',
  val,
  setVal,
  placeholder,
  error,
  multiline = false,
  maxLength,
}) => {
  return (
    <div className={`input-container ${error ? 'input-error' : ''}`}>
      <label>{label}</label>
      {multiline ? (
        <textarea
          className='input-textarea'
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      )}
      <div className='error-text'>{error}</div>
    </div>
  )
}

export default InputContainer
