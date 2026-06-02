import React, { FC, useMemo } from 'react'
import { TailSpin } from 'react-loader-spinner'
import { IngredientsType } from 'types'
import { calculateServingPrice } from 'src/util/calculateServingPrice'
import { hrMinToMin } from 'src/util/hrMinToMin'
import './AddRecipeSummaryBar.scss'

type TimeVal = { hours: number; minutes: number } | null

interface AddRecipeSummaryBarProps {
  servings: number | ''
  prepTime: TimeVal
  cookTime: TimeVal
  ingredients: IngredientsType[]
  isValid: boolean
  loading: boolean
  onSubmit: () => void
  submitLabel?: string
  // When provided (edit mode), renders a Cancel button alongside submit.
  onCancel?: () => void
}

const formatTime = (totalMin: number): string => {
  if (totalMin <= 0) return '—'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m} min`
}

// Sticky bar pinned to the bottom of the create-recipe page. Shows a live
// rollup of the recipe (servings, total time, ingredient count, estimated cost
// per serving) and hosts the submit button. The cost reuses the same
// calculateServingPrice util the API calls at publish time, so the preview
// matches the stored value; it shows "—" until ingredients are parsed.
const AddRecipeSummaryBar: FC<AddRecipeSummaryBarProps> = ({
  servings,
  prepTime,
  cookTime,
  ingredients,
  isValid,
  loading,
  onSubmit,
  submitLabel = 'Create Recipe',
  onCancel,
}) => {
  const ingredientCount = useMemo(
    () => ingredients.filter(ingr => 'parsedIngredient' in ingr).length,
    [ingredients]
  )
  const totalMin = hrMinToMin(prepTime) + hrMinToMin(cookTime)
  const servingPriceCents = useMemo(
    () => (servings ? calculateServingPrice(ingredients, Number(servings)) : 0),
    [ingredients, servings]
  )

  return (
    <div className='add-recipe-summary-bar'>
      <div className='summary-inner'>
        <dl className='summary-stats'>
          <div className='stat'>
            <dt>Serves</dt>
            <dd>{servings || '—'}</dd>
          </div>
          <div className='stat'>
            <dt>Total time</dt>
            <dd>{formatTime(totalMin)}</dd>
          </div>
          <div className='stat'>
            <dt>Ingredients</dt>
            <dd>{ingredientCount || '—'}</dd>
          </div>
          <div className='stat'>
            <dt>Est. / serving</dt>
            <dd className='price'>
              {servingPriceCents > 0
                ? `$${(servingPriceCents / 100).toFixed(2)}`
                : '—'}
            </dd>
          </div>
        </dl>
        <div className='summary-actions'>
          {onCancel && (
            <button
              type='button'
              className='cancel-btn'
              disabled={loading}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            className={`submit-btn ${isValid ? 'valid' : 'invalid'}`}
            disabled={loading}
            aria-busy={loading}
            onClick={onSubmit}
          >
            {loading ? (
              <TailSpin
                height='28'
                width='28'
                color='white'
                ariaLabel='loading'
              />
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddRecipeSummaryBar
