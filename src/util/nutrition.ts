// Shared per-serving nutrition primitives, used by both the on-screen
// NutritionData card and the print layout (PrintableRecipe). Each component
// owns its own labels/markup; only the number math and missing-key safety live
// here so they can't drift apart.

export const getQuantity = (
  num: number | undefined,
  servings: number
): number | null => {
  // Only treat genuinely-missing data as null; a real 0 (fat-free, sugar-free,
  // etc.) is a valid value and must render as "0", not be hidden.
  if (num == null || !servings) {
    return null
  }
  return Math.round(num / servings)
}

// Some stored recipes have an incomplete `nutritionData` (a missing
// `totalNutrients` map, or individual nutrient keys absent — sometimes only a
// calorie count exists). Wrap the map so any missing key yields
// `{ quantity: undefined }` instead of throwing when a row reads `.quantity`.
const emptyNutrient = { quantity: undefined as unknown as number }
export const safeNutrientMap = (
  map: Record<string, { quantity: number }> | undefined | null
): Record<string, { quantity: number }> =>
  new Proxy(map ?? {}, {
    get: (target, key: string) => target[key] ?? emptyNutrient,
  })
