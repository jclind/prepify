import { ingredientParser } from '@jclind/ingredient-parser'
import { IngredientResponse } from '@jclind/ingredient-parser/types'
import React, { useState } from 'react'
import { IngredientsType } from 'types'
import IngredientsInput from './IngredientsInput'
import { v4 as uuidv4 } from 'uuid'
import IngredientList from './IngredientList'
import './IngredientsContainer.scss'

type IngredientsContainerProps = {
  ingredients: IngredientsType[]
  setIngredients: React.Dispatch<React.SetStateAction<IngredientsType[]>>
}

const IngredientsContainer = ({
  ingredients,
  setIngredients,
}: IngredientsContainerProps) => {
  const [ingredientLoading, setIngredientLoading] = useState<{
    isLoading: boolean
    index: number
  }>({ isLoading: false, index: -1 })
  const [reorderActive, setReorderActive] = useState(false)

  const addIngredientToList = (data: IngredientsType) => {
    setIngredients((prev: IngredientsType[]) => {
      const update: IngredientsType[] = [...prev, data]
      return update
    })
  }
  const removeIngredient = (removeId: string) => {
    setIngredients(prev => prev.filter(ingr => ingr.id !== removeId))
  }

  return (
    <div className='ingredients-container'>
      <IngredientsInput
        addIngredientToList={addIngredientToList}
        setIngredientLoading={setIngredientLoading}
        ingredientsLength={ingredients.length}
      />
      <IngredientList
        ingredients={ingredients}
        setIngredients={setIngredients}
        ingredientLoading={ingredientLoading}
        setIngredientLoading={setIngredientLoading}
        reorderActive={reorderActive}
        removeIngredient={removeIngredient}
      />
      <button
        className='reorder-btn'
        onClick={() => setReorderActive(prev => !prev)}
      >
        {reorderActive ? 'Done' : 'Reorder'}
      </button>
    </div>
  )
}

export default IngredientsContainer
