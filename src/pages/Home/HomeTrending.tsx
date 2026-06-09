import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import RecipeAPI from 'src/api/recipes'
import { formatRating } from 'src/util/formatRating'
import { RecipeType } from 'types'

const skeletonColor = '#e6e6e6'
const fmtPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const TrendingCard: FC<{ recipe: RecipeType }> = ({ recipe }) => {
  const ratingCount = Number(recipe.rating?.rateCount) || 0
  return (
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
          <span>
            <AiOutlineStar />{' '}
            {ratingCount === 0 ? 'New' : formatRating(recipe.rating.rateValue, ratingCount)}
          </span>
          {recipe.cuisine && <span className='cuisine'>{recipe.cuisine}</span>}
        </div>
      </div>
    </Link>
  )
}

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
  const { data, isLoading } = useQuery<RecipeType[]>({
    queryKey: ['trending-recipes'],
    queryFn: () => RecipeAPI.getTrendingRecipes(4),
  })

  const recipes = data ?? []

  return (
    <div className={`home-trending-grid ${isLoading ? 'loading' : ''}`}>
      {recipes.length > 0
        ? recipes.map(r => <TrendingCard recipe={r} key={r._id} />)
        : Array.from({ length: 4 }).map((_, i) => <TrendingCardSkeleton key={i} />)}
    </div>
  )
}

export default HomeTrending
