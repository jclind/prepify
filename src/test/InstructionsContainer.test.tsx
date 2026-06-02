import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstructionsContainer from 'src/pages/AddRecipe/Instructions/InstructionsContainer'

vi.mock('src/api/recipes', () => ({ default: {} }))
vi.mock('src/api/auth', () => ({ default: { getUID: vi.fn().mockReturnValue(null) } }))

// Simplify InstructionList to show step text, the (re)computed index, and a Remove button per item
vi.mock('src/pages/AddRecipe/Instructions/InstructionList/InstructionList', () => ({
  default: ({ instructions, removeInstruction }: any) => (
    <ol data-testid='instruction-list'>
      {instructions.map((instr: any) => (
        <li key={instr.id} data-testid='instruction-item'>
          {'index' in instr && (
            <span data-testid={`instruction-index-${instr.id}`}>{instr.index}</span>
          )}
          {'content' in instr ? instr.content : instr.label}
          <button onClick={() => removeInstruction(instr.id)}>Remove {instr.id}</button>
        </li>
      ))}
    </ol>
  ),
}))

vi.mock('src/pages/AddRecipe/AddLabel/AddLabel', () => ({ default: () => null }))

const Wrapper = ({ initial = [] as any[] }: { initial?: any[] }) => {
  const [instructions, setInstructions] = useState<any[]>(initial)
  return (
    <>
      <InstructionsContainer instructions={instructions} setInstructions={setInstructions} />
      <span data-testid='count'>{instructions.length}</span>
    </>
  )
}

describe('InstructionsContainer', () => {
  it('entering text and pressing Enter appends a new instruction step', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Add instruction for your recipe.')
    await user.type(input, 'Preheat the oven')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByText('Preheat the oven')).toBeInTheDocument()
  })

  it('submitting an empty input does not add a step', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('removing an instruction step removes it from the list', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Add instruction for your recipe.')
    await user.type(input, 'Step one')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('count').textContent).toBe('1')
    await user.click(screen.getByText(/^Remove /))
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  // --- Re-index regressions (High #3 fix) ---
  it('removing a middle instruction re-indexes the survivors sequentially', async () => {
    const user = userEvent.setup()
    render(<Wrapper />)
    const input = screen.getByPlaceholderText('Add instruction for your recipe.')
    // Add three steps via the input flow so each gets a unique id from uuidv4
    await user.type(input, 'Step one')
    await user.keyboard('{Enter}')
    await user.type(input, 'Step two')
    await user.keyboard('{Enter}')
    await user.type(input, 'Step three')
    await user.keyboard('{Enter}')

    const items = screen.getAllByTestId('instruction-item')
    expect(items).toHaveLength(3)
    // Initial indices are 1, 2, 3
    expect(items[0].textContent).toContain('1')
    expect(items[1].textContent).toContain('2')
    expect(items[2].textContent).toContain('3')

    // Remove the middle one
    const removeButtons = screen.getAllByText(/^Remove /)
    await user.click(removeButtons[1])

    const after = screen.getAllByTestId('instruction-item')
    expect(after).toHaveLength(2)
    // Survivors are re-indexed to 1 and 2, not 1 and 3
    expect(after[0].textContent).toContain('Step one')
    expect(after[0].textContent).toContain('1')
    expect(after[1].textContent).toContain('Step three')
    expect(after[1].textContent).toContain('2')
  })

  it('removing a content instruction with labels mixed in re-indexes only content items', async () => {
    const user = userEvent.setup()
    // Pre-seed: content #1 (index 1), label, content #2 (index 2), content #3 (index 3)
    const initial = [
      { id: 'c1', content: 'First step', index: 1 },
      { id: 'lbl', label: 'Section header' },
      { id: 'c2', content: 'Second step', index: 2 },
      { id: 'c3', content: 'Third step', index: 3 },
    ]
    render(<Wrapper initial={initial} />)

    // Remove the second content item (id=c2)
    await user.click(screen.getByText('Remove c2'))

    // Survivors: c1, label, c3 — content items re-indexed 1, 2; label unchanged
    expect(screen.queryByText('Second step')).toBeNull()
    expect(screen.getByText('Section header')).toBeInTheDocument()
    expect(screen.getByTestId('instruction-index-c1').textContent).toBe('1')
    expect(screen.getByTestId('instruction-index-c3').textContent).toBe('2')
    // Label has no index in this mock; assert no index span for it
    expect(screen.queryByTestId('instruction-index-lbl')).toBeNull()
  })
})
