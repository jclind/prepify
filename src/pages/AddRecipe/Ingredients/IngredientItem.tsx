import { AlertCircleIcon, CloseIcon, DragIcon, RotateCwIcon, ShoppingBasketIcon } from 'src/Components/icons'
import React, { FC, useState, useRef } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor, spinnerColor } from 'src/util/loadingStyles'
import { toast } from 'react-hot-toast'
import RecipeAPI from 'src/api/recipes'
import { IngredientsType } from 'types'
import FormInput from 'src/Components/Form/FormInput'
import {
  IngredientEnrichTimeoutError,
  withTimeout,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'
import { IngredientStatus } from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'
import '../ListComponents/Item.scss'
import { TailSpin } from 'react-loader-spinner'
import IngredientItemText from 'src/Components/IngredientItemText/IngredientItemText'


type IngredientItemProps = {
  ingredients: IngredientsType[]
  ingredient?: IngredientsType
  // Sets this row's enrichment status by id (see IngredientsContainer).
  setItemStatus: (id: string, status: IngredientStatus | null) => void
  loading?: boolean
  errored?: boolean
  provided?: DraggableProvided
  snapshot?: DraggableStateSnapshot
  removeIngredient: (id: string) => void
  retryIngredient: (id: string) => void
  setIngredients: React.Dispatch<React.SetStateAction<IngredientsType[]>>
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
  setItemStatus,
  loading,
  errored,
  provided,
  snapshot,
  removeIngredient,
  retryIngredient,
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
      const id = ingredient.id
      setItemStatus(id, 'loading')
      try {
        // Same timeout/exit guard as the add path: getIngredientData soft-fails
        // but can't protect against a request that never settles, so race it
        // against a wall clock.
        const ingredientDataRes = await withTimeout(
          RecipeAPI.getIngredientData(editedVal)
        )
        editIngredient(id, { ...ingredientDataRes })
        setItemStatus(
          id,
          'error' in ingredientDataRes && ingredientDataRes.error
            ? 'error'
            : null
        )
      } catch (err: unknown) {
        const timedOut = err instanceof IngredientEnrichTimeoutError
        setItemStatus(id, 'error')
        toast.error(
          timedOut
            ? `"${editedVal}" is taking too long to look up — kept without nutrition data. Retry or edit it.`
            : `Couldn't fetch data for "${editedVal}" — kept without it. Retry or edit it.`
        )
      }
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
      } ${errored ? 'errored' : ''}`}
      {...provided?.draggableProps}
    >
      {/* Always-visible drag handle (the only drag target, so the row text
          stays click-to-edit). Reorder is available any time — no mode. */}
      <div
        className='drag-handle'
        aria-label='Drag to reorder'
        {...provided?.dragHandleProps}
      >
        <DragIcon className='icon' />
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
                  <ShoppingBasketIcon className='img no-img' />
                )}
              </>
            )}
          </div>
          {/* Optimistic: the parsed text is available locally, so show it
              immediately even while enrichment (image/price) is still loading. */}
          <div className='text-container'>{renderIngredientText()}</div>
        </button>
      ) : (
        <button className='label-text-container' onClick={handleIngrClick}>
          <h4 className='text'>{ingredient.label}</h4>
        </button>
      )}

      {!isEditing && isParsed && errored && !loading && (
        <button
          type='button'
          className='ingr-retry'
          aria-label='Retry ingredient lookup'
          title="Couldn't fetch nutrition data — retry"
          onClick={e => {
            e.stopPropagation()
            retryIngredient(ingredient.id)
          }}
        >
          <AlertCircleIcon className='icon warn' />
          <RotateCwIcon className='icon retry' />
        </button>
      )}

      {!isEditing && isParsed && !errored && (
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
        <CloseIcon className='icon' />
      </button>

      {!snapshot?.isDragging && (
        <div className={`${isEditing ? 'edit-input' : 'hidden'}`}>
          <FormInput
            size='compact'
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
                color={spinnerColor}
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
