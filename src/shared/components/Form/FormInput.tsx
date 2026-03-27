import React, { ChangeEvent, FC, ReactElement } from 'react'
import './FormInput.scss'

interface LoginInputProps {
  icon: ReactElement
  type: string
  placeholder: string
  name: string
  val: string
  setVal: (value: string) => void
}

const LoginInput: FC<LoginInputProps> = ({
  icon,
  type,
  placeholder,
  name,
  val,
  setVal,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value)
  }

  return (
    <label className='form-input'>
      <div className='label-title'>{name}</div>
      <div className='input-container'>
        {icon}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          autoComplete='on'
          required
        />
      </div>
    </label>
  )
}

export default LoginInput
