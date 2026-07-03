import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IngredientsInput from 'src/pages/AddRecipe/Ingredients/IngredientsInput'
import { INGREDIENT_MAX_LENGTH } from 'src/util/recipeLimits'

const PLACEHOLDER = 'Add ingredients to your recipe.'
const HINT = 'Enter an ingredient before adding it.'
const TOO_LONG_HINT = `An ingredient cannot exceed ${INGREDIENT_MAX_LENGTH} characters.`

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

  it('accepts a line exactly at the length cap', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    const line = 'x'.repeat(INGREDIENT_MAX_LENGTH)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await user.click(input)
    await user.paste(line)
    await user.keyboard('{enter}')
    expect(onAdd).toHaveBeenCalledWith(line)
    expect(screen.queryByText(TOO_LONG_HINT)).toBeNull()
  })

  it('rejects a line over the length cap with a server-parity hint', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await user.click(input)
    await user.paste('x'.repeat(INGREDIENT_MAX_LENGTH + 1))
    await user.keyboard('{enter}')
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(TOO_LONG_HINT)).toBeInTheDocument()
  })

  it('caps on trimmed length, not whitespace padding', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    // Real content is exactly at the cap; the surrounding spaces trim away, so
    // this is accepted rather than rejected on raw length.
    const line = 'x'.repeat(INGREDIENT_MAX_LENGTH)
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    await user.click(input)
    await user.paste(`  ${line}  `)
    await user.keyboard('{enter}')
    expect(onAdd).toHaveBeenCalledWith(line)
  })
})
