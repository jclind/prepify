import { IngredientData, ParsedIngredient, IngredientsType } from 'types'

// Rescale a recipe's ingredient quantities and per-ingredient prices from
// `originalServings` to `newServings` (used by the SingleRecipe servings
// stepper). Labels (entries without a parsedIngredient) pass through unchanged.
export const updateIngredients = (
  ingredients: IngredientsType[],
  originalServings: number,
  newServings: number,
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
        ingr.ingredientData,
      )
      let updatedParsedIngredient: ParsedIngredient = structuredClone(
        ingr.parsedIngredient,
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
