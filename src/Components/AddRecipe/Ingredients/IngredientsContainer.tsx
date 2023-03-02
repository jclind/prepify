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
    const ingredientData: IngredientsType = { ...data, id: uuidv4() }
    setIngredients((prev: IngredientsType[]) => {
      const update: IngredientsType[] = [...prev, ingredientData]
      return update
    })
  }
  const getIngredientData = async (val: string) => {
    const apiKey = process.env.REACT_APP_SPOONACULAR_API_KEY

    if (!apiKey) {
      throw new Error('Spoonacular API key is not defined')
    }

    const result: IngredientResponse = await ingredientParser(val, apiKey)

    return result
  }

  return (
    <div className='ingredients-container'>
      <IngredientsInput
        getIngredientData={getIngredientData}
        addIngredientToList={addIngredientToList}
        setIngredientLoading={setIngredientLoading}
        ingredientsLength={ingredients.length}
      />
      <IngredientList
        ingredients={ingredients}
        setIngredients={setIngredients}
        ingredientLoading={ingredientLoading}
        reorderActive={reorderActive}
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
