const isFraction = (str: string) => {
  const tempSplit = str.split('/')

  if (tempSplit.length !== 2) {
    return false
  }

  const allValsAreNums = tempSplit.every(
    i => !isNaN(Number(i)) && i.trim() !== ''
  )
  if (!allValsAreNums) {
    return false
  }

  return true
}

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

export const evalNum = (val: string | number | undefined): number => {
  if (typeof val === 'undefined') return 0
  if (typeof val === 'number') {
    return val
  }
  const evalFraction = (frac: string) => {
    const split = frac.split('/')
    const res = parseInt(split[0], 10) / parseInt(split[1], 10)
    return Number(res)
  }
  if (isFraction(val)) {
    return evalFraction(val)
  }

  const splitVal = val.split(/[\s-]/)
  if (splitVal.length <= 0) return 0
  if (splitVal.length === 1) {
    if (isFraction(splitVal[0])) {
      return evalFraction(splitVal[0])
    } else {
      return Number(splitVal[0])
    }
  } else {
    console.log("This shouldn't be happening in evalNum")
    return 0
  }
}
