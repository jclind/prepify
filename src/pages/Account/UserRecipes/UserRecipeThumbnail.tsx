import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar, AiOutlineEye } from 'react-icons/ai'
import { MdOutlineCalendarToday } from 'react-icons/md'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import './UserRecipeThumbnail.scss'
import { RecipeType } from 'types'
import { formatRating } from 'src/util/formatRating'

const skeletonColor = '#d6d6d6'

const formatDate = (createdAt: string) => {
  const ms = Number(createdAt)
  if (!ms || Number.isNaN(ms)) return null
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

type UserRecipeThumbnailType = {
  recipe: RecipeType | null
  loading?: boolean
}

const UserRecipeThumbnail: FC<UserRecipeThumbnailType> = ({
  recipe,
  loading,
}) => {
  const createdDate = recipe ? formatDate(recipe.createdAt) : null

  const card = (
    <>
      <div className='img-container'>
        {loading || !recipe?.recipeImage ? (
          <Skeleton className='img' baseColor={skeletonColor} />
        ) : (
          <>
            <img
              className='img'
              height={300}
              width={200}
              src={recipe.recipeImage}
              alt={recipe.title}
              title={recipe.title}
              loading='eager'
            />
            {createdDate ? (
              <span className='date-pill'>
                <MdOutlineCalendarToday className='icon' />
                {createdDate}
              </span>
            ) : null}
          </>
        )}
      </div>
      <h3 className='title'>
        {loading || !recipe ? (
          <Skeleton baseColor={skeletonColor} height={30} />
        ) : (
          recipe.title
        )}
      </h3>
      <div className='price'>
        {loading ||
        !recipe ||
        recipe.servingPrice == null ||
        !recipe.servings ? (
          <Skeleton baseColor={skeletonColor} height={20} width={180} />
        ) : (
          `Serving: $${(recipe.servingPrice / 100).toFixed(2)} | Recipe: $${(
            (recipe.servingPrice / 100) *
            recipe.servings
          ).toFixed(2)}`
        )}
      </div>
      <div className='info'>
        <div className='total-time single-info'>
          {loading || !recipe ? (
            <Skeleton baseColor={skeletonColor} className='skeleton' width={50} />
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
          {loading || !recipe ? (
            <Skeleton baseColor={skeletonColor} className='skeleton' width={50} />
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
        <div className='views single-info'>
          {loading || !recipe ? (
            <Skeleton baseColor={skeletonColor} className='skeleton' width={50} />
          ) : (
            <>
              <AiOutlineEye className='icon' />
              {recipe.views}
            </>
          )}
        </div>
      </div>
    </>
  )

  if (loading || !recipe) {
    return <div className='user-recipe-thumbnail'>{card}</div>
  }

  return (
    <Link to={`/recipes/${recipe._id}`} className='user-recipe-thumbnail'>
      {card}
    </Link>
  )
}

export default UserRecipeThumbnail
