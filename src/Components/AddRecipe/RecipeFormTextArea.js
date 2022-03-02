import React from 'react'
import './RecipeFormInput.scss'

const RecipeFormTextArea = ({
  placeholder,
  name,
  val,
  smallTextArea,
  setVal,
  textAreaProp,
  handleKeyPress,
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
    <label className='recipe-form-textarea'>
      {name && <div className='label-title'>{name}</div>}
      <div className='input-container'>
        <textarea
          placeholder={placeholder}
          value={val}
          onChange={handleChange}
          className={smallTextArea ? 'small-textarea' : ''}
          ref={textAreaProp ? textAreaProp : null}
          onKeyPress={handleKeyPress}
        />
      </div>
    </label>
  )
}

export default RecipeFormTextArea
