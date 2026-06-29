import React, { FC, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { AiOutlineInfoCircle } from 'react-icons/ai'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
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
import LoadingBar from 'react-top-loading-bar'
import FormInput from 'src/Components/Form/FormInput'
import ImagePicker from 'src/pages/AddRecipe/ImagePicker/ImagePicker'
import './AddRecipe.scss'
import RecipeFormTextArea from 'src/pages/AddRecipe/RecipeFormTextArea'
import ServingsInput from 'src/pages/AddRecipe/ServingsInput/ServingsInput'
import TimeInput from 'src/pages/AddRecipe/TimeInput/TimeInput'
import IngredientsContainer from 'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer'
import InstructionsContainer from 'src/pages/AddRecipe/Instructions/InstructionsContainer'
import CuisineSelector from 'src/pages/AddRecipe/CuisineSelector/CuisineSelector'
import MealTypeSelector from 'src/pages/AddRecipe/MealTypeSelector/MealTypeSelector'
import DietSelector from 'src/pages/AddRecipe/DietSelector/DietSelector'
import { hrMinToMin } from 'src/util/hrMinToMin'
import { minToHrMin } from 'src/util/minToHrMin'
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  INSTRUCTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
} from 'src/util/recipeLimits'
import RecipeAPI from 'src/api/recipes'
import styles from 'src/_exports.module.scss'
import AddRecipeFormError from 'src/pages/AddRecipe/AddRecipeFormError'
import SectionHeader from 'src/pages/AddRecipe/SectionHeader'
import AddRecipeSummaryBar from 'src/pages/AddRecipe/AddRecipeSummaryBar'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-hot-toast'
import DraftAPI from 'src/api/drafts'
import { useDraftAutosave } from 'src/pages/AddRecipe/useDraftAutosave'
import DraftSaveStatus from 'src/pages/AddRecipe/DraftSaveStatus'
import DraftResumeBanner from 'src/pages/AddRecipe/DraftResumeBanner'

type TimeVal = { hours: number; minutes: number } | null

// Shown when a recipe saves but is held by automated moderation for an admin to
// review before it appears publicly. Longer-lived than a normal toast (and not
// styled as an error — nothing went wrong) so the owner doesn't miss it.
const notifyPendingReview = () =>
  toast(
    'Your recipe was submitted and is pending review. It will appear publicly once approved.',
    { icon: '⏳', duration: 7000 }
  )

// When `initialRecipe` is supplied the form runs in edit mode: every field is
// pre-populated from the existing recipe and submitting updates it (preserving
// ratings/saves) instead of creating a new one.
type AddRecipeProps = { initialRecipe?: RecipeType }

