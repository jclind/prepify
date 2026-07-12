import React, { FC } from 'react'
import { formatIngredientQuantity } from 'src/util/formatQuantity'
import './IngredientItemText.scss'

type IngredientItemTextProps = {
  quantity: number | null
  minQty: number | null
  maxQty: number | null
  unit: string | null
  ingredientName: string | null
  comment: string | null
}

const IngredientItemText: FC<IngredientItemTextProps> = ({
  quantity,
  minQty,
  maxQty,
  unit,
  ingredientName,
  comment,
}) => {
  const quantityText = formatIngredientQuantity(quantity, minQty, maxQty)
  return (
    <div className='ingredient-item-text'>
      <p>
        {quantityText ? (
          <>
            <strong>{quantityText}</strong>{' '}
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
