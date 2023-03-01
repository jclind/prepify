import { IngredientResponse } from '@jclind/ingredient-parser/types'
import React, { useState } from 'react'
import { IngredientsType } from 'types'
import RecipeFormInput from '../RecipeFormInput'

type IngredientsInputProps = {
  getIngredientData: (val: string) => Promise<IngredientResponse>
  addIngredientToList: (data: IngredientsType) => void
  // ingredients: IngredientsType[]
  // setIngredients: (val: IngredientsType[]) => void
}

const IngredientsInput = ({
  getIngredientData,
  addIngredientToList,
}: IngredientsInputProps) => {
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddIngredient = async () => {
    setError('')
    if (loading || !inputVal) return

    setLoading(true)

    const data: IngredientResponse = await getIngredientData(inputVal)
    if (data) {
      addIngredientToList(data)
      setInputVal('')
      setLoading(false)
    } else {
      setLoading(false)
      setError('something went wrong')
    }
  }

  return (
    <RecipeFormInput
      placeholder='Add ingredients to your recipe.'
      val={inputVal}
      setVal={setInputVal}
      onEnter={handleAddIngredient}
    />
  )
}

export default IngredientsInput
