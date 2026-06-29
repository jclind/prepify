import { KitchenIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import './RecipePlaceholder.scss'

/**
 * Fallback shown when a recipe has no image (or its image URL fails to load).
 * An on-brand utensils icon on a soft-orange tile — avoids the browser's broken
 * -image glyph and needs no asset. Fills its container; pass the same className
 * the <img> would use so it inherits the slot's sizing.
 */
const RecipePlaceholder: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`recipe-placeholder ${className}`} aria-hidden='true'>
    <KitchenIcon className='recipe-placeholder__icon' />
  </div>
)

export default RecipePlaceholder
