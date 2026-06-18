import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TimeInput from 'src/pages/AddRecipe/TimeInput/TimeInput'

// TimeInput holds two guarded number fields: hours accept an integer in [0, 99],
// minutes an integer in [0, 59]; out-of-range/non-integer input is dropped so the
// field reverts to its last valid value.
const setup = () => {
  const setVal = vi.fn()
  render(<TimeInput label='Prep time' val={null} setVal={setVal} />)
  const [hours, minutes] = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
  return { setVal, hours, minutes }
}
const change = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } })

describe('TimeInput validation', () => {
  it('accepts valid hours and emits the combined value', () => {
    const { setVal, hours } = setup()
    change(hours, '2')
    expect(hours.value).toBe('2')
    expect(setVal).toHaveBeenCalled()
    const last = setVal.mock.calls.at(-1)![0]
    expect(Number(last.hours)).toBe(2)
  })

  it('accepts valid minutes', () => {
    const { minutes } = setup()
    change(minutes, '45')
    expect(minutes.value).toBe('45')
  })

  it('rejects hours over 99 (field reverts to empty)', () => {
    const { hours } = setup()
    change(hours, '100')
    expect(hours.value).toBe('')
  })

  it('rejects minutes over 59', () => {
    const { minutes } = setup()
    change(minutes, '75')
    expect(minutes.value).toBe('')
  })

  it('rejects a non-integer in either field', () => {
    const { hours, minutes } = setup()
    change(hours, '1.5')
    expect(hours.value).toBe('')
    change(minutes, '2.5')
    expect(minutes.value).toBe('')
  })

  it('accepts the boundaries (99 hours, 59 minutes)', () => {
    const { hours, minutes } = setup()
    change(hours, '99')
    change(minutes, '59')
    expect(hours.value).toBe('99')
    expect(minutes.value).toBe('59')
  })
})
