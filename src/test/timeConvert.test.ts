import { describe, it, expect } from 'vitest'
import { hrMinToMin } from 'src/util/hrMinToMin'
import { minToHrMin } from 'src/util/minToHrMin'

// Prep/cook time round-trips through these two on the add/edit-recipe form:
// the form holds { hours, minutes }, the payload stores a minute total.
describe('hrMinToMin', () => {
  it('flattens { hours, minutes } to a minute total', () => {
    expect(hrMinToMin({ hours: 1, minutes: 30 })).toBe(90)
    expect(hrMinToMin({ hours: 0, minutes: 0 })).toBe(0)
    expect(hrMinToMin({ hours: 2, minutes: 5 })).toBe(125)
  })

  it('treats null (unset time) as 0', () => {
    expect(hrMinToMin(null)).toBe(0)
  })
})

describe('minToHrMin', () => {
  it('splits a minute total back into { hours, minutes }', () => {
    expect(minToHrMin(90)).toEqual({ hours: 1, minutes: 30 })
    expect(minToHrMin(45)).toEqual({ hours: 0, minutes: 45 })
    expect(minToHrMin(125)).toEqual({ hours: 2, minutes: 5 })
  })

  it('returns null for 0/null so the field renders empty', () => {
    expect(minToHrMin(0)).toBeNull()
    expect(minToHrMin(null)).toBeNull()
  })
})

describe('round-trip', () => {
  it('minToHrMin(hrMinToMin(x)) preserves a non-zero time', () => {
    expect(minToHrMin(hrMinToMin({ hours: 2, minutes: 15 }))).toEqual({
      hours: 2,
      minutes: 15,
    })
  })
})
