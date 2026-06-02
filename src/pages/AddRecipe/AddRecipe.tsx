import React, { FC, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AddRecipeErrorType,
  IngredientsType,
  InstructionsType,
  RecipeEditFormType,
  RecipeFormType,
  RecipeType,
} from 'types'
import LoadingBar from 'react-top-loading-bar'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'
import ImagePicker from 'src/pages/AddRecipe/ImagePicker/ImagePicker'
import './AddRecipe.scss'
import RecipeFormTextArea from 'src/pages/AddRecipe/RecipeFormTextArea'
import ServingsInput from 'src/pages/AddRecipe/ServingsInput/ServingsInput'
import TimeInput from 'src/pages/AddRecipe/TimeInput/TimeInput'
import IngredientsContainer from 'src/pages/AddRecipe/Ingredients/IngredientsContainer/IngredientsContainer'
import InstructionsContainer from 'src/pages/AddRecipe/Instructions/InstructionsContainer'
import CuisineSelector from 'src/pages/AddRecipe/CuisineSelector/CuisineSelector'
import MealTypeSelector from 'src/pages/AddRecipe/MealTypeSelector/MealTypeSelector'
import { hrMinToMin } from 'src/util/hrMinToMin'
import { minToHrMin } from 'src/util/minToHrMin'
import {
  TITLE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  INSTRUCTION_MAX_LENGTH,
  MAX_INGREDIENTS,
  MAX_INSTRUCTIONS,
} from 'src/util/recipeLimits'
import RecipeAPI, { ADD_RECIPE_AUTH_ERROR } from 'src/api/recipes'
import styles from 'src/_exports.module.scss'
import AddRecipeFormError from 'src/pages/AddRecipe/AddRecipeFormError'
import SectionHeader from 'src/pages/AddRecipe/SectionHeader'
import AddRecipeSummaryBar from 'src/pages/AddRecipe/AddRecipeSummaryBar'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-hot-toast'

type TimeVal = { hours: number; minutes: number } | null

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
  const [errors, setErrors] = useState<Partial<AddRecipeErrorType>>({})

  const [isFormValid, setIsFormValid] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
        toast.success('Recipe updated!')
        navigate(`/recipes/${initialRecipe._id}`)
      } else {
        toast.error(result.message)
      }
    } else {
      const recipeData: RecipeFormType = { ...formData, recipeImage: recipeImage! }
      const newId = await RecipeAPI.addRecipe(recipeData, setLoadingProgress)
      if (newId === ADD_RECIPE_AUTH_ERROR) {
        toast.error('Your session has expired — please sign in again and retry.')
      } else if (newId) {
        toast.success('Recipe published!')
        navigate(`/recipes/${newId}`)
      } else {
        toast.error('Failed to create recipe. Please try again.')
      }
    }
    setAddRecipeLoading(false)
    setLoadingProgress(100)
  }

  return (
    <>
      <Helmet>
        <title>{isEditMode ? 'Edit Recipe' : 'Create New Recipe'}</title>
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
        <h1>{isEditMode ? 'Edit Recipe' : 'Create New Recipe'}</h1>
        <div className='container'>
          <div className='container-inner' ref={addRecipeFormRef}>
            <div className='title input-field'>
              <SectionHeader label='Title' required />
              {errors.title && (
                <AddRecipeFormError error={errors.title} id='error-title' />
              )}
              <RecipeFormInput
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
