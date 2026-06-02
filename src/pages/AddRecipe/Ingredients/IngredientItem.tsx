import React, { Dispatch, SetStateAction, FC, useState, useRef } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import { CiShoppingBasket } from 'react-icons/ci'
import { MdDragIndicator } from 'react-icons/md'
import { AiOutlineClose } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import RecipeAPI from 'src/api/recipes'
import { getIndexById } from 'src/util/getIndexById'
import { IngredientsType } from 'types'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'
import '../ListComponents/Item.scss'
import { TailSpin } from 'react-loader-spinner'
import styles from 'src/_exports.module.scss'
import IngredientItemText from 'src/Components/IngredientItemText/IngredientItemText'

const skeletonColor = '#d6d6d6'

type IngredientItemProps = {
  ingredients: IngredientsType[]
  ingredient?: IngredientsType
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

// Per-ingredient price label from the enriched parser data. Returns '—' when
// pricing couldn't be fetched (soft-fail) so a row never looks broken.
const priceLabel = (ingredient?: IngredientsType): string => {
  if (
    ingredient &&
    'ingredientData' in ingredient &&
    ingredient.ingredientData
  ) {
    const cents = Number(ingredient.ingredientData.totalPriceUSACents)
    if (!isNaN(cents)) return `$${(cents / 100).toFixed(2)}`
  }
  return '—'
}

const IngredientItem: FC<IngredientItemProps> = ({
  ingredients,
  ingredient,
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
        <IngredientItemText
          quantity={quantity}
          unit={unit}
          ingredientName={ingredientName}
          comment={comment}
        />
      )
    }
    return null
  }
  const handleIngrClick = () => {
    if (editInputRef?.current) {
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
      // Phase A: soft-fail by design — whether enrichment succeeded or returned
      // an error variant, we overwrite the existing ingredient with the new
      // parse result so the edit takes effect either way. The error is carried
      // through on the IngredientsType payload itself; no extra handling needed
      // here.
      editIngredient(ingredient.id, { ...ingredientDataRes })
      setLoading({ isLoading: false, index: -1 })
    }

    setIsEditing(false)
    editInputRef?.current?.blur()
  }

  if (!ingredient) return null

  const isParsed = 'parsedIngredient' in ingredient

  return (
    <div
      ref={provided?.innerRef}
      className={`ingredients-container item ingredient-row ${
        snapshot?.isDragging ? 'dragging' : ''
      }`}
      {...provided?.draggableProps}
    >
      {/* Always-visible drag handle (the only drag target, so the row text
          stays click-to-edit). Reorder is available any time — no mode. */}
      <div
        className='drag-handle'
        aria-label='Drag to reorder'
        {...provided?.dragHandleProps}
      >
        <MdDragIndicator className='icon' />
      </div>

      {isEditing ? null : isParsed ? (
        <button className='item-btn' onClick={handleIngrClick}>
          <div className='img-container'>
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
          <h4 className='text'>{ingredient.label}</h4>
        </button>
      )}

      {!isEditing && isParsed && (
        <span className={`ingr-price ${loading ? 'na' : ''}`}>
          {loading ? '' : priceLabel(ingredient)}
        </span>
      )}

      <button
        className='ingr-remove'
        aria-label='Remove ingredient'
        onClick={e => {
          e.stopPropagation()
          removeIngredient(ingredient.id)
        }}
      >
        <AiOutlineClose className='icon' />
      </button>

      {!snapshot?.isDragging && (
        <div className={`${isEditing ? 'edit-input' : 'hidden'}`}>
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
