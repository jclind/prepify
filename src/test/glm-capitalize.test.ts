import { describe, it, expect } from 'vitest'
import { capitalize } from 'src/util/capitalize'

// capitalize upper-cases only the first character. The falsy guard matters:
// callers feed it optional labels, and '' must come back as '' (never crash,
// never turn into "undefined").
describe('capitalize', () => {
  it('upper-cases the first letter and keeps the rest untouched', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('hELLO')).toBe('HELLO')
    expect(capitalize('x')).toBe('X')
    expect(capitalize('1up')).toBe('1up')
  })

  it('returns an empty string for falsy input', () => {
    expect(capitalize('')).toBe('')
  })
})
