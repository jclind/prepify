import React, { useEffect, useState } from 'react'
import { AddRecipeErrorType, IngredientsType, InstructionsType } from 'types'
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

const AddRecipe = () => {
  const [addRecipeLoading, setAddRecipeLoading] = useState(false)
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

  const validate = () => {
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
    if (mealTypes.length <= 0) newErrors.course = 'Course required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  useEffect(() => {
    if (validate()) setIsFormValid(true)
    else setIsFormValid(false)
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

  return (
    <div className='add-recipe-page page'>
      <div className='container'>
        <div className='container-inner'>
          <div className='title input-field'>
            <h2 className='recipe-form-input-label'>Title</h2>
            <RecipeFormInput
              placeholder='Add a title to your recipe.'
              val={title}
              setVal={setTitle}
              characterLimit={60}
            />
          </div>
          <div className='image-picker input-field'>
            <h2 className='recipe-form-input-label'>Select Image</h2>
            <ImagePicker image={recipeImage} setImage={setRecipeImage} />
          </div>
          <div className='description input-field'>
            <h2 className='recipe-form-input-label'>Description</h2>
            <RecipeFormTextArea
              placeholder='Add a description to your recipe'
              val={description}
              setVal={setDescription}
            />
          </div>
          <div className='servings input-field'>
            <h2 className='recipe-form-input-label'>Servings</h2>
            <ServingsInput servings={servings} setServings={setServings} />
          </div>
          <div className='prep-time input-field'>
            <h2 className='recipe-form-input-label'>Prep Time</h2>
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
            <IngredientsContainer
              ingredients={ingredients}
              setIngredients={setIngredients}
            />
          </div>
          <div className='instructions input-field'>
            <h2 className='recipe-form-input-label'>Instructions</h2>
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
            <MealTypeSelector
              mealTypes={mealTypes}
              setMealTypes={setMealTypes}
            />
          </div>
          <button className={`submit-btn ${isFormValid ? 'valid' : 'invalid'}`}>
            Create Recipe
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddRecipe
