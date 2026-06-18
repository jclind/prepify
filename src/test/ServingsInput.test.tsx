import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ServingsInput from 'src/pages/AddRecipe/ServingsInput/ServingsInput'

// ServingsInput guards its setter: only an integer in [1, 99] (or empty) is
// accepted; anything else is dropped so the field can't hold an invalid value.
const setup = (initial: number | '' = '') => {
  const setServings = vi.fn()
  render(<ServingsInput servings={initial} setServings={setServings} />)
  const input = screen.getByPlaceholderText(
    'How many servings does your recipe make?'
  ) as HTMLInputElement
  return { setServings, input }
}

const change = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } })

describe('ServingsInput validation', () => {
  it('accepts a valid integer in range', () => {
    const { setServings, input } = setup()
    change(input, '4')
    expect(setServings).toHaveBeenCalledWith('4')
  })

  it('accepts clearing a populated field (empty)', () => {
    const { setServings, input } = setup(4)
    change(input, '')
    expect(setServings).toHaveBeenCalledWith('')
  })

  it.each(['0', '-3', '100', '150'])('rejects out-of-range value %s', val => {
    const { setServings, input } = setup()
    change(input, val)
    expect(setServings).not.toHaveBeenCalled()
  })

  it('rejects a non-integer (decimal)', () => {
    const { setServings, input } = setup()
    change(input, '3.5')
    expect(setServings).not.toHaveBeenCalled()
  })

  it('accepts the upper bound (99) but not 100', () => {
    const { setServings, input } = setup()
    change(input, '99')
    expect(setServings).toHaveBeenCalledWith('99')
    setServings.mockClear()
    change(input, '100')
    expect(setServings).not.toHaveBeenCalled()
  })
})
