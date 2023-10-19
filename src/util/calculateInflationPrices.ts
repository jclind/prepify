const INFLATION_MULTIPLIER = 1.45

export const calculateInflationPrice = (
  servingPrice: number | null | undefined,
  servings: number | null | undefined
) => {
  if (!servingPrice || !servings) {
    return { servingPrice: 0, recipePrice: 0 }
  }
  const correctedServingPrice = (
    (servingPrice * INFLATION_MULTIPLIER) /
    100
  ).toFixed(2)

  const correctedRecipePrice = (
    Number(correctedServingPrice) * servings
  ).toFixed(2)

  return {
    servingPrice: correctedServingPrice,
    recipePrice: correctedRecipePrice,
  }
}
