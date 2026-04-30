import React, { useState } from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstructionsContainer from 'src/pages/AddRecipe/Instructions/InstructionsContainer'

vi.mock('src/api/recipes', () => ({ default: {} }))
vi.mock('src/api/auth', () => ({ default: { getUID: vi.fn().mockReturnValue(null) } }))

// Simplify InstructionList to show step text and a Remove button per item
vi.mock('src/pages/AddRecipe/Instructions/InstructionList/InstructionList', () => ({
  default: ({ instructions, removeInstruction }: any) => (
    <ol data-testid='instruction-list'>
      {instructions.map((instr: any) => (
        <li key={instr.id}>
          {'content' in instr ? instr.content : instr.label}
          <button onClick={() => removeInstruction(instr.id)}>Remove</button>
        </li>
      ))}
    </ol>
  ),
}))

vi.mock('src/pages/AddRecipe/AddLabel/AddLabel', () => ({ default: () => null }))

const Wrapper = () => {
  const [instructions, setInstructions] = useState<any[]>([])
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
    await user.click(screen.getByText('Remove'))
    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})