const AddRecipe: FC<AddRecipeProps> = ({ initialRecipe }) => {
  const isEditMode = !!initialRecipe

  const [addRecipeLoading, setAddRecipeLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const addRecipeFormRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(initialRecipe?.title ?? '')
  const [recipeImage, setRecipeImage] = useState<File | undefined>()
  // Edit mode only: the recipe's current image URL, kept when the user doesn't
  // pick a new file. Cleared if they remove the image (forcing a new pick).
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(
    initialRecipe?.recipeImage
  )
  const [description, setDescription] = useState(initialRecipe?.description ?? '')
  const [servings, setServings] = useState<number | ''>(
    initialRecipe?.servings ?? ''
  )
  const [prepTime, setPrepTime] = useState<TimeVal>(
    initialRecipe ? minToHrMin(initialRecipe.prepTime) : null
  )
  const [cookTime, setCookTime] = useState<TimeVal>(
    initialRecipe ? minToHrMin(initialRecipe.cookTime) : null
  )
  const [fridgeLife, setFridgeLife] = useState<number>(
    initialRecipe?.fridgeLife ?? 0
  )
  const [freezerLife, setFreezerLife] = useState<number>(
    initialRecipe?.freezerLife ?? 0
  )
  const [ingredients, setIngredients] = useState<IngredientsType[]>(
    initialRecipe?.ingredients ?? []
  )
  const [instructions, setInstructions] = useState<InstructionsType[]>(
    initialRecipe?.instructions ?? []
  )
  const [cuisine, setCuisine] = useState(initialRecipe?.cuisine ?? '')
  const [mealTypes, setMealTypes] = useState<string[]>(
    initialRecipe?.mealTypes ?? []
  )
  // Author-selected diet tags (optional). In edit mode this pre-fills from the
  // recipe's existing nutritionLabels — including ones Edamam set on older
  // recipes — so the author can keep or correct them.
  const [nutritionLabels, setNutritionLabels] = useState<string[]>(
    initialRecipe?.nutritionLabels ?? []
  )
  const [errors, setErrors] = useState<Partial<AddRecipeErrorType>>({})

  const [isFormValid, setIsFormValid] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ─── Draft autosave (create flow only) ──────────────────────────────────────
  // Edit mode never touches drafts. In create mode the form is autosaved to a
  // server-side draft so unfinished recipes survive a refresh or navigating
  // away. The image is intentionally not part of a draft — it's re-picked on
  // resume (publish validation still requires one).
  const [searchParams, setSearchParams] = useSearchParams()
  const urlDraftId = isEditMode ? null : searchParams.get('draftId')
  const [draftId, setDraftId] = useState<string | null>(urlDraftId)
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
          setTitle(draft.title ?? '')
          setDescription(draft.description ?? '')
          setServings(draft.servings ?? '')
          setPrepTime(draft.prepTime != null ? minToHrMin(draft.prepTime) : null)
          setCookTime(draft.cookTime != null ? minToHrMin(draft.cookTime) : null)
          setFridgeLife(draft.fridgeLife ?? 0)
          setFreezerLife(draft.freezerLife ?? 0)
          setIngredients(draft.ingredients ?? [])
          setInstructions(draft.instructions ?? [])
          setCuisine(draft.cuisine ?? '')
          setMealTypes(draft.mealTypes ?? [])
          setNutritionLabels(draft.nutritionLabels ?? [])
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

  // A brand-new draft is only created once the recipe has a title. This gates
  // out throwaway drafts from a stray keystroke (keeping the Drafts list and the
  // per-user draft count clean); updating an existing draft is unaffected.
  const canCreateDraft = !!title.trim()

  const { status: draftStatus, clearDraft } = useDraftAutosave({
    content: draftContent,
    enabled: !isEditMode && hydrated,
    canCreate: canCreateDraft,
    draftId,
    onDraftCreated: (draft: RecipeDraftType) => {
      // Mark as owned before the URL sync below points the URL at it, so the
      // hydration effect doesn't reload the draft we just created.
      ownedDraftsRef.current.add(draft._id)
      setDraftId(draft._id)
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
    onLimitReached: (message: string) => toast.error(message),
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
    let newErrors: Partial<AddRecipeErrorType> = {}

    if (!title) {
      newErrors.title = 'Title is required'
    } else if (title.length > TITLE_MAX_LENGTH) {
      newErrors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters`
    }

    // In edit mode a recipe with no newly-picked file is still valid as long as
    // it has its existing stored image.
    if (!recipeImage && !existingImageUrl) newErrors.image = 'Image is required'
    if (!description) {
      newErrors.description = 'Description is required'
    } else if (description.length > DESCRIPTION_MAX_LENGTH) {
      newErrors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`
    }
    if (!servings) newErrors.servings = 'Servings amount is required'
    if (!prepTime) newErrors.prepTime = 'Prep time is required'
    if (ingredients.length <= 0) {
      newErrors.ingredients = 'Recipe must contain ingredients'
    } else if (ingredients.length > MAX_INGREDIENTS) {
      newErrors.ingredients = `A recipe cannot have more than ${MAX_INGREDIENTS} ingredients`
    }
    if (instructions.length <= 0) {
      newErrors.instructions = 'Instructions are required'
    } else if (instructions.length > MAX_INSTRUCTIONS) {
      newErrors.instructions = `A recipe cannot have more than ${MAX_INSTRUCTIONS} instructions`
    }
    if (mealTypes.length <= 0) newErrors.mealType = 'Meal type required'

    assignErrors && setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  useEffect(() => {
    // Once the user has attempted a submit, keep the displayed errors in sync as
    // fields are fixed (assignErrors=true) so a corrected field clears its message
    // immediately instead of lingering until the next submit click. Before the
    // first attempt we only compute validity, never surface errors.
    if (validate(hasAttemptedSubmit)) setIsFormValid(true)
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
  ])
  const handleSubmit = async () => {
    if (addRecipeLoading) return
    setHasAttemptedSubmit(true)
    if (!validate(true)) {
      addRecipeFormRef?.current && addRecipeFormRef.current.scrollTo(0, 0)
      return
    }

    setAddRecipeLoading(true)
    // Shared form-state → payload mapping; the two branches differ only in the
    // image field (optional on edit, required on create) and which API they call.
    const formData = {
      title,
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
        toast.error('Your session has expired — please sign in again and retry.')
      } else if (result.status === 'success') {
        // Write the server's updated recipe straight into the cache rather than
        // invalidating: invalidation would refetch GET /getRecipe (which bumps
        // the public view counter) and briefly flash stale data. The created
        // list still needs a refetch to reorder/relabel.
        queryClient.setQueryData(['recipe', initialRecipe._id], result.recipe)
        queryClient.invalidateQueries({ queryKey: ['created-recipes'] })
        // A medium-confidence moderation hold saves the edit but withholds it from
        // public reads until an admin clears it; tell the owner instead of the
        // usual "updated!" so a silently-hidden recipe isn't a surprise.
        if (result.recipe.status === 'pending_review') {
          notifyPendingReview()
        } else {
          toast.success('Recipe updated!')
        }
        navigate(`/recipes/${initialRecipe._id}`)
      } else {
        toast.error(result.message)
      }
    } else {
      const recipeData: RecipeFormType = { ...formData, recipeImage: recipeImage! }
      const result = await RecipeAPI.addRecipe(recipeData, setLoadingProgress)
      if (result.status === 'auth-error') {
        toast.error('Your session has expired — please sign in again and retry.')
      } else if (result.status === 'success') {
        // Recipe is saved — remove the now-redundant draft (and stop autosave
        // from recreating it on unmount) before navigating away.
        await clearDraft()
        queryClient.invalidateQueries({ queryKey: ['drafts'] })
        if (result.pendingReview) {
          notifyPendingReview()
        } else {
          toast.success('Recipe published!')
        }
        navigate(`/recipes/${result.id}`)
      } else {
        toast.error(result.message)
      }
    }
    setAddRecipeLoading(false)
    setLoadingProgress(100)
  }

  return (
    <>
      <Helmet>
        <title>{isEditMode ? 'Edit Recipe · Prepify' : 'Create a Recipe · Prepify'}</title>
        <link
          rel='canonical'
          href={
            isEditMode && initialRecipe
              ? `https://www.prepifymeals.com/recipes/${initialRecipe._id}`
              : 'https://www.prepifymeals.com/add-recipe'
          }
        />
        <meta
          name='description'
          content='Create your own healthy recipe on Prepify'
        />
      </Helmet>
      <div className='add-recipe-page page'>
        <LoadingBar
          color={styles.primary}
          progress={loadingProgress}
          onLoaderFinished={() => setLoadingProgress(0)}
        />
        <div className='add-recipe-heading'>
          <h1>{isEditMode ? 'Edit Recipe' : 'Create New Recipe'}</h1>
          {!isEditMode && <DraftSaveStatus status={draftStatus} />}
        </div>
        {!isEditMode && !draftId && <DraftResumeBanner />}
        <div className='container'>
          <div className='container-inner' ref={addRecipeFormRef}>
            <div className='title input-field'>
              <SectionHeader label='Title' required />
              {errors.title && (
                <AddRecipeFormError error={errors.title} id='error-title' />
              )}
              <FormInput
                size='compact'
                placeholder='Add a title to your recipe.'
                val={title}
                setVal={setTitle}
                characterLimit={TITLE_MAX_LENGTH}
                invalid={!!errors.title}
                describedBy={errors.title ? 'error-title' : undefined}
              />
            </div>
            <div className='image-picker input-field'>
              <SectionHeader label='Select Image' required />
              {errors.image && (
                <AddRecipeFormError error={errors.image} id='error-image' />
              )}
              {resumedFromDraft && !recipeImage && (
                <p className='draft-image-hint'>
                  <AiOutlineInfoCircle className='icon' />
                  Drafts don't save your image — add it again before publishing.
                </p>
              )}
              <ImagePicker
                image={recipeImage}
                setImage={setRecipeImage}
                initialPreviewUrl={existingImageUrl}
                onRemove={() => setExistingImageUrl(undefined)}
              />
            </div>
            <div className='description input-field'>
              <SectionHeader label='Description' required />
              {errors.description && (
                <AddRecipeFormError
                  error={errors.description}
                  id='error-description'
                />
              )}
              <RecipeFormTextArea
                placeholder='Add a description to your recipe'
                val={description}
                setVal={setDescription}
                characterLimit={DESCRIPTION_MAX_LENGTH}
                invalid={!!errors.description}
                describedBy={errors.description ? 'error-description' : undefined}
              />
            </div>
            <div className='servings input-field'>
              <SectionHeader label='Servings' required />
              {errors.servings && (
                <AddRecipeFormError error={errors.servings} id='error-servings' />
              )}
              <ServingsInput
                servings={servings}
                setServings={setServings}
                invalid={!!errors.servings}
                describedBy={errors.servings ? 'error-servings' : undefined}
              />
            </div>
            <div className='prep-time input-field'>
              <SectionHeader label='Prep Time' required />
              {errors.prepTime && (
                <AddRecipeFormError error={errors.prepTime} id='error-prepTime' />
              )}
              <TimeInput
                label={'How long will your recipe take to prepare?'}
                val={prepTime}
                setVal={setPrepTime}
              />
            </div>
            <div className='cook-time input-field'>
              <SectionHeader label='Cook Time' />
              <TimeInput
                label={'How long will your recipe take to cook?'}
                val={cookTime}
                setVal={setCookTime}
              />
            </div>
            <div className='ingredients input-field'>
              <SectionHeader label='Ingredients' required />
              {errors.ingredients && (
                <AddRecipeFormError
                  error={errors.ingredients}
                  id='error-ingredients'
                />
              )}
              <IngredientsContainer
                ingredients={ingredients}
                setIngredients={setIngredients}
              />
            </div>
            <div className='instructions input-field'>
              <SectionHeader label='Instructions' required />
              {errors.instructions && (
                <AddRecipeFormError
                  error={errors.instructions}
                  id='error-instructions'
                />
              )}
              <InstructionsContainer
                instructions={instructions}
                setInstructions={setInstructions}
              />
            </div>
            <div className='cuisine input-field'>
              <SectionHeader label='Cuisine' />
              <CuisineSelector cuisine={cuisine} setCuisine={setCuisine} />
            </div>
            <div className='course input-field'>
              <SectionHeader label='Course' required />
              {errors.mealType && (
                <AddRecipeFormError error={errors.mealType} id='error-mealType' />
              )}
              <MealTypeSelector
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
              />
            </div>
            <div className='diet input-field'>
              <SectionHeader label='Diet' />
              <DietSelector
                nutritionLabels={nutritionLabels}
                setNutritionLabels={setNutritionLabels}
              />
            </div>
          </div>
        </div>
        <AddRecipeSummaryBar
          servings={servings}
          prepTime={prepTime}
          cookTime={cookTime}
          ingredients={ingredients}
          isValid={isFormValid}
          loading={addRecipeLoading}
          onSubmit={handleSubmit}
          submitLabel={isEditMode ? 'Save Changes' : 'Create Recipe'}
          onCancel={
            isEditMode && initialRecipe
              ? () => navigate(`/recipes/${initialRecipe._id}`)
              : undefined
          }
        />
      </div>
    </>
  )
}

export default AddRecipe
