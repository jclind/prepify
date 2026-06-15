import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiFillStar } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import SaveControl from 'src/Components/AddToCollection/SaveControl'
import { formatRating } from 'src/util/formatRating'
import { formatPrice } from 'src/util/formatPrice'
import { minToHrMin } from 'src/util/minToHrMin'
import { RecipeType } from 'types'
import './RecipeCard.scss'

const skeletonColor = '#e6e6e6'

/**
 * Filled star + numeric rating + count (compact, single-star). `rateValue` /
 * `rateCount` come off the API as strings, so coerce via Number/formatRating.
 */
const Rating: FC<{ value: number; count: number }> = ({ value, count }) => {
  const c = Number(count)
  if (!c) {
    return (
      <span className='recipe-card__rating recipe-card__rating--none'>
        No ratings
      </span>
    )
  }
  return (
    <span className='recipe-card__rating'>
      <AiFillStar className='star' />
      <span className='val'>{formatRating(Number(value), c)}</span>
      <span className='count'>({c})</span>
    </span>
  )
}

type RecipeCardProps = { recipe: RecipeType | null; loading?: boolean }

/**
 * Browse-grid recipe card: image with price-per-serving chip + save bookmark,
 * cuisine eyebrow, title, and a time/rating meta row. Used by the /recipes
 * page. (RecipeThumbnail is kept for the account pages.)
 */
const RecipeCard: FC<RecipeCardProps> = ({ recipe, loading }) => {
  if (loading || !recipe) {
    return (
      <article className='recipe-card recipe-card--loading' aria-hidden='true'>
        <div className='recipe-card__thumb'>
          <Skeleton className='recipe-card__img-skeleton' baseColor={skeletonColor} />
        </div>
        <div className='recipe-card__body'>
          <Skeleton width={70} height={10} baseColor={skeletonColor} />
          <Skeleton height={20} baseColor={skeletonColor} style={{ margin: '0.4rem 0' }} />
          <Skeleton width='60%' height={14} baseColor={skeletonColor} />
        </div>
      </article>
    )
  }

  const price =
    recipe.servingPrice != null
      ? `${formatPrice(recipe.servingPrice)}/serving`
      : null
  const hm = minToHrMin(recipe.totalTime)
  const time = !hm
    ? `${recipe.totalTime} min`
    : hm.hours
    ? `${hm.hours}h${hm.minutes ? ` ${hm.minutes}m` : ''}`
    : `${hm.minutes} min`

  return (
    <article className='recipe-card'>
      <Link
        to={`/recipes/${recipe._id}`}
        className='recipe-card__link'
        aria-label={recipe.title}
      >
        <div className='recipe-card__thumb'>
          <img
            src={recipe.recipeImage}
            alt={recipe.title}
            loading='lazy'
            width={300}
            height={225}
          />
          {price && <span className='recipe-card__price'>{price}</span>}
        </div>
        <div className='recipe-card__body'>
          {recipe.cuisine && (
            <span className='recipe-card__cuisine'>{recipe.cuisine}</span>
          )}
          <h3 className='recipe-card__title'>{recipe.title}</h3>
          <div className='recipe-card__meta'>
            <span className='recipe-card__time'>
              <CgTimer /> {time}
            </span>
            <Rating value={recipe.rating.rateValue} count={recipe.rating.rateCount} />
          </div>
        </div>
      </Link>
      <SaveControl
        recipeId={recipe._id}
        variant='icon'
        title={recipe.title}
        className='recipe-card__save-wrap'
        triggerClassName='recipe-card__save'
      />
    </article>
  )
}

export default RecipeCard
