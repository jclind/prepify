import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientsInput from 'src/pages/AddRecipe/Ingredients/IngredientsInput'

const PLACEHOLDER = 'Add ingredients to your recipe.'
const HINT = 'Enter an ingredient before adding it.'

const setup = () => {
  const onAdd = vi.fn()
  render(<IngredientsInput onAdd={onAdd} />)
  return { onAdd }
}

describe('IngredientsInput', () => {
  it('pressing Enter on an empty field shows a hint and does not add', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), '{enter}')
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('treats whitespace-only input as empty', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), '   {enter}')
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('hands a trimmed entry to onAdd and clears the field immediately', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    const input = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement
    await user.type(input, '  2 cups flour  {enter}')
    // Optimistic: the value is handed off trimmed and the field is cleared
    // synchronously so the user can keep typing while enrichment runs.
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('2 cups flour')
    expect(input.value).toBe('')
    expect(screen.queryByText(HINT)).toBeNull()
  })
})
