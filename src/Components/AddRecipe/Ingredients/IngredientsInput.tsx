import { IngredientResponse } from '@jclind/ingredient-parser/types'
import React, { useState } from 'react'
import RecipeAPI from 'src/api/recipes'
import { IngredientsType } from 'types'
import RecipeFormInput from '../RecipeFormInput'

type IngredientsInputProps = {
  addIngredientToList: (data: IngredientsType) => void
  setIngredientLoading: (data: { isLoading: boolean; index: number }) => void
  ingredientsLength: number
}

const IngredientsInput = ({
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

    const data: IngredientsType = await RecipeAPI.getIngredientData(inputVal)
    if (data) {
      addIngredientToList(data)
      setInputVal('')
    } else {
      setError('something went wrong')
    }
    setLoading(false)
    setIngredientLoading({ isLoading: false, index: -1 })
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
