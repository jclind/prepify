import { RecipeData } from '../mockRecipe'

/** Scale a quantity string like "1 cup" by a factor, keeping the unit. */
export function scaledQty(qty: string, scale: number): string {
  const m = qty.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  if (!m) return qty
  const n = parseFloat(m[1]) * scale
  const rounded = n >= 1 ? n.toFixed(n % 1 === 0 ? 0 : 1) : n.toFixed(2)
  return `${rounded} ${m[2]}`.trim()
}

export type Macro = { key: string; label: string; value: number; unit: string }

/** The four headline macros, ready to render as bars/donut/chips. */
export function macros(n: RecipeData['nutrition']): Macro[] {
  return [
    { key: 'protein', label: 'Protein', value: n.protein, unit: 'g' },
    { key: 'fat', label: 'Fat', value: n.fat, unit: 'g' },
    { key: 'carbs', label: 'Carbs', value: n.carbs, unit: 'g' },
    { key: 'fiber', label: 'Fiber', value: n.fiber, unit: 'g' },
  ]
}

/** Full nutrition rows for a "facts label" style table. */
export function nutritionRows(
  n: RecipeData['nutrition']
): { label: string; value: string }[] {
  return [
    { label: 'Calories', value: `${n.calories}` },
    { label: 'Total Fat', value: `${n.fat} g` },
    { label: 'Total Carbohydrate', value: `${n.carbs} g` },
    { label: 'Dietary Fiber', value: `${n.fiber} g` },
    { label: 'Sugars', value: `${n.sugar} g` },
    { label: 'Protein', value: `${n.protein} g` },
    { label: 'Sodium', value: `${n.sodium} mg` },
  ]
}

/** Compact, human-readable view/save/made-it counts. */
export function compactNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `${n}`
}
