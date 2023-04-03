import React, { useEffect, useRef, useState } from 'react'
import {
  AddRecipeErrorType,
  IngredientsType,
  InstructionsType,
  RecipeFormType,
} from 'types'
import { TailSpin } from 'react-loader-spinner'
import LoadingBar from 'react-top-loading-bar'
import RecipeFormInput from './RecipeFormInput'
import ImagePicker from './ImagePicker/ImagePicker'
import './AddRecipe.scss'
import RecipeFormTextArea from './RecipeFormTextArea'
import ServingsInput from './ServingsInput/ServingsInput'
import TimeInput from './TimeInput/TimeInput'
import IngredientsContainer from './Ingredients/IngredientsContainer/IngredientsContainer'
import InstructionsContainer from './Instructions/InstructionsContainer'
import CuisineSelector from './CuisineSelector/CuisineSelector'
import MealTypeSelector from './MealTypeSelector/MealTypeSelector'
import { hrMinToMin } from 'src/util/hrMinToMin'
import RecipeAPI from 'src/api/recipes'
import styles from '../../_exports.scss'
import AddRecipeFormError from './AddRecipeFormError'
import { Helmet } from 'react-helmet-async'

const AddRecipe = () => {
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

  const validate = (assignErrors: boolean = false) => {
    let newErrors: Partial<AddRecipeErrorType> = {}

    if (!title) {
      newErrors.title = 'Title is required'
    } else if (title.length > 50) {
      newErrors.title = 'Title cannot exceed 50 characters'
    }

    if (!recipeImage) newErrors.image = 'Image is required'
    if (!description) newErrors.description = 'Description is required'
    if (!servings) newErrors.servings = 'Servings amount is required'
    if (!prepTime) newErrors.prepTime = 'Prep time is required'
    if (ingredients.length <= 0)
      newErrors.ingredients = 'Recipe must contain ingredients'
    if (instructions.length <= 0)
      newErrors.instructions = 'Instructions are required'
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
    if (validate()) setIsFormValid(true)
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
  ])
  const handleAddRecipe = async () => {
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
      try {
        await RecipeAPI.addRecipe(recipeData, setLoadingProgress)
        clearForm()
      } catch (error) {
        console.log('ERROR:', error)
      } finally {
        setAddRecipeLoading(false)
        setLoadingProgress(100)
      }
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
          href='https://www.prepify.netlify.app/add-recipe'
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
              {errors.title && <AddRecipeFormError error={errors.title} />}
              <RecipeFormInput
                placeholder='Add a title to your recipe.'
                val={title}
                setVal={setTitle}
                characterLimit={60}
              />
            </div>
            <div className='image-picker input-field'>
              <h2 className='recipe-form-input-label'>Select Image</h2>
              {errors.image && <AddRecipeFormError error={errors.image} />}
              <ImagePicker image={recipeImage} setImage={setRecipeImage} />
            </div>
            <div className='description input-field'>
              <h2 className='recipe-form-input-label'>Description</h2>
              {errors.description && (
                <AddRecipeFormError error={errors.description} />
              )}
              <RecipeFormTextArea
                placeholder='Add a description to your recipe'
                val={description}
                setVal={setDescription}
              />
            </div>
            <div className='servings input-field'>
              <h2 className='recipe-form-input-label'>Servings</h2>
              {errors.servings && (
                <AddRecipeFormError error={errors.servings} />
              )}
              <ServingsInput servings={servings} setServings={setServings} />
            </div>
            <div className='prep-time input-field'>
              <h2 className='recipe-form-input-label'>Prep Time</h2>
              {errors.prepTime && (
                <AddRecipeFormError error={errors.prepTime} />
              )}
              <TimeInput
                label={'How long will your recipe take to prepare?'}
                val={prepTime}
                setVal={setPrepTime}
              />
            </div>
            <div className='cook-time input-field'>
              <h2 className='recipe-form-input-label'>Cook Time</h2>
              {errors.cookTime && (
                <AddRecipeFormError error={errors.cookTime} />
              )}
              <TimeInput
                label={'How long will your recipe take to cook?'}
                val={cookTime}
                setVal={setCookTime}
              />
            </div>
            <div className='ingredients input-field'>
              <h2 className='recipe-form-input-label'>Ingredients</h2>
              {errors.ingredients && (
                <AddRecipeFormError error={errors.ingredients} />
              )}
              <IngredientsContainer
                ingredients={ingredients}
                setIngredients={setIngredients}
              />
            </div>
            <div className='instructions input-field'>
              <h2 className='recipe-form-input-label'>Instructions</h2>
              {errors.instructions && (
                <AddRecipeFormError error={errors.instructions} />
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
                <AddRecipeFormError error={errors.mealType} />
              )}
              <MealTypeSelector
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
              />
            </div>
            <button
              className={`submit-btn ${isFormValid ? 'valid' : 'invalid'}`}
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
