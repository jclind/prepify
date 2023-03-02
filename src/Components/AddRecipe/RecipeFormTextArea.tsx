import React, { ChangeEvent, KeyboardEvent, Ref } from 'react'
import './RecipeFormInput.scss'

type RecipeFormTextAreaProps = {
  placeholder?: string
  name?: string
  val: string
  smallTextArea?: boolean
  setVal: (val: string) => void
  textAreaRef?: React.RefObject<HTMLTextAreaElement>
  handleKeyPress?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  characterLimit?: number
  onEnter?: () => void
  onBlur?: () => void
}

const RecipeFormTextArea = ({
  placeholder,
  name,
  val,
  smallTextArea,
  setVal,
  textAreaRef,
  handleKeyPress,
  characterLimit,
  onEnter,
  onBlur,
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
          ref={textAreaRef}
          onKeyPress={handleKeyPress}
          onKeyDown={e => {
            if (e.key === 'Enter' && onEnter) onEnter()
          }}
          onBlur={onBlur}
        />
      </div>
    </label>
  )
}

export default RecipeFormTextArea
