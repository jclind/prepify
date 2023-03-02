import React, { Dispatch, SetStateAction, FC, useState, useRef } from 'react'
import { DraggableProvided } from 'react-beautiful-dnd'
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import RecipeAPI from 'src/api/recipes'
import { getIndexById } from 'src/util/getIndexById'
import { IngredientsType } from 'types'
import RecipeFormInput from '../RecipeFormInput'

const skeletonColor = '#d6d6d6'

type IngredientItemProps = {
  ingredients: IngredientsType[]
  ingredient?: IngredientsType
  reorderActive?: boolean
  setLoading: Dispatch<
    SetStateAction<{
      isLoading: boolean
      index: number
    }>
  >
  loading?: boolean
  provided?: DraggableProvided
  removeIngredient: (id: string) => void
  setIngredients: Dispatch<SetStateAction<IngredientsType[]>>
  isDragging?: boolean
}
const IngredientItem: FC<IngredientItemProps> = ({
  ingredients,
  ingredient,
  reorderActive,
  setLoading,
  loading,
  provided,
  removeIngredient,
  setIngredients,
  isDragging,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedVal, setEditedVal] = useState(() => {
    if (!ingredient) {
      return ''
    }
    if ('label' in ingredient) return ingredient.label
    return ingredient.parsedIngredient.originalIngredientString
  })
  const editInputRef = useRef<HTMLInputElement>(null)
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
  const handleIngrClick = () => {
    if (editInputRef?.current && !reorderActive) {
      setIsEditing(true)
      editInputRef.current.focus()
    }
  }
  const editIngredient = (id: string, updatedItem: IngredientsType) => {
    setIngredients(prev =>
      prev.map(instr => (instr.id === id ? { ...updatedItem, id } : instr))
    )
  }
  const handleEditSubmit = async () => {
    if (!editedVal || !ingredient) {
      setIsEditing(false)
      return
    }

    const isLabel = 'label' in ingredient

    if (isLabel && ingredient.label !== editedVal) {
      editIngredient(ingredient.id, { label: editedVal, id: ingredient.id })
    } else if (
      !isLabel &&
      ingredient.parsedIngredient.originalIngredientString !== editedVal
    ) {
      const currIndex = getIndexById(ingredients, ingredient.id)
      setLoading({ isLoading: true, index: currIndex })
      const updatedIngrData = await RecipeAPI.getIngredientData(editedVal)
      editIngredient(ingredient.id, { ...updatedIngrData })
      setLoading({ isLoading: false, index: -1 })
    }

    setIsEditing(false)
    editInputRef?.current?.blur()
  }

  const renderHandler = () => (
    <div
      className={`handler ${
        reorderActive ? 'handler-active' : 'handler-inactive'
      }`}
      {...provided?.dragHandleProps}
    >
      <AiOutlineMenu className='icon' />
    </div>
  )
  const renderRemoveIngredientBtn = () => {
    if (!ingredient) return null
    return (
      <button
        className={`remove-ingredient-btn ${
          reorderActive
            ? 'remove-ingredient-active'
            : 'remove-ingredient-inactive'
        }`}
        onClick={e => {
          e.stopPropagation()
          ingredient.id && removeIngredient(ingredient.id)
        }}
      >
        <AiOutlineClose className='icon' />
      </button>
    )
  }

  if (!ingredient) return null
  return (
    <div className='container' {...provided?.draggableProps}>
      {renderHandler()}
      {renderRemoveIngredientBtn()}
      {isEditing ? null : 'parsedIngredient' in ingredient ? (
        <button className='item-btn' onClick={handleIngrClick}>
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
      ) : (
        <button
          className={`label-text-container ${
            reorderActive ? 'padding-active' : ''
          }`}
          onClick={handleIngrClick}
        >
          <h4 className='text'>{ingredient.label}</h4>
        </button>
      )}
      {!isDragging && (
        <div
          className={`${isEditing && !reorderActive ? 'edit-input' : 'hidden'}`}
        >
          <RecipeFormInput
            val={editedVal}
            setVal={setEditedVal}
            inputRef={editInputRef}
            onBlur={handleEditSubmit}
            onEnter={handleEditSubmit}
          />
        </div>
      )}
    </div>
  )
}

export default IngredientItem
