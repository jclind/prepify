import React, { useState, useEffect, useRef } from 'react'
import './SingleRecipe.scss'
import { useParams } from 'react-router-dom'
import { useRecipe } from '../../context/RecipeContext'

import Ingredients from './Ingredients/Ingredients'
import Directions from './Directions/Directions'
import SaveRecipeBtn from './SaveRecipeBtn'
import AddRatingBtn from './AddRatingBtn'
import PrintRecipeBtn from './PrintRecipeBtn'
import RecipeRatings from './RecipeRatings/RecipeRatings'
import NutritionData from './NutritionData/NutritionData'

import { formatRating } from '../../util/formatRating'
import { calcServings } from '../../util/calcServings'
import { capitalize } from '../../util/capitalize'

import { AiOutlineClockCircle, AiOutlineUsergroupAdd } from 'react-icons/ai'
import { BsStar } from 'react-icons/bs'

import { getWindowWidth } from '../../util/getWindowWidth'
import { Helmet } from 'react-helmet'

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipeAPI from '../../api/recipes'

const skeletonColor = '#d6d6d6'

const SingleRecipe = () => {
  const [currRecipe, setCurrRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modIngredients, setModIngredients] = useState([])

  const [currUserReview, setCurrUserReview] = useState({})

  const [windowWidth, setWindowWidth] = useState(getWindowWidth())

  const [yieldSize, setYieldSize] = useState(0)

  const printedRef = useRef()
  useEffect(() => {
    if (yieldSize >= 0 && currRecipe) {
      const recipeServings = JSON.parse(localStorage.getItem('recipeServings'))
      const idx = recipeServings.findIndex(
        item => item.recipeId === currRecipe._id
      )
      if (yieldSize === 0) {
        if (recipeServings && idx >= 0) {
          setYieldSize(recipeServings[idx].servingSize)
        } else {
          setYieldSize(Number(currRecipe.yield.value))
        }
      } else {
        // If yieldSize has changed from original recipe size, set local storage
        if (yieldSize) {
          if (recipeServings) {
            if (idx >= 0) {
              recipeServings[idx].servingSize = yieldSize
              localStorage.setItem(
                'recipeServings',
                JSON.stringify([...recipeServings])
              )
            } else {
              localStorage.setItem(
                'recipeServings',
                JSON.stringify([
                  ...recipeServings,
                  { recipeId: currRecipe._id, servingSize: yieldSize },
                ])
              )
            }
          } else {
            localStorage.setItem(
              'recipeServings',
              JSON.stringify([
                { recipeId: currRecipe._id, servingSize: yieldSize },
              ])
            )
          }
        }
      }

      setModIngredients(
        calcServings(
          currRecipe.ingredients,
          Number(currRecipe.yield.value),
          yieldSize
        )
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yieldSize, currRecipe])

  const { getRecipe } = useRecipe()

  let recipeParams = useParams()
  const recipeId = recipeParams.recipeId

  // Retrieve recipe data with recipeId
  useEffect(() => {
    getRecipe(recipeId).then(res => {
      setCurrRecipe(res.data)
      setLoading(false)
    })

    function handleResize() {
      setWindowWidth(getWindowWidth())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currRecipe) {
      const recipeServings = JSON.parse(localStorage.getItem('recipeServings'))
      if (recipeServings) {
        const idx = recipeServings.findIndex(
          item => item.recipeId === currRecipe._id
        )
        if (idx >= 0) {
          const newServingSize = recipeServings[idx].servingSize
          setYieldSize(newServingSize)
        } else {
          setYieldSize(Number(currRecipe.yield.value))
        }
      }
    }
  }, [currRecipe])

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>
          Prepify |{' '}
          {loading ? 'Recipe Loading...' : capitalize(currRecipe.title)}
        </title>
      </Helmet>
      <div className='page single-recipe-page' ref={printedRef}>
        <div className='recipe-container'>
          <div className='header-content'>
            {windowWidth <= 956 && (
              <div className='mobile-title-content'>
                <h1 className='title'>
                  {loading ? (
                    <Skeleton baseColor={skeletonColor} />
                  ) : (
                    currRecipe.title
                  )}
                </h1>
                <p className='description'>
                  {loading ? (
                    <Skeleton baseColor={skeletonColor} count={4} />
                  ) : (
                    currRecipe.description
                  )}
                </p>
              </div>
            )}
            <div className='recipe-image-container'>
              {loading ? (
                <Skeleton baseColor={skeletonColor} className='img skeleton' />
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
                    {loading ? (
                      <Skeleton baseColor={skeletonColor} />
                    ) : (
                      currRecipe.title
                    )}
                  </h1>
                  <p className='description'>
                    {loading ? (
                      <Skeleton baseColor={skeletonColor} count={4} />
                    ) : (
                      currRecipe.description
                    )}
                  </p>
                </>
              )}

              <div className='recipe-data'>
                <div className='time data-element'>
                  {loading ? (
                    <Skeleton baseColor={skeletonColor} className='skeleton' />
                  ) : (
                    <>
                      <AiOutlineClockCircle className='icon' />
                      <h3>Total Time</h3>
                      <div className='data'>{currRecipe.totalTime} min.</div>
                    </>
                  )}
                </div>
                <div className='servings data-element'>
                  {loading ? (
                    <Skeleton baseColor={skeletonColor} className='skeleton' />
                  ) : (
                    <>
                      <AiOutlineUsergroupAdd className='icon' />
                      <h3>
                        {currRecipe.yield.type.value || currRecipe.yield.type}
                      </h3>
                      <div className='data'>{yieldSize}</div>
                    </>
                  )}
                </div>
                <div className='rating data-element'>
                  {loading ? (
                    <Skeleton baseColor={skeletonColor} className='skeleton' />
                  ) : (
                    <>
                      {' '}
                      <BsStar className='icon' />
                      <h3>Rating</h3>
                      <div className='data'>
                        {Number(currRecipe.rating.rateCount) === 0 ? (
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
                {loading ? (
                  <Skeleton
                    baseColor={skeletonColor}
                    className='action skeleton'
                  />
                ) : (
                  <SaveRecipeBtn recipeId={currRecipe._id} className='action' />
                )}
                {loading ? (
                  <Skeleton
                    baseColor={skeletonColor}
                    className='action skeleton'
                  />
                ) : (
                  <AddRatingBtn
                    recipeId={currRecipe._id}
                    currUserReview={currUserReview}
                    className='action'
                  />
                )}
                {loading ? (
                  <Skeleton
                    baseColor={skeletonColor}
                    className='action skeleton'
                  />
                ) : (
                  <PrintRecipeBtn
                    recipe={currRecipe}
                    printedRef={printedRef}
                    className='action'
                  />
                )}
              </div>
            </div>
          </div>

          <div className='body-content'>
            <Ingredients
              ingredients={modIngredients}
              yieldSize={yieldSize}
              setYieldSize={setYieldSize}
              loading={loading}
            />
            <Directions
              directions={
                currRecipe && currRecipe.instructions
                  ? currRecipe.instructions
                  : null
              }
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
                  {currRecipe.tags.map(tag => {
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
            {currRecipe && currRecipe.nutritionData && <NutritionData />}
          </div>
          {!loading && (
            <RecipeRatings
              recipeId={currRecipe._id}
              ratingVal={currRecipe.rating.rateValue}
              ratingCount={currRecipe.rating.rateCount}
              currUserReview={currUserReview}
              setCurrUserReview={setCurrUserReview}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default SingleRecipe
