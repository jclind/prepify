import React, { Dispatch, FC, SetStateAction } from 'react'
import { IngredientsType } from 'types'
import { AiOutlineClose, AiOutlineMenu } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import './IngredientList.scss'
import {
  DragDropContext,
  DraggableProvided,
  DropResult,
} from 'react-beautiful-dnd'
import { reorder } from 'src/util/reorder'
import Drop from './Dnd/Drop'
import Drag from './Dnd/Drag'
import DndContext from './Dnd/DndContext'
import { isButtonElement } from 'react-router-dom/dist/dom'

const skeletonColor = '#d6d6d6'

type IngredientItemProps = {
  ingredient?: IngredientsType
  reorderActive?: boolean
  loading?: boolean
  provided?: DraggableProvided
}
const IngredientItem: FC<IngredientItemProps> = ({
  ingredient,

  reorderActive,
  loading,
  provided,
}) => {
  const renderIngredientText = () => {
    if (typeof ingredient !== 'undefined' && 'parsedIngredient' in ingredient) {
      const {
        quantity,
        unit,
        ingredient: ingredientName,
        comment,
      } = ingredient.parsedIngredient
      return (
        <>
          {quantity && quantity > 0 ? (
            <span className='bold-text text'>{quantity}</span>
          ) : null}
          {quantity && quantity > 0 && unit ? (
            <span className='bold-text text'>{unit}</span>
          ) : null}
          <span className='text'>{ingredientName}</span>
          {comment && <span className='text'>{`, ${comment}`}</span>}
        </>
      )
    }
    return null
  }

  return (
    <div className='container' {...provided?.draggableProps}>
      <div
        className={`handler ${
          reorderActive ? 'handler-active' : 'handler-inactive'
        }`}
        {...provided?.dragHandleProps}
      >
        <AiOutlineMenu className='icon' />
      </div>
      {/* {reorderActive && ( */}
      <button
        className={`remove-ingredient-btn ${
          reorderActive
            ? 'remove-ingredient-active'
            : 'remove-ingredient-inactive'
        }`}
      >
        <AiOutlineClose className='icon' />
      </button>
      {/* )} */}
      {!ingredient || 'parsedIngredient' in ingredient ? (
        <button className='item-btn'>
          <div
            className={`img-container ${reorderActive ? 'padding-active' : ''}`}
          >
            {loading ? (
              <Skeleton className='img' baseColor={skeletonColor} />
            ) : (
              <img
                className='img'
                src={ingredient?.ingredientData?.imagePath}
                alt=''
              />
            )}
          </div>
          <div className='text-container'>
            {loading ? (
              <Skeleton baseColor={skeletonColor} height={25} width={'35ch'} />
            ) : (
              renderIngredientText()
            )}
          </div>
        </button>
      ) : null}
    </div>
  )
}

type IngredientListProps = {
  ingredients: IngredientsType[]
  setIngredients: Dispatch<SetStateAction<IngredientsType[]>>
  ingredientLoading: { isLoading: boolean; index: number }
  reorderActive: boolean
}
const IngredientList: FC<IngredientListProps> = ({
  ingredients,
  setIngredients,
  ingredientLoading,
  reorderActive,
}) => {
  return (
    <DndContext list={ingredients} setList={setIngredients}>
      {ingredients.map((ingr, idx) => {
        const isCurrIngredientLoading =
          ingredientLoading.isLoading && ingredientLoading.index === idx

        return (
          <Drag key={ingr.id} id={ingr.id ?? 'id'} index={idx}>
            <IngredientItem
              ingredient={ingr}
              reorderActive={reorderActive}
              loading={isCurrIngredientLoading}
            />
          </Drag>
        )
      })}
      {ingredientLoading.isLoading &&
        ingredientLoading.index >= ingredients.length && (
          <>
            <IngredientItem loading={true} reorderActive={reorderActive} />
          </>
        )}
    </DndContext>
  )
}

export default IngredientList
