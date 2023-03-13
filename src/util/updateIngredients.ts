import { IngredientData, ParsedIngredient } from '@jclind/ingredient-parser'
import { IngredientsType } from 'types'
// import { evalNum } from './validateIngredientQuantityStr'

// const mixedToDecimal = (str: string): number => {
//   const split: string[] = str.split(' ')

//   const decimal = split.reduce((prev, curr) => {
//     return evalNum(prev) + evalNum(curr)
//   }, 0)

//   return decimal || 0
// }
// const decimalToFraction = (num: number) => {
//   const fracs = [
//     { frac: '0', num: 0 },
//     { frac: '1/8', num: 0.125 },
//     { frac: '1/4', num: 0.25 },
//     { frac: '1/3', num: 0.333 },
//     { frac: '3/8', num: 0.375 },
//     { frac: '1/2', num: 0.5 },
//     { frac: '5/8', num: 0.625 },
//     { frac: '2/3', num: 0.666 },
//     { frac: '3/4', num: 0.75 },
//     { frac: '7/8', num: 0.875 },
//   ]

//   const closest = fracs.sort(
//     (a, b) => Math.abs(num - a.num) - Math.abs(num - b.num)
//   )[0]
//   return closest.frac
// }

export const updateIngredients = (
  ingredients: IngredientsType[],
  originalServings: number,
  newServings: number
) => {
  const fractionMulti = newServings / originalServings

  const updatedIngredients: IngredientsType[] = ingredients.map(ingr => {
    if ('parsedIngredient' in ingr) {
      let quantity = null
      let price = null

      if (ingr.parsedIngredient.quantity) {
        quantity = ingr.parsedIngredient.quantity * fractionMulti
      }

      if (ingr?.ingredientData?.totalPriceUSACents) {
        price = (fractionMulti * ingr.ingredientData.totalPriceUSACents)
          .toFixed(2)
          .toString()
      }

      let updatedIngredientData: IngredientData | null = structuredClone(
        ingr.ingredientData
      )
      let updatedParsedIngredient: ParsedIngredient = structuredClone(
        ingr.parsedIngredient
      )
      if (price && quantity) {
        // If quantity exists, updatedIngredientData will exist
        updatedIngredientData!.totalPriceUSACents = Number(price)
        updatedParsedIngredient.quantity = quantity
      } else if (price) {
        updatedIngredientData!.totalPriceUSACents = Number(price)
      } else if (quantity) {
        updatedParsedIngredient.quantity = quantity
      }

      return {
        ...ingr,
        ingredientData: updatedIngredientData,
        parsedIngredient: updatedParsedIngredient,
      }
    }
    return ingr
  })
  return updatedIngredients
}
