import { CloseIcon, DragIcon } from 'src/Components/icons'
import React, { Dispatch, FC, SetStateAction, useRef, useState } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import { InstructionsType } from 'types'
import './InstructionItem.scss'
import '../../ListComponents/Item.scss'
import RecipeFormTextArea from 'src/pages/AddRecipe/RecipeFormTextArea'
import { INSTRUCTION_MAX_LENGTH } from 'src/util/recipeLimits'

type InstructionItemProps = {
  instruction: InstructionsType
  provided?: DraggableProvided
  snapshot?: DraggableStateSnapshot
  removeInstruction: (id: string) => void
  setInstructions: Dispatch<SetStateAction<InstructionsType[]>>
}

const InstructionItem: FC<InstructionItemProps> = ({
  instruction,
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
  // handleEditSubmit ends by programmatically blur()-ing the textarea (so a
  // keyboard Enter-submit also exits edit mode visually). That blur()
  // synchronously re-fires the same RecipeFormTextArea's onBlur, which is
  // also wired to submit — without a guard, every Enter-submit double-invokes
  // handleEditSubmit against the same stale closed-over editedVal/instruction
  // (duplicate, idempotent setInstructions call). This ref is flipped
  // immediately before the self-triggered blur() and consumed by handleBlur
  // below, so only a genuine user blur (click-away while editing) reaches
  // handleEditSubmit a second time. Mirrors the identical fix in
  // IngredientItem.tsx (V6, #287).
  const suppressNextBlurSubmitRef = useRef(false)

  const handleInstrClick = () => {
    setIsEditing(true)
    textAreaRef?.current && textAreaRef.current.focus()
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
    suppressNextBlurSubmitRef.current = true
    blur()
    setIsEditing(false)
  }

  // Wired to RecipeFormTextArea's onBlur. Genuine blur-away (clicking
  // elsewhere while editing) should still submit; the blur() handleEditSubmit
  // triggers on itself should not resubmit — see suppressNextBlurSubmitRef
  // above.
  const handleBlur = () => {
    if (suppressNextBlurSubmitRef.current) {
      suppressNextBlurSubmitRef.current = false
      return
    }
    handleEditSubmit()
  }

  const isContent = 'content' in instruction

  return (
    <div
      ref={provided?.innerRef}
      className={`instructions-container item instruction-row ${
        snapshot?.isDragging ? 'dragging' : ''
      }`}
      {...provided?.draggableProps}
    >
      {/* Always-visible drag handle (the only drag target, so clicking the step
          text still opens inline edit). Reorder any time — no mode. */}
      <div
        className='drag-handle'
        aria-label='Drag to reorder'
        {...provided?.dragHandleProps}
      >
        <DragIcon className='icon' />
      </div>

      {isEditing ? null : isContent ? (
        <button className='item-btn' onClick={handleInstrClick}>
          <div className='index'>{instruction.index}</div>
          <div className='content'>{instruction.content}</div>
        </button>
      ) : (
        <button className='label-text-container' onClick={handleInstrClick}>
          <h4 className='text'>{instruction.label}</h4>
        </button>
      )}

      <button
        className='instr-remove'
        aria-label='Remove step'
        onClick={e => {
          e.stopPropagation()
          removeInstruction(instruction.id)
        }}
      >
        <CloseIcon className='icon' />
      </button>

      {!snapshot?.isDragging && (
        <div
          className={`text-area-container ${isEditing ? 'edit-input' : 'hidden'}`}
        >
          <RecipeFormTextArea
            val={editedVal}
            setVal={setEditedVal}
            textAreaRef={textAreaRef}
            onBlur={handleBlur}
            onEnter={handleEditSubmit}
            smallTextArea={true}
            characterLimit={INSTRUCTION_MAX_LENGTH}
          />
        </div>
      )}
    </div>
  )
}

export default InstructionItem
