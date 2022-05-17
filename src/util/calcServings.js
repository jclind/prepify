import { evalNum } from './validateIngredientQuantityStr'

const mixedToDecimal = str => {
  const split = str.split(' ')

  return split.reduce((prev, curr) => evalNum(prev) + evalNum(curr), 0)
}
const decimalToFraction = num => {
  const fracs = [
    { frac: '0', num: 0 },
    { frac: '1/8', num: 0.125 },
    { frac: '1/4', num: 0.25 },
    { frac: '1/3', num: 0.333 },
    { frac: '3/8', num: 0.375 },
    { frac: '1/2', num: 0.5 },
    { frac: '5/8', num: 0.625 },
    { frac: '2/3', num: 0.666 },
    { frac: '3/4', num: 0.75 },
    { frac: '7/8', num: 0.875 },
  ]

  const closest = fracs.sort(
    (a, b) => Math.abs(num - a.num) - Math.abs(num - b.num)
  )[0]
  return closest.frac
}

export const calcServings = (ingredients, originalServings, newServings) => {
  const fractionMulti = newServings / originalServings

  return ingredients.map(ingrObj => {
    const list = ingrObj.list.map(ingr => {
      let quantity = null
      let price = null

      if (ingr.quantity) {
        const res = mixedToDecimal(ingr.quantity) * fractionMulti
        const wholeNum = Math.floor(res)
        let fraction = decimalToFraction(res - wholeNum)

        if (fraction === '0') {
          quantity = `${wholeNum}`
        } else if (wholeNum === 0) {
          quantity = `${fraction}`
        } else {
          quantity = `${wholeNum} ${fraction}`
        }
      }

      if (ingr.price) {
        price = (fractionMulti * Number(ingr.price)).toFixed(2).toString()
      }

      if (price && quantity) {
        return { ...ingr, price, quantity }
      } else if (price) {
        return { ...ingr, price }
      } else if (quantity) {
        return { ...ingr, quantity }
      }

      return { ...ingr }
    })
    return { ...ingrObj, list }
  })
}
