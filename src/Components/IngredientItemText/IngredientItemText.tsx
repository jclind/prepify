import React, { FC } from 'react'
import './IngredientItemText.scss'

type IngredientItemText = {
  quantity: number | null
  unit: string | null
  ingredientName: string | null
  comment: string | null
}

const IngredientItemText: FC<IngredientItemText> = ({
  quantity,
  unit,
  ingredientName,
  comment,
}) => {
  return (
    <div className='ingredient-item-text'>
      <p>
        {quantity ? (
          <>
            <strong>{quantity}</strong>{' '}
          </>
        ) : null}
        {unit ? (
          <>
            <strong>{unit}</strong>{' '}
          </>
        ) : null}
        {ingredientName && <span>{ingredientName}</span>}
        {comment && <span>, {comment}</span>}
      </p>
    </div>
  )
}

export default IngredientItemText
