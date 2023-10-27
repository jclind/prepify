import React from 'react'
import { FC } from 'react'

type InputContainerProps = {
  label: string
  type?: string
  val: string
  setVal: (val: string) => void
  placeholder?: string
  error?: string
}

const InputContainer: FC<InputContainerProps> = ({
  label,
  type = 'text',
  val,
  setVal,
  placeholder,
  error,
}) => {
  return (
    <div className={`input-container ${error ? 'input-error' : ''}`}>
      <label>{label}</label>
      <input
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
      />
      <div className='error-text'>{error}</div>
    </div>
  )
}

export default InputContainer
