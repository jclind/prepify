import React, { Dispatch, FC, SetStateAction, useRef, useState } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd'
import { InstructionsType } from 'types'
import Handler from '../../ListComponents/Handler'
import RemoveItem from '../../ListComponents/RemoveItem'
import './InstructionItem.scss'
import '../../ListComponents/Item.scss'
import RecipeFormTextArea from '../../RecipeFormTextArea'

type InstructionItemProps = {
  instruction: InstructionsType
  reorderActive?: boolean
  provided?: DraggableProvided
  snapshot?: DraggableStateSnapshot
  removeInstruction: (id: string) => void
  setInstructions: Dispatch<SetStateAction<InstructionsType[]>>
}

const InstructionItem: FC<InstructionItemProps> = ({
  instruction,
  reorderActive,
  provided,
  snapshot,
  removeInstruction,
  setInstructions,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [editedVal, setEditedVal] = useState(() => {
    if ('label' in instruction) return instruction.label
    return instruction.content
  })

  const handleInstrClick = () => {
    if (!reorderActive) {
      setIsEditing(true)
      textAreaRef?.current && textAreaRef.current.focus()
    }
  }
  const editInstruction = (id: string, updatedItem: InstructionsType) => {
    setInstructions(prev =>
      prev.map(instr => (instr.id === id ? updatedItem : instr))
    )
  }
  const handleEditSubmit = () => {
    const blur = () => textAreaRef?.current && textAreaRef.current.blur()
    if (editedVal) {
      const updatedInstruction = { ...instruction }

      if ('label' in updatedInstruction) {
        updatedInstruction.label = editedVal
      } else {
        updatedInstruction.content = editedVal
      }

      editInstruction(instruction.id, updatedInstruction)
    }
    blur()
    setIsEditing(false)
  }

  return (
    <div
      className={`instructions-container item ${
        snapshot?.isDragging ? 'dragging' : ''
      }`}
      {...provided?.draggableProps}
    >
      <Handler provided={provided} reorderActive={reorderActive} />
      {instruction && (
        <RemoveItem
          removeItem={removeInstruction}
          id={instruction.id}
          reorderActive={reorderActive ?? false}
        />
      )}
      {isEditing ? null : 'content' in instruction ? (
        <button className='item-btn' onClick={handleInstrClick}>
          <div className={`index ${reorderActive ? 'margin-active' : ''}`}>
            {instruction.index}
          </div>
          <div className='content'>{instruction.content}</div>
        </button>
      ) : (
        <button
          className={`label-text-container ${
            reorderActive ? 'margin-active' : ''
          }`}
          onClick={handleInstrClick}
        >
          <h4 className='text'>{instruction.label}</h4>
        </button>
      )}
      {!snapshot?.isDragging && (
        <div
          className={`text-area-container ${
            isEditing && !reorderActive ? 'edit-input' : 'hidden'
          }`}
        >
          <RecipeFormTextArea
            val={editedVal}
            setVal={setEditedVal}
            textAreaRef={textAreaRef}
            onBlur={handleEditSubmit}
            onEnter={handleEditSubmit}
            smallTextArea={true}
          />
        </div>
      )}
    </div>
  )
}

export default InstructionItem
