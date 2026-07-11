import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  AddRecipeErrorType,
  IngredientsType,
  InstructionsType,
  RecipeDraftContent,
  RecipeDraftType,
  RecipeEditFormType,
  RecipeFormType,
  RecipeType,
} from 'types'
import { hrMinToMin } from 'src/util/hrMinToMin'
import { minToHrMin } from 'src/util/minToHrMin'
import RecipeAPI from 'src/api/recipes'
import DraftAPI from 'src/api/drafts'
import { useAuth } from 'src/context/AuthContext'
import {
  useDraftAutosave,
  hasDraftableContent,
  DraftStatus,
} from 'src/pages/AddRecipe/useDraftAutosave'
import {
  IngredientStatus,
  missingDataStatuses,
  withIngredientStatus,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'
import {
  validateRecipeForm,
  isRecipeFormValid,
  INGREDIENTS_PENDING_MESSAGE,
  TimeVal,
} from 'src/pages/AddRecipe/recipeFormValidation'

export type { TimeVal }

// Same auth-expiry message on both the update and publish paths below.
const SESSION_EXPIRED =
  'Your session has expired — please sign in again and retry.'

// Shown when a recipe saves but is held by automated moderation for an admin to
// review before it appears publicly. Longer-lived than a normal toast (and not
// styled as an error — nothing went wrong) so the owner doesn't miss it.
const notifyPendingReview = () =>
  toast(
    'Your recipe was submitted and is pending review. It will appear publicly once approved.',
    { icon: '⏳', duration: 7000 }
  )

// ─── Form-field state (useReducer) ──────────────────────────────────────────
// The recipe payload the user is building. Ancillary UI/status state (loading,
// errors, draft bookkeeping) stays as useState below — the reducer owns only the
// fields that make up the recipe/draft body.
export type RecipeFormState = {
  title: string
  recipeImage: File | undefined
  // Edit mode only: the recipe's current image URL, kept when the user doesn't
  // pick a new file. Cleared if they remove the image (forcing a new pick).
  existingImageUrl: string | undefined
  description: string
  // The raw servings field string ('' until typed). ServingsInput stores what was
  // typed; the numeric coercion lives at submit time (`Number(servings)` below)
  // and in the validator — so the type is honestly `string`, not a `number` that
  // a DOM string only pretends to be.
  servings: string
  prepTime: TimeVal
  cookTime: TimeVal
  fridgeLife: number
  freezerLife: number
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  cuisine: string
  mealTypes: string[]
  nutritionLabels: string[]
}

type SetFieldAction = {
  [K in keyof RecipeFormState]: {
    type: 'SET_FIELD'
    key: K
    value: React.SetStateAction<RecipeFormState[K]>
  }
}[keyof RecipeFormState]

type RecipeFormAction =
  | SetFieldAction
  | { type: 'HYDRATE'; values: Partial<RecipeFormState> }

function recipeFormReducer(
  state: RecipeFormState,
  action: RecipeFormAction
): RecipeFormState {
  switch (action.type) {
    case 'SET_FIELD': {
      const key = action.key
      const prev = state[key]
      // Support both a direct value and the useState-style updater function, so
      // child setters keep their React.Dispatch<SetStateAction<T>> contract
      // (IngredientsContainer/InstructionsContainer rely on functional updates).
      const next =
        typeof action.value === 'function'
          ? (
              action.value as (
                p: RecipeFormState[typeof key]
              ) => RecipeFormState[typeof key]
            )(prev)
          : action.value
      return { ...state, [key]: next }
    }
    case 'HYDRATE':
      return { ...state, ...action.values }
    default:
      return state
  }
}

function initFormState(initialRecipe?: RecipeType): RecipeFormState {
  return {
    title: initialRecipe?.title ?? '',
    recipeImage: undefined,
    existingImageUrl: initialRecipe?.recipeImage,
    description: initialRecipe?.description ?? '',
    servings: String(initialRecipe?.servings ?? ''),
    prepTime: initialRecipe ? minToHrMin(initialRecipe.prepTime) : null,
    cookTime: initialRecipe ? minToHrMin(initialRecipe.cookTime) : null,
    fridgeLife: initialRecipe?.fridgeLife ?? 0,
    freezerLife: initialRecipe?.freezerLife ?? 0,
    ingredients: initialRecipe?.ingredients ?? [],
    instructions: initialRecipe?.instructions ?? [],
    cuisine: initialRecipe?.cuisine ?? '',
    mealTypes: initialRecipe?.mealTypes ?? [],
    // Author-selected diet tags (optional). In edit mode this pre-fills from the
    // recipe's existing nutritionLabels — including ones Edamam set on older
    // recipes — so the author can keep or correct them.
    nutritionLabels: initialRecipe?.nutritionLabels ?? [],
  }
}

// When `initialRecipe` is supplied the form runs in edit mode: every field is
// pre-populated from the existing recipe and submitting updates it (preserving
// ratings/saves) instead of creating a new one.
export function useRecipeForm(initialRecipe?: RecipeType) {
  const isEditMode = !!initialRecipe

  const [state, dispatch] = useReducer(
    recipeFormReducer,
    initialRecipe,
    initFormState
  )
  const {
    title,
    recipeImage,
    existingImageUrl,
    description,
    servings,
    prepTime,
    cookTime,
    fridgeLife,
    freezerLife,
    ingredients,
    instructions,
    cuisine,
    mealTypes,
    nutritionLabels,
  } = state

  // Stable per-field setters that preserve the useState dispatch contract, so
  // child components (and their React.memo boundaries) see an unchanging setter
  // reference. `dispatch` is stable, so these are built once.
  const setters = useMemo(() => {
    const make =
      <K extends keyof RecipeFormState>(
        key: K
      ): React.Dispatch<React.SetStateAction<RecipeFormState[K]>> =>
      value =>
        dispatch({ type: 'SET_FIELD', key, value } as RecipeFormAction)
    return {
      setTitle: make('title'),
      setRecipeImage: make('recipeImage'),
      setExistingImageUrl: make('existingImageUrl'),
      setDescription: make('description'),
      setServings: make('servings'),
      setPrepTime: make('prepTime'),
      setCookTime: make('cookTime'),
      setFridgeLife: make('fridgeLife'),
      setFreezerLife: make('freezerLife'),
      setIngredients: make('ingredients'),
      setInstructions: make('instructions'),
      setCuisine: make('cuisine'),
      setMealTypes: make('mealTypes'),
      setNutritionLabels: make('nutritionLabels'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [addRecipeLoading, setAddRecipeLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const addRecipeFormRef = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<Partial<AddRecipeErrorType>>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // Per-row ingredient enrichment status, lifted here (rather than living in
  // IngredientsContainer) so submission can be gated while any row's
  // nutrition/price lookup is still in flight — a submit inside that window
  // would persist the ingredient as ingredientData:null forever and understate
  // the stored serving price. Edit mode seeds rows already stored without data
  // (persisted before this gate existed) as errored, so they surface the retry
  // affordance instead of rendering settled.
  const [ingredientStatusById, setIngredientStatusById] = useState<
    Record<string, IngredientStatus>
  >(() => missingDataStatuses(state.ingredients))
  const setIngredientStatus = useCallback(
    (id: string, status: IngredientStatus | null) =>
      setIngredientStatusById(prev => withIngredientStatus(prev, id, status)),
    []
  )
  // Only rows still in the list count — a stale map entry for a removed row
  // must not wedge the form.
  const enrichmentPending = ingredients.some(
    ingr => ingredientStatusById[ingr.id] === 'loading'
  )

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Drafts are per-user; a signed-out visitor can still open /add-recipe (it's
  // not auth-guarded), so autosave must know when there's nobody to save for —
  // it then shows calm "sign in to save" copy instead of erroring.
  const isSignedIn = !!useAuth()?.user

  // ─── Draft autosave (create flow only) ────────────────────────────────────
  // Edit mode never touches drafts. In create mode the form is autosaved to a
  // server-side draft so unfinished recipes survive a refresh or navigating
  // away. The image is intentionally not part of a draft — it's re-picked on
  // resume (publish validation still requires one).
  const [searchParams, setSearchParams] = useSearchParams()
  const urlDraftId = isEditMode ? null : searchParams.get('draftId')
  const [draftId, setDraftId] = useState<string | null>(urlDraftId)
  // The `updatedAt` of the draft version currently on screen — set alongside
  // `draftId` (on resume-load below, and from the create response) so
  // useDraftAutosave has a base version to condition its first update on. See
  // useDraftAutosave's own tracking of subsequent saves.
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null)
  // "Hydrated" gates autosave: true for a fresh create, briefly false while a
  // resumed draft loads into the fields.
  const [hydrated, setHydrated] = useState(!urlDraftId)
  // Draft ids whose content is already on screen — either just loaded here, or
  // just created by autosave. The hydration effect skips these so our own URL
  // updates (and a resume of the draft we're already editing) don't trigger a
  // redundant reload.
  const ownedDraftsRef = useRef<Set<string>>(new Set())
  // True once a draft was resumed (loaded from the server) this session, used to
  // remind the user to re-add the image — drafts don't persist it. Not set for
  // drafts created in the current session (the user never had an image to lose).
  const [resumedFromDraft, setResumedFromDraft] = useState(false)

  // Load the draft named in the URL whenever it points at one we haven't loaded
  // yet. Runs on mount for `?draftId=…`, and again when the resume banner
  // navigates to a draft while this page is already mounted — same route, so no
  // remount happens on its own and a mount-only effect would never re-fire.
  useEffect(() => {
    if (isEditMode || !urlDraftId || ownedDraftsRef.current.has(urlDraftId)) return
    let cancelled = false
    setHydrated(false)
    DraftAPI.getDraft(urlDraftId)
      .then(draft => {
        if (cancelled) return
        ownedDraftsRef.current.add(urlDraftId)
        if (draft) {
          setDraftId(urlDraftId)
          setDraftUpdatedAt(draft.updatedAt)
          dispatch({
            type: 'HYDRATE',
            values: {
              title: draft.title ?? '',
              description: draft.description ?? '',
              servings: String(draft.servings ?? ''),
              prepTime: draft.prepTime != null ? minToHrMin(draft.prepTime) : null,
              cookTime: draft.cookTime != null ? minToHrMin(draft.cookTime) : null,
              fridgeLife: draft.fridgeLife ?? 0,
              freezerLife: draft.freezerLife ?? 0,
              ingredients: draft.ingredients ?? [],
              instructions: draft.instructions ?? [],
              cuisine: draft.cuisine ?? '',
              mealTypes: draft.mealTypes ?? [],
              nutritionLabels: draft.nutritionLabels ?? [],
            },
          })
          // A draft autosaved while a row's lookup was still in flight persists
          // that row as ingredientData:null. Nothing re-enriches on resume, so
          // without a status the row would render settled and the submit gate
          // would never see it — mark such rows errored (retryable) instead.
          setIngredientStatusById(prev => ({
            ...missingDataStatuses(draft.ingredients ?? []),
            ...prev,
          }))
          setResumedFromDraft(true)
        }
        setHydrated(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        if (status === 404 || status === 403) {
          // The draft is genuinely gone or not the caller's. Drop only the
          // draftId param (preserving any other query params) and let the user
          // start a fresh draft.
          toast.error("Couldn't load that draft — starting a new one.")
          setDraftId(null)
          const next = new URLSearchParams(searchParams)
          next.delete('draftId')
          setSearchParams(next, { replace: true })
          setHydrated(true)
        } else {
          // Transient failure (network/5xx) on a draft that likely still
          // exists. Leave autosave disabled (hydrated stays false) so we don't
          // create a duplicate or overwrite the unloaded draft with a partial
          // form; ask the user to retry.
          toast.error('Could not load your draft. Refresh to try again.')
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDraftId])

  // Serializable draft content mirrored from form state. Times are stored as
  // minutes (matching the recipe shape); empty values are omitted.
  const draftContent: RecipeDraftContent = useMemo(
    () => ({
      title,
      description,
      // Send explicit null (not undefined) when empty so clearing a field is
      // persisted rather than silently dropped from the payload — see
      // RecipeDraftContent.
      servings: servings === '' ? null : Number(servings),
      prepTime: prepTime ? hrMinToMin(prepTime) : null,
      cookTime: cookTime ? hrMinToMin(cookTime) : null,
      fridgeLife,
      freezerLife,
      ingredients,
      instructions,
      cuisine,
      mealTypes,
      nutritionLabels,
    }),
    [
      title,
      description,
      servings,
      prepTime,
      cookTime,
      fridgeLife,
      freezerLife,
      ingredients,
      instructions,
      cuisine,
      mealTypes,
      nutritionLabels,
    ]
  )

  // A brand-new draft is created once the form holds any real content, not just
  // a title (see hasDraftableContent). An all-default form still never creates
  // one, keeping the Drafts list and the per-user draft count clean; updating
  // an existing draft is unaffected.
  const canCreateDraft = hasDraftableContent(draftContent)

  const { status: draftStatus, clearDraft } = useDraftAutosave({
    content: draftContent,
    enabled: !isEditMode && hydrated,
    isSignedIn,
    canCreate: canCreateDraft,
    draftId,
    draftUpdatedAt,
    onDraftCreated: (draft: RecipeDraftType) => {
      // Mark as owned before the URL sync below points the URL at it, so the
      // hydration effect doesn't reload the draft we just created.
      ownedDraftsRef.current.add(draft._id)
      setDraftId(draft._id)
      setDraftUpdatedAt(draft.updatedAt)
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
    onLimitReached: (message: string) => toast.error(message),
    onConflict: (message: string) => toast.error(message),
    onDeletedElsewhere: (message: string) => {
      // The draft we were autosaving into was deleted elsewhere (another tab's
      // Drafts list, or the per-user cap trim evicting the oldest). Drop the dead
      // id + URL param — mirroring the hydration-404 recovery above — so the next
      // edit re-creates a fresh draft instead of retrying a doomed PUT. Current
      // work isn't lost: it re-creates on the next change.
      setDraftId(null)
      setDraftUpdatedAt(null)
      const next = new URLSearchParams(searchParams)
      next.delete('draftId')
      setSearchParams(next, { replace: true })
      toast.error(message)
    },
  })

  // Reflect the active draft id in the URL (replace) so a refresh resumes the
  // same draft rather than starting a second one.
  useEffect(() => {
    if (isEditMode || !draftId) return
    if (searchParams.get('draftId') === draftId) return
    const next = new URLSearchParams(searchParams)
    next.set('draftId', draftId)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const validate = (assignErrors: boolean = false) => {
    const newErrors = validateRecipeForm({
      title,
      recipeImage,
      existingImageUrl,
      description,
      servings,
      prepTime,
      ingredients,
      instructions,
      mealTypes,
      ingredientsPending: enrichmentPending,
    })
    assignErrors && setErrors(newErrors)
    return newErrors
  }
  useEffect(() => {
    // Once the user has attempted a submit, keep the displayed errors in sync as
    // fields are fixed (assignErrors=true) so a corrected field clears its message
    // immediately instead of lingering until the next submit click. Before the
    // first attempt we only compute validity, never surface errors.
    if (isRecipeFormValid(validate(hasAttemptedSubmit))) setIsFormValid(true)
    else setIsFormValid(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    recipeImage,
    existingImageUrl,
    description,
    servings,
    prepTime,
    ingredients,
    instructions,
    mealTypes,
    hasAttemptedSubmit,
    enrichmentPending,
  ])

  const handleSubmit = async () => {
    if (addRecipeLoading) return
    setHasAttemptedSubmit(true)
    const submitErrors = validate(true)
    if (!isRecipeFormValid(submitErrors)) {
      // When in-flight enrichment is the ONLY blocker, waiting genuinely
      // resolves it (bounded by the enrichment timeout) — say so instead of
      // leaving the user hunting for a field to fix. With other errors present
      // the toast would misdirect ("just wait" won't unblock), so those get
      // the standard field-error treatment alone.
      const onlyPendingBlocks =
        Object.keys(submitErrors).length === 1 &&
        submitErrors.ingredients === INGREDIENTS_PENDING_MESSAGE
      if (onlyPendingBlocks) {
        toast(INGREDIENTS_PENDING_MESSAGE, { icon: '⏳' })
      }
      addRecipeFormRef?.current && addRecipeFormRef.current.scrollTo(0, 0)
      return
    }

    setAddRecipeLoading(true)
    // Shared form-state → payload mapping; the two branches differ only in the
    // image field (optional on edit, required on create) and which API they call.
    const formData = {
      // Persist the trimmed title so surrounding whitespace can't render a
      // blank/mis-aligned <h1> (validation already rejects an all-blank title).
      title: title.trim(),
      prepTime: hrMinToMin(prepTime),
      cookTime: hrMinToMin(cookTime),
      servings: Number(servings),
      fridgeLife,
      freezerLife,
      description,
      ingredients,
      instructions,
      cuisine,
      mealTypes,
      nutritionLabels,
    }
    if (isEditMode && initialRecipe) {
      const editData: RecipeEditFormType = { ...formData, recipeImage }
      const result = await RecipeAPI.editRecipe(
        initialRecipe._id,
        editData,
        initialRecipe,
        setLoadingProgress
      )
      if (result.status === 'auth-error') {
        toast.error(SESSION_EXPIRED)
      } else if (result.status === 'success') {
        // Write the server's updated recipe straight into the cache rather than
        // invalidating: invalidation would refetch GET /getRecipe (which bumps
        // the public view counter) and briefly flash stale data. The created
        // list still needs a refetch to reorder/relabel.
        queryClient.setQueryData(['recipe', initialRecipe._id], result.recipe)
        queryClient.invalidateQueries({ queryKey: ['created-recipes'] })
        // A medium-confidence moderation hold saves the edit but withholds it from
        // public reads until an admin clears it; tell the owner instead of the
        // usual "updated" so a silently-hidden recipe isn't a surprise.
        if (result.recipe.status === 'pending_review') {
          notifyPendingReview()
        } else {
          toast.success('Recipe updated.')
        }
        navigate(`/recipes/${initialRecipe._id}`)
      } else {
        toast.error(result.message)
      }
    } else {
      const recipeData: RecipeFormType = { ...formData, recipeImage: recipeImage! }
      const result = await RecipeAPI.addRecipe(recipeData, setLoadingProgress)
      if (result.status === 'auth-error') {
        toast.error(SESSION_EXPIRED)
      } else if (result.status === 'success') {
        // Recipe is saved — remove the now-redundant draft (and stop autosave
        // from recreating it on unmount) before navigating away. Only when the
        // form is hydrated: if a resumed draft failed to load (transient error),
        // draftId still points at that draft but its real content was never on
        // screen, so clearing it would silently delete an untouched draft that is
        // unrelated to what we just published.
        if (hydrated) await clearDraft()
        queryClient.invalidateQueries({ queryKey: ['drafts'] })
        if (result.pendingReview) {
          notifyPendingReview()
        } else {
          toast.success('Recipe published.')
        }
        navigate(`/recipes/${result.id}`)
      } else {
        toast.error(result.message)
      }
    }
    setAddRecipeLoading(false)
    setLoadingProgress(100)
  }

  return {
    isEditMode,
    // field values
    title,
    recipeImage,
    existingImageUrl,
    description,
    servings,
    prepTime,
    cookTime,
    fridgeLife,
    freezerLife,
    ingredients,
    instructions,
    cuisine,
    mealTypes,
    nutritionLabels,
    // setters
    ...setters,
    // status / derived
    errors,
    isFormValid,
    ingredientStatusById,
    setIngredientStatus,
    addRecipeLoading,
    loadingProgress,
    setLoadingProgress,
    draftStatus,
    draftId,
    resumedFromDraft,
    addRecipeFormRef,
    // handlers
    handleSubmit,
  }
}

export type { DraftStatus }
