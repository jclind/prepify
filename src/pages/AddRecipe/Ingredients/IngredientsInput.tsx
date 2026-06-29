import React, { FC, useState } from 'react'
import FormInput from 'src/Components/Form/FormInput'

type IngredientsInputProps = {
  // Hands the raw entry to the container, which adds it optimistically and runs
  // enrichment. Fire-and-forget by design — the input clears immediately so the
  // user can keep typing while the row fills in.
  onAdd: (rawValue: string) => void
}

const IngredientsInput: FC<IngredientsInputProps> = ({ onAdd }) => {
  const [inputVal, setInputVal] = useState('')
  const [hint, setHint] = useState('')

  const handleAddIngredient = () => {
    // Empty / whitespace-only input: close the loop with a hint instead of
    // silently no-opping, and never add an empty row.
    const trimmed = inputVal.trim()
    if (!trimmed) {
      setHint('Enter an ingredient before adding it.')
      return
    }

    setHint('')
    onAdd(trimmed)
    // Clear immediately — the ingredient is already in the list optimistically,
    // so the field is ready for the next entry without waiting on the network.
    setInputVal('')
  }

  return (
    <div className='input-container'>
      <FormInput
        size='compact'
        placeholder='Add ingredients to your recipe.'
        val={inputVal}
        setVal={setInputVal}
        onEnter={handleAddIngredient}
      />
      {hint && (
        <div className='warning' role='status'>
          {hint}
        </div>
      )}
    </div>
  )
}

export default IngredientsInput
