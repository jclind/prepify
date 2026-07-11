import React from 'react'
import { vi } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
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

  // Stale-suppression regression: on a GENUINE blur-away, real focus has
  // already left the textarea by the time handleEditSubmit runs, so its
  // trailing self-blur() no-ops (per spec, blur() on a non-focused element
  // fires no event — jsdom conforms) and never consumes the suppress flag.
  // Without the edit-entry reset, the flag stays stuck true and the NEXT edit
  // session's genuine blur-away is swallowed (no submit, edit mode stays
  // open). This test moves REAL focus (element.focus() on another control)
  // instead of fireEvent.blur, so the browser-faithful ordering — blur event
  // first, self-blur() a no-op — is what actually runs.
  it('a second edit session still submits on blur-away after a prior blur-away submit', async () => {
    const { container, setInstructions } = renderItem()
    const removeBtn = container.querySelector('.instr-remove') as HTMLButtonElement

    const blurAwaySession = (value: string) => {
      fireEvent.click(container.querySelector('.item-btn') as HTMLElement)
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement
      expect(document.activeElement).toBe(textarea) // real focus from click-to-edit
      fireEvent.change(textarea, { target: { value } })
      // Genuine blur-away: move real DOM focus to another control. jsdom
      // fires the real blur on the textarea; the handler's trailing blur()
      // then targets an already-unfocused element and fires nothing.
      act(() => removeBtn.focus())
    }

    blurAwaySession('Preheat the oven to 350F')
    await waitFor(() => expect(setInstructions).toHaveBeenCalledTimes(1))

    blurAwaySession('Preheat the oven to 375F')
    // Pre-fix: the stale flag from session 1 swallows this submit (stays 1).
    await waitFor(() => expect(setInstructions).toHaveBeenCalledTimes(2))
  })
})
