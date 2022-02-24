import React, { useState, useEffect, useRef } from 'react'
import './AddRecipe.scss'
import RecipeFormInput from './RecipeFormInput'
import RecipeFormTextArea from './RecipeFormTextArea'
import TimeInput from './TimeInput/TimeInput'
import IngredientListContainer from './IngredientsList/IngredientListContainer'
import InstructionsContainer from './InstructionsList/InstructionsContainer'
import RecipeImage from './RecipeImage/RecipeImage'
import ServingsInput from './ServingsInput/ServingsInput'
import { useRecipe } from '../../context/RecipeContext'
import { TailSpin } from 'react-loader-spinner'
import LoadingBar from 'react-top-loading-bar'
import RecipeTags from './RecipeTags/RecipeTags'

const AddRecipe = () => {
  const [recipeTitle, setRecipeTitle] = useState('')
  const [recipePrepTime, setRecipePrepTime] = useState('')
  const [recipeCookTime, setRecipeCookTime] = useState('')
  const [recipeAdditionalTime, setRecipeAdditionalTime] = useState('')
  const [recipeYield, setRecipeYield] = useState({
    type: 'Servings',
    value: '',
  })
  const [recipeFridgeLife, setRecipeFridgeLife] = useState('')
  const [recipeFreezerLife, setRecipeFreezerLife] = useState('')
  const [recipeDescription, setRecipeDescription] = useState('')

  const [recipeIngredients, setRecipeIngredients] = useState([
    { name: 'Ingredients List 1', list: [] },
  ])
  const [recipeInstructions, setRecipeInstructions] = useState([
    { name: 'Instructions List 1', list: [] },
  ])

  const [recipeTags, setRecipeTags] = useState([])

  const [recipeImage, setRecipeImage] = useState('')

  const [undoClearForm, setUndoClearForm] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)

  const { addRecipe } = useRecipe()

  const setStatesToLocalData = () => {
    const addRecipeFormData = JSON.parse(
      localStorage.getItem('addRecipeFormData')
    )
    console.log(addRecipeFormData)

    const title = addRecipeFormData?.recipeTitle
      ? addRecipeFormData.recipeTitle
      : ''
    setRecipeTitle(title)

    const prepTime = addRecipeFormData?.recipePrepTime
      ? addRecipeFormData.recipePrepTime
      : ''
    setRecipePrepTime(prepTime)

    const cookTime = addRecipeFormData?.recipeCookTime
      ? addRecipeFormData.recipeCookTime
      : ''
    setRecipeCookTime(cookTime)

    const additionalTime = addRecipeFormData?.recipeAdditionalTime
      ? addRecipeFormData.recipeAdditionalTime
      : ''
    setRecipeAdditionalTime(additionalTime)

    const servingSize = addRecipeFormData?.recipeYield
      ? addRecipeFormData.recipeYield
      : { type: 'Servings', value: '' }
    setRecipeYield(servingSize)

    const fridgeLife = addRecipeFormData?.recipeFridgeLife
      ? addRecipeFormData.recipeFridgeLife
      : ''
    setRecipeFridgeLife(fridgeLife)

    const freezerLife = addRecipeFormData?.recipeFreezerLife
      ? addRecipeFormData.recipeFreezerLife
      : ''
    setRecipeFreezerLife(freezerLife)

    const description = addRecipeFormData?.recipeDescription
      ? addRecipeFormData.recipeDescription
      : ''
    setRecipeDescription(description)

    const ingredients = addRecipeFormData?.recipeIngredients
      ? addRecipeFormData.recipeIngredients
      : [{ name: 'Ingredient List 1', list: [] }]
    setRecipeIngredients(ingredients)

    const instructions = addRecipeFormData?.recipeInstructions
      ? addRecipeFormData.recipeInstructions
      : [{ name: 'Instructions List 1', list: [] }]
    setRecipeInstructions(instructions)
  }

  useEffect(() => {
    setStatesToLocalData()
  }, [])

  useEffect(() => {
    const saveLocalRecipeData = () => {
      const addRecipeFormData = {
        recipeTitle,
        recipePrepTime,
        recipeCookTime,
        recipeAdditionalTime,
        recipeYield,
        recipeFridgeLife,
        recipeFreezerLife,
        recipeDescription,
        recipeInstructions,
        recipeIngredients,
      }
      localStorage.setItem(
        'addRecipeFormData',
        JSON.stringify(addRecipeFormData)
      )
    }

    window.addEventListener('beforeunload', saveLocalRecipeData)

    return () => {
      window.removeEventListener('beforeunload', saveLocalRecipeData)
    }
  }, [
    recipeTitle,
    recipePrepTime,
    recipeCookTime,
    recipeAdditionalTime,
    recipeYield,
    recipeFridgeLife,
    recipeFreezerLife,
    recipeDescription,
    recipeInstructions,
    recipeIngredients,
  ])

  const handleAddRecipeFormSubmit = e => {
    const returnError = msg => {
      setLoading(false)
      setError(msg)
    }
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!recipeTitle) return returnError('Please Enter Recipe Title')
    if (!recipePrepTime) return returnError('Please Enter Prep time')
    if (!recipeCookTime) return returnError('Please Enter Cook Time')
    if (!recipeYield) return returnError('Please Enter Serving Size')
    if (recipeInstructions.length <= 0)
      return returnError('Please Enter Instructions')
    if (recipeIngredients.length <= 0)
      return returnError('Please Enter Ingredients')
    if (!recipeImage) return returnError('Please Select Image')

    const recipeData = {
      title: recipeTitle,
      prepTime: recipePrepTime,
      cookTime: recipeCookTime,
      additionalTime: recipeAdditionalTime,
      yield: recipeYield,
      fridgeLife: recipeFridgeLife,
      freezerLife: recipeFreezerLife,
      description: recipeDescription,
      instructions: recipeInstructions,
      ingredients: recipeIngredients,
      recipeImage: recipeImage,
      tags: recipeTags,
    }

    addRecipe(
      recipeData,
      setLoading,
      loadingProgress,
      setLoadingProgress,
      setError
    ).then(() => {
      // navigate('/')
      clearForm()
    })
    // .catch(err => {
    //   setLoading(false)
    //   setError(err)
    // })
  }

  const clearForm = () => {
    if (undoClearForm) {
      setUndoClearForm(false)
      return setStatesToLocalData()
    }

    setRecipeTitle('')
    setRecipeYield({
      type: 'Servings',
      value: '',
    })
    setRecipePrepTime('')
    setRecipeCookTime('')
    setRecipeAdditionalTime('')
    setRecipeFridgeLife('')
    setRecipeFreezerLife('')
    setRecipeDescription('')
    setRecipeIngredients([{ name: 'Ingredients List 1', list: [] }])
    setRecipeInstructions([{ name: 'Instructions List 1', list: [] }])
    setRecipeImage('')
    setRecipeTags([])
    setUndoClearForm(true)
  }

  useEffect(() => {
    if (error) {
      addRecipeTitleRef.current.scrollIntoView()
    }
  }, [error])

  const addRecipeTitleRef = useRef()

  return (
    <div className='add-recipe-page page'>
      <LoadingBar
        color='#ff5722'
        progress={loadingProgress}
        onLoaderFinished={() => setLoadingProgress(0)}
      />
      <h1 className='title' ref={addRecipeTitleRef}>
        Create Your Own Recipe
      </h1>
      <div className='form-container'>
        <form
          action=''
          className='create-recipe-form'
          onSubmit={handleAddRecipeFormSubmit}
        >
          {error && <div className='error'>{error}</div>}
          <RecipeFormInput
            name={'Title *'}
            val={recipeTitle}
            setVal={setRecipeTitle}
            placeholder={'Mexican Chipotle Bowl...'}
            characterLimit={60}
          />
          <RecipeFormTextArea
            name='Recipe Description'
            val={recipeDescription}
            setVal={setRecipeDescription}
            placeholder='Description of recipe...'
            characterLimit={400}
          />
          <ServingsInput
            recipeYield={recipeYield}
            setRecipeYield={setRecipeYield}
          />
          <div className='recipe-data times'>
            <TimeInput
              label='Prep Time *'
              val={recipePrepTime}
              setVal={setRecipePrepTime}
            />
            <TimeInput
              label='Cook Time'
              val={recipeCookTime}
              setVal={setRecipeCookTime}
            />
            <TimeInput
              label='Additional Time'
              val={recipeAdditionalTime}
              setVal={setRecipeAdditionalTime}
            />
          </div>
          <div className='recipe-data'>
            <RecipeFormInput
              name={'Fridge Life (days)'}
              type={'number'}
              val={recipeFridgeLife}
              setVal={setRecipeFridgeLife}
              placeholder={'3'}
              characterLimit={3}
            />
            <RecipeFormInput
              name={'Freezer Life (days)'}
              type={'number'}
              val={recipeFreezerLife}
              setVal={setRecipeFreezerLife}
              placeholder={'40'}
              characterLimit={3}
            />
          </div>
          <IngredientListContainer
            recipeIngredients={recipeIngredients}
            setRecipeIngredients={setRecipeIngredients}
          />
          <InstructionsContainer
            recipeInstructions={recipeInstructions}
            setRecipeInstructions={setRecipeInstructions}
          />
          <RecipeImage
            recipeImage={recipeImage}
            setRecipeImage={setRecipeImage}
          />
          <RecipeTags tags={recipeTags} setTags={setRecipeTags} />
          <button type='submit' className='btn add-recipe-btn'>
            {loading ? (
              <TailSpin
                heigth='30'
                width='30'
                color='white'
                arialLabel='loading'
                className='spinner'
              />
            ) : (
              'Create Recipe'
            )}
          </button>
        </form>
      </div>
      <button className='clear-form' onClick={clearForm}>
        {undoClearForm ? 'Undo' : 'Clear Form'}
      </button>
    </div>
  )
}

export default AddRecipe
