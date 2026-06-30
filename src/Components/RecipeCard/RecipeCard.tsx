import { ClockIcon, StarFilledIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import { skeletonBase as skeletonColor } from 'src/util/loadingStyles'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipePlaceholder from 'src/Components/RecipePlaceholder/RecipePlaceholder'
import SaveControl from 'src/Components/AddToCollection/SaveControl'
import { formatRating } from 'src/util/formatRating'
import { formatPrice } from 'src/util/formatPrice'
import { minToHrMin } from 'src/util/minToHrMin'
import { RecipeType } from 'types'
import './RecipeCard.scss'


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
      <StarFilledIcon className='star' />
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
  // Hold a skeleton over the thumb until the image actually decodes (onLoad), so
  // a card never shows an empty box painting in top-down. Reset if the URL changes.
  const [imgLoaded, setImgLoaded] = useState(false)

  if (loading || !recipe) {
    return (
      <article className='recipe-card recipe-card--loading' aria-hidden='true'>
        <div className='recipe-card__thumb'>
          <Skeleton className='recipe-card__img-skeleton' baseColor={skeletonColor} />
        </div>
        {/* Mirror the real body: cuisine eyebrow, a 2-line title (the card reserves
            two lines so 1- and 2-line titles are the same height), and a meta row
            pinned to the bottom — so the skeleton→content swap doesn't reflow. */}
        <div className='recipe-card__body'>
          <Skeleton inline width={70} height={10} baseColor={skeletonColor} />
          <div className='recipe-card__title recipe-card__title--skeleton'>
            <Skeleton height={15} count={2} baseColor={skeletonColor} />
          </div>
          <div className='recipe-card__meta'>
            <Skeleton inline width={70} height={14} baseColor={skeletonColor} />
            <Skeleton inline width={48} height={14} baseColor={skeletonColor} />
          </div>
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
            <>
              <img
                src={recipe.recipeImage}
                alt=''
                loading='lazy'
                decoding='async'
                width={300}
                height={225}
                // A cached image can finish decoding before React attaches
                // onLoad, so the event never fires and the skeleton sticks over a
                // decoded image. The ref re-checks `complete` on every commit to
                // catch that case (and recover if onLoad was missed).
                ref={node => {
                  if (node?.complete && node.naturalWidth > 0 && !imgLoaded) {
                    setImgLoaded(true)
                  }
                }}
                className={imgLoaded ? 'is-loaded' : ''}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {!imgLoaded && (
                <Skeleton
                  className='recipe-card__img-skeleton'
                  baseColor={skeletonColor}
                />
              )}
            </>
          ) : (
            <RecipePlaceholder />
          )}
          {price && <span className='recipe-card__price'>{price}</span>}
        </div>
        <div className='recipe-card__body'>
          {/* Always render the eyebrow (nbsp fallback when there's no cuisine) so
              the line is reserved — the skeleton always draws an eyebrow bar, and
              a cuisine-less card would otherwise be one line shorter than its
              skeleton and shift the grid up on swap. */}
          <span className='recipe-card__cuisine'>
            {recipe.cuisine || ' '}
          </span>
          <h3 className='recipe-card__title'>{recipe.title}</h3>
          <div className='recipe-card__meta'>
            <span className='recipe-card__time'>
              <ClockIcon /> {time}
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
