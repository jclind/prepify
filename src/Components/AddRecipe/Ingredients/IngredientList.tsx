import React, { Dispatch, FC, SetStateAction, useState } from 'react'
import { IngredientsType } from 'types'
import './IngredientList.scss'
import Drag from './Dnd/Drag'
import DndContext from './Dnd/DndContext'
import IngredientItem from './IngredientItem'

type IngredientListProps = {
  ingredients: IngredientsType[]
  setIngredients: Dispatch<SetStateAction<IngredientsType[]>>
  setIngredientLoading: Dispatch<
    SetStateAction<{
      isLoading: boolean
      index: number
    }>
  >
  ingredientLoading: { isLoading: boolean; index: number }
  reorderActive: boolean
  removeIngredient: (id: string) => void
}
const IngredientList: FC<IngredientListProps> = ({
  ingredients,
  setIngredients,
  setIngredientLoading,
  ingredientLoading,
  reorderActive,
  removeIngredient,
}) => {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <DndContext
      list={ingredients}
      setList={setIngredients}
      setIsDragging={setIsDragging}
    >
      <>
        {ingredients.map((ingr, idx) => {
          const isCurrIngredientLoading =
            ingredientLoading.isLoading && ingredientLoading.index === idx

          return (
            <Drag key={ingr.id} id={ingr.id ?? 'id'} index={idx}>
              <IngredientItem
                ingredients={ingredients}
                ingredient={ingr}
                reorderActive={reorderActive}
                setLoading={setIngredientLoading}
                loading={isCurrIngredientLoading}
                removeIngredient={removeIngredient}
                setIngredients={setIngredients}
                isDragging={isDragging}
              />
            </Drag>
          )
        })}
        {ingredientLoading.isLoading &&
          ingredientLoading.index >= ingredients.length && (
            <>
              <IngredientItem
                ingredients={ingredients}
                setLoading={setIngredientLoading}
                loading={true}
                reorderActive={reorderActive}
                removeIngredient={removeIngredient}
                setIngredients={setIngredients}
              />
            </>
          )}
      </>
    </DndContext>
  )
}

export default IngredientList
