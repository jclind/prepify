import React, { useState } from 'react'
import { IngredientsType } from 'types'
import AddLabelContainer from '../AddLabel/AddLabel'
import IngredientList from '../IngredientList/IngredientList'
import IngredientsInput from '../IngredientsInput'
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
      {/* <button className="add-header-btn" onClick={}> */}
      <AddLabelContainer addToList={addIngredientToList} />
      {/* </button> */}
    </div>
  )
}

export default IngredientsContainer
