import React, { FC, useCallback, useRef } from 'react'
import { parseIngredientString } from '@jclind/ingredient-parser'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'react-hot-toast'
import { IngredientsType, LabelType } from 'types'
import RecipeAPI, { INGREDIENT_RATE_LIMIT_CODE } from 'src/api/recipes'
import AddLabel from 'src/pages/AddRecipe/AddLabel/AddLabel'
import IngredientList from 'src/pages/AddRecipe/Ingredients/IngredientList/IngredientList'
import IngredientsInput from 'src/pages/AddRecipe/Ingredients/IngredientsInput'
import {
  IngredientEnrichTimeoutError,
  IngredientStatus,
  withTimeout,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'
import './IngredientsContainer.scss'

type IngredientsContainerProps = {
  ingredients: IngredientsType[]
  setIngredients: React.Dispatch<React.SetStateAction<IngredientsType[]>>
  // Per-row enrichment state, owned by useRecipeForm (see IngredientStatus in
  // ingredientEnrichment.ts) so the form can gate submission while any row's
  // lookup is still in flight.
  statusById: Record<string, IngredientStatus>
  setItemStatus: (id: string, status: IngredientStatus | null) => void
}

const IngredientsContainer: FC<IngredientsContainerProps> = ({
  ingredients,
  setIngredients,
  statusById,
  setItemStatus,
}) => {
  // Current list mirrored into a ref so the async settle paths below can check
  // whether their row still exists without going stale (enrichInPlace's
  // callback identity mustn't churn per keystroke).
  const ingredientsRef = useRef(ingredients)
  ingredientsRef.current = ingredients

  // Enrich a parsed ingredient already in the list (by id) and reconcile it in
  // place. Shared by the optimistic add path and the per-row retry. The id is
  // preserved across reconciliation so the row's React/DnD key — and its
  // position if the user reordered while it loaded — stay stable.
  const enrichInPlace = useCallback(
    async (id: string, rawValue: string, displayName: string) => {
      setItemStatus(id, 'loading')
      // The user may remove the row while its lookup is in flight
      // (removeIngredient settles its status); a late result for a gone row
      // must not resurrect the status entry or toast about it.
      const rowRemoved = () =>
        !ingredientsRef.current.some(ingr => ingr.id === id)
      try {
        const enriched = await withTimeout(RecipeAPI.getIngredientData(rawValue))
        if (rowRemoved()) return
        setIngredients(prev =>
          prev.map(ingr => (ingr.id === id ? { ...enriched, id } : ingr))
        )
        // getIngredientData is soft-fail: it resolves with an `error` variant
        // (parsed-only, no nutrition/price) rather than throwing. Surface that as
        // an errored-but-usable row so the user can retry, edit, or proceed.
        if ('error' in enriched && enriched.error) {
          setItemStatus(id, 'error')
          // A rate-limited lookup is a distinct, expected condition — not a
          // one-off miss — so it gets its own honest toast (an immediate Retry
          // would just re-429; the retry button disables itself until retryAt).
          if (enriched.error.code === INGREDIENT_RATE_LIMIT_CODE) {
            toast.error(
              `"${displayName}" hit the ingredient lookup limit — wait a moment before retrying.`
            )
          }
        } else {
          setItemStatus(id, null)
        }
      } catch (err: unknown) {
        // The only rejection here is our own timeout (getIngredientData itself
        // never rejects). The request is abandoned; keep the parsed-only row so
        // the user doesn't lose their entry, mark it errored, and let them retry.
        if (rowRemoved()) return
        const timedOut = err instanceof IngredientEnrichTimeoutError
        setItemStatus(id, 'error')
        toast.error(
          timedOut
            ? `"${displayName}" is taking too long to look up — added without nutrition data. Retry or edit it.`
            : `Couldn't fetch data for "${displayName}" — added without it. Retry or edit it.`
        )
      }
    },
    [setIngredients, setItemStatus]
  )

  // Optimistic add: parse locally (synchronous) and show the ingredient in the
  // list immediately, then fill in nutrition/price/image when enrichment
  // returns. The slow part is the network enrichment, never the parse.
  const addIngredient = useCallback(
    (rawValue: string) => {
      const trimmed = rawValue.trim()
      if (!trimmed) return

      const id = uuidv4()
      const parsedIngredient = parseIngredientString(trimmed)
      const optimistic: IngredientsType = {
        parsedIngredient,
        ingredientData: null,
        id,
      }
      setIngredients(prev => [...prev, optimistic])
      // Fire-and-forget: the row is already on screen; reconciliation/failure is
      // handled inside enrichInPlace via state, so callers needn't await.
      void enrichInPlace(id, trimmed, parsedIngredient.ingredient || trimmed)
    },
    [enrichInPlace, setIngredients]
  )

  const retryIngredient = useCallback(
    (id: string) => {
      const ingr = ingredients.find(i => i.id === id)
      if (!ingr || !('parsedIngredient' in ingr)) return
      // Still cooling down from a rate-limited lookup: the button that
      // triggers this is disabled in that state too, but guard here as well
      // since a retry could otherwise be wired up some other way.
      if (
        'error' in ingr &&
        ingr.error?.code === INGREDIENT_RATE_LIMIT_CODE &&
        ingr.error.retryAt &&
        ingr.error.retryAt > Date.now()
      ) {
        return
      }
      const raw = ingr.parsedIngredient.originalIngredientString
      void enrichInPlace(id, raw, ingr.parsedIngredient.ingredient || raw)
    },
    [ingredients, enrichInPlace]
  )

  // Labels carry no nutrition data, so they're added directly with no enrichment
  // round-trip. Also used as the reconcile target for AddLabel.
  const addLabelToList = useCallback(
    (data: LabelType) => {
      setIngredients(prev => [...prev, data])
    },
    [setIngredients]
  )

  const removeIngredient = useCallback(
    (removeId: string) => {
      setIngredients(prev => prev.filter(ingr => ingr.id !== removeId))
      setItemStatus(removeId, null)
    },
    [setIngredients, setItemStatus]
  )

  // Sum of the enriched per-ingredient prices (cents). Shown as a subtotal so
  // the cook sees the total grocery cost; the page's summary bar handles the
  // per-serving figure separately.
  const subtotalCents = ingredients.reduce((sum, ingr) => {
    if ('ingredientData' in ingr && ingr.ingredientData) {
      const cents = Number(ingr.ingredientData.totalPriceUSACents)
      if (!isNaN(cents)) return sum + cents
    }
    return sum
  }, 0)

  return (
    <div className='ingredients-container'>
      <IngredientsInput onAdd={addIngredient} />
      <IngredientList
        ingredients={ingredients}
        setIngredients={setIngredients}
        statusById={statusById}
        setItemStatus={setItemStatus}
        removeIngredient={removeIngredient}
        retryIngredient={retryIngredient}
      />
      <div className='ingredients-footer'>
        <AddLabel addToList={addLabelToList} />
        {subtotalCents > 0 && (
          <span className='ingredients-subtotal'>
            Subtotal <b>${(subtotalCents / 100).toFixed(2)}</b>
          </span>
        )}
      </div>
    </div>
  )
}

export default IngredientsContainer
