import { ClockIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { RecipeType } from 'types'
import { skeletonColor, fmtPrice, ratingLabel } from './homeFormat'

// Shared recipe card for the Home rows (Trending, For You). A lightweight
// thumbnail+meta link — intentionally simpler than the full RecipeCard (no save
// control) to keep the rows fast and uncluttered.
export const HomeRecipeCard: FC<{ recipe: RecipeType }> = ({ recipe }) => {
  // Hold a skeleton over the thumb until the image decodes (onLoad), then fade it
  // in — otherwise the image paints in top-down over an empty box on a slow load.
  const [imgLoaded, setImgLoaded] = useState(false)
  return (
    <Link to={`/recipes/${recipe._id}`} className='home-recipe-card'>
      <div className='thumb'>
        <img
          src={recipe.recipeImage}
          alt={recipe.title}
          loading='lazy'
          decoding='async'
          // A cached image can decode before React attaches onLoad (the event
          // then never fires and the skeleton sticks). Re-check `complete` on
          // each commit to catch that and recover a missed onLoad.
          ref={node => {
            if (node?.complete && node.naturalWidth > 0 && !imgLoaded) {
              setImgLoaded(true)
            }
          }}
          className={imgLoaded ? 'is-loaded' : ''}
          onLoad={() => setImgLoaded(true)}
        />
        {!imgLoaded && <Skeleton baseColor={skeletonColor} />}
        {recipe.servingPrice != null && (
          <span className='price-chip'>{fmtPrice(recipe.servingPrice)}/serv</span>
        )}
      </div>
      <div className='body'>
        <h3>{recipe.title}</h3>
        <div className='meta'>
          <span><ClockIcon /> {recipe.totalTime}m</span>
          <span><StarOutlineIcon /> {ratingLabel(recipe.rating)}</span>
          {recipe.cuisine && <span className='cuisine'>{recipe.cuisine}</span>}
        </div>
      </div>
    </Link>
  )
}

export const HomeRecipeCardSkeleton: FC = () => (
  <div className='home-recipe-card'>
    <div className='thumb'>
      <Skeleton baseColor={skeletonColor} />
    </div>
    <div className='body'>
      <h3><Skeleton baseColor={skeletonColor} count={2} /></h3>
      <div className='meta'><Skeleton inline baseColor={skeletonColor} width={140} /></div>
    </div>
  </div>
)
