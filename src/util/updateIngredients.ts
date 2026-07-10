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
      const updatedIngredientData: IngredientData | null = structuredClone(
        ingr.ingredientData,
      )
      const updatedParsedIngredient: ParsedIngredient = structuredClone(
        ingr.parsedIngredient,
      )

      // Scale the quantity and both range bounds so a "2-3 cups" range rescales
      // to e.g. "4-6 cups" instead of dropping its upper bound. Null/zero
      // amounts (e.g. "salt, to taste") have nothing to scale.
      if (updatedParsedIngredient.quantity) {
        updatedParsedIngredient.quantity =
          updatedParsedIngredient.quantity * fractionMulti
      }
      if (updatedParsedIngredient.minQty) {
        updatedParsedIngredient.minQty =
          updatedParsedIngredient.minQty * fractionMulti
      }
      if (updatedParsedIngredient.maxQty) {
        updatedParsedIngredient.maxQty =
          updatedParsedIngredient.maxQty * fractionMulti
      }

      if (updatedIngredientData?.totalPriceUSACents) {
        updatedIngredientData.totalPriceUSACents = Number(
          (fractionMulti * updatedIngredientData.totalPriceUSACents).toFixed(2),
        )
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
