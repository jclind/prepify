import React, { FC, useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

import './SingleRecipe.scss'

import Ingredients from 'src/pages/SingleRecipe/DataSections/Ingredients/Ingredients'
import Instructions from 'src/pages/SingleRecipe/DataSections/Instructions/Instructions'
import Tags from 'src/pages/SingleRecipe/DataSections/Tags'
import RecipeControls from 'src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls'
import MadeRecipeBtn from 'src/pages/SingleRecipe/Buttons/MadeRecipeBtn'

import { updateIngredients } from 'src/util/updateIngredients'
import { capitalize } from 'src/util/capitalize'

import { IngredientsType, RecipeType, ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import RecipeNotFound from 'src/pages/SingleRecipe/RecipeNotFound/RecipeNotFound'
import RatingsAndReviews from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews'
import RecipeHeaderContent from 'src/pages/SingleRecipe/RecipeHeaderContent/RecipeHeaderContent'

type LocalStorageRecipeType = {
  recipeId: string
  numServings: number
}

type Props = { recipe?: RecipeType | null }

const SingleRecipe: FC<Props> = ({ recipe }) => {
  const [currRecipe, setCurrRecipe] = useState<RecipeType | null>(
    recipe || null
  )
  const [loading, setLoading] = useState(true)
  const [recipe404, setRecipe404] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [modIngredients, setModIngredients] = useState<IngredientsType[]>([])
  const [currUserReview, setCurrUserReview] = useState<ReviewType | null>(null)
  const [servingSize, setServingSize] = useState(0)
  const printedRef = useRef<HTMLInputElement>(null)

  const { recipeId } = useParams<{ recipeId: string }>()

  const updateRecipeLocalStorage = (recipeId: string, numServings: number) => {
    const localStorageRecipeArr: LocalStorageRecipeType[] = JSON.parse(
      localStorage.getItem('recipeServings') || '[]'
    )
    const currRecipeLocalStorageIndex = localStorageRecipeArr.findIndex(
      item => item.recipeId === recipeId
    )

    if (currRecipeLocalStorageIndex !== -1) {
      localStorageRecipeArr[currRecipeLocalStorageIndex].numServings =
        servingSize
    } else {
      localStorageRecipeArr.push({ recipeId, numServings })
    }
    localStorage.setItem(
      'recipeServings',
      JSON.stringify(localStorageRecipeArr)
    )
  }

  useEffect(() => {
    if (currRecipe && servingSize > 0) {
      updateRecipeLocalStorage(currRecipe._id, servingSize)
      setModIngredients(
        updateIngredients(
          currRecipe.ingredients,
          currRecipe.servings,
          servingSize
        )
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servingSize])

  // Retrieve recipe data with recipeId
  useEffect(() => {
    if (!recipeId) return
    RecipeAPI.getRecipe(recipeId)
      .then(res => {
        if (!res || !res.title) {
          setRecipe404(true)
        } else {
          setCurrRecipe(res)
          const recipeServingsLS: LocalStorageRecipeType[] = JSON.parse(
            localStorage.getItem('recipeServings') || '[]'
          )

          const currRecipeLocalStorageObj = recipeServingsLS.find(
            item => item.recipeId === res._id
          )

          // Set currRecipeServings to saved local numServings value for current recipe if it exists, if not set to the default servings for the current recipe
          const currRecipeServings: number = currRecipeLocalStorageObj
            ? currRecipeLocalStorageObj.numServings
            : res.servings

          setServingSize(currRecipeServings)
        }
        setLoading(false)
      })
      .catch(err => {
        console.log(err)
        setRecipeError('Failed to load recipe. Please try again.')
        setLoading(false)
      })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>
          Prepify |{' '}
          {loading
            ? 'Recipe Loading...'
            : currRecipe && currRecipe.title
            ? capitalize(currRecipe.title)
            : 'Recipe 404'}
        </title>
        <meta name='description' content={currRecipe?.description} />
      </Helmet>
      {recipeError ? (
        <div className='recipe-fetch-error'>{recipeError}</div>
      ) : recipe404 ? (
        <RecipeNotFound />
      ) : (
        <>
          <div className='page single-recipe-page' ref={printedRef}>
            <div className='recipe-container'>
              {currRecipe && (
                <RecipeControls
                  recipeId={currRecipe._id}
                  authorUsername={currRecipe.authorUsername}
                  recipeTitle={currRecipe.title}
                />
              )}
              <RecipeHeaderContent
                currRecipe={currRecipe}
                loading={loading}
                currUserReview={currUserReview}
                printedRef={printedRef}
                servingSize={servingSize}
              />
              <div className='body-content'>
                <Ingredients
                  ingredients={modIngredients}
                  servingSize={servingSize}
                  setServingSize={setServingSize}
                  loading={loading}
                />
                <Instructions
                  instructions={currRecipe?.instructions || []}
                  loading={loading}
                />
                <Tags loading={loading} currRecipe={currRecipe} />
                {recipeId && <MadeRecipeBtn recipeId={recipeId} />}
                <div className='recipe-stats'></div>
              </div>
              {!loading && currRecipe && (
                <RatingsAndReviews
                  recipeId={currRecipe && currRecipe._id}
                  ratingVal={
                    currRecipe &&
                    currRecipe.rating &&
                    currRecipe.rating.rateValue
                  }
                  ratingCount={
                    currRecipe &&
                    currRecipe.rating &&
                    currRecipe.rating.rateCount
                  }
                  currUserReview={currUserReview}
                  setCurrUserReview={setCurrUserReview}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default SingleRecipe
