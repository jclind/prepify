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
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import Modal from 'react-modal'
Modal.setAppElement('#root')

const RecipeCreatedModal = ({
  recipeCreatedModalIsOpen,
  setRecipeCreatedModalIsOpen,
  recipeId,
}) => {
  const navigate = useNavigate()
  const closeModal = () => {
    setRecipeCreatedModalIsOpen(false)
  }
  const customStyles = {
    content: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',

      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',

      background: '#eeeeee',
      padding: '2.5rem',
      borderRadius: '5px',
    },
    overlay: {
      zIndex: '1000',
      background: 'rgba(0, 0, 0, 0.5)',
    },
  }
  return (
    <Modal
      isOpen={recipeCreatedModalIsOpen}
      onRequestClose={closeModal}
      style={customStyles}
      className='recipe-created-modal'
    >
      <div className='heading'>Success!</div>
      <p className='text'>
        You're recipe has been posted for everyone to enjoy!
      </p>
      <div className='options'>
        <button
          className='home-btn btn'
          onClick={() => {
            navigate('/')
          }}
        >
          Home
        </button>
        <button
          className='view-recipe-btn btn'
          onClick={() => {
            navigate(`/recipes/${recipeId}`)
          }}
        >
          View Recipe
        </button>
      </div>
    </Modal>
  )
}

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

  const [recipeCreatedModalIsOpen, setRecipeCreatedModalIsOpen] =
    useState(false)
  const [recipeId, setRecipeId] = useState('')

  const setStatesToLocalData = () => {
    const addRecipeFormData = JSON.parse(
      localStorage.getItem('addRecipeFormData')
    )

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

    // ERROR HANDLING
    if (!recipeTitle.trim()) return returnError('Please Enter Recipe Title') // Check if recipe title exists
    if (!recipePrepTime) return returnError('Please Enter Prep time') // Check if prep time is more than 0
    if (
      isNaN(recipePrepTime) ||
      Number(recipePrepTime) % 1 !== 0 ||
      Number(recipePrepTime) <= 0
    )
      return returnError(
        'Please Make Sure Prep Time Is A Positive Whole Number'
      ) // Only allow whole number for prep time

    if (
      recipeCookTime &&
      (isNaN(recipeCookTime) ||
        Number(recipeCookTime) < 0 ||
        Number(recipeCookTime) % 1 !== 0)
    )
      return returnError('Please Enter Cook Time As A Positive Whole Number') // Check if cookTime exists. If it does confirm it is a positive whole number

    if (
      recipeAdditionalTime &&
      (isNaN(recipeAdditionalTime) ||
        Number(recipeAdditionalTime) < 0 ||
        Number(recipeAdditionalTime) % 1 !== 0)
    )
      return returnError(
        'Please Enter Additional Time As A Positive Whole Number Or 0'
      ) // Check if cookTime exists. If it does confirm it is a positive whole number

    if (
      !recipeYield ||
      Number(recipeYield.value) <= 0 ||
      Number(recipeYield.value) % 1 !== 0
    )
      return returnError(
        'Please Enter Serving Size As Positive Whole Number or 0'
      ) // Check if recipeYield exists, is whole and positive

    let isInstructionErr = false
    if (recipeInstructions.length <= 0)
      return returnError('Please Enter Instructions')
    // If any list of instructions is empty, throw error
    recipeInstructions.forEach(insList => {
      if (insList.list.length <= 0) {
        isInstructionErr = true
        return
      }
    })
    if (isInstructionErr)
      return returnError('Please Enter Instructions For Each List')

    let isIngredientErr = false
    if (recipeIngredients.length <= 0)
      return returnError('Please Enter Instructions')
    // If any list of ingredients is empty, throw error
    recipeIngredients.forEach(ingrList => {
      if (ingrList.list.length <= 0) {
        isIngredientErr = true
        return
      }
    })
    if (isIngredientErr)
      return returnError('Please Enter Ingredients For Each List')

    if (!recipeImage) return returnError('Please Enter Image')

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

    console.log('RECIPE_SUBMITTED')

    addRecipe(
      recipeData,
      setLoading,
      loadingProgress,
      setLoadingProgress,
      setError
    )
      .then(res => {
        setRecipeId(res)
        clearForm()
        setStatesToLocalData()
        setRecipeCreatedModalIsOpen(true)
        // navigate('/')
      })
      .catch(err => {
        setLoading(false)
        setError(err)
        console.log(err)
      })
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

    setError('')

    localStorage.removeItem('addRecipeFormData')
  }

  useEffect(() => {
    if (error) {
      addRecipeTitleRef.current.scrollIntoView()
    }
  }, [error])

  const addRecipeTitleRef = useRef()

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Create Recipe</title>
      </Helmet>
      <div className='add-recipe-page page'>
        <RecipeCreatedModal
          recipeCreatedModalIsOpen={recipeCreatedModalIsOpen}
          setRecipeCreatedModalIsOpen={setRecipeCreatedModalIsOpen}
          recipeId={recipeId}
        />
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
    </>
  )
}

export default AddRecipe
