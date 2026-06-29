import React, { ChangeEvent, FC, KeyboardEvent } from 'react'
import './RecipeFormTextArea.scss'

type RecipeFormTextAreaProps = {
  placeholder?: string
  name?: string
  val: string
  smallTextArea?: boolean
  setVal: (val: string) => void
  textAreaRef?: React.RefObject<HTMLTextAreaElement | null>
  handleKeyPress?: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  characterLimit?: number
  onEnter?: () => void
  onBlur?: () => void
  // Accessibility: flag the field as invalid and point it at its error message.
  invalid?: boolean
  describedBy?: string
}

const RecipeFormTextArea: FC<RecipeFormTextAreaProps> = ({
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
  invalid,
  describedBy,
}) => {
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
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      </div>
    </label>
  )
}

export default RecipeFormTextArea
