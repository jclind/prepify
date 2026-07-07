import { InfoIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { RecipeType } from 'types'
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
import { TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from 'src/util/recipeLimits'
import styles from 'src/_exports.module.scss'
import AddRecipeFormError from 'src/pages/AddRecipe/AddRecipeFormError'
import SectionHeader from 'src/pages/AddRecipe/SectionHeader'
import AddRecipeSummaryBar from 'src/pages/AddRecipe/AddRecipeSummaryBar'
import { Helmet } from 'react-helmet-async'
import DraftSaveStatus from 'src/pages/AddRecipe/DraftSaveStatus'
import DraftResumeBanner from 'src/pages/AddRecipe/DraftResumeBanner'
import { useRecipeForm } from 'src/pages/AddRecipe/useRecipeForm'

// When `initialRecipe` is supplied the form runs in edit mode: every field is
// pre-populated from the existing recipe and submitting updates it (preserving
// ratings/saves) instead of creating a new one. All form state, validation,
// draft autosave and submit orchestration live in useRecipeForm; this component
// is the presentation layer.
type AddRecipeProps = { initialRecipe?: RecipeType }

const AddRecipe: FC<AddRecipeProps> = ({ initialRecipe }) => {
  const navigate = useNavigate()
  const {
    isEditMode,
    title,
    recipeImage,
    existingImageUrl,
    description,
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    cuisine,
    mealTypes,
    nutritionLabels,
    setTitle,
    setRecipeImage,
    setExistingImageUrl,
    setDescription,
    setServings,
    setPrepTime,
    setCookTime,
    setIngredients,
    setInstructions,
    setCuisine,
    setMealTypes,
    setNutritionLabels,
    errors,
    isFormValid,
    addRecipeLoading,
    loadingProgress,
    setLoadingProgress,
    draftStatus,
    draftId,
    resumedFromDraft,
    addRecipeFormRef,
    handleSubmit,
  } = useRecipeForm(initialRecipe)

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
                  <InfoIcon className='icon' />
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
