import { IngredientsType } from 'types'

// Each ingredient's `totalPriceUSACents` is the cost (in cents) of the full
// quantity used in the recipe, so summing them across all ingredients gives the
// total grocery cost. The per-serving price is simply that total divided by the
// number of servings. Result is returned in whole cents — callers render it as a
// dollar string via `formatPrice` / `.toFixed(2)`.
export const calculateServingPrice = (
  ingredientsList: IngredientsType[],
  numServings: number
) => {
  if (numServings <= 0) return 0

  let totalRecipeCents = 0
  ingredientsList.forEach(ingr => {
    if ('parsedIngredient' in ingr && ingr.ingredientData) {
      const ingrPrice = Number(ingr.ingredientData.totalPriceUSACents)
      if (!isNaN(ingrPrice)) totalRecipeCents += ingrPrice
    }
  })

  return Math.round(totalRecipeCents / numServings)
}
