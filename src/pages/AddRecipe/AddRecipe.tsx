import React, { FC, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AddRecipeErrorType,
  IngredientsType,
  InstructionsType,
  RecipeFormType,
} from 'types'
import { TailSpin } from 'react-loader-spinner'
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
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-hot-toast'

const AddRecipe: FC = () => {
  const [addRecipeLoading, setAddRecipeLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const addRecipeFormRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('')
  const [recipeImage, setRecipeImage] = useState<File | undefined>()
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState<number | ''>('')
  const [prepTime, setPrepTime] = useState<{
    hours: number
    minutes: number
  } | null>(null)
  const [cookTime, setCookTime] = useState<{
    hours: number
    minutes: number
  } | null>(null)
  const [fridgeLife, setFridgeLife] = useState<number>(0)
  const [freezerLife, setFreezerLife] = useState<number>(0)
  const [ingredients, setIngredients] = useState<IngredientsType[]>([])
  const [instructions, setInstructions] = useState<InstructionsType[]>([])
  const [cuisine, setCuisine] = useState('')
  const [mealTypes, setMealTypes] = useState<string[]>([])
  const [errors, setErrors] = useState<Partial<AddRecipeErrorType>>({})

  const [isFormValid, setIsFormValid] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const navigate = useNavigate()

  const validate = (assignErrors: boolean = false) => {
    let newErrors: Partial<AddRecipeErrorType> = {}

    if (!title) {
      newErrors.title = 'Title is required'
    } else if (title.length > TITLE_MAX_LENGTH) {
      newErrors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters`
    }

    if (!recipeImage) newErrors.image = 'Image is required'
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
  const clearForm = () => {
    setTitle('')
    setRecipeImage(undefined)
    setDescription('')
    setServings('')
    setPrepTime(null)
    setCookTime(null)
    setFridgeLife(0)
    setFreezerLife(0)
    setIngredients([])
    setInstructions([])
    setCuisine('')
    setMealTypes([])
    setErrors({})
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
    description,
    servings,
    prepTime,
    ingredients,
    instructions,
    mealTypes,
    hasAttemptedSubmit,
  ])
  const handleAddRecipe = async () => {
    if (addRecipeLoading) return
    setHasAttemptedSubmit(true)
    if (validate(true)) {
      setAddRecipeLoading(true)
      const recipeData: RecipeFormType = {
        title,
        prepTime: hrMinToMin(prepTime),
        cookTime: hrMinToMin(cookTime),
        servings: Number(servings),
        fridgeLife,
        freezerLife,
        description,
        ingredients,
        instructions,
        recipeImage: recipeImage!,
        cuisine,
        mealTypes,
      }
      const newId = await RecipeAPI.addRecipe(recipeData, setLoadingProgress)
      if (newId === ADD_RECIPE_AUTH_ERROR) {
        toast.error('Your session has expired — please sign in again and retry.')
      } else if (newId) {
        toast.success('Recipe published!')
        navigate(`/recipes/${newId}`)
      } else {
        toast.error('Failed to create recipe. Please try again.')
      }
      setAddRecipeLoading(false)
      setLoadingProgress(100)
    } else {
      addRecipeFormRef?.current && addRecipeFormRef.current.scrollTo(0, 0)
    }
  }

  return (
    <>
      <Helmet>
        <title>Create New Recipe</title>
        <link
          rel='canonical'
          href='https://www.prepifymeals.com/add-recipe'
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
        <h1>Create New Recipe</h1>
        <div className='container'>
          <div className='container-inner' ref={addRecipeFormRef}>
            <div className='title input-field'>
              <h2 className='recipe-form-input-label'>Title </h2>
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
              <h2 className='recipe-form-input-label'>Select Image</h2>
              {errors.image && (
                <AddRecipeFormError error={errors.image} id='error-image' />
              )}
              <ImagePicker image={recipeImage} setImage={setRecipeImage} />
            </div>
            <div className='description input-field'>
              <h2 className='recipe-form-input-label'>Description</h2>
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
              <h2 className='recipe-form-input-label'>Servings</h2>
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
              <h2 className='recipe-form-input-label'>Prep Time</h2>
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
              <h2 className='recipe-form-input-label'>Cook Time</h2>
              <TimeInput
                label={'How long will your recipe take to cook?'}
                val={cookTime}
                setVal={setCookTime}
              />
            </div>
            <div className='ingredients input-field'>
              <h2 className='recipe-form-input-label'>Ingredients</h2>
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
              <h2 className='recipe-form-input-label'>Instructions</h2>
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
              <h2 className='recipe-form-input-label'>Cuisine</h2>
              <CuisineSelector cuisine={cuisine} setCuisine={setCuisine} />
            </div>
            <div className='course input-field'>
              <h2 className='recipe-form-input-label'>Course</h2>
              {errors.mealType && (
                <AddRecipeFormError error={errors.mealType} id='error-mealType' />
              )}
              <MealTypeSelector
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
              />
            </div>
            <button
              className={`submit-btn ${isFormValid ? 'valid' : 'invalid'}`}
              disabled={addRecipeLoading}
              aria-busy={addRecipeLoading}
              onClick={handleAddRecipe}
            >
              {addRecipeLoading ? (
                <TailSpin
                  height='30'
                  width='30'
                  color='white'
                  ariaLabel='loading'
                />
              ) : (
                'Create Recipe'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AddRecipe
