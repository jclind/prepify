import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { skeletonColor, fmtPrice, ratingLabel } from './homeFormat'

const TrendingCard: FC<{ recipe: RecipeType }> = ({ recipe }) => (
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

const TrendingCardSkeleton: FC = () => (
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

const HomeTrending: FC = () => {
  const { data, isLoading, isError } = useQuery<RecipeType[]>({
    queryKey: ['trending-recipes'],
    queryFn: () => RecipeAPI.getTrendingRecipes(4),
  })

  const recipes = data ?? []

  if (isLoading) {
    return (
      <div className='home-trending-grid'>
        {Array.from({ length: 4 }).map((_, i) => <TrendingCardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError || recipes.length === 0) {
    return (
      <p className='home-empty'>
        {isError
          ? 'Couldn’t load trending recipes. Please try again later.'
          : 'No trending recipes yet.'}
      </p>
    )
  }

  return (
    <div className='home-trending-grid'>
      {recipes.map(r => <TrendingCard recipe={r} key={r._id} />)}
    </div>
  )
}

export default HomeTrending
