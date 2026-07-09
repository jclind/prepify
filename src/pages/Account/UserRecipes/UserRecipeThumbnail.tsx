import { ArrowUpRightIcon, BookmarkIcon, ClockIcon, EyeIcon, StarOutlineIcon, TrendingUpIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import 'react-loading-skeleton/dist/skeleton.css'

import './UserRecipeThumbnail.scss'
import { CreatedRecipeCardType } from 'types'
import { formatRating } from 'src/util/formatRating'
import { formatCompactCount } from 'src/util/formatCompactCount'
import { formatPrice } from 'src/util/formatPrice'


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
  recipe: CreatedRecipeCardType | null
  loading?: boolean
}

// "Dashboard · slim tiles" card: a header row (thumbnail + title + price/date),
// a compact three-up performance strip (views / saves / made), and a quiet
// time/rating footer.
const UserRecipeThumbnail: FC<UserRecipeThumbnailType> = ({
  recipe,
  loading,
}) => {
  const isLoading = loading || !recipe
  const createdDate = recipe ? formatDate(recipe.createdAt) : null
  const price =
    recipe && recipe.servingPrice != null
      ? formatPrice(recipe.servingPrice)
      : null

  const card = (
    <>
      <div className='head-row'>
        <div className='thumb'>
          {isLoading || !recipe!.recipeImage ? (
            // Skeleton stands in for both the loading state and a recipe with no
            // image, so a missing image never renders a broken-image icon.
            <Skeleton className='img' baseColor={skeletonColor} />
          ) : (
            <img
              className='img'
              src={recipe!.recipeImage}
              alt={recipe!.title}
              title={recipe!.title}
              loading='eager'
            />
          )}
        </div>
        <div className='id'>
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} height={20} width={'14ch'} />
          ) : (
            <h3 className='title'>{recipe!.title}</h3>
          )}
          {!isLoading && (
            <div className='sub'>
              {price && <span className='price'>{price} / serving</span>}
              {createdDate && <span className='date'>{createdDate}</span>}
            </div>
          )}
        </div>
        {!isLoading && <ArrowUpRightIcon className='go' />}
      </div>

      <div className='tiles'>
        <div className='tile'>
          <EyeIcon className='ic' />
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} height={18} width={24} />
          ) : (
            <b>{formatCompactCount(recipe!.views)}</b>
          )}
          <small>views</small>
        </div>
        <div className='tile'>
          <BookmarkIcon className='ic' />
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} height={18} width={24} />
          ) : (
            <b>{formatCompactCount(recipe!.numTimesSaved)}</b>
          )}
          <small>saves</small>
        </div>
        <div className='tile'>
          <TrendingUpIcon className='ic' />
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} height={18} width={24} />
          ) : (
            <b>{formatCompactCount(recipe!.numTimesMade)}</b>
          )}
          <small>made</small>
        </div>
      </div>

      <div className='footer'>
        <span>
          <ClockIcon />
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} width={50} />
          ) : recipe!.totalTime > 1 ? (
            `${recipe!.totalTime} mins`
          ) : (
            `${recipe!.totalTime} min`
          )}
        </span>
        <span>
          <StarOutlineIcon />
          {isLoading ? (
            <Skeleton inline baseColor={skeletonColor} width={50} />
          ) : Number(recipe!.rating.rateCount) === 0 ? (
            'New'
          ) : (
            <>
              {formatRating(recipe!.rating.rateValue, recipe!.rating.rateCount)}{' '}
              ({recipe!.rating.rateCount})
            </>
          )}
        </span>
      </div>
    </>
  )

  if (isLoading) {
    return <div className='user-recipe-thumbnail'>{card}</div>
  }

  return (
    <Link to={`/recipes/${recipe!._id}`} className='user-recipe-thumbnail'>
      {card}
    </Link>
  )
}

export default UserRecipeThumbnail
