import React, { FC, useState } from 'react'
import { IngredientsType } from 'types'
import AddLabel from 'src/pages/AddRecipe/AddLabel/AddLabel'
import IngredientList from 'src/pages/AddRecipe/Ingredients/IngredientList/IngredientList'
import IngredientsInput from 'src/pages/AddRecipe/Ingredients/IngredientsInput'
import './IngredientsContainer.scss'

type IngredientsContainerProps = {
  ingredients: IngredientsType[]
  setIngredients: React.Dispatch<React.SetStateAction<IngredientsType[]>>
}

const IngredientsContainer: FC<IngredientsContainerProps> = ({
  ingredients,
  setIngredients,
}) => {
  const [ingredientLoading, setIngredientLoading] = useState<{
    isLoading: boolean
    index: number
  }>({ isLoading: false, index: -1 })

  const addIngredientToList = (data: IngredientsType) => {
    setIngredients((prev: IngredientsType[]) => {
      const update: IngredientsType[] = [...prev, data]
      return update
    })
  }
  const removeIngredient = (removeId: string) => {
    setIngredients(prev => prev.filter(ingr => ingr.id !== removeId))
  }

  // Sum of the enriched per-ingredient prices (cents). Shown as a subtotal so
  // the cook sees the total grocery cost; the page's summary bar handles the
  // per-serving figure separately.
  const subtotalCents = ingredients.reduce((sum, ingr) => {
    if ('ingredientData' in ingr && ingr.ingredientData) {
      const cents = Number(ingr.ingredientData.totalPriceUSACents)
      if (!isNaN(cents)) return sum + cents
    }
    return sum
  }, 0)

  return (
    <div className='ingredients-container'>
      <IngredientsInput
        addIngredientToList={addIngredientToList}
        setIngredientLoading={setIngredientLoading}
        ingredientsLength={ingredients.length}
        ingredientLoading={ingredientLoading}
      />
      <IngredientList
        ingredients={ingredients}
        setIngredients={setIngredients}
        ingredientLoading={ingredientLoading}
        setIngredientLoading={setIngredientLoading}
        removeIngredient={removeIngredient}
      />
      <div className='ingredients-footer'>
        <AddLabel addToList={addIngredientToList} />
        {subtotalCents > 0 && (
          <span className='ingredients-subtotal'>
            Subtotal <b>${(subtotalCents / 100).toFixed(2)}</b>
          </span>
        )}
      </div>
    </div>
  )
}

export default IngredientsContainer
