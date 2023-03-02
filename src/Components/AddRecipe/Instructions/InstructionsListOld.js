import React, { useState, useEffect, useRef } from 'react'
import RecipeFormTextArea from '../RecipeFormTextArea'
import InstructionsItem from './InstructionsItem'
import { v4 as uuidv4 } from 'uuid'
import './InstructionsList.scss'

const InstructionsList = ({
  recipeInstructions,
  instructionListName,
  setRecipeInstructions,
  updateRecipeInstructions,
  updateListName,
  index,
  isMultipleLists,
  removeList,
}) => {
  const [instructionText, setInstructionText] = useState('')

  const [listTitle, setListTitle] = useState('')
  const [error, setError] = useState('')

  const instructionTextAreaRef = useRef()

  const handleAddInstruction = e => {
    e.preventDefault()

    if (instructionText.length <= 5) {
      return setError('ERROR, MUST HAVE 5 OR MORE CHARACTERS PER INSTRUCTION')
    }

    const data = {
      content: instructionText,
      index: recipeInstructions.length + 1,
      id: `instruction-${uuidv4()}`,
    }

    setRecipeInstructions(data, index)

    setInstructionText('')
    instructionTextAreaRef.current.focus()
  }
  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddInstruction(e)
    }
  }

  const updateInstruction = (updatedItem, id) => {
    setError('')

    const tempInstructionsIndex = recipeInstructions.findIndex(
      item => item.id === id
    )

    if (!updatedItem.content) {
      setError('ERROR, CONTENT CANNOT BE NULL')
    }

    const instructionData = [
      ...recipeInstructions.slice(0, tempInstructionsIndex),
      { ...updatedItem },
      ...recipeInstructions.slice(tempInstructionsIndex + 1),
    ]

    updateRecipeInstructions(instructionData, index)
    return true
  }

  const deleteInstruction = id => {
    const tempInstructionsIndex = recipeInstructions.findIndex(
      item => item.id === id
    )

    const instructionData = [
      ...recipeInstructions.slice(0, tempInstructionsIndex),
      ...recipeInstructions.slice(tempInstructionsIndex + 1),
    ]
    updateRecipeInstructions(instructionData, index)
  }

  const updateInstructionListName = e => {
    const val = e.target.value
    setListTitle(val)
    updateListName(val, index)
  }

  useEffect(() => {
    setError('')
  }, [instructionText])

  return (
    <div className='instructions-list'>
      {isMultipleLists && (
        <div className='list-title'>
          {listTitle ? `${listTitle}:` : `${instructionListName}:`}
        </div>
      )}
      {isMultipleLists && (
        <button
          type='button'
          className='remove-list-btn btn'
          onClick={() => removeList(index)}
        >
          Remove List
        </button>
      )}
      {error && <div className='error'>{error}</div>}
      {isMultipleLists && (
        <input
          className='list-title-input'
          placeholder={`Enter Title For List ${index + 1}`}
          value={listTitle}
          onChange={updateInstructionListName}
        />
      )}
      <div className='instruction-list-textarea-container'>
        <RecipeFormTextArea
          smallTextArea={true}
          val={instructionText}
          setVal={setInstructionText}
          placeholder='Pre-heat oven to 350 degrees....'
          textAreaProp={instructionTextAreaRef}
          handleKeyPress={handleKeyPress}
        />
        <button
          type='button'
          className='add-instruction btn'
          onClick={handleAddInstruction}
        >
          Add Step
        </button>
      </div>
      <div className='list'>
        {recipeInstructions.map((instruction, idx) => {
          return (
            <InstructionsItem
              instruction={instruction}
              index={idx + 1}
              key={instruction.id}
              deleteInstruction={deleteInstruction}
              updateInstruction={updateInstruction}
            />
          )
        })}
      </div>
    </div>
  )
}

export default InstructionsList
