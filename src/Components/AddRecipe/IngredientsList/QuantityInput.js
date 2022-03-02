import React, { useState } from 'react'

import { validateIngredientQuantityStr } from '../../../util/validateIngredientQuantityStr'

const QuantityInput = ({ val, setVal }) => {
  const [tempQuantity, setTempQuantity] = useState(val)

  const handleInputChange = e => {
    const newVal = e.target.value

    setTempQuantity(newVal)

    const ingredientData = validateIngredientQuantityStr(newVal)
    if (ingredientData.err) {
      console.log(ingredientData.err)
    }
  }
  return (
    <>
      <input
        type='text'
        className='quantity'
        placeholder='Qty: 1 1/2 cups, to taste'
        value={tempQuantity}
        onChange={handleInputChange}
      />
    </>
  )
}

export default QuantityInput
