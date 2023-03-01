import React, { ChangeEvent, KeyboardEvent, Ref } from 'react'
import './RecipeFormInput.scss'

type RecipeFormTextAreaProps = {
  placeholder: string
  name?: string
  val: string
  smallTextArea?: boolean
  setVal: (val: string) => void
  textAreaProp?: Ref<HTMLTextAreaElement>
  handleKeyPress?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  characterLimit?: number
}

const RecipeFormTextArea = ({
  placeholder,
  name,
  val,
  smallTextArea,
  setVal,
  textAreaProp,
  handleKeyPress,
  characterLimit,
}: RecipeFormTextAreaProps) => {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
          ref={textAreaProp ? textAreaProp : undefined}
          onKeyPress={handleKeyPress}
        />
      </div>
    </label>
  )
}

export default RecipeFormTextArea
