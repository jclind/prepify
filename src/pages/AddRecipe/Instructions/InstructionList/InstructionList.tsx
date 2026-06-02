import React, { Dispatch, FC, SetStateAction } from 'react'
import { InstructionsType } from 'types'
import { DndContext, Drag } from 'src/pages/AddRecipe/Dnd'
import InstructionItem from 'src/pages/AddRecipe/Instructions/InstructionItem/InstructionItem'

type InstructionListProps = {
  instructions: InstructionsType[]
  setInstructions: Dispatch<SetStateAction<InstructionsType[]>>
  removeInstruction: (id: string) => void
}

const InstructionList: FC<InstructionListProps> = ({
  instructions,
  setInstructions,
  removeInstruction,
}) => {
  const handleListChange = (updatedList: InstructionsType[]) => {
    let indexCounter: number = 0

    const indexedData = updatedList.map(ingr => {
      if ('index' in ingr) {
        indexCounter++
        return { ...ingr, index: indexCounter }
      }
      return ingr
    })
    setInstructions(indexedData)
  }

  return (
    <DndContext list={instructions} handleListChange={handleListChange}>
      <>
        {instructions.map((instr, idx) => (
          <Drag key={instr.id} id={instr.id} index={idx}>
            <InstructionItem
              instruction={instr}
              removeInstruction={removeInstruction}
              setInstructions={setInstructions}
            />
          </Drag>
        ))}
      </>
    </DndContext>
  )
}

export default InstructionList
