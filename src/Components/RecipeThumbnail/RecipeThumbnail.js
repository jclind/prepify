import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar } from 'react-icons/ai'
import { formatRating } from '../../util/formatRating'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import './RecipeThumbnail.scss'

const skeletonColor = '#d6d6d6'

const RecipeThumbnail = ({ recipe, loading }) => {
  const { _id, recipeImage, title, totalTime, rating } = recipe || ''
  const navigate = useNavigate()
  const handleOnClick = () => {
    if (!loading) {
      navigate(`/recipes/${_id}`)
    }
  }

  return (
    <>
      <div onClick={handleOnClick} className='recipe-thumbnail'>
        <div className='img-container'>
          {loading || !recipeImage ? (
            <Skeleton className='img' baseColor={skeletonColor} />
          ) : (
            <img className='img' src={recipeImage} alt={title} />
          )}
        </div>
        <h4 className='title'>
          {loading ? <Skeleton baseColor={skeletonColor} height={30} /> : title}
        </h4>
        <div className='price'>
          {loading || !recipe || !recipe.servingPrice || !recipe.yield ? (
            <Skeleton baseColor={skeletonColor} height={30} />
          ) : (
            `Recipe: $${(recipe.servingPrice * recipe.yield.value).toFixed(
              2
            )} | Serving: $${recipe.servingPrice}`
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
                {totalTime > 1 ? `${totalTime} mins` : `${totalTime} min`}
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
                {Number(rating.rateCount) === 0 ? (
                  0
                ) : (
                  <>
                    {formatRating(rating.rateValue, rating.rateCount)} (
                    {rating.rateCount})
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
