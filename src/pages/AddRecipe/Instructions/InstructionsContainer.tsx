import React, { FC, useState } from 'react'
import { InstructionsType } from 'types'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'
import { v4 as uuidv4 } from 'uuid'
import AddLabel from 'src/pages/AddRecipe/AddLabel/AddLabel'
import InstructionList from 'src/pages/AddRecipe/Instructions/InstructionList/InstructionList'
import { INSTRUCTION_MAX_LENGTH } from 'src/util/recipeLimits'

type InstructionsContainerProps = {
  instructions: InstructionsType[]
  setInstructions: React.Dispatch<React.SetStateAction<InstructionsType[]>>
}

const InstructionsContainer: FC<InstructionsContainerProps> = ({
  instructions,
  setInstructions,
}) => {
  const [inputVal, setInputVal] = useState('')
  const [reorderActive, setReorderActive] = useState(false)

  const addInstructionToList = (data: InstructionsType) => {
    setInstructions((prev: InstructionsType[]) => {
      const update: InstructionsType[] = [...prev, data]
      return update
    })
  }
  const removeInstruction = (removeId: string) => {
    setInstructions(prev => {
      const filtered = prev.filter(instr => instr.id !== removeId)
      let indexCounter: number = 0
      return filtered.map(instr => {
        if ('index' in instr) {
          indexCounter++
          return { ...instr, index: indexCounter }
        }
        return instr
      })
    })
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
        characterLimit={INSTRUCTION_MAX_LENGTH}
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
