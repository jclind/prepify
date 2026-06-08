import React, { FC } from 'react'
import { NutritionDataType } from 'types'

const getQuantity = (num: number | undefined, servings: number) => {
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
const safeNutrientMap = (
  map: Record<string, { quantity: number }> | undefined | null
): Record<string, { quantity: number }> =>
  new Proxy(map ?? {}, {
    get: (target, key: string) => target[key] ?? emptyNutrient,
  })

type NutritionDataProps = {
  data: NutritionDataType
  servings: number
}

const NutritionData: FC<NutritionDataProps> = ({ data, servings }) => {
  const tNutr = safeNutrientMap(data.totalNutrients)
  const caloriesPerServing = getQuantity(data.calories, servings)
  const hasCalories = caloriesPerServing != null

  const macros = [
    { key: 'PROCNT', label: 'Protein' },
    { key: 'FAT', label: 'Fat' },
    { key: 'CHOCDF', label: 'Carbs' },
    { key: 'FIBTG', label: 'Fiber' },
  ].map(m => ({ ...m, value: getQuantity(tNutr[m.key]?.quantity, servings) }))
  const macroMax = Math.max(1, ...macros.map(m => m.value ?? 0))
  const hasMacros = macros.some(m => m.value != null)

  const fact = (key: string, unit: string) => {
    const q = getQuantity(tNutr[key]?.quantity, servings)
    return q != null ? `${q} ${unit}` : null
  }
  // Only keep facts that actually have a value.
  const allFacts: { label: string; value: string }[] = [
    hasCalories ? { label: 'Calories', value: `${caloriesPerServing}` } : null,
    { label: 'Total Fat', value: fact('FAT', 'g') },
    { label: 'Total Carbohydrate', value: fact('CHOCDF', 'g') },
    { label: 'Dietary Fiber', value: fact('FIBTG', 'g') },
    { label: 'Sugars', value: fact('SUGAR', 'g') },
    { label: 'Protein', value: fact('PROCNT', 'g') },
    { label: 'Sodium', value: fact('NA', 'mg') },
  ].filter((f): f is { label: string; value: string } => !!f && f.value != null)
  const detailFacts = allFacts.filter(f => f.label !== 'Calories')
  const showFactsTable = detailFacts.length > 0

  // Nothing usable → render nothing (no empty card).
  if (!hasCalories && !hasMacros && !showFactsTable) return null

  const caloriesEl = hasCalories && (
    <div className='nd-cal'>
      <strong>{caloriesPerServing}</strong> calories
    </div>
  )
  const macroBars = hasMacros && (
    <div className='nd-macros'>
      {macros.map(m => (
        <div className='nd-macro' key={m.key}>
          <div className='nd-macro-top'>
            <span>{m.label}</span>
            <span>{m.value != null ? `${m.value}g` : '—'}</span>
          </div>
          <div className='nd-track'>
            <div
              className='nd-fill'
              style={{ width: `${((m.value ?? 0) / macroMax) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
  const factsTable = showFactsTable && (
    <table className='nd-facts'>
      <tbody>
        {detailFacts.map(f => (
          <tr key={f.label}>
            <td>{f.label}</td>
            <td>{f.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <section className='card nutrition-card'>
      <div className='recipe-nutrition-data'>
        <div className='nd-head'>
          <h3>Nutrition</h3>
          <span className='nd-per'>per serving</span>
        </div>

        {hasMacros && showFactsTable ? (
          // full data: macro bars beside a facts table
          <div className='nd-grid'>
            <div className='nd-macros-col'>
              {caloriesEl}
              {macroBars}
            </div>
            {factsTable}
          </div>
        ) : hasMacros ? (
          // macros only (no detailed facts)
          <div className='nd-macros-col'>
            {caloriesEl}
            {macroBars}
          </div>
        ) : showFactsTable ? (
          // facts only (no macro breakdown)
          <div className='nd-facts-only'>
            {caloriesEl}
            {factsTable}
          </div>
        ) : (
          // calories only
          <div className='nd-cal solo'>
            <strong>{caloriesPerServing}</strong> calories per serving
          </div>
        )}
      </div>
    </section>
  )
}

export default NutritionData
