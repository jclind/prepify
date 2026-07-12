import { describe, it, expect } from 'vitest'
import { updateIngredients } from 'src/util/updateIngredients'
import {
  IngredientsType,
  ParsedIngredient,
  IngredientData,
  LabelType,
} from 'types'

const parsed = (quantity: number | null): ParsedIngredient => ({
  quantity,
  unit: 'cup',
  unitPlural: 'cups',
  symbol: null,
  ingredient: 'Flour',
  originalIngredientString: `${quantity ?? ''} cups Flour`,
  minQty: null,
  maxQty: null,
  comment: null,
})

const data = (totalPriceUSACents?: number): IngredientData => ({
  name: 'Flour',
  totalPriceUSACents,
})

const item = (
  quantity: number | null,
  price?: number
): IngredientsType => ({
  id: 'i1',
  parsedIngredient: parsed(quantity),
  ingredientData: price === undefined ? null : data(price),
})

const label: LabelType = { id: 'l1', label: 'For the sauce' }

// Helper: narrow to the parsed-ingredient variant for assertions.
const asItem = (i: IngredientsType) => {
  if (!('parsedIngredient' in i)) throw new Error('expected an ingredient, got a label')
  return i
}

describe('updateIngredients', () => {
  it('scales quantity and price up when servings double', () => {
    const [out] = updateIngredients([item(2, 100)], 2, 4)
    const scaled = asItem(out)
    expect(scaled.parsedIngredient.quantity).toBe(4)
    expect(scaled.ingredientData?.totalPriceUSACents).toBe(200)
  })

  it('scales down when servings are reduced', () => {
    const [out] = updateIngredients([item(4, 200)], 4, 2)
    const scaled = asItem(out)
    expect(scaled.parsedIngredient.quantity).toBe(2)
    expect(scaled.ingredientData?.totalPriceUSACents).toBe(100)
  })

  it('scales quantity even when there is no price data', () => {
    const [out] = updateIngredients([item(3)], 3, 6)
    const scaled = asItem(out)
    expect(scaled.parsedIngredient.quantity).toBe(6)
    expect(scaled.ingredientData).toBeNull()
  })

  it('leaves a null/zero quantity untouched (nothing to scale)', () => {
    const [out] = updateIngredients([item(null, 100)], 2, 4)
    const scaled = asItem(out)
    expect(scaled.parsedIngredient.quantity).toBeNull()
    // Price still scales independently of quantity.
    expect(scaled.ingredientData?.totalPriceUSACents).toBe(200)
  })

  it('passes label entries through unchanged', () => {
    const [out] = updateIngredients([label], 2, 4)
    expect(out).toEqual(label)
  })

  it('does not mutate the input ingredients (works on clones)', () => {
    const input = [item(2, 100)]
    updateIngredients(input, 2, 4)
    const original = asItem(input[0])
    expect(original.parsedIngredient.quantity).toBe(2)
    expect(original.ingredientData?.totalPriceUSACents).toBe(100)
  })

  it('rounds the scaled price to cents (toFixed(2) semantics)', () => {
    // 100 * (1/3) = 33.333… -> "33.33" -> 33.33
    const [out] = updateIngredients([item(3, 100)], 3, 1)
    const scaled = asItem(out)
    expect(scaled.ingredientData?.totalPriceUSACents).toBeCloseTo(33.33, 2)
  })

  it('scales both range bounds so a "2-3" range does not lose its upper end', () => {
    const ranged: IngredientsType = {
      id: 'r1',
      parsedIngredient: { ...parsed(2), minQty: 2, maxQty: 3 },
      ingredientData: null,
    }
    const [out] = updateIngredients([ranged], 2, 4)
    const scaled = asItem(out)
    expect(scaled.parsedIngredient.quantity).toBe(4)
    expect(scaled.parsedIngredient.minQty).toBe(4)
    expect(scaled.parsedIngredient.maxQty).toBe(6)
  })
})
