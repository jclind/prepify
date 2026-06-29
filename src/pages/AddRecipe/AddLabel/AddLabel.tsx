import { PlusIcon } from 'src/Components/icons'
import React, { FC, useEffect, useRef, useState } from 'react'
import { LabelType } from 'types'
import { v4 as uuidv4 } from 'uuid'
import FormInput from 'src/Components/Form/FormInput'
import './AddLabel.scss'

type AddLabelProps = {
  addToList: (val: LabelType) => void
}

// Two states, rendered conditionally so the inactive one never reserves layout
// space (previously both rendered at once and the hidden input made the footer
// row tall, knocking the button out of alignment with the subtotal).
const AddLabel: FC<AddLabelProps> = ({ addToList }) => {
  const [isAddLabelVisible, setIsAddLabelVisible] = useState(false)
  const [labelVal, setLabelVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input once it has actually mounted — calling focus() in the click
  // handler ran before React rendered the input, so it silently failed.
  useEffect(() => {
    if (isAddLabelVisible) inputRef.current?.focus()
  }, [isAddLabelVisible])

  const handleEnter = () => {
    if (!isAddLabelVisible || !labelVal) return setIsAddLabelVisible(false)
    addToList({ label: labelVal, id: uuidv4() })
    setLabelVal('')
    setIsAddLabelVisible(false)
  }

  return (
    <div className='add-label-container'>
      {isAddLabelVisible ? (
        <FormInput
          size='compact'
          val={labelVal}
          setVal={setLabelVal}
          inputRef={inputRef}
          onEnter={handleEnter}
          onBlur={handleEnter}
          placeholder={'Add a ingredient group label/title.'}
        />
      ) : (
        <button
          className='add-label-btn'
          onClick={() => setIsAddLabelVisible(true)}
        >
          <PlusIcon className='icon' />
          <span className='text'>Add Label</span>
        </button>
      )}
    </div>
  )
}

export default AddLabel
