// Renders a decimal ingredient quantity as the nearest "nice" cooking fraction
// for display (e.g. 1.5 → "1 1/2", 0.33 → "1/3"). The old in-app quantity
// *validation* this file was named for is gone — ingredient parsing now happens
// via @jclind/ingredient-parser — so the only surviving export is this display
// helper, and the file was renamed from validateIngredientQuantityStr.ts to
// match.
export const closestFraction = (num: number): string => {
  const fractions = [
    { num: 1, den: 8 },
    { num: 1, den: 4 },
    { num: 1, den: 3 },
    { num: 3, den: 8 },
    { num: 1, den: 2 },
    { num: 5, den: 8 },
    { num: 2, den: 3 },
    { num: 3, den: 4 },
    { num: 7, den: 8 },
  ]

  const wholeNum = Math.floor(num)
  const decimal = num - wholeNum
  if (decimal === 0) {
    return wholeNum.toString()
  }

  const closest = fractions.reduce((prev, curr) => {
    const currValue = curr.num / curr.den
    const prevValue = prev.num / prev.den
    return Math.abs(currValue - decimal) < Math.abs(prevValue - decimal)
      ? curr
      : prev
  })

  // Roll over to the next whole number when the remainder is at least as close
  // to 1 as it is to the nearest table fraction (which tops out at 7/8). Without
  // this, decimals in [0.9375, 1) snapped down to "7/8" instead of rounding up
  // — e.g. 0.95 → "1", 1.96 → "2". The 0.9375 midpoint ties toward rounding up.
  const closestDistance = Math.abs(closest.num / closest.den - decimal)
  if (1 - decimal <= closestDistance) {
    return (wholeNum + 1).toString()
  }

  const numerator = closest.num
  const denominator = closest.den
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(numerator, denominator)

  return `${wholeNum ? wholeNum + ' ' : ''}${numerator / divisor}/${
    denominator / divisor
  }`
}

// Renders an ingredient amount for display, honouring a captured quantity range
// (e.g. "2-3 cups") when the parser recorded a distinct upper bound. A range is
// present when `maxQty` exceeds `minQty`; otherwise the single `quantity` is
// shown. Returns '' when there is no numeric amount (e.g. "salt, to taste").
// This is the one place ranges get rendered — SingleRecipe, the printable view,
// and the add-recipe row all route through it so a "2-3" never collapses to "2".
export const formatIngredientQuantity = (
  quantity: number | null,
  minQty?: number | null,
  maxQty?: number | null
): string => {
  if (minQty != null && maxQty != null && maxQty > minQty) {
    return `${closestFraction(minQty)}–${closestFraction(maxQty)}`
  }
  if (quantity != null) {
    return closestFraction(quantity)
  }
  return ''
}
