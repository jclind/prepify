import React, { useState, useEffect, useRef } from 'react'
import './SingleRecipe.scss'
import { useParams } from 'react-router-dom'

import Ingredients from './Ingredients/Ingredients'
import SaveRecipeBtn from './SaveRecipeBtn'
import AddRatingBtn from './AddRatingBtn'
import PrintRecipeBtn from './PrintRecipeBtn'
import RecipeRatings from './RecipeRatings/RecipeRatings'
import RecipeNotFound from './RecipeNotFound.js/RecipeNotFound'

import { formatRating } from '../../util/formatRating'
import { updateIngredients } from '../../util/updateIngredients'
import { capitalize } from '../../util/capitalize'

import { AiOutlineClockCircle, AiOutlineUsergroupAdd } from 'react-icons/ai'
import { BsStar } from 'react-icons/bs'

import { getWindowWidth } from '../../util/getWindowWidth'
import { Helmet } from 'react-helmet'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { IngredientsType, RecipeType, ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import Instructions from './Instructions/Instructions'
import Tags from './Tags'
import RecipeControls from './RecipeControls/RecipeControls'
import MadeRecipeBtn from './MadeRecipeBtn'

const skeletonColor = '#d6d6d6'

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

  const [windowWidth, setWindowWidth] = useState(getWindowWidth())

  const [servingSize, setServingSize] = useState(0)

  const printedRef = useRef() as React.MutableRefObject<HTMLInputElement>

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

  let recipeParams = useParams()
  const recipeId = recipeParams.recipeId

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

    function handleResize() {
      setWindowWidth(getWindowWidth())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
              <div className='header-content'>
                {windowWidth <= 956 && (
                  <div className='mobile-title-content'>
                    <h1 className='title'>
                      {loading || !currRecipe?.title ? (
                        <Skeleton baseColor={skeletonColor} />
                      ) : (
                        currRecipe.title
                      )}
                    </h1>
                    <div className='recipe-price'>
                      {loading ||
                      !currRecipe?.servingPrice ||
                      !currRecipe?.servings ? (
                        <Skeleton baseColor={skeletonColor} height={30} />
                      ) : (
                        `Serving: $${(currRecipe.servingPrice / 100).toFixed(
                          2
                        )} | Recipe: $${(
                          (currRecipe.servingPrice / 100) *
                          currRecipe.servings
                        ).toFixed(2)}`
                      )}
                    </div>
                    <p className='description'>
                      {loading || !currRecipe?.description ? (
                        <Skeleton baseColor={skeletonColor} count={4} />
                      ) : (
                        currRecipe.description
                      )}
                    </p>
                  </div>
                )}
                <div className='recipe-image-container'>
                  {loading || !currRecipe?.recipeImage ? (
                    <Skeleton
                      baseColor={skeletonColor}
                      className='img skeleton'
                    />
                  ) : (
                    <img
                      className='img'
                      src={currRecipe.recipeImage}
                      alt={currRecipe.title}
                    />
                  )}
                </div>
                <div className='description-content'>
                  {windowWidth > 956 && (
                    <>
                      <h1 className='title'>
                        {loading || !currRecipe?.title ? (
                          <Skeleton baseColor={skeletonColor} />
                        ) : (
                          currRecipe.title
                        )}
                      </h1>
                      <div className='recipe-price'>
                        {loading ||
                        !currRecipe?.servingPrice ||
                        !currRecipe?.servings ? (
                          <Skeleton baseColor={skeletonColor} height={30} />
                        ) : (
                          `Serving: $${(currRecipe.servingPrice / 100).toFixed(
                            2
                          )} | Recipe: $${(
                            (currRecipe.servingPrice / 100) *
                            currRecipe.servings
                          ).toFixed(2)}`
                        )}
                      </div>
                      <p className='description'>
                        {loading || !currRecipe?.description ? (
                          <Skeleton baseColor={skeletonColor} count={4} />
                        ) : (
                          currRecipe.description
                        )}
                      </p>
                    </>
                  )}

                  <div className='recipe-data'>
                    <div className='time data-element'>
                      {loading || !currRecipe?.totalTime ? (
                        <Skeleton
                          baseColor={skeletonColor}
                          className='skeleton'
                        />
                      ) : (
                        <>
                          <AiOutlineClockCircle className='icon' />
                          <h3>Total Time</h3>
                          <div className='data'>
                            {currRecipe.totalTime} min.
                          </div>
                        </>
                      )}
                    </div>
                    <div className='servings data-element'>
                      {loading ? (
                        <Skeleton
                          baseColor={skeletonColor}
                          className='skeleton'
                        />
                      ) : (
                        <>
                          <AiOutlineUsergroupAdd className='icon' />
                          <h3>Servings</h3>
                          <div className='data'>{servingSize}</div>
                        </>
                      )}
                    </div>
                    <div className='rating data-element'>
                      {loading ? (
                        <Skeleton
                          baseColor={skeletonColor}
                          className='skeleton'
                        />
                      ) : (
                        <>
                          {' '}
                          <BsStar className='icon' />
                          <h3>Rating</h3>
                          <div className='data'>
                            {!currRecipe ||
                            !currRecipe.rating ||
                            Number(currRecipe.rating.rateCount) === 0 ? (
                              'No Ratings'
                            ) : (
                              <>
                                {formatRating(
                                  currRecipe.rating.rateValue,
                                  currRecipe.rating.rateCount
                                )}{' '}
                                ({currRecipe.rating.rateCount})
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className='actions'>
                    {loading || !currRecipe?._id ? (
                      <Skeleton
                        baseColor={skeletonColor}
                        className='action skeleton'
                      />
                    ) : (
                      <SaveRecipeBtn recipeId={currRecipe._id} />
                    )}
                    {loading ? (
                      <Skeleton
                        baseColor={skeletonColor}
                        className='action skeleton'
                      />
                    ) : (
                      <AddRatingBtn currUserReview={currUserReview} />
                    )}
                    {loading ? (
                      <Skeleton
                        baseColor={skeletonColor}
                        className='action skeleton'
                      />
                    ) : (
                      <PrintRecipeBtn printedRef={printedRef} />
                    )}
                  </div>
                </div>
              </div>
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
                <RecipeRatings
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
