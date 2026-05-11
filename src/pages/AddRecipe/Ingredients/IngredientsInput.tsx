import React, { FC, useState } from 'react'
import { TailSpin } from 'react-loader-spinner'
import RecipeAPI from 'src/api/recipes'
import { IngredientsType } from 'types'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'
import styles from 'src/_exports.module.scss'

type IngredientsInputProps = {
  addIngredientToList: (data: IngredientsType) => void
  setIngredientLoading: (data: { isLoading: boolean; index: number }) => void
  ingredientsLength: number
  ingredientLoading: { isLoading: boolean; index: number }
}

const IngredientsInput: FC<IngredientsInputProps> = ({
  addIngredientToList,
  setIngredientLoading,
  ingredientsLength,
  ingredientLoading,
}) => {
  const [inputVal, setInputVal] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddIngredient = async () => {
    setIngredientLoading({ isLoading: true, index: ingredientsLength })
    if (loading || !inputVal) return

    setLoading(true)

    const data: IngredientsType = await RecipeAPI.getIngredientData(inputVal)
    if (data) {
      addIngredientToList(data)
      setInputVal('')
    } else {
      // !! ERROR
    }
    setLoading(false)
    setIngredientLoading({ isLoading: false, index: -1 })
  }

  return (
    <div className='input-container'>
      <RecipeFormInput
        placeholder='Add ingredients to your recipe.'
        val={inputVal}
        setVal={setInputVal}
        onEnter={handleAddIngredient}
      />
      {ingredientLoading.isLoading && (
        <div className='loading-indicator'>
          <TailSpin
            height='20'
            width='20'
            color={styles.primaryText}
            ariaLabel='loading'
          />
        </div>
      )}
    </div>
  )
}

export default IngredientsInput
