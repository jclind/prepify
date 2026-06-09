import React, { FC } from 'react'

import './PrintableRecipe.scss'

import { capitalize } from 'src/util/capitalize'
import { closestFraction } from 'src/util/validateIngredientQuantityStr'
import { formatRating } from 'src/util/formatRating'
import { formatMonthYear } from 'src/util/formatDate'
import { formatPrice } from 'src/util/formatPrice'

import { IngredientsType, InstructionsType, RecipeType } from 'types'

type PrintableRecipeProps = {
  ref?: React.Ref<HTMLDivElement>
  recipe: RecipeType
  // Already scaled to the user's selected serving size.
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  servingSize: number
}

// Per-serving nutrition rows derived from the recipe's *total* nutrients, which
// are stored across the recipe's original serving count (see NutritionData).
const nutritionRows = (recipe: RecipeType): { label: string; value: string }[] => {
  const data = recipe.nutritionData
  if (!data) return []
  const servings = recipe.servings
  if (!servings) return []

  const perServing = (num: number | undefined): number | null =>
    num == null ? null : Math.round(num / servings)

  const nutrient = (key: string) => data.totalNutrients?.[key]?.quantity
  const cal = perServing(data.calories)

  const rows: ({ label: string; value: string } | null)[] = [
    cal != null ? { label: 'Calories', value: `${cal}` } : null,
    fmt('Fat', nutrient('FAT'), 'g', servings),
    fmt('Carbs', nutrient('CHOCDF'), 'g', servings),
    fmt('Fiber', nutrient('FIBTG'), 'g', servings),
    fmt('Sugars', nutrient('SUGAR'), 'g', servings),
    fmt('Protein', nutrient('PROCNT'), 'g', servings),
    fmt('Sodium', nutrient('NA'), 'mg', servings),
  ]
  return rows.filter((r): r is { label: string; value: string } => r != null)
}

const fmt = (
  label: string,
  num: number | undefined,
  unit: string,
  servings: number
): { label: string; value: string } | null => {
  if (num == null || !servings) return null
  return { label, value: `${Math.round(num / servings)} ${unit}` }
}

const PrintableRecipe: FC<PrintableRecipeProps> = ({
  ref,
  recipe,
  ingredients,
  instructions,
  servingSize,
}) => {
  const servings = servingSize || recipe.servings
  const ratingCount = recipe.rating?.rateCount ?? 0
  const tags = recipe.nutritionLabels ?? []
  const nutrition = nutritionRows(recipe)

  return (
    <div className='printable-recipe' ref={ref} aria-hidden='true'>
      <header className='pr-header'>
        <h1 className='pr-title'>{capitalize(recipe.title || '')}</h1>
        <div className='pr-byline'>
          by @{recipe.authorUsername}
          {recipe.createdAt && formatMonthYear(recipe.createdAt) && (
            <> · {formatMonthYear(recipe.createdAt)}</>
          )}
        </div>
        {recipe.description && (
          <p className='pr-description'>{recipe.description}</p>
        )}
        <ul className='pr-meta'>
          <li>
            <span className='pr-meta-label'>Total time</span>
            <span className='pr-meta-value'>{recipe.totalTime ?? '—'} min</span>
          </li>
          <li>
            <span className='pr-meta-label'>Servings</span>
            <span className='pr-meta-value'>{servings || '—'}</span>
          </li>
          {ratingCount > 0 && (
            <li>
              <span className='pr-meta-label'>Rating</span>
              <span className='pr-meta-value'>
                {formatRating(recipe.rating?.rateValue, ratingCount)} ({ratingCount})
              </span>
            </li>
          )}
        </ul>
      </header>

      <div className='pr-body'>
        <section className='pr-section pr-ingredients'>
          <h2>Ingredients</h2>
          <ul>
            {ingredients.map(ingr =>
              'parsedIngredient' in ingr ? (
                <li key={ingr.id} className='pr-ing'>
                  <span className='pr-qty'>
                    {ingr.parsedIngredient.quantity
                      ? closestFraction(ingr.parsedIngredient.quantity)
                      : ''}
                    {ingr.parsedIngredient.unit
                      ? ` ${ingr.parsedIngredient.unit}`
                      : ''}
                  </span>{' '}
                  <span className='pr-name'>
                    {ingr.parsedIngredient.ingredient}
                    {ingr.parsedIngredient.comment
                      ? `, ${ingr.parsedIngredient.comment}`
                      : ''}
                  </span>
                </li>
              ) : (
                <li key={ingr.id} className='pr-ing-group'>
                  {ingr.label.replace(/:/g, '')}
                </li>
              )
            )}
          </ul>
        </section>

        <section className='pr-section pr-instructions'>
          <h2>Instructions</h2>
          {/* Numbers come from instr.index (not <ol> auto-numbering): group-label
              rows must not consume a step number, and a flex number column keeps
              double-digit numbers from being clipped. */}
          <ol>
            {instructions.map(instr =>
              'content' in instr ? (
                <li key={instr.id} className='pr-step'>
                  <span className='pr-step-num'>{instr.index}.</span>
                  <span className='pr-step-text'>{instr.content}</span>
                </li>
              ) : (
                <li key={instr.id} className='pr-step-group'>
                  {instr.label.replace(/:/g, '')}
                </li>
              )
            )}
          </ol>
        </section>

        {nutrition.length > 0 && (
          <section className='pr-section pr-nutrition'>
            <h2>
              Nutrition <span className='pr-per'>per serving</span>
            </h2>
            <ul>
              {nutrition.map(n => (
                <li key={n.label}>
                  <span className='pr-nutr-label'>{n.label}</span>
                  <span className='pr-nutr-value'>{n.value}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tags.length > 0 && (
          <section className='pr-section pr-tags'>
            <h2>Tags</h2>
            <p>{tags.join(' · ')}</p>
          </section>
        )}
      </div>

      <footer className='pr-footer'>
        {recipe.servingPrice ? (
          <div className='pr-price'>
            Estimated {formatPrice(recipe.servingPrice * servings)} total ·{' '}
            {formatPrice(recipe.servingPrice)}/serving
          </div>
        ) : null}
        <div className='pr-source'>
          Printed from Prepify — {window.location.href}
        </div>
      </footer>
    </div>
  )
}

export default PrintableRecipe
