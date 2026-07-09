import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'
import { RecipeCardType } from 'types'
import { HomeRecipeCard } from './HomeRecipeCard'

// Personalized "For You" row. "Hide until personalized": only renders for a
// logged-in user, and only once the server returns picks (it returns [] until
// the user has enough saves/makes/ratings to infer taste).
//
// Pop-in, no skeleton (a documented exception in docs/design/loading-states.md):
// because this row frequently resolves to empty, a skeleton would be a promise of
// content it often can't keep — reserving space then collapsing it is the home
// page's main layout jump. Instead we render nothing until real picks arrive, then
// fade the row in (one downward shift, never a shift-in-then-out). Trending above
// still signals that the page is loading. Silent on error: it's a bonus row.
const HomeForYou: FC = () => {
  const user = useAuth()?.user ?? null

  const { data, isLoading, isError } = useQuery<RecipeCardType[]>({
    queryKey: ['for-you-recipes', user?.uid],
    // Match the Trending row's count (4) so the desktop grid stays even.
    queryFn: () => RecipeAPI.getForYouRecipes(4),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Logged out, still loading, errored, or not enough signal → the row doesn't
  // exist yet. No skeleton, no reserved space.
  if (!user || isLoading || isError) return null

  const recipes = data ?? []
  if (recipes.length === 0) return null

  return (
    <section className='home-section home-section--pop-in'>
      <div className='home-section-header'>
        <h2>For you</h2>
        <p>Picked from recipes you’ve saved and cooked</p>
      </div>
      <div className='home-trending-grid'>
        {recipes.map(r => <HomeRecipeCard recipe={r} key={r._id} />)}
      </div>
    </section>
  )
}

export default HomeForYou
