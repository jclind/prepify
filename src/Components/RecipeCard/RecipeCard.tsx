import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiFillStar } from 'react-icons/ai'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipePlaceholder from 'src/Components/RecipePlaceholder/RecipePlaceholder'
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

type RecipeCardProps = {
  recipe: RecipeType | null
  loading?: boolean
  // Extra refresh after a save/membership change (the Saved tab passes this so
  // unsaving/refiling resets its paged grid). Caches always refetch regardless.
  onMutated?: () => void
}

/**
 * Browse-grid recipe card: image with price-per-serving chip + save bookmark,
 * cuisine eyebrow, title, and a time/rating meta row. Used by the /recipes
 * page and the account Saved tab.
 */
const RecipeCard: FC<RecipeCardProps> = ({ recipe, loading, onMutated }) => {
  // Hooks must run before the loading early-return below.
  const [imgError, setImgError] = useState(false)

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
      {/* No aria-label here: it would override the link's name to just the
          title while the visible card text (cuisine, time, rating) stays
          unread — a WCAG 2.5.3 label-in-name mismatch. Letting the content name
          the link keeps the visible text and the accessible name in sync. The
          thumbnail is decorative (the title sits right beside it), so alt=''. */}
      <Link to={`/recipes/${recipe._id}`} className='recipe-card__link'>
        <div className='recipe-card__thumb'>
          {recipe.recipeImage && !imgError ? (
            <img
              src={recipe.recipeImage}
              alt=''
              loading='lazy'
              decoding='async'
              width={300}
              height={225}
              onError={() => setImgError(true)}
            />
          ) : (
            <RecipePlaceholder />
          )}
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
        onMutated={onMutated}
      />
    </article>
  )
}

// Memoized: the /recipes grid is an infinite-scroll list, so already-rendered
// cards shouldn't re-render when a new page appends or a sibling save mutates.
export default React.memo(RecipeCard)
