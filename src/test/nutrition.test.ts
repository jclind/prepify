import { describe, it, expect } from 'vitest'
import { getQuantity, safeNutrientMap } from 'src/util/nutrition'

// Shared nutrition math used by both the on-screen card and the print layout.
describe('getQuantity (per-serving rounding)', () => {
  it('divides the total by servings and rounds', () => {
    expect(getQuantity(100, 4)).toBe(25)
    expect(getQuantity(7, 2)).toBe(4) // 3.5 rounds to 4
  })

  it('treats a genuine 0 as a valid value, not missing', () => {
    // Fat-free / sugar-free must render "0", not be hidden as null.
    expect(getQuantity(0, 4)).toBe(0)
  })

  it('returns null only when the value is missing or servings is falsy', () => {
    expect(getQuantity(undefined, 4)).toBeNull()
    expect(getQuantity(100, 0)).toBeNull()
  })
})

describe('safeNutrientMap (missing-key safety)', () => {
  it('passes through present nutrient entries', () => {
    const map = safeNutrientMap({ FAT: { quantity: 12 } })
    expect(map.FAT.quantity).toBe(12)
  })

  it('yields { quantity: undefined } for absent keys instead of throwing', () => {
    const map = safeNutrientMap({ FAT: { quantity: 12 } })
    expect(map.PROTEIN.quantity).toBeUndefined()
  })

  it('handles a null/undefined source map without throwing', () => {
    expect(safeNutrientMap(null).ANYTHING.quantity).toBeUndefined()
    expect(safeNutrientMap(undefined).CALORIES.quantity).toBeUndefined()
  })
})
