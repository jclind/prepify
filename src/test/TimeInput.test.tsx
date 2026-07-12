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

// Regression: on edit / draft-resume the parent passes a { hours, minutes } object.
// The old effect did `Number(val)` (NaN for an object) and blanked both fields —
// it should hydrate them from the object members instead.
describe('TimeInput hydration', () => {
  const renderWith = (val: { hours: number; minutes: number } | null) => {
    render(<TimeInput label='Prep time' val={val} setVal={vi.fn()} />)
    const [hours, minutes] = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    return { hours, minutes }
  }

  it('populates both fields from a full { hours, minutes } value', () => {
    const { hours, minutes } = renderWith({ hours: 1, minutes: 30 })
    expect(hours.value).toBe('1')
    expect(minutes.value).toBe('30')
  })

  it('shows the minutes and leaves hours empty when hours is 0', () => {
    const { hours, minutes } = renderWith({ hours: 0, minutes: 45 })
    expect(minutes.value).toBe('45')
    expect(hours.value).toBe('')
  })

  it('leaves both fields empty for a null value', () => {
    const { hours, minutes } = renderWith(null)
    expect(hours.value).toBe('')
    expect(minutes.value).toBe('')
  })
})

// Regression: clearing BOTH fields (on edit) must push null up so the parent
// drops the old time. Previously the writeback effect only fired for a truthy
// value (`if (minutes || hours)`), so emptying both left the parent holding the
// stale pre-clear time and the "prep time required" guard kept passing.
describe('TimeInput clear-both-fields', () => {
  it('emits null once the user empties both fields', () => {
    const setVal = vi.fn()
    render(<TimeInput label='Prep time' val={{ hours: 2, minutes: 15 }} setVal={setVal} />)
    const [hours, minutes] = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    // Sanity: hydrated from the object.
    expect(hours.value).toBe('2')
    expect(minutes.value).toBe('15')

    change(hours, '')
    change(minutes, '')

    expect(hours.value).toBe('')
    expect(minutes.value).toBe('')
    // The final emission is an explicit null (not the stale {2,15}).
    expect(setVal.mock.calls.at(-1)![0]).toBeNull()
  })

  it('does not emit null on the initial pre-hydration render (no clobber)', () => {
    const setVal = vi.fn()
    // Fields start empty while the parent already holds a value; the hydration
    // pass must not be mistaken for a user clear.
    render(<TimeInput label='Prep time' val={{ hours: 1, minutes: 30 }} setVal={setVal} />)
    expect(setVal).not.toHaveBeenCalledWith(null)
  })
})

// W2 a11y wiring: when the section is in error, both time fields carry the
// invalid flag and point at the section's error message.
describe('TimeInput a11y wiring', () => {
  it('threads invalid + describedBy to both fields', () => {
    render(
      <TimeInput
        label='Prep time'
        val={null}
        setVal={vi.fn()}
        invalid
        describedBy='error-prepTime'
      />
    )
    const inputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    expect(inputs).toHaveLength(2)
    for (const input of inputs) {
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'error-prepTime')
    }
  })

  it('emits neither attribute when the field is valid', () => {
    render(<TimeInput label='Prep time' val={null} setVal={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText('0') as HTMLInputElement[]
    for (const input of inputs) {
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(input).not.toHaveAttribute('aria-describedby')
    }
  })
})
