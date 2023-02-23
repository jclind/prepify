import { IngredientsType } from 'types'

export const calculateServingPrice = (
  ingredientsList: IngredientsType[],
  numServings: number
) => {
  if (numServings <= 0) return 0

  let priceForAllServings = 0
  ingredientsList.forEach(ingr => {
    if ('parsedIngredient' in ingr && ingr.ingredientData) {
      const ingrPrice = Number(ingr.ingredientData.totalPriceUSACents)
      const singleServingIngrPrice = ingrPrice / numServings
      priceForAllServings += singleServingIngrPrice
    }
  })
  const servingPrice = priceForAllServings / numServings
  return Math.ceil(servingPrice / 100) * 100
}
