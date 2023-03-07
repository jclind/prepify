import React, { useState, useEffect, useRef } from 'react'
import './SingleRecipe.scss'
import { useParams } from 'react-router-dom'

import Ingredients from './Ingredients/Ingredients'
import SaveRecipeBtn from './SaveRecipeBtn'
import AddRatingBtn from './AddRatingBtn'
import PrintRecipeBtn from './PrintRecipeBtn'
import RecipeRatings from './RecipeRatings/RecipeRatings'
import NutritionData from './NutritionData/NutritionData'
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

const skeletonColor = '#d6d6d6'

const SingleRecipe = () => {
  const [currRecipe, setCurrRecipe] = useState<RecipeType | null>(null)
  const [loading, setLoading] = useState(true)
  const [recipe404, setRecipe404] = useState(false)
  const [modIngredients, setModIngredients] = useState<IngredientsType[] | []>(
    []
  )

  const [currUserReview, setCurrUserReview] = useState<ReviewType | {}>({})

  const [windowWidth, setWindowWidth] = useState(getWindowWidth())

  const [servingSize, setServingSize] = useState(0)

  const printedRef = useRef() as React.MutableRefObject<HTMLInputElement>
  useEffect(() => {
    if (currRecipe) {
      const recipeServings: { recipeId: string; numServings: number }[] | [] =
        JSON.parse(localStorage.getItem('recipeServings') || '[]')

      const currRecipeLocalStorageObj = recipeServings.find(
        item => item.recipeId === currRecipe._id
      )
      // Set currRecipeServings to saved local numServings value for current recipe if it exists, if not set to the default servings for the current recipe
      const currRecipeServings: number = currRecipeLocalStorageObj
        ? currRecipeLocalStorageObj.numServings
        : currRecipe.servings

      setServingSize(currRecipeServings)
      setModIngredients(
        updateIngredients(
          currRecipe.ingredients,
          currRecipe.servings,
          currRecipeServings
        )
      )
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currRecipe])

  // const recipeResult = useRecipe()
  // const getRecipe = recipeResult?.getRecipe ?? null

  let recipeParams = useParams()
  const recipeId = recipeParams.recipeId

  // Retrieve recipe data with recipeId
  useEffect(() => {
    if (!recipeId) return
    RecipeAPI.getRecipe(recipeId)
      .then(res => {
        console.log(res)
        if (!res || !res.title) {
          console.log('heh?')
          setRecipe404(true)
        } else {
          setCurrRecipe(res)
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
              {' '}
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
                <div className='tags-container'>
                  <label className='tag-label'>
                    {loading ? (
                      <Skeleton baseColor={skeletonColor} width={50} />
                    ) : (
                      'Tags:'
                    )}
                  </label>
                  {!loading ? (
                    <div className='tags'>
                      {currRecipe &&
                        currRecipe.nutritionLabels &&
                        currRecipe.nutritionLabels.map(tag => {
                          return (
                            <div className='tag' key={tag}>
                              {tag}
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className='tags'>
                      <Skeleton
                        baseColor={skeletonColor}
                        className='tag skeleton'
                      />
                      <Skeleton
                        baseColor={skeletonColor}
                        className='tag skeleton'
                      />
                      <Skeleton
                        baseColor={skeletonColor}
                        className='tag skeleton'
                      />
                    </div>
                  )}
                </div>
                {/* {currRecipe && currRecipe.nutritionData && (
                  <NutritionData
                    data={currRecipe.nutritionData}
                    servings={currRecipe.servings}
                  />
                )} */}
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
