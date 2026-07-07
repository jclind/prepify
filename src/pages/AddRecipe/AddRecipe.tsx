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
import FormField from 'src/pages/AddRecipe/FormField'
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
        {/* The create/edit form is an authted app page, never something to
            index — matches the noindex on Account/Settings/CreateUsername. */}
        <meta name='robots' content='noindex' />
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
            <FormField
              className='title'
              label='Title'
              required
              error={errors.title}
              errorId='error-title'
            >
              <FormInput
                size='compact'
                placeholder='Add a title to your recipe.'
                val={title}
                setVal={setTitle}
                characterLimit={TITLE_MAX_LENGTH}
                invalid={!!errors.title}
                describedBy={errors.title ? 'error-title' : undefined}
              />
            </FormField>
            <FormField
              className='image-picker'
              label='Select Image'
              required
              error={errors.image}
              errorId='error-image'
            >
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
            </FormField>
            <FormField
              className='description'
              label='Description'
              required
              error={errors.description}
              errorId='error-description'
            >
              <RecipeFormTextArea
                placeholder='Add a description to your recipe'
                val={description}
                setVal={setDescription}
                characterLimit={DESCRIPTION_MAX_LENGTH}
                invalid={!!errors.description}
                describedBy={errors.description ? 'error-description' : undefined}
              />
            </FormField>
            <FormField
              className='servings'
              label='Servings'
              required
              error={errors.servings}
              errorId='error-servings'
            >
              <ServingsInput
                servings={servings}
                setServings={setServings}
                invalid={!!errors.servings}
                describedBy={errors.servings ? 'error-servings' : undefined}
              />
            </FormField>
            <FormField
              className='prep-time'
              label='Prep Time'
              required
              error={errors.prepTime}
              errorId='error-prepTime'
            >
              <TimeInput
                label={'How long will your recipe take to prepare?'}
                val={prepTime}
                setVal={setPrepTime}
              />
            </FormField>
            <FormField className='cook-time' label='Cook Time'>
              <TimeInput
                label={'How long will your recipe take to cook?'}
                val={cookTime}
                setVal={setCookTime}
              />
            </FormField>
            <FormField
              className='ingredients'
              label='Ingredients'
              required
              error={errors.ingredients}
              errorId='error-ingredients'
            >
              <IngredientsContainer
                ingredients={ingredients}
                setIngredients={setIngredients}
              />
            </FormField>
            <FormField
              className='instructions'
              label='Instructions'
              required
              error={errors.instructions}
              errorId='error-instructions'
            >
              <InstructionsContainer
                instructions={instructions}
                setInstructions={setInstructions}
              />
            </FormField>
            <FormField className='cuisine' label='Cuisine'>
              <CuisineSelector cuisine={cuisine} setCuisine={setCuisine} />
            </FormField>
            <FormField
              className='course'
              label='Course'
              required
              error={errors.mealType}
              errorId='error-mealType'
            >
              <MealTypeSelector
                mealTypes={mealTypes}
                setMealTypes={setMealTypes}
              />
            </FormField>
            <FormField className='diet' label='Diet'>
              <DietSelector
                nutritionLabels={nutritionLabels}
                setNutritionLabels={setNutritionLabels}
              />
            </FormField>
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
