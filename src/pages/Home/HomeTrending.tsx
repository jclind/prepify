import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeAPI from 'src/api/recipes'
import { RecipeCardType } from 'types'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import { HomeRecipeCard, HomeRecipeCardSkeleton } from './HomeRecipeCard'

const HomeTrending: FC = () => {
  const { data, isLoading, isError } = useQuery<RecipeCardType[]>({
    queryKey: ['trending-recipes'],
    queryFn: () => RecipeAPI.getTrendingRecipes(4),
    // Trending shifts slowly; match the For-You / by-meal rows (5 min) so a
    // Home re-visit serves from cache instead of refetching on every mount.
    staleTime: 5 * 60 * 1000,
  })

  const recipes = data ?? []
  // Per docs/design/loading-states.md: gate the skeleton behind a short delay so
  // a cache hit / fast fetch resolves into cards without a one-frame flash. The
  // isLoading branch still owns this frame (so the empty state can't flash either
  // — it just holds a blank grid until the skeleton is due).
  const showSkeleton = useDelayedLoading(isLoading)

  if (isLoading) {
    // Render the skeleton cards immediately so the grid reserves its full height
    // from the first frame (no jump when the cards/real content arrive). The
    // delay gate only controls *visibility* — during the brief flash-guard window
    // the cards are `visibility:hidden` (space held, nothing drawn), then revealed.
    return (
      <div className={`home-trending-grid ${showSkeleton ? '' : 'sk-hold'}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <HomeRecipeCardSkeleton key={i} />
        ))}
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
