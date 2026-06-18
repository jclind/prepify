import React, { Dispatch, FC, SetStateAction } from 'react'
import { IngredientsType } from 'types'
import { DndContext, Drag } from 'src/pages/AddRecipe/Dnd'
import IngredientItem from 'src/pages/AddRecipe/Ingredients/IngredientItem'
import { IngredientStatus } from 'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer'
import './IngredientList.scss'

type IngredientListProps = {
  ingredients: IngredientsType[]
  setIngredients: Dispatch<SetStateAction<IngredientsType[]>>
  // Per-row enrichment state keyed by ingredient id (see IngredientsContainer).
  statusById: Record<string, IngredientStatus>
  setItemStatus: (id: string, status: IngredientStatus | null) => void
  removeIngredient: (id: string) => void
  retryIngredient: (id: string) => void
}
const IngredientList: FC<IngredientListProps> = ({
  ingredients,
  setIngredients,
  statusById,
  setItemStatus,
  removeIngredient,
  retryIngredient,
}) => {
  const handlListChange = (updatedList: IngredientsType[]) =>
    setIngredients(updatedList)

  return (
    <DndContext list={ingredients} handleListChange={handlListChange}>
      <>
        {ingredients.map((ingr, idx) => {
          const status = ingr.id ? statusById[ingr.id] : undefined
          return (
            <Drag key={ingr.id} id={ingr.id ?? 'id'} index={idx}>
              <IngredientItem
                ingredients={ingredients}
                ingredient={ingr}
                setItemStatus={setItemStatus}
                loading={status === 'loading'}
                errored={status === 'error'}
                removeIngredient={removeIngredient}
                retryIngredient={retryIngredient}
                setIngredients={setIngredients}
              />
            </Drag>
          )
        })}
      </>
    </DndContext>
  )
}

export default IngredientList
