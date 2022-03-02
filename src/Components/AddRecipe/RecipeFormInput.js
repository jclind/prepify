import React from 'react'
import './RecipeFormInput.scss'

const RecipeFormInput = ({
  type,
  placeholder,
  name,
  val,
  setVal,
  characterLimit,
}) => {
  const handleChange = e => {
    const val = e.target.value

    if (characterLimit && val.length > characterLimit) {
      return
    }
    return setVal(val)
  }
  return (
    <label className='recipe-form-input'>
      {name && <div className='label-title'>{name}</div>}
      <div className='input-container'>
        <input
          type={type}
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
        />
      </div>
    </label>
  )
}

export default RecipeFormInput
