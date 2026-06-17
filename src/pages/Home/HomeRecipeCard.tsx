import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { RecipeType } from 'types'
import { skeletonColor, fmtPrice, ratingLabel } from './homeFormat'

// Shared recipe card for the Home rows (Trending, For You). A lightweight
// thumbnail+meta link — intentionally simpler than the full RecipeCard (no save
// control) to keep the rows fast and uncluttered.
export const HomeRecipeCard: FC<{ recipe: RecipeType }> = ({ recipe }) => (
  <Link to={`/recipes/${recipe._id}`} className='home-recipe-card'>
    <div className='thumb'>
      <img src={recipe.recipeImage} alt={recipe.title} />
      {recipe.servingPrice != null && (
        <span className='price-chip'>{fmtPrice(recipe.servingPrice)}/serv</span>
      )}
    </div>
    <div className='body'>
      <h3>{recipe.title}</h3>
      <div className='meta'>
        <span><CgTimer /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {ratingLabel(recipe.rating)}</span>
        {recipe.cuisine && <span className='cuisine'>{recipe.cuisine}</span>}
      </div>
    </div>
  </Link>
)

export const HomeRecipeCardSkeleton: FC = () => (
  <div className='home-recipe-card'>
    <div className='thumb'>
      <Skeleton baseColor={skeletonColor} height='100%' style={{ aspectRatio: '4 / 3', display: 'block' }} />
    </div>
    <div className='body'>
      <h3><Skeleton baseColor={skeletonColor} count={2} /></h3>
      <div className='meta'><Skeleton baseColor={skeletonColor} width={140} /></div>
    </div>
  </div>
)
