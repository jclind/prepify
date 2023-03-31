import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet'

import './SingleRecipe.scss'

import Ingredients from './DataSections/Ingredients/Ingredients'
import Instructions from './DataSections/Instructions/Instructions'
import Tags from './DataSections/Tags'
import RecipeControls from './DataSections/RecipeControls/RecipeControls'
import MadeRecipeBtn from './Buttons/MadeRecipeBtn'

import { updateIngredients } from '../../util/updateIngredients'
import { capitalize } from '../../util/capitalize'

import { IngredientsType, RecipeType, ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import RecipeNotFound from './RecipeNotFound.js/RecipeNotFound'
import RatingsAndReviews from './DataSections/RatingsAndReviews/RatingsAndReviews'
import RecipeHeaderContent from './RecipeHeaderContent/RecipeHeaderContent'

type LocalStorageRecipeType = {
  recipeId: string
  numServings: number
}

const SingleRecipe = () => {
  const [currRecipe, setCurrRecipe] = useState<RecipeType | null>(null)
  const [loading, setLoading] = useState(true)
  const [recipe404, setRecipe404] = useState(false)
  const [modIngredients, setModIngredients] = useState<IngredientsType[]>([])
  const [currUserReview, setCurrUserReview] = useState<ReviewType | null>(null)
  const [servingSize, setServingSize] = useState(0)
  const printedRef = useRef() as React.MutableRefObject<HTMLInputElement>

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
      </Helmet>
      {recipe404 ? (
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
