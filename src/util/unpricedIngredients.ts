import { IngredientsType } from 'types'

// A parsed row that adds nothing to the per-serving price: the parser declined
// to price its measure, or the lookup failed outright. Label rows aren't
// ingredients and never count.
//
// Tested on the type, never on truthiness. Since parser 2.2.0 a genuinely free
// ingredient (water, "salt and pepper to taste") carries a real
// `totalPriceUSACents: 0`, and a falsy check would call that row unpriced.
export const isUnpricedIngredient = (ingr: IngredientsType): boolean =>
  'parsedIngredient' in ingr &&
  typeof ingr.ingredientData?.totalPriceUSACents !== 'number'

// What to call an unpriced row when listing it back to the author: the line
// they typed, which they'll recognise, rather than the parser's extracted name.
export const unpricedIngredientLines = (
  ingredients: IngredientsType[]
): string[] =>
  ingredients.flatMap(ingr =>
    isUnpricedIngredient(ingr) && 'parsedIngredient' in ingr
      ? [ingr.parsedIngredient.originalIngredientString]
      : []
  )
