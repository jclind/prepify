import React from 'react'
import { vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import InstructionItem from 'src/pages/AddRecipe/Instructions/InstructionItem/InstructionItem'

const contentInstruction = (id: string, content: string, index = 1) => ({
  id,
  content,
  index,
})

const renderItem = () => {
  const instruction = contentInstruction('instr-1', 'Preheat the oven')
  const removeInstruction = vi.fn()
  const setInstructions = vi.fn()
  const { container } = render(
    <InstructionItem
      instruction={instruction as any}
      removeInstruction={removeInstruction}
      setInstructions={setInstructions}
    />
  )
  return { container, removeInstruction, setInstructions }
}

// Enter edit mode, type a new value, and submit it (Enter).
const editTo = (container: HTMLElement, value: string) => {
  fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement
  fireEvent.change(textarea, { target: { value } })
  fireEvent.keyDown(textarea, { key: 'Enter' })
}

describe('InstructionItem inline edit', () => {
  it('submits exactly once on Enter (no double-submit from the trailing blur())', async () => {
    const { container, setInstructions } = renderItem()

    editTo(container, 'Preheat the oven to 350F')

    await waitFor(() => expect(setInstructions).toHaveBeenCalled())
    // Pin: Enter-submit must invoke setInstructions exactly once. Before the
    // blur-guard fix, handleEditSubmit's own trailing textAreaRef.blur()
    // synchronously re-fired RecipeFormTextArea's onBlur (also wired to
    // submit), double-calling setInstructions against the same stale
    // closed-over editedVal/instruction — the identical V6 shape fixed in
    // IngredientItem.tsx (#287).
    expect(setInstructions).toHaveBeenCalledTimes(1)
  })

  it('submits exactly once on genuine blur-away (no Enter)', async () => {
    const { container, setInstructions } = renderItem()

    fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Preheat the oven to 350F' } })
    // Click away without pressing Enter first — a genuine blur.
    fireEvent.blur(textarea)

    await waitFor(() => expect(setInstructions).toHaveBeenCalled())
    expect(setInstructions).toHaveBeenCalledTimes(1)
  })

  it('does not submit when the edited value is unchanged but is empty', async () => {
    const { container, setInstructions } = renderItem()
    editTo(container, '')
    expect(setInstructions).not.toHaveBeenCalled()
  })
})
