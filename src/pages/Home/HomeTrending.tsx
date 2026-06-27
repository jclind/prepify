import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { HomeRecipeCard, HomeRecipeCardSkeleton } from './HomeRecipeCard'

const HomeTrending: FC = () => {
  const { data, isLoading, isError } = useQuery<RecipeType[]>({
    queryKey: ['trending-recipes'],
    queryFn: () => RecipeAPI.getTrendingRecipes(4),
    // Trending shifts slowly; match the For-You / by-meal rows (5 min) so a
    // Home re-visit serves from cache instead of refetching on every mount.
    staleTime: 5 * 60 * 1000,
  })

  const recipes = data ?? []

  if (isLoading) {
    return (
      <div className='home-trending-grid'>
        {Array.from({ length: 4 }).map((_, i) => <HomeRecipeCardSkeleton key={i} />)}
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
      {recipes.map(r => <HomeRecipeCard recipe={r} key={r._id} />)}
    </div>
  )
}

export default HomeTrending
