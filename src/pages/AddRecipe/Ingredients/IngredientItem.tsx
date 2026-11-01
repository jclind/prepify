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

// Per-ingredient price for the row, carrying the parser's own provenance so a
// guess doesn't render with the authority of a measured number. Four states:
//
//   'exact'    — a mass measure. unit → grams is exact and density-independent.
//   'estimate' — a volume measure converted through an average density (a cup
//                of flour genuinely varies ±20%), or a per-item price
//                multiplied by a count. Same number, marked as a guess.
//   'free'     — a real price that happens to be 0 (parser 2.2.0): water, or an
//                amount left to the cook like "to taste". Renders identically
//                to 'exact', no badge and no styling of its own. It exists only
//                so the row can say why the number is 0, since $0.00 next to
//                "salt and pepper" otherwise reads as broken.
//   'none'     — no price at all. Since @jclind/ingredient-parser 2.1.0 the
//                parser declines rather than guessing when a measure can't be
//                priced, which is why this is now common enough to deserve real
//                copy. It matters because calculateServingPrice skips these
//                rows silently, so the per-serving total understates until the
//                author supplies a price.
//
// 'free' and 'none' are the pair most easily confused, and the subtotal chip
// depends on keeping them apart: a free row is priced and must not mark the
// total partial.
//
// Rows enriched before priceBasis existed carry a price but no provenance, and
// land in 'exact' on purpose — historical recipes shouldn't all sprout estimate
// markers on the strength of a missing field.
type PriceKind = 'exact' | 'estimate' | 'free' | 'none'
type PriceDisplay = { text: string; kind: PriceKind; title: string }

const priceDisplay = (ingredient?: IngredientsType): PriceDisplay => {
  const data =
    ingredient && 'ingredientData' in ingredient ? ingredient.ingredientData : null
  // Guarded on the type rather than Number(): `Number(null)` is 0, which would
  // render a confident "$0.00" for a row that has no price at all.
  const cents =
    data && typeof data.totalPriceUSACents === 'number'
      ? data.totalPriceUSACents
      : null

  if (cents === null || !Number.isFinite(cents)) {
    return {
      // "needs price", not "add price": there's no way to set one yet, and a
      // label that reads like a button you can't press is worse than a label
      // that just states the problem. Becomes the hook for the author-editable
      // price feature when that lands.
      text: 'needs price',
      kind: 'none',
      title:
        "We couldn't estimate a price for this ingredient, so it isn't counted in the per-serving cost.",
    }
  }

  const text = `$${(cents / 100).toFixed(2)}`
  // Before the confidence check, though a free price is always 'high': the
  // basis is the more specific fact, and reading it first keeps the branch
  // true if the parser ever downgrades a free row's confidence.
  if (data?.priceBasis === 'free') {
    return {
      text,
      kind: 'free',
      title: 'This ingredient is free, so it adds nothing to the cost.',
    }
  }
  if (data?.priceConfidence === 'low') {
    return {
      text,
      kind: 'estimate',
      title:
        data.priceBasis === 'unit-estimate'
          ? 'Estimated from a per-item price rather than a measured amount.'
          : 'Estimated using an average density for this ingredient, so it can be off by roughly 20%.',
    }
  }
  return { text, kind: 'exact', title: '' }
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
  // Guards handleEditSubmit's async path (the getIngredientData enrichment
  // await) against re-entry. Set synchronously at the top of handleEditSubmit
  // — before the first await — and cleared in a finally, so it's already true
  // for the whole pending window. Without it: (a) a genuine blur-away while
  // the row is still awaiting enrichment slips past suppressNextBlurSubmitRef
  // (that flag only guards the submit's own trailing self-blur, not a real
  // user blur) and fires a second, fully duplicate submit against the same
  // stale editedVal; (b) a rapid double-Enter does the same via onEnter. Both
  // mean a duplicate network call, a duplicate 429 toast, and doubled
  // rate-limit consumption. A ref (not state) because it's read/written
  // synchronously inside event handlers and never needs to trigger a render.
  const isSubmittingRef = useRef(false)

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
    // Re-entry guard: a second call (rapid double-Enter, or a genuine
    // blur-away that races the pending enrichment await below) while a
    // submit is already in flight is dropped. Set before any await so it's
    // already true for the entire pending window — see isSubmittingRef above.
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    try {
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
    } finally {
      isSubmittingRef.current = false
    }
  }

  // Wired to FormInput's onBlur. Genuine blur-away (clicking elsewhere while
  // editing) should still submit; the blur() handleEditSubmit triggers on
  // itself should not resubmit — see suppressNextBlurSubmitRef above. A blur
  // that lands while a submit is already pending (isSubmittingRef) is also
  // dropped rather than firing a second submit; the in-flight submit's own
  // post-await tail (setIsEditing(false), etc.) is what exits edit mode, so
  // dropping this blur doesn't leave the row stuck open.
  const handleBlur = () => {
    if (suppressNextBlurSubmitRef.current) {
      suppressNextBlurSubmitRef.current = false
      return
    }
    if (isSubmittingRef.current) return
    handleEditSubmit()
  }

  if (!ingredient) return null

  const isParsed = 'parsedIngredient' in ingredient
  const price = priceDisplay(ingredient)

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
        <span
          className={`ingr-price ${loading ? 'na' : price.kind}`}
          title={loading ? undefined : price.title || undefined}
        >
          {loading ? '' : price.text}
          {/* Same reasoning as the estimate badge below: `title` alone is read
              inconsistently, so a screen-reader user would hear "$0.00" and
              nothing explaining it. No badge here, only the sentence. */}
          {!loading && price.kind === 'free' && (
            <span className='sr-only'>{price.title}</span>
          )}
          {!loading && price.kind === 'estimate' && (
            <>
              {/* The badge is decoration for this purpose: `aria-label` on a
                  span with no role isn't honored, so it announced as the bare
                  string "est" (or nothing) and the explanation in `title` is
                  read inconsistently too. Hide the glyph, carry the real
                  sentence in .sr-only — the same sentence sighted users get
                  from the tooltip. */}
              <span className='est' aria-hidden='true'>
                est
              </span>
              <span className='sr-only'>{price.title}</span>
            </>
          )}
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
