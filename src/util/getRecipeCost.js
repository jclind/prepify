export const getRecipeCost = (ingrs, servings) => {
  const recipePrice = ingrs
    .reduce((prev, currList) => {
      const currPrice = currList.list.reduce((prevPrice, currIngr) => {
        return prevPrice + Number(currIngr.price)
      }, 0)
      return prev + currPrice
    }, 0)
    .toFixed(2)
  const servingPrice = (recipePrice / servings).toFixed(2)

  return {
    recipe: recipePrice,
    serving: servingPrice,
    infoString: `Serving: $${servingPrice} | Recipe: $${recipePrice}`,
  }
}
