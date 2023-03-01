import { ingredientParser } from '@jclind/ingredient-parser'
import { IngredientResponse } from '@jclind/ingredient-parser/types'
import React from 'react'
import { IngredientsType } from 'types'
import IngredientsInput from './IngredientsInput'
import { v4 as uuidv4 } from 'uuid'

type IngredientsContainerProps = {
  ingredients: IngredientsType[]
  setIngredients: React.Dispatch<React.SetStateAction<IngredientsType[]>>
}

const IngredientsContainer = ({
  ingredients,
  setIngredients,
}: IngredientsContainerProps) => {
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
    <div>
      <IngredientsInput
        getIngredientData={getIngredientData}
        addIngredientToList={addIngredientToList}
      />
    </div>
  )
}

export default IngredientsContainer
