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
  const [enrichmentWarning, setEnrichmentWarning] = useState('')

  const handleAddIngredient = async () => {
    // Phase A: guard BEFORE we touch loading state. Previously the empty-input
    // path set isLoading=true and returned without clearing it, sticking the
    // spinner on the parent IngredientsContainer.
    if (loading || !inputVal) return

    setEnrichmentWarning('')
    setLoading(true)
    setIngredientLoading({ isLoading: true, index: ingredientsLength })

    try {
      const data: IngredientsType = await RecipeAPI.getIngredientData(inputVal)
      // getIngredientData is soft-fail: always returns a valid IngredientsType,
      // even on enrichment failure (ingredientData: null + error). Per the
      // ingredient-enrichment-failures-are-non-fatal policy, we add the
      // ingredient either way and surface a small warning if enrichment failed.
      addIngredientToList(data)
      setInputVal('')
      if ('error' in data && data.error) {
        setEnrichmentWarning(
          `Added "${inputVal}", but couldn't fetch nutrition/image data. You can edit or remove it.`
        )
      }
    } finally {
      setLoading(false)
      setIngredientLoading({ isLoading: false, index: -1 })
    }
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
      {enrichmentWarning && (
        <div className='warning' role='status'>
          {enrichmentWarning}
        </div>
      )}
    </div>
  )
}

export default IngredientsInput
