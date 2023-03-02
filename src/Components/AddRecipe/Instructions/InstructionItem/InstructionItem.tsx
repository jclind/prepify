import React, { FC, useState } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd'
import { InstructionsType } from 'types'
import Handler from '../../ListComponents/Handler'
import RemoveItem from '../../ListComponents/RemoveItem'
import './InstructionItem.scss'
import '../../ListComponents/Item.scss'

type InstructionItemProps = {
  instructions: InstructionsType[]
  instruction: InstructionsType
  reorderActive?: boolean
  provided?: DraggableProvided
  snapshot?: DraggableStateSnapshot
  removeInstruction: (id: string) => void
}

const InstructionItem: FC<InstructionItemProps> = ({
  instructions,
  instruction,
  reorderActive,
  provided,
  snapshot,
  removeInstruction,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedVal, setEditedVal] = useState(() => {
    if ('label' in instruction) return instruction.label
    return instruction.content
  })

  const handleInstrClick = () => {}

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
    </div>
  )
}

export default InstructionItem
