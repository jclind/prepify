import React, { ChangeEvent } from 'react'
import './RecipeFormInput.scss'

interface RecipeFormInputProps<T extends string | number | undefined> {
  type?: 'text' | 'password' | 'number' | 'email' | 'tel' | 'url'
  placeholder?: string
  name?: string
  val: T
  setVal: (val: T) => void
  characterLimit?: number
  inputBeginningText?: string
  onEnter?: () => void
}

const RecipeFormInput = <T extends string | number | undefined>({
  type = 'text',
  placeholder,
  name,
  val,
  setVal,
  characterLimit,
  inputBeginningText,
}: RecipeFormInputProps<T>) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value

    if (characterLimit && val.length > characterLimit) {
      return
    }
    return setVal(val as T)
  }

  return (
    <label className='recipe-form-input'>
      {name && <div className='label-title'>{name}</div>}
      <div className='input-container'>
        {inputBeginningText && (
          <div className='input-beginning-text'>{inputBeginningText}</div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          style={{
            paddingLeft: inputBeginningText
              ? `${inputBeginningText.length + 1.5}ch`
              : '1rem',
          }}
        />
      </div>
    </label>
  )
}

export default RecipeFormInput
