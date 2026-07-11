import { AlertCircleIcon, CloseIcon, DragIcon, RotateCwIcon, ShoppingBasketIcon } from 'src/Components/icons'
import React, { FC, useState, useRef, useEffect } from 'react'
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor, spinnerColor } from 'src/util/loadingStyles'
import { toast } from 'react-hot-toast'
import RecipeAPI, { INGREDIENT_RATE_LIMIT_CODE } from 'src/api/recipes'
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
  // handleEditSubmit ends by programmatically blur()-ing the input (so a
  // keyboard Enter-submit also exits edit mode visually). That blur()
  // synchronously re-fires the same FormInput's onBlur, which is also wired
  // to submit — without a guard, every Enter-submit double-invokes
  // handleEditSubmit against the same stale closed-over editedVal/ingredient
  // (double network call, double toast). This ref is flipped immediately
  // before the self-triggered blur() and consumed by handleBlur below, so
  // only a genuine user blur (click-away while editing) reaches
  // handleEditSubmit a second time.
  const suppressNextBlurSubmitRef = useRef(false)

  // When enrichment last 429'd, hold retryAt (epoch ms) here so the retry
  // button can disable itself instead of immediately re-429ing. Sourced from
  // ingredient.error on mount/prop-change (the add path sets it via
  // getIngredientData); the edit path below sets it directly on a fresh 429.
  const rowRetryAt =
    ingredient && 'error' in ingredient && ingredient.error?.code === INGREDIENT_RATE_LIMIT_CODE
      ? ingredient.error.retryAt
      : undefined
  const [isRateLimited, setIsRateLimited] = useState(
    () => !!rowRetryAt && rowRetryAt > Date.now()
  )
  // Re-sync when the row's error changes (e.g. a fresh 429 on retry/edit) and
  // self-clear once retryAt passes, so the button re-enables without any
  // outside trigger.
  useEffect(() => {
    if (!rowRetryAt || rowRetryAt <= Date.now()) {
      setIsRateLimited(false)
      return
    }
    setIsRateLimited(true)
    const timer = setTimeout(() => setIsRateLimited(false), rowRetryAt - Date.now())
    return () => clearTimeout(timer)
  }, [rowRetryAt])

  const renderIngredientText = () => {
    if (typeof ingredient !== 'undefined' && 'parsedIngredient' in ingredient) {
      const {
        quantity,
        minQty,
        maxQty,
        unit,
        ingredient: ingredientName,
        comment,
      } = ingredient.parsedIngredient
      return (
        <IngredientItemText
          quantity={quantity}
          minQty={minQty}
          maxQty={maxQty}
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
      // A genuine blur-away submit leaves the suppress flag set: focus has
      // already left the input by the time handleEditSubmit runs, so its
      // trailing self-blur() no-ops on the already-blurred element (no event)
      // and never consumes the flag. Reset on edit-entry so stale suppression
      // can't swallow the next session's genuine blur-away.
      suppressNextBlurSubmitRef.current = false
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
        const rowError =
          'error' in ingredientDataRes ? ingredientDataRes.error : undefined
        setItemStatus(id, rowError ? 'error' : null)
        // Same honest-messaging branch as the add path: a 429 is a distinct,
        // expected condition, not a generic miss, so it gets its own toast
        // instead of silently landing on the row.
        if (rowError?.code === INGREDIENT_RATE_LIMIT_CODE) {
          toast.error(
            `"${editedVal}" hit the ingredient lookup limit — wait a moment before retrying.`
          )
        }
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
    suppressNextBlurSubmitRef.current = true
    editInputRef?.current?.blur()
  }

  // Wired to FormInput's onBlur. Genuine blur-away (clicking elsewhere while
  // editing) should still submit; the blur() handleEditSubmit triggers on
  // itself should not resubmit — see suppressNextBlurSubmitRef above.
  const handleBlur = () => {
    if (suppressNextBlurSubmitRef.current) {
      suppressNextBlurSubmitRef.current = false
      return
    }
    handleEditSubmit()
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
          title={
            isRateLimited
              ? 'Rate limited — please wait a moment before retrying'
              : "Couldn't fetch nutrition data — retry"
          }
          disabled={isRateLimited}
          onClick={e => {
            e.stopPropagation()
            if (isRateLimited) return
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
            onBlur={handleBlur}
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
