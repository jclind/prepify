import React, { Dispatch, SetStateAction, FC, useState, useRef } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd'
import { CiShoppingBasket } from 'react-icons/ci'
import Skeleton from 'react-loading-skeleton'
import RecipeAPI from 'src/api/recipes'
import { getIndexById } from 'src/util/getIndexById'
import { IngredientsType } from 'types'
import Handler from '../ListComponents/Handler'
import RecipeFormInput from '../RecipeFormInput'
import '../ListComponents/Item.scss'
import RemoveItem from '../ListComponents/RemoveItem'
import { TailSpin } from 'react-loader-spinner'
import styles from '../../../_exports.scss'

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
  snapshot?: DraggableStateSnapshot
  removeIngredient: (id: string) => void
  setIngredients: Dispatch<SetStateAction<IngredientsType[]>>
}
const IngredientItem: FC<IngredientItemProps> = ({
  ingredients,
  ingredient,
  reorderActive,
  setLoading,
  loading,
  provided,
  snapshot,
  removeIngredient,
  setIngredients,
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
      const ingredientDataRes = await RecipeAPI.getIngredientData(editedVal)
      if ('error' in ingredientDataRes) {
        console.log(ingredientDataRes.error)
      }
      editIngredient(ingredient.id, { ...ingredientDataRes })
      setLoading({ isLoading: false, index: -1 })
    }

    setIsEditing(false)
    editInputRef?.current?.blur()
  }

  if (!ingredient) return null
  return (
    <div
      className={`ingredients-container item ${
        snapshot?.isDragging ? 'dragging' : ''
      }`}
      {...provided?.draggableProps}
    >
      <Handler provided={provided} reorderActive={reorderActive} />
      {ingredient && (
        <RemoveItem
          removeItem={removeIngredient}
          id={ingredient.id}
          reorderActive={reorderActive ?? false}
        />
      )}
      {isEditing ? null : 'parsedIngredient' in ingredient ? (
        <button className='item-btn' onClick={handleIngrClick}>
          <div
            className={`img-container ${reorderActive ? 'margin-active' : ''}`}
          >
            {loading ? (
              <Skeleton className='img' baseColor={skeletonColor} />
            ) : (
              <>
                {ingredient?.ingredientData?.imagePath ? (
                  <img
                    className='img'
                    src={ingredient.ingredientData.imagePath}
                    alt=''
                  />
                ) : (
                  <CiShoppingBasket className='img no-img' />
                )}
              </>
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
        <button className='label-text-container' onClick={handleIngrClick}>
          <h4 className={`text ${reorderActive ? 'margin-active' : ''}`}>
            {ingredient.label}
          </h4>
        </button>
      )}
      {!snapshot?.isDragging && (
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
          {loading && (
            <div className='loading-indicator'>
              <TailSpin
                height='20'
                width='20'
                color={styles.primaryText}
                ariaLabel='loading'
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IngredientItem
