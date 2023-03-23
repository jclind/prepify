import React, { useState } from 'react'
import { InstructionsType } from 'types'
import RecipeFormInput from '../RecipeFormInput'
import { v4 as uuidv4 } from 'uuid'
import AddLabel from '../../../pages/AddRecipe/AddLabel/AddLabel'
import InstructionList from './InstructionList/InstructionList'

type InstructionsContainerProps = {
  instructions: InstructionsType[]
  setInstructions: React.Dispatch<React.SetStateAction<InstructionsType[]>>
}

const InstructionsContainer = ({
  instructions,
  setInstructions,
}: InstructionsContainerProps) => {
  const [inputVal, setInputVal] = useState('')
  const [reorderActive, setReorderActive] = useState(false)

  const addInstructionToList = (data: InstructionsType) => {
    setInstructions((prev: InstructionsType[]) => {
      const update: InstructionsType[] = [...prev, data]
      return update
    })
  }
  const removeInstruction = (removeId: string) => {
    setInstructions(prev => prev.filter(instr => instr.id !== removeId))
  }

  const addInstruction = (data: { label: string } | { content: string }) => {
    setInstructions(prev => {
      const id = uuidv4().toString()
      let instructionData: InstructionsType
      if ('label' in data) {
        instructionData = { ...data, id }
      } else {
        // Get array of instructions without headers for proper indexing
        const instructionOnlyArr = prev.filter(instr => {
          if ('content' in instr) return instr
          else return instr
        })
        instructionData = {
          ...data,
          index: instructionOnlyArr.length + 1,
          id,
        }
      }
      return [...prev, instructionData]
    })
  }

  const handleEnter = () => {
    if (!inputVal) return
    setInputVal('')
    addInstruction({ content: inputVal })
  }

  return (
    <div className='ingredients-container'>
      <RecipeFormInput
        placeholder='Add instruction for your recipe.'
        val={inputVal}
        setVal={setInputVal}
        onEnter={handleEnter}
      />
      <InstructionList
        instructions={instructions}
        setInstructions={setInstructions}
        removeInstruction={removeInstruction}
        reorderActive={reorderActive}
      />
      <button
        className='reorder-btn'
        onClick={() => setReorderActive(prev => !prev)}
      >
        {reorderActive ? 'Done' : 'Reorder'}
      </button>
      <AddLabel addToList={addInstructionToList} />
    </div>
  )
}

export default InstructionsContainer
