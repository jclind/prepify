import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar } from 'react-icons/ai'
import { formatRating } from '../../util/formatRating'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import './RecipeThumbnail.scss'
import { RecipeType } from '../../../types'

const skeletonColor = '#d6d6d6'

type RecipeThumbnailType = {
  recipe: RecipeType
  loading: boolean
}

const RecipeThumbnail = ({ recipe, loading }: RecipeThumbnailType) => {
  const navigate = useNavigate()
  const handleOnClick = () => {
    if (!loading) {
      navigate(`/recipes/${recipe._id}`)
    }
  }

  return (
    <>
      <div onClick={handleOnClick} className='recipe-thumbnail'>
        <div className='img-container'>
          {loading || !recipe.recipeImage ? (
            <Skeleton className='img' baseColor={skeletonColor} />
          ) : (
            <img className='img' src={recipe.recipeImage} alt={recipe.title} />
          )}
        </div>
        <h4 className='title'>
          {loading ? (
            <Skeleton baseColor={skeletonColor} height={30} />
          ) : (
            recipe.title
          )}
        </h4>
        <div className='price'>
          {loading || !recipe || !recipe.servingPrice || !recipe.servings ? (
            <Skeleton baseColor={skeletonColor} height={30} />
          ) : (
            `Serving: $${(recipe.servingPrice / 100).toFixed(2)} | Recipe: $${(
              (recipe.servingPrice / 100) *
              recipe.servings
            ).toFixed(2)}`
          )}
        </div>
        <div className='info'>
          <div className='total-time single-info'>
            {loading ? (
              <Skeleton
                baseColor={skeletonColor}
                className='skeleton'
                width={50}
              />
            ) : (
              <>
                <CgTimer className='icon' />
                {recipe.totalTime > 1
                  ? `${recipe.totalTime} mins`
                  : `${recipe.totalTime} min`}
              </>
            )}
          </div>
          <div className='rating single-info'>
            {loading ? (
              <Skeleton
                baseColor={skeletonColor}
                className='skeleton'
                width={50}
              />
            ) : (
              <>
                <AiOutlineStar className='icon' />
                {Number(recipe.rating.rateCount) === 0 ? (
                  0
                ) : (
                  <>
                    {formatRating(
                      recipe.rating.rateValue,
                      recipe.rating.rateCount
                    )}{' '}
                    ({recipe.rating.rateCount})
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default RecipeThumbnail
