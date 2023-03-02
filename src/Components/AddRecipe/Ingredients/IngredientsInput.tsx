import { IngredientResponse } from '@jclind/ingredient-parser/types'
import React, { useState } from 'react'
import { IngredientsType } from 'types'
import RecipeFormInput from '../RecipeFormInput'

type IngredientsInputProps = {
  getIngredientData: (val: string) => Promise<IngredientResponse>
  addIngredientToList: (data: IngredientsType) => void
  setIngredientLoading: (data: { isLoading: boolean; index: number }) => void
  ingredientsLength: number
  // ingredients: IngredientsType[]
  // setIngredients: (val: IngredientsType[]) => void
}

const IngredientsInput = ({
  getIngredientData,
  addIngredientToList,
  setIngredientLoading,
  ingredientsLength,
}: IngredientsInputProps) => {
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddIngredient = async () => {
    setIngredientLoading({ isLoading: true, index: ingredientsLength })
    setError('')
    if (loading || !inputVal) return

    setLoading(true)

    const data: IngredientResponse = await getIngredientData(inputVal)
    if (data) {
      addIngredientToList(data)
      setInputVal('')
      setLoading(false)
      setIngredientLoading({ isLoading: false, index: -1 })
    } else {
      setLoading(false)
      setError('something went wrong')
      setIngredientLoading({ isLoading: false, index: -1 })
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
