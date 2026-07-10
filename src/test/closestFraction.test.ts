import { describe, it, expect } from 'vitest'
import {
  closestFraction,
  formatIngredientQuantity,
} from 'src/util/formatQuantity'

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

  it('rounds up to the next whole number past 7/8 instead of snapping down', () => {
    // Regression (BUG_HUNT I2): decimals in [0.9375, 1) used to render "7/8".
    expect(closestFraction(0.95)).toBe('1')
    expect(closestFraction(0.99)).toBe('1')
    expect(closestFraction(1.96)).toBe('2')
    // The 0.9375 midpoint between 7/8 and 1 ties toward rounding up.
    expect(closestFraction(0.9375)).toBe('1')
    // Just below the midpoint still snaps to 7/8 (closer to 0.875 than to 1).
    expect(closestFraction(0.9)).toBe('7/8')
    expect(closestFraction(0.875)).toBe('7/8')
  })
})

// formatIngredientQuantity is the single display entry point: it renders a
// "min–max" range when the parser captured a distinct upper bound, and falls
// back to the single quantity (via closestFraction) otherwise.
describe('formatIngredientQuantity', () => {
  it('renders a range with an en dash when maxQty exceeds minQty', () => {
    expect(formatIngredientQuantity(2, 2, 3)).toBe('2–3')
    expect(formatIngredientQuantity(1.5, 1.5, 2.5)).toBe('1 1/2–2 1/2')
  })

  it('renders a single quantity when there is no distinct upper bound', () => {
    // Non-range parses come back with quantity == minQty == maxQty.
    expect(formatIngredientQuantity(1.5, 1.5, 1.5)).toBe('1 1/2')
    // Legacy documents predating range capture carry null bounds.
    expect(formatIngredientQuantity(0.5, null, null)).toBe('1/2')
    expect(formatIngredientQuantity(2)).toBe('2')
  })

  it('returns an empty string when there is no numeric amount', () => {
    expect(formatIngredientQuantity(null, null, null)).toBe('')
    expect(formatIngredientQuantity(null)).toBe('')
    // The parser returns 0 for "salt, to taste" — render just the name, not "0".
    expect(formatIngredientQuantity(0, 0, 0)).toBe('')
    expect(formatIngredientQuantity(0)).toBe('')
  })
})
