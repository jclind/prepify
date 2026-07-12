import { describe, it, expect } from 'vitest'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import { IngredientsType } from 'types'

// Minimal ingredient factory: the util only reads `parsedIngredient` (presence)
// and `ingredientData.totalPriceUSACents`, so we stub just enough to satisfy the
// type guard. `totalPriceUSACents` is the cost of the full quantity used in the
// recipe (in cents), per the @jclind/ingredient-parser contract.
const ingr = (totalPriceUSACents: number | undefined): IngredientsType =>
  ({
    id: Math.random().toString(),
    parsedIngredient: {} as never,
    ingredientData: { totalPriceUSACents } as never,
  } as IngredientsType)

// A non-ingredient label row (section header). Has no `parsedIngredient`/data
// and must be ignored by the sum.
const label: IngredientsType = { id: 'lbl', label: 'For the sauce' }

describe('calculateServingPrice', () => {
  it('returns total grocery cost divided by servings, in cents', () => {
    // 600 + 400 = 1000 cents total over 4 servings = 250 cents/serving.
    const result = calculateServingPrice([ingr(600), ingr(400)], 4)
    expect(result).toBe(250)
  })

  it('does NOT double-divide by servings (regression for the core bug)', () => {
    // Total 1000 cents over 4 servings must be 250, not 1000/4/4 = 62.5.
    expect(calculateServingPrice([ingr(1000)], 4)).toBe(250)
  })

  it('preserves sub-dollar precision instead of rounding up to whole dollars', () => {
    // 150 cents over 1 serving = $1.50. The old impl snapped this up to $2.00
    // (Math.ceil(x/100)*100). It should stay 150.
    expect(calculateServingPrice([ingr(150)], 1)).toBe(150)
  })

  it('rounds to the nearest whole cent', () => {
    // 100 cents over 3 servings = 33.33… → 33.
    expect(calculateServingPrice([ingr(100)], 3)).toBe(33)
    // 200 cents over 3 servings = 66.66… → 67.
    expect(calculateServingPrice([ingr(200)], 3)).toBe(67)
  })

  it('returns 0 for zero or negative servings (no divide-by-zero)', () => {
    expect(calculateServingPrice([ingr(500)], 0)).toBe(0)
    expect(calculateServingPrice([ingr(500)], -2)).toBe(0)
  })

  it('returns 0 for an empty ingredient list', () => {
    expect(calculateServingPrice([], 4)).toBe(0)
  })

  it('ignores label rows that carry no price data', () => {
    const result = calculateServingPrice([label, ingr(800), label], 2)
    expect(result).toBe(400)
  })

  it('skips ingredients whose price is missing or non-numeric', () => {
    // undefined → NaN; must be treated as 0 rather than poisoning the sum.
    const result = calculateServingPrice([ingr(600), ingr(undefined)], 2)
    expect(result).toBe(300)
  })

  it('handles a single-serving recipe (total == per-serving price)', () => {
    expect(calculateServingPrice([ingr(325), ingr(175)], 1)).toBe(500)
  })

  it('handles fractional input cents from the parser', () => {
    // The parser can return fractional cents (e.g. 75.71). 75.71 + 24.29 = 100
    // over 2 servings = 50.
    expect(calculateServingPrice([ingr(75.71), ingr(24.29)], 2)).toBe(50)
  })
})
