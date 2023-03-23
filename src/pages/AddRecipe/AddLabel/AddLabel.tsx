import React, { FC, useRef, useState } from 'react'
import { AiOutlinePlus } from 'react-icons/ai'
import { LabelType } from 'types'
import { v4 as uuidv4 } from 'uuid'
import RecipeFormInput from '../RecipeFormInput'
import './AddLabel.scss'

type AddLabelProps = {
  addToList: (val: LabelType) => void
}

const AddLabel: FC<AddLabelProps> = ({ addToList }) => {
  const [isAddLabelVisible, setIsAddLabelVisible] = useState(false)
  const [labelVal, setLabelVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEnter = () => {
    if (!isAddLabelVisible || !labelVal) return setIsAddLabelVisible(false)
    addToList({ label: labelVal, id: uuidv4() })
    setLabelVal('')
    setIsAddLabelVisible(false)
  }

  const openInput = () => {
    setIsAddLabelVisible(true)
    if (inputRef?.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className='add-label-container'>
      <div className={`input-container ${isAddLabelVisible ? '' : 'hidden'}`}>
        <RecipeFormInput
          val={labelVal}
          setVal={setLabelVal}
          inputRef={inputRef}
          onEnter={handleEnter}
          onBlur={handleEnter}
          placeholder={'Add a ingredient group label/title.'}
        />
      </div>
      <button
        className={`add-label-btn ${isAddLabelVisible ? 'hidden' : ''}`}
        onClick={openInput}
      >
        <AiOutlinePlus className='icon' />{' '}
        <span className='text'>Add Label</span>
      </button>
    </div>
  )
}

export default AddLabel
