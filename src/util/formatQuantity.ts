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

  const numerator = closest.num
  const denominator = closest.den
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(numerator, denominator)

  return `${wholeNum ? wholeNum + ' ' : ''}${numerator / divisor}/${
    denominator / divisor
  }`
}
