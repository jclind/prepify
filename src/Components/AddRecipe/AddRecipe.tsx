import React, { useState } from 'react'
import { AddRecipeErrorType, IngredientsType, InstructionsType } from 'types'
import RecipeFormInput from './RecipeFormInput'
import ImagePicker from './ImagePicker/ImagePicker'
import './AddRecipe.scss'
import RecipeFormTextArea from './RecipeFormTextArea'
import ServingsInput from './ServingsInput/ServingsInput'
import TimeInput from './TimeInput/TimeInput'
import IngredientsContainer from './Ingredients/IngredientsContainer/IngredientsContainer'

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
        </div>
      </div>
    </div>
  )
}

export default AddRecipe
