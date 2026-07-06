import { describe, it, expect } from 'vitest'
import { closestFraction } from 'src/util/formatQuantity'

// closestFraction renders a decimal ingredient quantity as the nearest "nice"
// cooking fraction for display (the recipe page + printable view + ingredient
// rows all call it). It snaps to a fixed table of common fractions
// (1/8…7/8, thirds) and prefixes the whole-number part for mixed numbers.
describe('closestFraction', () => {
  it('returns a bare integer string when there is no fractional part', () => {
    expect(closestFraction(0)).toBe('0')
    expect(closestFraction(3)).toBe('3')
  })

  it('maps exact common fractions to their canonical form (no whole part)', () => {
    expect(closestFraction(0.125)).toBe('1/8')
    expect(closestFraction(0.25)).toBe('1/4')
    expect(closestFraction(0.375)).toBe('3/8')
    expect(closestFraction(0.5)).toBe('1/2')
    expect(closestFraction(0.625)).toBe('5/8')
    expect(closestFraction(0.75)).toBe('3/4')
    expect(closestFraction(0.875)).toBe('7/8')
  })

  it('handles thirds', () => {
    expect(closestFraction(1 / 3)).toBe('1/3')
    expect(closestFraction(2 / 3)).toBe('2/3')
  })

  it('prefixes the whole-number part for mixed numbers', () => {
    expect(closestFraction(1.5)).toBe('1 1/2')
    expect(closestFraction(2.25)).toBe('2 1/4')
    expect(closestFraction(3 + 2 / 3)).toBe('3 2/3')
  })

  it('snaps an off-grid decimal to the nearest table entry', () => {
    // 0.3 is closer to 1/3 (0.333, Δ0.033) than 1/4 (0.25, Δ0.05).
    expect(closestFraction(0.3)).toBe('1/3')
    // 0.4 is closest to 3/8 (0.375, Δ0.025), beating 1/3 and 1/2.
    expect(closestFraction(0.4)).toBe('3/8')
    // Just under 1/8 still snaps to 1/8 (it's the smallest entry).
    expect(closestFraction(0.1)).toBe('1/8')
  })
})
